import {
  itineraryResponseSchema,
  type GeneratedItem,
  type GenerationState,
  type TripInput,
} from "./domain";
import { addMinutes, formatDateStr, minutesOf, parseDateParts } from "./format";
import {
  fetchMultiCityRealWorldPlaces,
  parseTripDestinations,
  type CityCandidatePool,
  type RealPlace,
} from "./places/real-places.server";
import { getAccommodationPricing } from "./hotels/hotel-pricing.server";
import {
  isWithinDestinationRegion,
  isValidCoordinates,
  resolveDestinationCoordinates,
} from "./maps/geocoding";

const MODEL = "google/gemini-3.5-flash";

/**
 * Generates an inclusive list of YYYY-MM-DD calendar dates.
 * Uses UTC date calculations to guarantee zero timezone date-shift bugs.
 */
export function dayList(start: string, end: string): string[] {
  const pStart = parseDateParts(start);
  const pEnd = parseDateParts(end);
  if (!pStart || !pEnd) return [start];

  const days: string[] = [];
  const current = new Date(Date.UTC(pStart.year, pStart.month - 1, pStart.day));
  const last = new Date(Date.UTC(pEnd.year, pEnd.month - 1, pEnd.day));

  while (current <= last && days.length < 30) {
    const y = current.getUTCFullYear();
    const m = current.getUTCMonth() + 1;
    const d = current.getUTCDate();
    days.push(formatDateStr(y, m, d));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days.length ? days : [start];
}

/**
 * Normalizes activity titles for intelligent duplicate and near-duplicate detection.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(
      /\b(visit|explore|experience|tour|attend|go to|see|famous|historic|historical|local|traditional|morning|evening|afternoon|night|day \d+|discover|stroll|walk|around|lunch at|dinner at|breakfast at|meal at|food at|cafe at|restaurant at|dining at)\b/g,
      "",
    )
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Fuzzy matches venue/place names taking into account title prefixes, alternate spellings, and token overlap.
 */
export function isFuzzyMatch(titleA: string, titleB: string): boolean {
  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);
  if (normA === normB) return true;
  if (normA.length > 3 && normB.length > 3 && (normA.includes(normB) || normB.includes(normA))) {
    return true;
  }
  const stopWords = new Set([
    "the",
    "and",
    "at",
    "in",
    "of",
    "to",
    "a",
    "an",
    "park",
    "center",
    "centre",
    "city",
    "place",
    "spot",
    "viewpoint",
    "museum",
    "temple",
    "mosque",
    "monument",
    "lake",
    "village",
    "fort",
    "bazaar",
    "market",
    "restaurant",
    "cafe",
    "hotel",
  ]);
  const tokensA = titleA
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
  const tokensB = titleB
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (tokensA.length > 0 && tokensB.length > 0) {
    const common = tokensA.filter((t) => tokensB.includes(t));
    if (common.length >= 1 && common.length / Math.min(tokensA.length, tokensB.length) >= 0.5) {
      return true;
    }
  }
  return false;
}

export interface CanonicalIdentity {
  canonicalName: string;
  coordKey: string | null;
  isStructural: boolean;
}

/**
 * Extracts a canonical place/activity identity for robust, cross-day semantic duplicate detection.
 */
export function extractCanonicalIdentity(item: {
  title: string;
  location?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  category?: string | null | undefined;
}): CanonicalIdentity {
  const normTitle = (item.title || "").toLowerCase().trim();
  const category = (item.category || "").toLowerCase().trim();

  // Structural items exception (Arrival, Check-in, Checkout, Departure, Transfers)
  const isStructural =
    category === "transit" ||
    category === "wellness" ||
    category === "accommodation" ||
    normTitle.includes("arrival") ||
    normTitle.includes("hotel check-in") ||
    normTitle.includes("hotel checkout") ||
    normTitle.includes("pack souvenirs") ||
    normTitle.includes("transfer") ||
    normTitle.includes("departure");

  if (isStructural) {
    return {
      canonicalName: normTitle.replace(/[^a-z0-9]/g, ""),
      coordKey: null,
      isStructural: true,
    };
  }

  // Extract core venue/place name by stripping action verbs and meal prefixes
  let cleanName = normTitle
    .replace(
      /\b(visit|explore|experience|tour|attend|go to|see|famous|historic|historical|local|traditional|morning|evening|afternoon|night|day \d+|discover|stroll|walk|around|lunch at|dinner at|breakfast at|meal at|food at|cafe at|restaurant at|dining at)\b/gi,
      "",
    )
    .replace(/[^a-z0-9]/g, "")
    .trim();

  if (cleanName.length < 3) {
    cleanName = normTitle.replace(/[^a-z0-9]/g, "").trim();
  }

  let coordKey: string | null = null;
  if (
    typeof item.latitude === "number" &&
    typeof item.longitude === "number" &&
    (item.latitude !== 0 || item.longitude !== 0)
  ) {
    coordKey = `${item.latitude.toFixed(3)},${item.longitude.toFixed(3)}`;
  }

  return {
    canonicalName: cleanName,
    coordKey,
    isStructural: false,
  };
}

/**
 * Global trip-wide deduplication system that prevents the same real place, restaurant,
 * or activity from repeating across different days.
 */
export function deduplicateItineraryItemsGlobal(items: GeneratedItem[]): {
  uniqueItems: GeneratedItem[];
  duplicatesRemovedCount: number;
} {
  const usedCanonicalNames = new Set<string>();
  const usedCoordKeys = new Set<string>();
  const usedStructuralKeysPerDay = new Set<string>();

  const uniqueItems: GeneratedItem[] = [];
  let removedCount = 0;

  for (const item of items) {
    const { canonicalName, coordKey, isStructural } = extractCanonicalIdentity(item);

    if (isStructural) {
      const dayStructKey = `${item.day_date}_${canonicalName}`;
      if (usedStructuralKeysPerDay.has(dayStructKey)) {
        console.log(
          `[RoamPulse] Duplicate structural item on same day removed: "${item.title}" on ${item.day_date}`,
        );
        removedCount++;
        continue;
      }
      usedStructuralKeysPerDay.add(dayStructKey);
      uniqueItems.push(item);
      continue;
    }

    let isDuplicate = false;

    if (canonicalName && usedCanonicalNames.has(canonicalName)) {
      isDuplicate = true;
    }

    if (coordKey && usedCoordKeys.has(coordKey)) {
      isDuplicate = true;
    }

    if (isDuplicate) {
      console.log(
        `[RoamPulse] Global duplicate place detected & removed: "${item.title}" on ${item.day_date}`,
      );
      removedCount++;
    } else {
      if (canonicalName) usedCanonicalNames.add(canonicalName);
      if (coordKey) usedCoordKeys.add(coordKey);
      uniqueItems.push(item);
    }
  }

  return {
    uniqueItems,
    duplicatesRemovedCount: removedCount,
  };
}

export function generateUniquenessKey(item: {
  title: string;
  day_date?: string;
  start_time?: string;
  location?: string | null;
  category?: string | null;
}): string {
  const normTitle = (item.title || "")
    .toLowerCase()
    .replace(
      /\b(visit|explore|experience|tour|attend|go to|see|famous|historic|historical|local|traditional|morning|evening|afternoon|night|day \d+|discover|stroll|walk|around|lunch at|dinner at|breakfast at|meal at|food at|cafe at|restaurant at|dining at)\b/gi,
      "",
    )
    .replace(/[^a-z0-9]/g, "")
    .trim();

  const normCat = (item.category || "activity").toLowerCase().trim();
  return `${normCat}_${normTitle}`;
}

export function validateAndCleanItineraryItems(
  items: GeneratedItem[],
  input: TripInput,
): GeneratedItem[] {
  const days = dayList(input.startDate, input.endDate);

  // Comprehensive blacklist of generic hallucinated activity titles
  const GENERIC_TITLE_BLACKLIST = [
    "sightseeing & local exploration",
    "explore local attractions",
    "discover the city",
    "free time",
    "local neighborhood exploration",
    "city stroll",
    "evening dining & leisure",
    "local dining & evening leisure",
    "evening dining & local",
    "explore paris",
    "explore tokyo",
    "explore islamabad",
    "explore rome",
    "explore amsterdam",
    "city exploration",
    "explore local area",
    "discover historic streets",
    "popular food lanes",
    "evening city walk",
    "morning city walk",
    "afternoon city walk",
    "visit famous attractions",
    "local neighborhood",
    "neighborhood exploration",
    "local sightseeing",
    "discover the local area",
    "explore the city",
    "city center walk",
    "local center walk",
  ];

  const cleaned = items.filter((item) => {
    if (!item.title || item.title.trim().length < 2) return false;
    if (!item.day_date || !days.includes(item.day_date)) return false;

    const lowerTitle = item.title.toLowerCase();
    const isStructural =
      item.is_structural ||
      item.category === "transit" ||
      item.category === "accommodation" ||
      lowerTitle.includes("arrival") ||
      lowerTitle.includes("check-in") ||
      lowerTitle.includes("checkout") ||
      lowerTitle.includes("transfer") ||
      lowerTitle.includes("departure") ||
      lowerTitle.startsWith("accommodation:");

    // Allow structural items unconditionally
    if (isStructural) return true;

    // Reject items matching the generic hallucination blacklist
    if (GENERIC_TITLE_BLACKLIST.some((bad) => lowerTitle.includes(bad))) {
      console.warn(
        `[RoamPulse] REJECTED GENERIC TEMPLATE ITEM: "${item.title}" (matched blacklist)`,
      );
      return false;
    }

    return true;
  });

  return cleaned.sort((a, b) => {
    if (a.day_date !== b.day_date) {
      return a.day_date.localeCompare(b.day_date);
    }
    return a.start_time.localeCompare(b.start_time);
  });
}


export function enforceArrivalAndDepartureConstraints(
  items: GeneratedItem[],
  input: TripInput,
): GeneratedItem[] {
  const days = dayList(input.startDate, input.endDate);
  if (days.length === 0) return items;

  const firstDay = days[0]!;
  const lastDay = days[days.length - 1]!;
  const arrivalMins = minutesOf(input.arrivalTime || "14:00");
  const departureMins = minutesOf(input.departureTime || "16:00");

  return items.filter((item) => {
    const itemStartMins = minutesOf(item.start_time);
    const lowerTitle = item.title.toLowerCase();
    const isTransitOrAcc =
      item.category === "transit" ||
      item.category === "accommodation" ||
      lowerTitle.includes("arrival") ||
      lowerTitle.includes("check-in") ||
      lowerTitle.includes("checkout") ||
      lowerTitle.includes("transfer") ||
      lowerTitle.includes("departure");

    if (item.day_date === firstDay && !isTransitOrAcc && itemStartMins < arrivalMins - 15) {
      console.log(
        `[RoamPulse] Dropping activity scheduled before arrival on Day 1: "${item.title}" at ${item.start_time}`,
      );
      return false;
    }

    if (item.day_date === lastDay && !isTransitOrAcc && itemStartMins > departureMins - 120) {
      console.log(
        `[RoamPulse] Dropping activity scheduled too close to departure on last day: "${item.title}" at ${item.start_time}`,
      );
      return false;
    }

    return true;
  });
}

export function clusterAndSortItemsByProximity(items: GeneratedItem[]): GeneratedItem[] {
  const dayGroups: Record<string, GeneratedItem[]> = {};

  items.forEach((item) => {
    if (!dayGroups[item.day_date]) dayGroups[item.day_date] = [];
    dayGroups[item.day_date]!.push(item);
  });

  const processed: GeneratedItem[] = [];

  Object.keys(dayGroups)
    .sort()
    .forEach((dayDate) => {
      const dayItems = dayGroups[dayDate]!;
      dayItems.sort((a, b) => a.start_time.localeCompare(b.start_time));
      processed.push(...dayItems);
    });

  return processed;
}

export function guaranteeAllDatesPresent(
  items: GeneratedItem[],
  input: TripInput,
  realPlaces: RealPlace[] = [],
): GeneratedItem[] {
  const days = dayList(input.startDate, input.endDate);
  const presentDates = new Set(items.map((i) => i.day_date));
  const missingDates = days.filter((d) => !presentDates.has(d));

  if (missingDates.length === 0) return items;

  console.log(`[RoamPulse] Dates missing in initial response: ${missingDates.join(", ")}`);

  const resultItems = [...items];
  const usedPlaceNames = new Set(items.map((i) => normalizeTitle(i.title)));
  const availableRealPlaces = realPlaces.filter((p) => !usedPlaceNames.has(normalizeTitle(p.name)));

  let realPlaceIndex = 0;

  missingDates.forEach((missingDay) => {
    const isFirstDay = missingDay === days[0];
    const isLastDay = missingDay === days[days.length - 1];

    if (isFirstDay) {
      resultItems.push({
        title: `Arrival in ${input.destination} & Station/Airport Transfer`,
        description: `Arrive in ${input.destination} and transfer to your accommodation.`,
        day_date: missingDay,
        start_time: input.arrivalTime || "14:00",
        end_time: addMinutes(input.arrivalTime || "14:00", 60),
        category: "transit",
        location: input.destination,
        latitude: null,
        longitude: null,
        estimated_cost: Math.round(input.currency === "USD" ? 10 : 500),
        cost_type: "estimated",
        verification_status: "estimated",
        travel_minutes: 30,
        indoor_outdoor: "mixed",
        weather_suitability: "any",
        booking_url: null,
        is_locked: false,
        is_structural: true,
        uniqueness_key: `repaired_arrival_${missingDay}`,
      });
    } else if (isLastDay) {
      resultItems.push({
        title: `Hotel Checkout & Departure Transfer`,
        description: `Check out of accommodation and transfer to airport or train station in ${input.destination}.`,
        day_date: missingDay,
        start_time: "11:00",
        end_time: input.departureTime || "16:00",
        category: "transit",
        location: input.destination,
        latitude: null,
        longitude: null,
        estimated_cost: Math.round(input.currency === "USD" ? 15 : 600),
        cost_type: "estimated",
        verification_status: "estimated",
        travel_minutes: 45,
        indoor_outdoor: "mixed",
        weather_suitability: "any",
        booking_url: null,
        is_locked: false,
        is_structural: true,
        uniqueness_key: `repaired_departure_${missingDay}`,
      });
    } else {
      let insertedCount = 0;
      let currentTimeMins = 10 * 60;

      while (insertedCount < 2 && realPlaceIndex < availableRealPlaces.length) {
        const place = availableRealPlaces[realPlaceIndex++]!;
        usedPlaceNames.add(normalizeTitle(place.name));

        const startTime = `${String(Math.floor(currentTimeMins / 60)).padStart(2, "0")}:${String(currentTimeMins % 60).padStart(2, "0")}`;
        const durationMins = place.category === "restaurant" ? 75 : 120;
        const endTime = addMinutes(startTime, durationMins);
        currentTimeMins += durationMins + 30;

        resultItems.push({
          title: place.name,
          description:
            place.description ||
            `Visit ${place.name} in ${input.destination}, selected for your trip.`,
          day_date: missingDay,
          start_time: startTime,
          end_time: endTime,
          category: place.category,
          location: place.address || input.destination,
          latitude: place.latitude ?? null,
          longitude: place.longitude ?? null,
          estimated_cost: Math.round(
            (place.estimatedCostMin ?? 250) * (input.currency === "USD" ? 0.012 : 1),
          ),
          cost_type: place.costType || "estimated",
          opening_hours: place.openingHours || null,
          rating: place.rating ?? 4.5,
          verification_status: "verified",
          place_id: place.placeId,
          why_fits: `Verified real place in ${input.destination}`,
          travel_minutes: 20,
          indoor_outdoor: "mixed",
          weather_suitability: "any",
          booking_url: null,
          is_locked: false,
          uniqueness_key: generateUniquenessKey({
            title: place.name,
            category: place.category,
            location: input.destination,
          }),
        });

        insertedCount++;
      }
    }
  });

  return resultItems.sort((a, b) => {
    if (a.day_date !== b.day_date) return a.day_date.localeCompare(b.day_date);
    return a.start_time.localeCompare(b.start_time);
  });
}

export type ItineraryGenerationMode = "initial" | "regenerate" | "recovery";

export interface GenerateItineraryOptions {
  mode?: ItineraryGenerationMode;
  generationId?: string;
  previousTitles?: string[];
  lockedItems?: GeneratedItem[];
  isRegeneration?: boolean;
  seed?: number;
  realPlacesOverride?: RealPlace[];
}

/**
 * Fallback Itinerary Generator creating ONLY structural logistics items when APIs fail or return 0 candidates.
 */
export function fallbackItinerary(
  input: TripInput,
  options?: GenerateItineraryOptions,
): GeneratedItem[] {
  const days = dayList(input.startDate, input.endDate);
  const places = options?.realPlacesOverride || [];

  const recoveryReason = places.length === 0 ? "GOOGLE_PLACES_EMPTY" : "GEMINI_FAILED";
  console.warn(`[RoamPulse] RECOVERY TRIGGERED`);
  console.warn(`reason: ${recoveryReason}`);
  console.warn(`[RoamPulse] destination: ${input.destination}`);
  console.warn(`[RoamPulse] verified realPlaces available: ${places.length}`);

  const rawItems: GeneratedItem[] = [];
  let placeIndex = 0;

  days.forEach((day, dayIndex) => {
    let currentTimeMins = 9 * 60;
    if (dayIndex === 0) {
      currentTimeMins = minutesOf(input.arrivalTime || "14:00") + 60;
    }

    const dayPlaces: RealPlace[] = [];
    while (dayPlaces.length < 3 && placeIndex < places.length) {
      dayPlaces.push(places[placeIndex++]!);
    }

    if (dayPlaces.length > 0) {
      dayPlaces.forEach((p) => {
        const startTime = `${String(Math.floor(currentTimeMins / 60)).padStart(2, "0")}:${String(currentTimeMins % 60).padStart(2, "0")}`;
        const durationMins = p.category === "restaurant" ? 75 : 120;
        const endTime = addMinutes(startTime, durationMins);
        currentTimeMins += durationMins + 30;

        const estCost =
          p.estimatedCostMin ??
          (p.category === "restaurant" ? 800 : p.priceLevel ? p.priceLevel * 300 : 250);

        rawItems.push({
          title: p.name,
          description:
            p.description ||
            `Visit ${p.name} in ${input.destination}, recommended for your ${input.travelStyle} trip.`,
          day_date: day,
          start_time: startTime,
          end_time: endTime,
          category: p.category,
          location: p.address || input.destination,
          latitude: p.latitude ?? null,
          longitude: p.longitude ?? null,
          estimated_cost: Math.round(estCost * (input.currency === "USD" ? 0.012 : 1)),
          cost_type: p.costType || (estCost === 0 ? "free" : "estimated"),
          opening_hours: p.openingHours || null,
          rating: p.rating ?? 4.5,
          verification_status: "verified",
          place_id: p.placeId,
          why_fits: `Verified ${p.category} in ${input.destination}`,
          travel_minutes: 20,
          indoor_outdoor: "mixed",
          weather_suitability: "any",
          booking_url: null,
          is_locked: false,
          uniqueness_key: generateUniquenessKey({
            title: p.name,
            category: p.category,
            location: input.destination,
          }),
        });
      });
    } else {
      // Pure structural items when no real places exist
      if (dayIndex === 0) {
        rawItems.push({
          title: `Arrival in ${input.destination} & Station/Airport Transfer`,
          description: `Arrive in ${input.destination} and transfer to accommodation.`,
          day_date: day,
          start_time: input.arrivalTime || "14:00",
          end_time: addMinutes(input.arrivalTime || "14:00", 60),
          category: "transit",
          location: input.destination,
          latitude: null,
          longitude: null,
          estimated_cost: Math.round(input.currency === "USD" ? 10 : 500),
          cost_type: "estimated",
          verification_status: "estimated",
          travel_minutes: 30,
          indoor_outdoor: "mixed",
          weather_suitability: "any",
          booking_url: null,
          is_locked: false,
          is_structural: true,
          uniqueness_key: `fallback_arrival_${day}`,
        });

        rawItems.push({
          title: `Hotel Check-in & Rest`,
          description: `Complete hotel check-in procedures and rest.`,
          day_date: day,
          start_time: addMinutes(input.arrivalTime || "14:00", 60),
          end_time: addMinutes(input.arrivalTime || "14:00", 120),
          category: "accommodation",
          location: input.destination,
          latitude: null,
          longitude: null,
          estimated_cost: 0,
          cost_type: "unknown",
          verification_status: "estimated",
          travel_minutes: 15,
          indoor_outdoor: "indoor",
          weather_suitability: "any",
          booking_url: null,
          is_locked: false,
          is_structural: true,
          uniqueness_key: `fallback_checkin_${day}`,
        });
      } else if (dayIndex === days.length - 1 && days.length > 1) {
        rawItems.push({
          title: `Hotel Checkout & Departure Transfer`,
          description: `Complete checkout and transfer to departure station/airport.`,
          day_date: day,
          start_time: "11:00",
          end_time: input.departureTime || "16:00",
          category: "transit",
          location: input.destination,
          latitude: null,
          longitude: null,
          estimated_cost: Math.round(input.currency === "USD" ? 12 : 600),
          cost_type: "estimated",
          verification_status: "estimated",
          travel_minutes: 45,
          indoor_outdoor: "mixed",
          weather_suitability: "any",
          booking_url: null,
          is_locked: false,
          is_structural: true,
          uniqueness_key: `fallback_departure_${day}`,
        });
      }
    }
  });

  const { uniqueItems } = deduplicateItineraryItemsGlobal(rawItems);
  const cleaned = validateAndCleanItineraryItems(
    enforceArrivalAndDepartureConstraints(uniqueItems, input),
    input,
  );
  return guaranteeAllDatesPresent(cleaned, input, places);
}

export interface ItineraryGenerationResult {
  items: GeneratedItem[];
  source: "ai" | "fallback";
  state: GenerationState;
  notice?: string | undefined;
  error: string | null;
}

/**
 * Multi-City Real-World Itinerary Planner & Reasoning Engine.
 */
export async function generateItinerary(
  input: TripInput,
  options?: GenerateItineraryOptions,
): Promise<ItineraryGenerationResult> {
  const mode = options?.mode || (options?.isRegeneration ? "regenerate" : "initial");
  const genId = options?.generationId || crypto.randomUUID();
  const days = dayList(input.startDate, input.endDate);

  const geminiApiKey = process.env["GEMINI_API_KEY"]?.trim();
  const gatewayApiKey = (
    process.env["AI_GATEWAY_API_KEY"] || process.env["LOVABLE_API_KEY"]
  )?.trim();

  const isGeminiConfigured = Boolean(geminiApiKey && geminiApiKey.length > 0);
  const isGatewayConfigured = Boolean(gatewayApiKey && gatewayApiKey.length > 0);

  let generationState: GenerationState = "RESEARCHING";

  console.log(`[RoamPulse] GENERATION START | generationId: ${genId}`);
  console.log(`[RoamPulse] destination: ${input.destination}`);
  console.log(`[RoamPulse] trip start date: ${input.startDate}`);
  console.log(`[RoamPulse] trip end date: ${input.endDate}`);
  console.log(`[RoamPulse] expected day count: ${days.length}`);
  console.log(`[RoamPulse] Gemini API key present: ${isGeminiConfigured}`);
  console.log(`[RoamPulse] Gemini model: ${MODEL}`);
  console.log(`[RoamPulse] GENERATION STATE: ${generationState}`);

  // Discover real-world place candidate pools for each destination city
  const cityPools: CityCandidatePool[] = await fetchMultiCityRealWorldPlaces(
    input.destination,
    input.extraDestinations,
    input.interests,
  );

  generationState = "PLACES_FOUND";
  console.log(`[RoamPulse] GENERATION STATE: ${generationState}`);

  const allVerifiedPlaces: RealPlace[] = cityPools.flatMap((p) => p.candidates);
  console.log(
    `[REAL PLACES] Discovered ${allVerifiedPlaces.length} total verified places across ${cityPools.length} cities`,
  );
  // Per-city breakdown
  for (const pool of cityPools) {
    console.log(
      `[RoamPulse] CITY POOL | city: ${pool.city} | candidates: ${pool.candidates.length}`,
    );
  }

  generationState = "PLACES_VERIFIED";
  console.log(`[RoamPulse] GENERATION STATE: ${generationState}`);


  const accommodationPricing = await getAccommodationPricing(
    cityPools[0]?.city || input.destination,
    input.currency,
    input.startDate,
    input.endDate,
    input.preferences.accommodation,
  );

  let generationNotice: string | undefined;
  let isDegraded = false;

  // Minimum Candidate Quality Gate
  const minCandidatesNeeded = Math.max(4, days.length * 2);
  if (allVerifiedPlaces.length < minCandidatesNeeded) {
    isDegraded = true;
    generationState = "DEGRADED";
    console.warn(
      `[RoamPulse] Limited candidate pool (${allVerifiedPlaces.length} places for ${days.length} days, minimum needed: ${minCandidatesNeeded}) -> Setting generation state to DEGRADED`,
    );
    generationNotice = `RoamPulse verified ${allVerifiedPlaces.length} real attractions for this destination. We created your itinerary using those verified locations without inventing fictional places.`;
  }

  if (!isGeminiConfigured && !isGatewayConfigured) {
    console.warn(
      "[RoamPulse] Using fallback itinerary because Gemini failed (GEMINI_API_KEY missing/unconfigured)",
    );
    const fallbackItems = fallbackItinerary(input, {
      ...options,
      realPlacesOverride: allVerifiedPlaces,
    });
    return {
      items: fallbackItems,
      source: "fallback",
      state: "DEGRADED",
      notice: "AI Planner unavailable — backup structural schedule generated.",
      error: null,
    };
  }

  // Divide trip days across cities for multi-city trips
  const cityDayAssignments: Array<{ city: string; pool: CityCandidatePool; days: string[] }> = [];
  const totalCities = cityPools.length;
  const daysPerCity = Math.max(1, Math.floor(days.length / totalCities));

  cityPools.forEach((pool, idx) => {
    const isLastCity = idx === totalCities - 1;
    const startIdx = idx * daysPerCity;
    const endIdx = isLastCity ? days.length : (idx + 1) * daysPerCity;
    const assignedDays = days.slice(startIdx, endIdx);
    cityDayAssignments.push({ city: pool.city, pool, days: assignedDays });
  });

  const promptParts = [
    `You are RoamPulse's expert local travel planner creating a multi-city ${days.length}-day itinerary.`,
    `Travelers: ${input.adults} adults, ${input.children} children. Budget: ${input.budget} ${input.currency}. Travel style: ${input.travelStyle}.`,
    `Interests: ${input.interests.join(", ") || "General exploration"}.`,
    `Arrival Time on Day 1: ${input.arrivalTime || "14:00"}. Departure Time on Day ${days.length}: ${input.departureTime || "16:00"}.`,
    `Pace: ${input.preferences.pace}. Transport mode: ${input.preferences.transport}.`,
    ``,
    `CRITICAL MULTI-CITY & REAL-PLACE RULES:`,
    `1. ZERO HALLUCINATION OF PLACE NAMES: You are the SCHEDULER, NOT the place database. You MUST select attractions, museums, landmarks, restaurants, and parks STRICTLY from the supplied candidate list. NEVER invent fictional place names.`,
    `2. CITY ALLOCATION & ZERO CITY CROSS-CONTAMINATION:`,
  ];

  cityDayAssignments.forEach(({ city, pool, days: cityDays }) => {
    promptParts.push(
      `   - CITY: ${city.toUpperCase()} (Assigned Dates: ${cityDays.join(", ")})`,
      `     You MUST select items for ${cityDays.join(", ")} ONLY from ${city.toUpperCase()} candidate places listed below. NEVER put a ${city} place on another city's dates.`,
    );
  });

  promptParts.push(
    `3. STRICT GLOBAL UNICITY: Every real place must appear ONLY ONCE across the entire itinerary.`,
    `4. NO GENERIC PLACEHOLDERS: NEVER emit generic titles like 'Explore Paris', 'Local Neighborhood Exploration', 'City Stroll', 'Evening Dining', or 'Free time'. Every non-structural activity MUST be an exact real venue from the candidates.`,
    `5. STRUCTURAL LOGISTICS ALLOWED: Use category 'transit' or 'accommodation' only for genuine logistics (airport transfer, hotel check-in/out, intercity train/flight).`,
    ``,
  );

  cityDayAssignments.forEach(({ city, pool, days: cityDays }) => {
    promptParts.push(
      `VERIFIED REAL-WORLD PLACES CANDIDATES FOR ${city.toUpperCase()} (DATES: ${cityDays.join(", ")}):`,
      JSON.stringify(
        pool.candidates.map((p) => ({
          place_id: p.placeId,
          name: p.name,
          category: p.category,
          address: p.address,
          latitude: p.latitude,
          longitude: p.longitude,
          rating: p.rating,
          openingHours: p.openingHours,
        })),
        null,
        2,
      ),
      ``,
    );
  });

  if (mode === "regenerate" || (options?.previousTitles && options.previousTitles.length > 0)) {
    promptParts.push(
      `REGENERATION INSTRUCTION: Provide a SUBSTANTIALLY DIFFERENT itinerary from previous runs. Avoid these previously generated titles: ${(options?.previousTitles || []).slice(0, 25).join(", ")}.`,
    );
  }

  const maxAttempts = 2;
  generationState = "PLANNING";
  console.log(`[RoamPulse] GENERATION STATE: ${generationState}`);
  console.log(`[RoamPulse] GEMINI PLANNING START`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      let rawJsonText: string | null = null;

      if (isGeminiConfigured) {
        console.log(`[RoamPulse] Gemini request started | attempt: ${attempt}`);
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`;
        const systemInstructionText = [
          "You are RoamPulse's expert local travel planner. Your ONLY job is to SCHEDULE the verified places provided to you.",
          "Return ONLY valid JSON matching schema {\"items\": [...]}.",
          "MANDATORY: Every sightseeing/activity/attraction item MUST have a place_id field matching EXACTLY one of the candidate place_id values from the city candidate lists provided.",
          "MANDATORY: Never invent, imagine, or create attraction/museum/landmark/restaurant/park/viewpoint/neighborhood names that are not in the candidate lists.",
          "MANDATORY: Do not emit items with titles like 'Explore Paris', 'Local Neighborhood Exploration', 'City Stroll', 'Evening Dining & Leisure', 'Evening City Walk', 'Local Sightseeing', 'Discover the City', 'Visit Famous Attractions', or any generic placeholder.",
          "For structural logistics only (airport transfer, hotel check-in, hotel checkout, intercity train/flight), place_id should be null and category should be 'transit' or 'accommodation'.",
          "If there are not enough candidates to fill all day slots, leave slots empty rather than inventing fictional places.",
        ].join(" ");

        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptParts.join("\n") }] }],
            systemInstruction: {
              parts: [{ text: systemInstructionText }],
            },
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        });


        console.log(`[RoamPulse] Gemini HTTP status: ${res.status}`);

        if (res.ok) {
          const geminiData = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          rawJsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
        } else {
          const errText = await res.text().catch(() => "");
          console.warn(
            `[RoamPulse] Gemini API returned HTTP ${res.status}: ${errText.slice(0, 200)}`,
          );
        }
      }

      if (!rawJsonText && isGatewayConfigured) {
        console.log(`[RoamPulse] Gemini Gateway request started | attempt: ${attempt}`);
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { authorization: `Bearer ${gatewayApiKey}`, "content-type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "You are RoamPulse's expert local travel planner. Your ONLY job is to SCHEDULE the verified places provided. Every sightseeing/attraction/activity title MUST be a specific real place from the candidates list with its exact place_id. NEVER invent place names not in the list. NEVER use titles like 'Explore [City]', 'City Stroll', 'Local Neighborhood', 'Evening Dining & Leisure', or any generic placeholder. Only transit and accommodation items may have null place_id.",
              },
              { role: "user", content: promptParts.join("\n") },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "emit_itinerary",
                  description: "Return day-by-day travel itinerary",
                  parameters: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            place_id: { type: "string" },
                            title: { type: "string" },
                            description: { type: "string" },
                            day_date: { type: "string" },
                            start_time: { type: "string" },
                            end_time: { type: "string" },
                            category: { type: "string" },
                            location: { type: "string" },
                            latitude: { type: "number" },
                            longitude: { type: "number" },
                            estimated_cost: { type: "number" },
                            indoor_outdoor: { type: "string" },
                            weather_suitability: { type: "string" },
                          },
                          required: [
                            "title",
                            "description",
                            "day_date",
                            "start_time",
                            "end_time",
                            "category",
                            "indoor_outdoor",
                          ],
                        },
                      },
                    },
                    required: ["items"],
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "emit_itinerary" } },
          }),
        });

        if (res.ok) {
          const json = (await res.json()) as {
            choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
          };
          rawJsonText = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? null;
        }
      }

      if (!rawJsonText) {
        throw new Error("No response content returned from AI services.");
      }

      generationState = "VALIDATING";
      console.log(`[RoamPulse] GENERATION STATE: ${generationState}`);

      const extractedJson = extractJsonFromText(rawJsonText);
      const jsonParsed = JSON.parse(extractedJson);
      const parsed = itineraryResponseSchema.safeParse(jsonParsed);

      if (!parsed.success) {
        throw new Error(`Validation failed: ${parsed.error.message}`);
      }

      const rawItems = parsed.data.items;
      console.log(`[RoamPulse] GEMINI RAW ITEM COUNT: ${rawItems.length}`);

      let realPlaceCount = 0;
      let structuralCount = 0;
      let rejectedInventedCount = 0;

      const validatedItems: GeneratedItem[] = [];

      for (const item of rawItems) {
        const isStructural =
          item.category === "transit" ||
          item.category === "accommodation" ||
          item.title.toLowerCase().includes("arrival") ||
          item.title.toLowerCase().includes("check-in") ||
          item.title.toLowerCase().includes("checkout") ||
          item.title.toLowerCase().includes("transfer") ||
          item.title.toLowerCase().includes("departure");

        if (isStructural) {
          structuralCount++;
          validatedItems.push({
            ...item,
            verification_status: "estimated",
            is_structural: true,
          });
          continue;
        }

        // Match against verified candidate pool for item's date & city
        const assignedCityObj = cityDayAssignments.find((a) => a.days.includes(item.day_date));
        const candidatePoolForDate = assignedCityObj
          ? assignedCityObj.pool.candidates
          : allVerifiedPlaces;

        let matchedPlace: RealPlace | undefined;

        if (item.place_id) {
          matchedPlace = candidatePoolForDate.find((p) => p.placeId === item.place_id);
        }

        if (!matchedPlace) {
          matchedPlace = candidatePoolForDate.find((p) => isFuzzyMatch(p.name, item.title));
        }

        if (!matchedPlace) {
          // Check all pools as fallback
          matchedPlace = allVerifiedPlaces.find((p) => isFuzzyMatch(p.name, item.title));
        }

        if (matchedPlace) {
          realPlaceCount++;
          let finalLat = matchedPlace.latitude ?? item.latitude ?? null;
          let finalLon = matchedPlace.longitude ?? item.longitude ?? null;

          const canonicalCity = await resolveDestinationCoordinates(
            matchedPlace.destinationCity || input.destination,
          );
          if (
            canonicalCity &&
            isValidCoordinates(canonicalCity.latitude, canonicalCity.longitude) &&
            isValidCoordinates(finalLat, finalLon)
          ) {
            if (
              !isWithinDestinationRegion(
                canonicalCity.latitude,
                canonicalCity.longitude,
                finalLat,
                finalLon,
                150,
              )
            ) {
              finalLat = null;
              finalLon = null;
            }
          }

          validatedItems.push({
            ...item,
            place_id: matchedPlace.placeId,
            title: matchedPlace.name,
            latitude: finalLat,
            longitude: finalLon,
            location: matchedPlace.address || item.location,
            rating: matchedPlace.rating ?? item.rating ?? null,
            opening_hours: matchedPlace.openingHours || item.opening_hours || null,
            verification_status: "verified",
            cost_type: matchedPlace.costType || item.cost_type || "estimated",
          });
        } else {
          // REJECT UNVERIFIED INVENTED SIGHTSEEING ITEM
          rejectedInventedCount++;
          console.warn(
            `[RoamPulse] REJECTED INVENTED ITEM: "${item.title}" on ${item.day_date} (Not in verified candidate pool)`,
          );
        }
      }

      console.log(`[RoamPulse] VALIDATED ITEM COUNT: ${validatedItems.length}`);
      console.log(`[RoamPulse] REAL PLACE ITEM COUNT: ${realPlaceCount}`);
      console.log(`[RoamPulse] STRUCTURAL ITEM COUNT: ${structuralCount}`);
      console.log(`[RoamPulse] REJECTED INVENTED ITEM COUNT: ${rejectedInventedCount}`);

      const { uniqueItems, duplicatesRemovedCount } =
        deduplicateItineraryItemsGlobal(validatedItems);
      console.log(`[RoamPulse] Global duplicates removed: ${duplicatesRemovedCount}`);

      const constrainedItems = enforceArrivalAndDepartureConstraints(
        uniqueItems.length > 0 ? uniqueItems : validatedItems,
        input,
      );

      const cleanedItems = validateAndCleanItineraryItems(constrainedItems, input);
      const finalItems = guaranteeAllDatesPresent(cleanedItems, input, allVerifiedPlaces);

      if (
        !finalItems.some(
          (i) =>
            i.category === "accommodation" || i.title.toLowerCase().startsWith("accommodation:"),
        )
      ) {
        finalItems.unshift({
          title: `Accommodation: ${accommodationPricing.hotelName}`,
          description: `${accommodationPricing.accommodationType.replace("_", " ")} stay in ${input.destination} (${accommodationPricing.totalNights} nights).`,
          day_date: days[0]!,
          start_time: input.arrivalTime || "14:00",
          end_time: addMinutes(input.arrivalTime || "14:00", 30),
          category: "accommodation",
          location: accommodationPricing.address || input.destination,
          latitude: accommodationPricing.latitude ?? null,
          longitude: accommodationPricing.longitude ?? null,
          estimated_cost: accommodationPricing.totalAccommodationCost ?? 0,
          cost_type: "estimated",
          verification_status: accommodationPricing.isVerified ? "verified" : "estimated",
          is_structural: true,
          travel_minutes: 0,
          indoor_outdoor: "indoor",
          weather_suitability: "any",
          booking_url: null,
          is_locked: false,
        });
      }

      generationState = isDegraded ? "DEGRADED" : "COMPLETE";

      console.log(`[RoamPulse] FINAL ITEM COUNT: ${finalItems.length}`);
      console.log(`[RoamPulse] GENERATION STATE: ${generationState}`);
      console.log(`[RoamPulse] GENERATION COMPLETE | generationId: ${genId}`);

      return {
        items: finalItems,
        source: "ai",
        state: generationState,
        notice: generationNotice,
        error: null,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[RoamPulse] Gemini itinerary attempt ${attempt} failed: ${errMsg}`);
      if (attempt === maxAttempts) {
        const fallbackItems = fallbackItinerary(input, {
          ...options,
          realPlacesOverride: allVerifiedPlaces,
        });
        return {
          items: fallbackItems,
          source: "fallback",
          state: "DEGRADED",
          notice: "AI Planner temporarily busy — generated backup schedule.",
          error: "AI planner busy.",
        };
      }
    }
  }

  const fallbackItems = fallbackItinerary(input, {
    ...options,
    realPlacesOverride: allVerifiedPlaces,
  });
  return {
    items: fallbackItems,
    source: "fallback",
    state: "DEGRADED",
    notice: "Backup schedule generated.",
    error: null,
  };
}

function extractJsonFromText(text: string): string {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim();
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  return text.trim();
}
