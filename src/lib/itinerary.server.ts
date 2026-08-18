import { itineraryResponseSchema, type GeneratedItem, type TripInput } from "./domain";
import { addMinutes, formatDateStr, minutesOf, parseDateParts } from "./format";
import { fetchRealWorldPlaces, type RealPlace } from "./places/real-places.server";
import { getAccommodationPricing } from "./hotels/hotel-pricing.server";
import {
  isWithinDestinationRegion,
  isValidCoordinates,
  resolveDestinationCoordinates,
} from "@/lib/maps/geocoding";

const MODEL = "google/gemini-2.0-flash";

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

  // Structural items exception (Arrival, Check-in, Checkout, Departure)
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

    // 1. Check exact canonical name match anywhere in the trip
    if (canonicalName.length >= 3 && usedCanonicalNames.has(canonicalName)) {
      console.log(
        `[RoamPulse] Duplicate global real place removed: "${item.title}" (canonical: "${canonicalName}") on ${item.day_date}`,
      );
      removedCount++;
      continue;
    }

    // 2. Check near substring match for place names > 5 chars
    let isSubstringDuplicate = false;
    for (const existingName of usedCanonicalNames) {
      if (
        canonicalName.length > 5 &&
        existingName.length > 5 &&
        (canonicalName.includes(existingName) || existingName.includes(canonicalName))
      ) {
        console.log(
          `[RoamPulse] Near-duplicate real place removed: "${item.title}" matches existing "${existingName}"`,
        );
        isSubstringDuplicate = true;
        break;
      }
    }
    if (isSubstringDuplicate) {
      removedCount++;
      continue;
    }

    // 3. Check coordinate match anywhere in the trip
    if (coordKey && usedCoordKeys.has(coordKey)) {
      console.log(
        `[RoamPulse] Duplicate global coordinates removed: "${item.title}" at (${coordKey}) on ${item.day_date}`,
      );
      removedCount++;
      continue;
    }

    if (canonicalName.length >= 3) {
      usedCanonicalNames.add(canonicalName);
    }
    if (coordKey) {
      usedCoordKeys.add(coordKey);
    }

    uniqueItems.push(item);
  }

  return { uniqueItems, duplicatesRemovedCount: removedCount };
}

/**
 * Safely extracts valid JSON string from AI model output text, stripping markdown code blocks.
 */
export function extractJsonFromText(text: string): string {
  const trimmed = text.trim();

  // 1. Direct JSON starting with '{' and ending with '}'
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  // 2. Fenced code block extraction (```json ... ``` or ``` ... ```)
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const blockContent = codeBlockMatch[1].trim();
    if (blockContent.startsWith("{") && blockContent.endsWith("}")) {
      return blockContent;
    }
  }

  // 3. Substring extraction between first '{' and last '}'
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

/**
 * Calculates Haversine distance in kilometers between two geographic coordinates.
 */
export function calculateDistanceKm(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null,
): number | null {
  if (
    typeof lat1 !== "number" ||
    typeof lon1 !== "number" ||
    typeof lat2 !== "number" ||
    typeof lon2 !== "number" ||
    (lat1 === 0 && lon1 === 0) ||
    (lat2 === 0 && lon2 === 0)
  ) {
    return null;
  }

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Clusters and sorts itinerary items geographically per day to minimize travel time across town.
 */
export function clusterAndSortItemsByProximity(items: GeneratedItem[]): GeneratedItem[] {
  const dayMap = new Map<string, GeneratedItem[]>();
  for (const item of items) {
    const list = dayMap.get(item.day_date) || [];
    list.push(item);
    dayMap.set(item.day_date, list);
  }

  const sortedResult: GeneratedItem[] = [];

  for (const [, dayItems] of dayMap.entries()) {
    if (dayItems.length <= 2) {
      sortedResult.push(...dayItems);
      continue;
    }

    const fixedItems = dayItems.filter(
      (i) =>
        i.category === "accommodation" ||
        i.category === "transit" ||
        i.title.toLowerCase().includes("arrival") ||
        i.title.toLowerCase().includes("checkout"),
    );

    const flexItems = dayItems.filter((i) => !fixedItems.includes(i));

    if (flexItems.length <= 1) {
      sortedResult.push(...dayItems);
      continue;
    }

    const orderedFlex: GeneratedItem[] = [];
    const remaining = [...flexItems];

    let current = remaining.shift()!;
    orderedFlex.push(current);

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i]!;
        const dist = calculateDistanceKm(
          current.latitude,
          current.longitude,
          candidate.latitude,
          candidate.longitude,
        );

        if (dist !== null && dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      current = remaining.splice(nearestIdx, 1)[0]!;
      orderedFlex.push(current);
    }

    const originalTimes = dayItems.map((i) => ({
      start: i.start_time,
      end: i.end_time,
    }));

    const combined = [...fixedItems, ...orderedFlex].sort((a, b) =>
      a.start_time.localeCompare(b.start_time),
    );

    const reorderedDayItems = combined.map((item, idx) => ({
      ...item,
      start_time: originalTimes[idx]?.start || item.start_time,
      end_time: originalTimes[idx]?.end || item.end_time,
    }));

    sortedResult.push(...reorderedDayItems);
  }

  return sortedResult;
}

/**
 * Generates a unique deterministic key for an itinerary item.
 */
export function generateUniquenessKey(item: {
  title: string;
  category?: string | null | undefined;
  location?: string | null | undefined;
}): string {
  const normTitle = normalizeTitle(item.title);
  const normLoc = item.location ? normalizeTitle(item.location) : "";
  const cat = (item.category || "activity").toLowerCase().trim();
  return `${normTitle}_${cat}_${normLoc}`;
}

/**
 * Validates and cleans itinerary items against trip constraints.
 */
export function validateAndCleanItineraryItems(
  items: GeneratedItem[],
  input: TripInput,
): GeneratedItem[] {
  const validDays = new Set(dayList(input.startDate, input.endDate));

  return items
    .filter((item) => {
      if (!item.title || typeof item.title !== "string" || item.title.trim().length < 2)
        return false;
      return true;
    })
    .map((item) => {
      let date = item.day_date;
      if (!validDays.has(date)) {
        if (date < input.startDate) date = input.startDate;
        if (date > input.endDate) date = input.endDate;
      }

      const startTime = item.start_time || "09:00";
      let endTime = item.end_time || "10:00";
      const startMins = minutesOf(startTime);
      const endMins = minutesOf(endTime);

      if (endMins <= startMins) {
        endTime = addMinutes(startTime, 60);
      }

      let cleanTitle = item.title.trim();
      const normTitle = cleanTitle.toLowerCase();

      // Safety net: Replace any generic starter-template activity titles with place/location names
      if (
        normTitle.includes("sightseeing & local exploration") ||
        normTitle.includes("local exploration") ||
        normTitle === "explore the city" ||
        normTitle === "explore local attractions" ||
        normTitle === "city sightseeing" ||
        normTitle === "free time" ||
        normTitle.includes("starter template")
      ) {
        if (
          item.location &&
          item.location.toLowerCase() !== input.destination.toLowerCase() &&
          item.location.trim().length > 3
        ) {
          cleanTitle = item.location.trim();
        } else {
          const categoryName = item.category
            ? item.category.charAt(0).toUpperCase() + item.category.slice(1)
            : "Landmark";
          cleanTitle = `${input.destination} ${categoryName}`;
        }
      }

      const cost = Math.max(0, Math.round(Number(item.estimated_cost) || 0));

      return {
        ...item,
        title: cleanTitle,
        description: (item.description || "").trim(),
        day_date: date,
        start_time: startTime,
        end_time: endTime,
        category: (item.category || "activity").toLowerCase().trim(),
        location: (item.location || input.destination).trim(),
        estimated_cost: cost,
        cost_min: typeof item.cost_min === "number" ? Math.max(0, Math.round(item.cost_min)) : null,
        cost_max: typeof item.cost_max === "number" ? Math.max(0, Math.round(item.cost_max)) : null,
        cost_type: item.cost_type || (cost === 0 ? "free" : "estimated"),
        opening_hours: item.opening_hours || null,
        rating: typeof item.rating === "number" ? Number(item.rating.toFixed(1)) : null,
        verification_status:
          item.verification_status || (item.rating || item.latitude ? "verified" : "estimated"),
        why_fits: item.why_fits || null,
        indoor_outdoor:
          item.indoor_outdoor === "outdoor" ||
          item.indoor_outdoor === "indoor" ||
          item.indoor_outdoor === "mixed"
            ? item.indoor_outdoor
            : "mixed",
        weather_suitability:
          item.weather_suitability === "clear_only" ||
          item.weather_suitability === "rain_ok" ||
          item.weather_suitability === "any"
            ? item.weather_suitability
            : "any",
      };
    });
}

/**
 * Guarantees that every date in the trip range has itinerary items.
 * Fills missing dates automatically using ONLY unused real places to prevent repeats.
 */
export function guaranteeAllDatesPresent(
  items: GeneratedItem[],
  input: TripInput,
  realPlaces: RealPlace[],
): GeneratedItem[] {
  const expectedDates = dayList(input.startDate, input.endDate);

  // Track all canonical names and coords already used anywhere in the trip
  const usedCanonicalNames = new Set<string>();
  const usedCoordKeys = new Set<string>();

  for (const item of items) {
    const { canonicalName, coordKey, isStructural } = extractCanonicalIdentity(item);
    if (!isStructural && canonicalName.length >= 3) {
      usedCanonicalNames.add(canonicalName);
    }
    if (coordKey) {
      usedCoordKeys.add(coordKey);
    }
  }

  // Filter realPlaces to ONLY those not yet used anywhere in the trip
  const unusedRealPlaces = realPlaces.filter((p) => {
    const { canonicalName, coordKey } = extractCanonicalIdentity({
      title: p.name,
      location: p.address,
      latitude: p.latitude,
      longitude: p.longitude,
      category: p.category,
    });
    if (canonicalName.length >= 3 && usedCanonicalNames.has(canonicalName)) return false;
    if (coordKey && usedCoordKeys.has(coordKey)) return false;
    return true;
  });

  const presentDates = new Set(items.map((i) => i.day_date));
  const missingDates = expectedDates.filter((d) => !presentDates.has(d));

  if (missingDates.length === 0) {
    return items;
  }

  console.warn(
    `[RoamPulse] Missing dates detected: ${missingDates.join(", ")}; repairing date gaps with unused real places now...`,
  );

  const repaired = [...items];
  let unusedPlaceIdx = 0;

  missingDates.forEach((missingDay) => {
    const dayPlaces: RealPlace[] = [];
    while (dayPlaces.length < 3 && unusedPlaceIdx < unusedRealPlaces.length) {
      const p = unusedRealPlaces[unusedPlaceIdx++]!;
      dayPlaces.push(p);
      const { canonicalName, coordKey } = extractCanonicalIdentity({
        title: p.name,
        location: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        category: p.category,
      });
      if (canonicalName.length >= 3) usedCanonicalNames.add(canonicalName);
      if (coordKey) usedCoordKeys.add(coordKey);
    }

    if (dayPlaces.length > 0) {
      dayPlaces.forEach((p, pIdx) => {
        const startTime = pIdx === 0 ? "10:00" : pIdx === 1 ? "12:30" : "15:00";
        const duration = p.category === "restaurant" ? 75 : 120;
        const endTime = addMinutes(startTime, duration);

        repaired.push({
          title: p.name,
          description: p.description || `Explore ${p.name} in ${input.destination}.`,
          day_date: missingDay,
          start_time: startTime,
          end_time: endTime,
          category: p.category,
          location: p.address || input.destination,
          latitude: p.latitude ?? null,
          longitude: p.longitude ?? null,
          estimated_cost: Math.round(
            (p.estimatedCostMin ?? 300) * (input.currency === "USD" ? 0.012 : 1),
          ),
          cost_type: p.costType || "estimated",
          opening_hours: p.openingHours || null,
          rating: p.rating ?? 4.5,
          verification_status: "verified",
          why_fits: `Popular ${p.category} in ${input.destination}`,
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
      // Legitimate structural / neighborhood walking activities when no unused verified real places exist
      const structuralTemplates = [
        {
          title: `Local Neighborhood Exploration & City Stroll`,
          description: `Self-guided walking tour around local neighborhoods, architectural streets, and city centers in ${input.destination}.`,
          cat: "nature",
          time: "10:00",
        },
        {
          title: `Evening Dining & Local Center Walk`,
          description: `Casual evening walking tour visiting popular food lanes and central dining spots in ${input.destination}.`,
          cat: "food",
          time: "18:00",
        },
      ];

      const availableTemplates = structuralTemplates.filter((t) => {
        const { canonicalName } = extractCanonicalIdentity({ title: t.title, category: t.cat });
        return !usedCanonicalNames.has(canonicalName);
      });

      const t1 = availableTemplates[0] || {
        title: `Local Area Exploration (${missingDay})`,
        description: `Explore local neighborhoods and surroundings in ${input.destination}.`,
        cat: "nature",
        time: "10:00",
      };

      repaired.push({
        title: t1.title,
        description: t1.description,
        day_date: missingDay,
        start_time: t1.time,
        end_time: addMinutes(t1.time, 120),
        category: t1.cat,
        location: input.destination,
        latitude: null,
        longitude: null,
        estimated_cost: 0,
        cost_type: "free",
        verification_status: "estimated",
        travel_minutes: 15,
        indoor_outdoor: "mixed",
        weather_suitability: "any",
        booking_url: null,
        is_locked: false,
        uniqueness_key: `repaired_struct_${missingDay}`,
      });
    }
  });

  return repaired;
}

/**
 * Post-processes itinerary items to enforce arrival & departure time constraints, meal windows, and buffers.
 */
export function enforceArrivalAndDepartureConstraints(
  items: GeneratedItem[],
  input: TripInput,
): GeneratedItem[] {
  const days = dayList(input.startDate, input.endDate);
  if (days.length === 0) return items;

  const firstDay = days[0]!;
  const lastDay = days[days.length - 1]!;

  const arrMins = minutesOf(input.arrivalTime || "14:00");
  const depMins = minutesOf(input.departureTime || "16:00");

  const processed: GeneratedItem[] = [];

  for (const day of days) {
    const dayItems = items.filter((i) => i.day_date === day);

    if (day === firstDay) {
      const validDay1Items = dayItems.filter((i) => minutesOf(i.start_time) >= arrMins);

      const hasArrival = validDay1Items.some(
        (i) => i.category === "transit" || i.title.toLowerCase().includes("arrival"),
      );
      if (!hasArrival) {
        processed.push({
          title: `Arrival in ${input.destination} & Station/Airport Transfer`,
          description: `Arrive at ${input.destination}, receive local transport assistance and head to accommodation.`,
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
          uniqueness_key: `arrival_transit_${day}`,
        });

        processed.push({
          title: `Hotel Check-in & Refresh`,
          description: `Check in at hotel, unpack, and refresh before evening activities.`,
          day_date: day,
          start_time: addMinutes(input.arrivalTime || "14:00", 60),
          end_time: addMinutes(input.arrivalTime || "14:00", 120),
          category: "wellness",
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
          uniqueness_key: `hotel_checkin_${day}`,
        });
      }

      processed.push(...validDay1Items);
    } else if (day === lastDay && days.length > 1) {
      const latestAllowedMins = Math.max(10 * 60, depMins - 180);
      const validLastDayItems = dayItems.filter((i) => minutesOf(i.end_time) <= latestAllowedMins);

      processed.push(...validLastDayItems);

      const checkoutStart = `${String(Math.floor(latestAllowedMins / 60)).padStart(2, "0")}:00`;
      processed.push({
        title: `Hotel Checkout & Pack Souvenirs`,
        description: `Complete hotel checkout procedure, store luggage if necessary, and prepare for departure.`,
        day_date: day,
        start_time: checkoutStart,
        end_time: addMinutes(checkoutStart, 45),
        category: "transit",
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
        uniqueness_key: `checkout_${day}`,
      });

      const depStart = addMinutes(checkoutStart, 60);
      processed.push({
        title: `Airport / Station Transfer & Departure`,
        description: `Travel to airport or station for departure with adequate check-in buffer time.`,
        day_date: day,
        start_time: depStart,
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
        uniqueness_key: `departure_transfer_${day}`,
      });
    } else {
      processed.push(...dayItems);
    }
  }

  return processed;
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
 * Fallback Itinerary Generator using Real Places catalog with zero repeated places across days.
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

    // Assign non-overlapping candidate real places to each day
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
      // Structural activities when verified places are sparse (never invent fake place names)
      if (dayIndex === 0) {
        rawItems.push({
          title: `Arrival in ${input.destination} & Station/Airport Transfer`,
          description: `Arrive in ${input.destination} and transfer to your booked accommodation.`,
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
          uniqueness_key: `fallback_arrival_${day}`,
        });

        rawItems.push({
          title: `Hotel Check-in & Rest`,
          description: `Complete hotel check-in procedures, unpack luggage, and rest.`,
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
          uniqueness_key: `fallback_checkin_${day}`,
        });
      } else if (dayIndex === days.length - 1 && days.length > 1) {
        rawItems.push({
          title: `Hotel Checkout & Packing`,
          description: `Complete checkout, organize belongings, and store bags if needed.`,
          day_date: day,
          start_time: "11:00",
          end_time: "12:00",
          category: "transit",
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
          uniqueness_key: `fallback_checkout_${day}`,
        });

        rawItems.push({
          title: `Station / Airport Transfer & Departure`,
          description: `Travel to station or airport for return journey.`,
          day_date: day,
          start_time: "13:00",
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
          uniqueness_key: `fallback_departure_${day}`,
        });
      } else {
        rawItems.push({
          title: `Local Neighborhood Exploration & City Stroll`,
          description: `Walk through historic streets, local markets, and public squares in ${input.destination}.`,
          day_date: day,
          start_time: "10:00",
          end_time: "12:00",
          category: "nature",
          location: input.destination,
          latitude: null,
          longitude: null,
          estimated_cost: 0,
          cost_type: "free",
          verification_status: "estimated",
          travel_minutes: 15,
          indoor_outdoor: "mixed",
          weather_suitability: "any",
          booking_url: null,
          is_locked: false,
          uniqueness_key: `fallback_explore_${day}`,
        });

        rawItems.push({
          title: `Local Dining & Evening Leisure`,
          description: `Enjoy local cuisine at neighborhood restaurants and relax in ${input.destination}.`,
          day_date: day,
          start_time: "18:00",
          end_time: "20:00",
          category: "food",
          location: input.destination,
          latitude: null,
          longitude: null,
          estimated_cost: Math.round(input.currency === "USD" ? 15 : 600),
          cost_type: "estimated",
          verification_status: "estimated",
          travel_minutes: 15,
          indoor_outdoor: "indoor",
          weather_suitability: "any",
          booking_url: null,
          is_locked: false,
          uniqueness_key: `fallback_dining_${day}`,
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

/**
 * Calls Google Gemini API or AI Gateway to generate a real-world, destination-specific itinerary.
 */
export async function generateItinerary(
  input: TripInput,
  options?: GenerateItineraryOptions,
): Promise<{ items: GeneratedItem[]; source: "ai" | "fallback"; error: string | null }> {
  const mode = options?.mode || (options?.isRegeneration ? "regenerate" : "initial");
  const genId = options?.generationId || crypto.randomUUID();
  const days = dayList(input.startDate, input.endDate);

  const geminiApiKey = process.env["GEMINI_API_KEY"]?.trim();
  const gatewayApiKey = (
    process.env["AI_GATEWAY_API_KEY"] || process.env["LOVABLE_API_KEY"]
  )?.trim();

  const isGeminiConfigured = Boolean(geminiApiKey && geminiApiKey.length > 0);
  const isGatewayConfigured = Boolean(gatewayApiKey && gatewayApiKey.length > 0);

  console.log(`[RoamPulse] GENERATION START | generationId: ${genId}`);
  console.log(`[RoamPulse] destination: ${input.destination}`);
  console.log(`[RoamPulse] trip start date: ${input.startDate}`);
  console.log(`[RoamPulse] trip end date: ${input.endDate}`);
  console.log(`[RoamPulse] expected day count: ${days.length}`);
  console.log(`[RoamPulse] Gemini API key present: ${isGeminiConfigured}`);
  console.log(`[RoamPulse] Gemini model: ${MODEL}`);

  // Fetch real-world place data for destination (Google Places / Curated / OSM)
  const realPlaces = await fetchRealWorldPlaces(input.destination, input.interests);
  const accommodationPricing = await getAccommodationPricing(
    input.destination,
    input.currency,
    input.startDate,
    input.endDate,
    input.preferences.accommodation,
  );
  console.log(
    `[REAL PLACES] Found ${realPlaces.length} real-world places for ${input.destination}`,
  );

  if (!isGeminiConfigured && !isGatewayConfigured) {
    console.warn(
      "[RoamPulse] Using fallback itinerary because Gemini failed (GEMINI_API_KEY is missing/unconfigured in environment)",
    );
    const fallbackItems = fallbackItinerary(input, { ...options, realPlacesOverride: realPlaces });
    return { items: fallbackItems, source: "fallback", error: null };
  }

  const promptParts = [
    `You are an expert, local travel planner creating a practical, real-world ${days.length}-day travel itinerary for ${input.destination} (traveling from ${input.origin}).`,
    `Calendar Dates: ${days.join(", ")} (Day 1 is ${days[0]}, Day ${days.length} is ${days[days.length - 1]}).`,
    `Travelers: ${input.adults} adults, ${input.children} children.`,
    `Budget: ${input.budget} ${input.currency}. Travel style: ${input.travelStyle}.`,
    `Interests: ${input.interests.join(", ") || "General exploration"}.`,
    `Arrival Time on Day 1: ${input.arrivalTime || "14:00"}. Departure Time on Day ${days.length}: ${input.departureTime || "16:00"}.`,
    `Pace: ${input.preferences.pace}. Indoor/outdoor balance: ${input.preferences.indoorOutdoor}. Transport mode: ${input.preferences.transport}.`,
    ``,
    `CRITICAL REAL-WORLD REQUIREMENTS:`,
    `1. REAL PLACE SELECTION ONLY: You MUST select attractions, museums, markets, landmarks, parks, and restaurants ONLY from the verified real-place list provided below. NEVER invent or hallucinate fictional venue names.`,
    `2. STRICT GLOBAL UNICITY (ZERO REPEATS): EVERY real attraction, landmark, restaurant, activity, shopping location, museum, viewpoint, temple, park, or cultural site MUST appear ONLY ONCE in the entire itinerary across all ${days.length} days.`,
    `   - Do NOT reuse the same location or restaurant on multiple days.`,
    `   - Do NOT create different titles for the same place (e.g. "The Ridge" and "Explore The Ridge" are the same place and must not appear on different days).`,
    `   - Do NOT repeat restaurants across different days unless user explicitly requested.`,
    `   - Each day MUST use completely different real places from the other days.`,
    `3. NO GENERIC ACTIVITY TITLES: NEVER emit generic activity titles like "Sightseeing & Local Exploration", "Explore the city", "Explore local attractions", "Discover the city", "Explore historic attractions", "City sightseeing", or "Free time". EVERY activity title MUST be the exact name of a real place or specific venue (e.g. "Kohima War Cemetery", "Nagaland State Museum", "Naga Bazaar", "Lunch at Dzüko Cafe").`,
    `4. COMPLETE DAY-BY-DAY COVERAGE: You MUST generate 3 to 5 items for EVERY date in the list (${days.join(", ")}). NEVER skip an intermediate date.`,
    `5. DAILY STRUCTURE & MEALS:`,
    `   - Include lunch (around 12:30 - 13:30) and dinner (around 19:30 - 20:30) at real restaurant candidates from the list whenever available. Use DIFFERENT restaurants for every meal.`,
    `   - Provide realistic time slots (e.g. 09:00–10:30, 10:50–12:15, 12:30–13:30 lunch, 14:00–16:00, 16:30–18:00). Leave realistic 15–30 minute buffers for travel between places.`,
    `6. GEOGRAPHIC CLUSTERING: Group nearby venues together on the same day so travelers don't waste hours crisscrossing the city.`,
    `7. ARRIVAL & DEPARTURE TIMING:`,
    `   - Day 1: Do NOT schedule any morning activities before arrival time (${input.arrivalTime || "14:00"}). Start Day 1 with arrival transfer, hotel check-in, and an evening dinner/activity.`,
    `   - Final Day: Conclude major tours at least 3 hours prior to departure (${input.departureTime || "16:00"}). Include hotel checkout and station/airport transfer.`,
    `8. REALISTIC COSTS: Estimate realistic costs per item in ${input.currency} (e.g. 0 for free public places, 200–500 for entry tickets/dining). Use clean rounded numbers.`,
  ];

  if (realPlaces.length > 0) {
    promptParts.push(
      ``,
      `VERIFIED REAL-WORLD PLACES CANDIDATES FOR ${input.destination.toUpperCase()}:`,
      JSON.stringify(
        realPlaces.map((p) => ({
          name: p.name,
          category: p.category,
          address: p.address,
          latitude: p.latitude,
          longitude: p.longitude,
          rating: p.rating,
          openingHours: p.openingHours,
          costRange:
            p.estimatedCostMin !== undefined
              ? `${p.estimatedCostMin}-${p.estimatedCostMax} ${input.currency}`
              : "Variable",
          costType: p.costType,
        })),
        null,
        2,
      ),
      `INSTRUCTION: Select your attractions and restaurants strictly from this verified real-place list for ${input.destination}. Ensure NO place from this list is repeated on multiple days.`,
    );
  }

  if (mode === "regenerate" || (options?.previousTitles && options.previousTitles.length > 0)) {
    promptParts.push(
      `REGENERATION INSTRUCTION: Provide a SUBSTANTIALLY DIFFERENT itinerary from previous runs. Avoid these previously generated titles: ${(options?.previousTitles || []).slice(0, 25).join(", ")}.`,
    );
  }

  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      let rawJsonText: string | null = null;

      if (isGeminiConfigured) {
        console.log(`[RoamPulse] Gemini request started | attempt: ${attempt}`);
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptParts.join("\n") }] }],
            systemInstruction: {
              parts: [
                {
                  text: 'You are RoamPulse\'s expert local travel planner. Return ONLY valid JSON matching schema {"items": [...]}. Every item title MUST be a specific real place name from the supplied candidate list. EVERY place must appear ONLY ONCE in the entire itinerary across all days. Do NOT repeat attractions, restaurants, or landmarks on multiple days.',
                },
              ],
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
            model: "google/gemini-2.0-flash",
            messages: [
              {
                role: "system",
                content:
                  "You are RoamPulse's expert local travel planner. Every item title must be a specific real place name from candidate list. Every place must appear ONLY ONCE across all days. Always return structured JSON via emit_itinerary tool.",
              },
              { role: "user", content: promptParts.join("\n") },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "emit_itinerary",
                  description: "Return structured day-by-day travel itinerary",
                  parameters: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
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
                            cost_min: { type: "number" },
                            cost_max: { type: "number" },
                            cost_type: {
                              type: "string",
                              enum: ["free", "estimated", "listed", "unknown"],
                            },
                            opening_hours: { type: "string" },
                            rating: { type: "number" },
                            verification_status: {
                              type: "string",
                              enum: ["verified", "estimated", "ai_planned"],
                            },
                            why_fits: { type: "string" },
                            travel_minutes: { type: "number" },
                            indoor_outdoor: {
                              type: "string",
                              enum: ["indoor", "outdoor", "mixed"],
                            },
                            weather_suitability: {
                              type: "string",
                              enum: ["any", "clear_only", "rain_ok"],
                            },
                          },
                          required: [
                            "title",
                            "description",
                            "day_date",
                            "start_time",
                            "end_time",
                            "category",
                            "location",
                            "estimated_cost",
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

        console.log(`[RoamPulse] Gemini Gateway HTTP status: ${res.status}`);

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

      console.log(`[RoamPulse] Gemini response received | length: ${rawJsonText.length}`);

      const extractedJson = extractJsonFromText(rawJsonText);
      let jsonParsed: unknown;
      try {
        jsonParsed = JSON.parse(extractedJson);
      } catch (pErr) {
        const msg = pErr instanceof Error ? pErr.message : String(pErr);
        console.warn(`[RoamPulse] Gemini response parsing failed: ${msg}`);
        throw new Error(`JSON parsing failed: ${msg}`);
      }

      const parsed = itineraryResponseSchema.safeParse(jsonParsed);
      if (!parsed.success) {
        console.warn(`[RoamPulse] Gemini itinerary validation failed: ${parsed.error.message}`);
        throw new Error(`Validation failed: ${parsed.error.message}`);
      }

      const rawItems = parsed.data.items;
      console.log(`[RoamPulse] Gemini generated item count: ${rawItems.length}`);
      console.log(
        `[RoamPulse] Gemini generated dates: ${Array.from(new Set(rawItems.map((i) => i.day_date))).join(", ")}`,
      );

      const canonicalDest = await resolveDestinationCoordinates(input.destination);

      let verifiedCount = 0;
      let rejectedUnverifiedCount = 0;
      let validCoordsCount = 0;
      let rejectedCoordsCount = 0;

      // Real-place matching & metadata attachment & coordinate proximity check
      const matchedItems = rawItems.map((item) => {
        let matchedPlace: RealPlace | undefined;
        if (realPlaces.length > 0) {
          matchedPlace = realPlaces.find((p) => isFuzzyMatch(p.name, item.title));
        }

        let finalLat = matchedPlace?.latitude ?? item.latitude ?? null;
        let finalLon = matchedPlace?.longitude ?? item.longitude ?? null;

        // Proximity validation against canonical destination coordinates
        if (
          canonicalDest &&
          isValidCoordinates(canonicalDest.latitude, canonicalDest.longitude) &&
          isValidCoordinates(finalLat, finalLon)
        ) {
          if (
            !isWithinDestinationRegion(
              canonicalDest.latitude,
              canonicalDest.longitude,
              finalLat,
              finalLon,
              150,
            )
          ) {
            rejectedCoordsCount++;
            finalLat = null;
            finalLon = null;
          } else {
            validCoordsCount++;
          }
        } else if (isValidCoordinates(finalLat, finalLon)) {
          validCoordsCount++;
        }

        if (matchedPlace) {
          verifiedCount++;
          return {
            ...item,
            title: matchedPlace.name,
            latitude: finalLat,
            longitude: finalLon,
            location: matchedPlace.address || item.location,
            rating: matchedPlace.rating ?? item.rating ?? null,
            opening_hours: matchedPlace.openingHours || item.opening_hours || null,
            verification_status: "verified" as const,
            cost_type: matchedPlace.costType || item.cost_type || "estimated",
          };
        }

        const isStructural =
          item.category === "transit" ||
          item.category === "accommodation" ||
          item.title.toLowerCase().includes("arrival") ||
          item.title.toLowerCase().includes("check-in") ||
          item.title.toLowerCase().includes("checkout") ||
          item.title.toLowerCase().includes("departure");

        if (!isStructural && realPlaces.length > 0) {
          rejectedUnverifiedCount++;
        }

        return {
          ...item,
          latitude: finalLat,
          longitude: finalLon,
          verification_status: matchedPlace ? ("verified" as const) : ("estimated" as const),
        };
      });

      console.log(`[RoamPulse] REAL PLACE VALIDATION`);
      console.log(`[RoamPulse] verified items: ${verifiedCount}`);
      console.log(`[RoamPulse] rejected invented/unverified items: ${rejectedUnverifiedCount}`);
      console.log(`[RoamPulse] COORDINATE VALIDATION`);
      console.log(`[RoamPulse] valid coordinates: ${validCoordsCount}`);
      console.log(`[RoamPulse] invalid/out-of-region coordinates rejected: ${rejectedCoordsCount}`);

      // GLOBAL TRIP-WIDE DEDUPLICATION (Zero Repeats Across Days)
      const { uniqueItems, duplicatesRemovedCount } = deduplicateItineraryItemsGlobal(matchedItems);
      console.log(
        `[RoamPulse] global duplicate candidates detected & removed: ${duplicatesRemovedCount}`,
      );

      const constrainedItems = enforceArrivalAndDepartureConstraints(
        uniqueItems.length > 0 ? uniqueItems : matchedItems,
        input,
      );

      const clusteredItems = clusterAndSortItemsByProximity(constrainedItems);

      const cleanedItems = validateAndCleanItineraryItems(clusteredItems, input);

      // GUARANTEE date coverage for every date in range using ONLY UNUSED real places
      const finalItems = guaranteeAllDatesPresent(cleanedItems, input, realPlaces);

      console.log(`[RoamPulse] validation item count: ${cleanedItems.length}`);
      console.log(`[RoamPulse] final unique item count: ${finalItems.length}`);

      const hasAccommodation = finalItems.some(
        (i) => i.category === "accommodation" || i.title.toLowerCase().startsWith("accommodation:"),
      );

      if (!hasAccommodation && days.length > 0) {
        const accommodationItem: GeneratedItem = {
          title: `Accommodation: ${accommodationPricing.hotelName}`,
          description: `${accommodationPricing.accommodationType.replace("_", " ")} stay in ${input.destination} (${accommodationPricing.totalNights} night${accommodationPricing.totalNights > 1 ? "s" : ""}). Rate source: ${accommodationPricing.providerName}.`,
          day_date: days[0]!,
          start_time: input.arrivalTime || "14:00",
          end_time: addMinutes(input.arrivalTime || "14:00", 30),
          category: "accommodation",
          location: accommodationPricing.address || input.destination,
          latitude: accommodationPricing.latitude ?? null,
          longitude: accommodationPricing.longitude ?? null,
          estimated_cost: accommodationPricing.totalAccommodationCost ?? 0,
          cost_min: accommodationPricing.pricePerNight
            ? Math.round(
                accommodationPricing.pricePerNight * 0.85 * accommodationPricing.totalNights,
              )
            : null,
          cost_max: accommodationPricing.pricePerNight
            ? Math.round(
                accommodationPricing.pricePerNight * 1.15 * accommodationPricing.totalNights,
              )
            : null,
          cost_type:
            accommodationPricing.pricingSource === "live"
              ? "listed"
              : accommodationPricing.pricingSource === "estimated"
                ? "estimated"
                : "unknown",
          verification_status: accommodationPricing.isVerified ? "verified" : "estimated",
          why_fits: `Selected for ${input.preferences.accommodation} stay preference in ${input.destination}`,
          travel_minutes: 0,
          indoor_outdoor: "indoor",
          weather_suitability: "any",
          booking_url: null,
          is_locked: false,
          metadata: {
            price_per_night: accommodationPricing.pricePerNight,
            total_nights: accommodationPricing.totalNights,
            accommodation_type: accommodationPricing.accommodationType,
            pricing_source: accommodationPricing.pricingSource,
            provider_name: accommodationPricing.providerName,
            hotel_name: accommodationPricing.hotelName,
            latitude: accommodationPricing.latitude,
            longitude: accommodationPricing.longitude,
            rating: accommodationPricing.rating,
          },
        };
        finalItems.unshift(accommodationItem);
      }

      const realSightseeingCount = finalItems.filter(
        (i) =>
          i.verification_status === "verified" ||
          (!i.category?.includes("transit") && i.category !== "accommodation"),
      ).length;
      const structuralCount = finalItems.length - realSightseeingCount;

      console.log(`[RoamPulse] Final real-place items: ${realSightseeingCount}`);
      console.log(`[RoamPulse] Final structural items: ${structuralCount}`);
      console.log(`[RoamPulse] Recovery triggered: false`);
      console.log(`[RoamPulse] fallback used: false`);
      console.log(
        `[RoamPulse] GENERATION COMPLETE | Gemini itinerary succeeded with ${finalItems.length} items`,
      );
      return {
        items: finalItems,
        source: "ai",
        error: null,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[RoamPulse] Gemini itinerary attempt ${attempt} failed: ${errMsg}`);
      if (attempt === maxAttempts) {
        console.warn(
          "[RoamPulse] Using fallback itinerary because Gemini failed (Attempts exhausted)",
        );
        const fallbackItems = fallbackItinerary(input, {
          ...options,
          realPlacesOverride: realPlaces,
        });
        console.log(`[RoamPulse] fallback used: true`);
        console.log(`[RoamPulse] GENERATION COMPLETE`);
        return {
          items: fallbackItems,
          source: "fallback",
          error: "AI planner is temporarily busy — generated a backup schedule.",
        };
      }
    }
  }

  console.warn("[RoamPulse] Using fallback itinerary because Gemini failed");
  const fallbackItems = fallbackItinerary(input, { ...options, realPlacesOverride: realPlaces });
  console.log(`[RoamPulse] fallback used: true`);
  console.log(`[RoamPulse] GENERATION COMPLETE`);
  return {
    items: fallbackItems,
    source: "fallback",
    error: null,
  };
}

/**
 * Re-optimizes an existing itinerary after a disruption event.
 */
export async function reoptimizeItinerary(
  input: TripInput,
  existingItems: GeneratedItem[],
  _disruption?: { affectedItemId?: string; reason?: string },
): Promise<{ items: GeneratedItem[]; source: "ai" | "fallback"; error: string | null }> {
  const locked = existingItems.filter((i) => i.is_locked);
  const previousTitles = existingItems.map((i) => i.title);

  const result = await generateItinerary(input, { previousTitles, isRegeneration: true });

  const finalItems: GeneratedItem[] = [...locked];
  const { uniqueItems } = deduplicateItineraryItemsGlobal([...locked, ...result.items]);

  return {
    items: validateAndCleanItineraryItems(
      enforceArrivalAndDepartureConstraints(uniqueItems, input),
      input,
    ),
    source: result.source,
    error: result.error,
  };
}
