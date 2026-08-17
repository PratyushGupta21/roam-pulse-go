import { itineraryResponseSchema, type GeneratedItem, type TripInput } from "./domain";
import { addMinutes, formatDateStr, minutesOf, parseDateParts } from "./format";
import { fetchRealWorldPlaces } from "./places/real-places.server";

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
      /\b(visit|explore|experience|tour|attend|go to|see|famous|historic|historical|local|traditional|morning|evening|afternoon|night|day \d+|discover|stroll|walk|around)\b/g,
      "",
    )
    .replace(/[^a-z0-9]/g, "")
    .trim();
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
 * Checks if a candidate activity title/location is a duplicate or near-duplicate of any previously planned activity.
 */
export function isDuplicateOrNearDuplicate(
  candidate: GeneratedItem,
  existingItems: GeneratedItem[],
): boolean {
  const candKey = generateUniquenessKey(candidate);
  const candNormTitle = normalizeTitle(candidate.title);

  if (candNormTitle.length < 3) return false;

  return existingItems.some((existing) => {
    const existKey = generateUniquenessKey(existing);
    if (candKey === existKey) return true;

    const existNormTitle = normalizeTitle(existing.title);
    if (existNormTitle.length < 3) return false;

    // Direct title string equality or substring match
    if (candNormTitle === existNormTitle) return true;
    if (
      candNormTitle.length > 5 &&
      existNormTitle.length > 5 &&
      (candNormTitle.includes(existNormTitle) || existNormTitle.includes(candNormTitle))
    ) {
      return true;
    }

    // Category + location duplicate match across days
    if (
      candidate.location &&
      existing.location &&
      normalizeTitle(candidate.location) === normalizeTitle(existing.location) &&
      candidate.category.toLowerCase() === existing.category.toLowerCase() &&
      candidate.category.toLowerCase() !== "food" &&
      candidate.category.toLowerCase() !== "transit"
    ) {
      return true;
    }

    return false;
  });
}

/**
 * Validates and cleans itinerary items against trip constraints (date boundary, start < end, non-negative costs).
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

      const cost = Math.max(0, Math.round(Number(item.estimated_cost) || 0));

      return {
        ...item,
        title: item.title.trim(),
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
        verification_status: item.verification_status || (item.rating ? "verified" : "estimated"),
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
 * Evaluates candidate activity quality against user preferences, interests, pacing, and budget.
 */
export function scoreCandidateActivity(
  item: GeneratedItem,
  input: TripInput,
  existingTripItems: GeneratedItem[],
  dayItemsCount: number,
): number {
  let score = 50;

  // 1. Interest Matching (+30 pts)
  const userInterests = (input.interests || []).map((i) => i.toLowerCase());
  const matchesInterest = userInterests.some(
    (interest) =>
      item.category.toLowerCase().includes(interest) || item.title.toLowerCase().includes(interest),
  );
  if (matchesInterest) score += 30;

  // 2. Destination Specificity (+20 pts)
  if (item.location && item.location.toLowerCase().includes(input.destination.toLowerCase())) {
    score += 20;
  }

  // 3. Uniqueness (+25 pts)
  if (!isDuplicateOrNearDuplicate(item, existingTripItems)) {
    score += 25;
  } else {
    score -= 100;
  }

  // 4. Daily Pacing (Optimal: 3-5 activities per day)
  if (dayItemsCount >= 5) score -= 40;

  // 5. Pricing Sanity (+15 pts)
  if (
    item.estimated_cost > 0 ||
    item.title.toLowerCase().includes("free") ||
    item.title.toLowerCase().includes("viewpoint")
  ) {
    score += 15;
  }

  return score;
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
      // DAY 1 ARRIVAL DAY: Remove activities before arrival time
      const validDay1Items = dayItems.filter((i) => minutesOf(i.start_time) >= arrMins);

      // Ensure Day 1 starts with Arrival & Check-in
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
          cost_type: "free",
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
      // FINAL DAY DEPARTURE DAY: Enforce 3-hour buffer before departure time
      const latestAllowedMins = Math.max(10 * 60, depMins - 180);
      const validLastDayItems = dayItems.filter((i) => minutesOf(i.end_time) <= latestAllowedMins);

      processed.push(...validLastDayItems);

      // Add Checkout & Departure Transfer
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
        cost_type: "free",
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
      // FULL SIGHTSEEING DAYS
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
}

/**
 * Calculates overlap ratio between new generated activity titles and previous activity titles.
 */
export function calculateTitleOverlapRatio(
  newItems: GeneratedItem[],
  previousTitles?: string[],
): number {
  if (!previousTitles || previousTitles.length === 0 || newItems.length === 0) return 0;
  const prevSet = new Set(previousTitles.map((t) => normalizeTitle(t)));
  let matches = 0;
  for (const item of newItems) {
    const norm = normalizeTitle(item.title);
    if (norm.length > 2 && prevSet.has(norm)) {
      matches++;
    }
  }
  return matches / newItems.length;
}

/**
 * Rich Dynamic Fallback Itinerary Generator with Multi-Variate Activity Pools.
 * Dynamic seed rotation ensures regeneration produces fresh schedules on every run even when AI is offline.
 */
export function fallbackItinerary(
  input: TripInput,
  options?: GenerateItineraryOptions,
): GeneratedItem[] {
  const days = dayList(input.startDate, input.endDate);

  let seed = options?.seed ?? 0;
  if (!seed && options?.generationId) {
    seed = options.generationId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  } else if (!seed && options?.previousTitles?.length) {
    seed = options.previousTitles.length * 13 + 3;
  }
  if (!seed) {
    seed = Date.now();
  }

  function pseudoRandom(s: number) {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  }

  let localSeed = seed;

  const morningPool = [
    {
      title: `Historic District & Old Town Morning Walk`,
      category: "culture",
      mins: 120,
      cost: 350,
      io: "outdoor" as const,
    },
    {
      title: `Artisanal Coffee Roastery & Local Bakery Breakfast`,
      category: "food",
      mins: 60,
      cost: 450,
      io: "indoor" as const,
    },
    {
      title: `Scenic Sunrise Viewpoint & Nature Promenade`,
      category: "sightseeing",
      mins: 90,
      cost: 0,
      io: "outdoor" as const,
    },
    {
      title: `Central Heritage Museum & Fine Art Gallery`,
      category: "culture",
      mins: 120,
      cost: 600,
      io: "indoor" as const,
    },
    {
      title: `Bustling Morning Produce & Craft Market`,
      category: "shopping",
      mins: 105,
      cost: 400,
      io: "outdoor" as const,
    },
    {
      title: `Botanical Sanctuary & Sculpture Garden`,
      category: "nature",
      mins: 90,
      cost: 300,
      io: "outdoor" as const,
    },
    {
      title: `Royal Palace Courtyard & Architecture Tour`,
      category: "history",
      mins: 135,
      cost: 800,
      io: "indoor" as const,
    },
    {
      title: `Riverside / Coastal Morning Promenade Trek`,
      category: "adventure",
      mins: 105,
      cost: 0,
      io: "outdoor" as const,
    },
    {
      title: `Ancient Temple Grounds & Spiritual Walk`,
      category: "culture",
      mins: 90,
      cost: 250,
      io: "outdoor" as const,
    },
    {
      title: `Neighborhood Delicatessen & Breakfast Tasting`,
      category: "food",
      mins: 60,
      cost: 500,
      io: "indoor" as const,
    },
  ];

  const afternoonPool = [
    {
      title: `Authentic Regional Lunch at Courtyard Restaurant`,
      category: "food",
      mins: 75,
      cost: 950,
      io: "indoor" as const,
    },
    {
      title: `Traditional Street Food & Alleyway Sampling Tour`,
      category: "food",
      mins: 90,
      cost: 750,
      io: "outdoor" as const,
    },
    {
      title: `Artisan Textile & Pottery Workshop Exhibition`,
      category: "culture",
      mins: 120,
      cost: 550,
      io: "indoor" as const,
    },
    {
      title: `Hilltop Panoramic Observation Deck`,
      category: "sightseeing",
      mins: 90,
      cost: 400,
      io: "outdoor" as const,
    },
    {
      title: `Independent Craft Boutiques & Souvenir Bazaar`,
      category: "shopping",
      mins: 120,
      cost: 650,
      io: "indoor" as const,
    },
    {
      title: `Historical Fortress & Ancient Citadel Exploration`,
      category: "history",
      mins: 150,
      cost: 700,
      io: "outdoor" as const,
    },
    {
      title: `Quiet Shade Garden & Heritage Library Rest`,
      category: "wellness",
      mins: 90,
      cost: 0,
      io: "indoor" as const,
    },
    {
      title: `Lakeside / Waterfront Afternoon Cafe & Refreshment`,
      category: "food",
      mins: 60,
      cost: 450,
      io: "indoor" as const,
    },
    {
      title: `Cultural Heritage Center & Photography Spot`,
      category: "culture",
      mins: 90,
      cost: 300,
      io: "outdoor" as const,
    },
    {
      title: `Nature Reserve Trail & Wildlife Overlook`,
      category: "adventure",
      mins: 120,
      cost: 500,
      io: "outdoor" as const,
    },
  ];

  const eveningPool = [
    {
      title: `Sunset Promenade & Golden Hour Viewpoint`,
      category: "sightseeing",
      mins: 75,
      cost: 0,
      io: "outdoor" as const,
    },
    {
      title: `Welcome Celebration Dinner at Heritage Bistro`,
      category: "food",
      mins: 105,
      cost: 1450,
      io: "indoor" as const,
    },
    {
      title: `Traditional Folk Music & Dance Performance`,
      category: "culture",
      mins: 90,
      cost: 1100,
      io: "indoor" as const,
    },
    {
      title: `Panoramic Rooftop Restaurant & Dinner`,
      category: "food",
      mins: 105,
      cost: 1650,
      io: "indoor" as const,
    },
    {
      title: `Bustling Evening Night Market & Street Bites`,
      category: "food",
      mins: 120,
      cost: 850,
      io: "outdoor" as const,
    },
    {
      title: `Illuminated Old Town Heritage Lantern Walk`,
      category: "history",
      mins: 90,
      cost: 350,
      io: "outdoor" as const,
    },
    {
      title: `Speakeasy Lounge & Specialty Beverage Tasting`,
      category: "food",
      mins: 90,
      cost: 1200,
      io: "indoor" as const,
    },
    {
      title: `Farewell Gala Dinner at Fine Dining Estate`,
      category: "food",
      mins: 120,
      cost: 1950,
      io: "indoor" as const,
    },
  ];

  const prevSet = new Set((options?.previousTitles || []).map((t) => normalizeTitle(t)));
  const existingItems: GeneratedItem[] = [];

  const rawItems = days.flatMap((day, dayIndex) => {
    const dayItems: typeof morningPool = [];

    // Morning item selection
    let mIdx = Math.floor(pseudoRandom(localSeed++) * morningPool.length);
    let morningItem = morningPool[mIdx]!;
    for (let shift = 0; shift < 4; shift++) {
      const norm = normalizeTitle(`${morningItem.title} (${input.destination})`);
      if (prevSet.has(norm)) {
        mIdx = (mIdx + 1) % morningPool.length;
        morningItem = morningPool[mIdx]!;
      }
    }
    dayItems.push(morningItem);

    // Afternoon item selection
    let aIdx = Math.floor(pseudoRandom(localSeed++) * afternoonPool.length);
    let afternoonItem = afternoonPool[aIdx]!;
    for (let shift = 0; shift < 4; shift++) {
      const norm = normalizeTitle(`${afternoonItem.title} (${input.destination})`);
      if (prevSet.has(norm)) {
        aIdx = (aIdx + 1) % afternoonPool.length;
        afternoonItem = afternoonPool[aIdx]!;
      }
    }
    dayItems.push(afternoonItem);

    // Evening item selection
    let eIdx = Math.floor(pseudoRandom(localSeed++) * eveningPool.length);
    let eveningItem = eveningPool[eIdx]!;
    for (let shift = 0; shift < 4; shift++) {
      const norm = normalizeTitle(`${eveningItem.title} (${input.destination})`);
      if (prevSet.has(norm)) {
        eIdx = (eIdx + 1) % eveningPool.length;
        eveningItem = eveningPool[eIdx]!;
      }
    }
    dayItems.push(eveningItem);

    let currentTimeMins = 9 * 60;
    if (dayIndex === 0) {
      currentTimeMins = minutesOf(input.arrivalTime || "14:00") + 60;
    }

    return dayItems.map((t, idx) => {
      const startH = String(Math.floor(currentTimeMins / 60)).padStart(2, "0");
      const startM = String(currentTimeMins % 60).padStart(2, "0");
      const startTime = `${startH}:${startM}`;
      const endTime = addMinutes(startTime, t.mins);
      currentTimeMins += t.mins + 30;

      let itemTitle = `${t.title} (${input.destination})`;

      const itemCost = Math.round(t.cost * (input.currency === "USD" ? 0.012 : 1));
      const candItem: GeneratedItem = {
        title: itemTitle,
        description: `Explore ${t.title.toLowerCase()} in ${input.destination}, curated for your ${input.travelStyle} trip.`,
        day_date: day,
        start_time: startTime,
        end_time: endTime,
        category: t.category,
        location: input.destination,
        latitude: null,
        longitude: null,
        estimated_cost: itemCost,
        cost_type: itemCost === 0 ? "free" : "estimated",
        verification_status: "estimated",
        travel_minutes: 20,
        indoor_outdoor: t.io,
        weather_suitability: t.io === "outdoor" ? ("clear_only" as const) : ("any" as const),
        booking_url: null,
        is_locked: false,
        uniqueness_key: generateUniquenessKey({
          title: itemTitle,
          category: t.category,
          location: input.destination,
        }),
      };

      if (isDuplicateOrNearDuplicate(candItem, existingItems)) {
        itemTitle = `${t.title} · Day ${dayIndex + 1} #${idx + 1}`;
        candItem.title = itemTitle;
        candItem.uniqueness_key = generateUniquenessKey({
          title: itemTitle,
          category: t.category,
          location: input.destination,
        });
      }

      existingItems.push(candItem);
      return candItem;
    });
  });

  return validateAndCleanItineraryItems(
    enforceArrivalAndDepartureConstraints(rawItems, input),
    input,
  );
}

/**
 * Calls the RoamPulse AI gateway to generate a highly diverse, destination-specific itinerary.
 */
/**
 * Calls the RoamPulse AI gateway or Gemini API to generate a real-world, destination-specific itinerary.
 */
export async function generateItinerary(
  input: TripInput,
  options?: GenerateItineraryOptions,
): Promise<{ items: GeneratedItem[]; source: "ai" | "fallback"; error: string | null }> {
  const mode = options?.mode || (options?.isRegeneration ? "regenerate" : "initial");
  const genId = options?.generationId || crypto.randomUUID();

  const geminiApiKey = process.env["GEMINI_API_KEY"]?.trim();
  const gatewayApiKey = (
    process.env["AI_GATEWAY_API_KEY"] || process.env["LOVABLE_API_KEY"]
  )?.trim();

  const isGeminiConfigured = Boolean(geminiApiKey && geminiApiKey.length > 0);
  const isGatewayConfigured = Boolean(gatewayApiKey && gatewayApiKey.length > 0);

  console.log(
    `[REGENERATE] request received | destination: ${input.destination} | mode: ${mode} | generationId: ${genId}`,
  );
  console.log(
    `[REGENERATE] Gemini API: ${isGeminiConfigured ? "configured" : "missing"} | AI Gateway: ${isGatewayConfigured ? "configured" : "missing"}`,
  );
  console.log(
    `[REGENERATE] previous titles count: ${options?.previousTitles?.length ?? 0} | locked items count: ${options?.lockedItems?.length ?? 0}`,
  );

  if (!isGeminiConfigured && !isGatewayConfigured) {
    console.log(
      `[REGENERATE] provider: FALLBACK | reason: No AI API keys configured | generationId: ${genId}`,
    );
    const items = fallbackItinerary(input, options);
    console.log(
      `[REGENERATE] generatedItems: ${items.length} | source: fallback | generationId: ${genId}`,
    );
    return { items, source: "fallback", error: null };
  }

  // Fetch real-world place data for destination (Level 1 / Level 2)
  const realPlaces = await fetchRealWorldPlaces(input.destination, input.interests);
  console.log(
    `[REAL PLACES] Found ${realPlaces.length} real-world places for ${input.destination}`,
  );

  const days = dayList(input.startDate, input.endDate);

  const promptParts = [
    `Create a practical, real-world ${days.length}-day travel itinerary for ${input.destination} (traveling from ${input.origin}).`,
    `Calendar Dates: ${days.join(", ")} (Day 1 is ${days[0]}, Day ${days.length} is ${days[days.length - 1]}).`,
    `Travelers: ${input.adults} adults, ${input.children} children.`,
    `Budget: ${input.budget} ${input.currency}. Travel style: ${input.travelStyle}.`,
    `Interests: ${input.interests.join(", ") || "General exploration"}.`,
    `Arrival Time on Day 1: ${input.arrivalTime || "14:00"}. Departure Time on Day ${days.length}: ${input.departureTime || "16:00"}.`,
    `Pace: ${input.preferences.pace}. Indoor/outdoor balance: ${input.preferences.indoorOutdoor}. Transport: ${input.preferences.transport}.`,
    `STRICT ARRIVAL & DEPARTURE TIMING RULES:`,
    `1. DAY 1 ARRIVAL: Do NOT schedule any activities before ${input.arrivalTime || "14:00"}. Start Day 1 with Arrival and Hotel Check-in.`,
    `2. FINAL DAY DEPARTURE: Do NOT schedule any major tours within 3 hours of departure (${input.departureTime || "16:00"}). Include Checkout and Transit.`,
    `STRICT REAL-WORLD PRICING & COST RULES:`,
    `1. NEVER state estimated costs as confirmed exact prices. Mark price type explicitly ("free", "estimated", or "listed").`,
    `2. If an activity is genuinely free (public viewpoint, park, beach, promenade, photo spot), set estimated_cost: 0 and cost_type: "free".`,
    `3. If an activity has a cost, provide realistic non-zero cost estimates in ${input.currency} (e.g. cost_min: 200, cost_max: 500, estimated_cost: 350, cost_type: "estimated").`,
    `STRICT GEOGRAPHIC & REAL PLACE RULES:`,
    `1. Use REAL-WORLD attractions, restaurants, markets, and neighborhood locations in ${input.destination}.`,
    `2. Cluster activities geographically on the same day to minimize unnecessary travel time across town.`,
    `3. Respect typical opening hours (e.g. opening_hours: "09:00 - 17:30").`,
    `4. PACING: Schedule 3 to 5 meaningful activities per day plus meals and free time.`,
  ];

  if (realPlaces.length > 0) {
    promptParts.push(
      `REAL-WORLD DESTINATION PLACES DATA FOR ${input.destination.toUpperCase()}:`,
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
      `INSTRUCTION: Prefer using these verified real places for major attractions and dining in ${input.destination}.`,
    );
  }

  if (mode === "regenerate" || (options?.previousTitles && options.previousTitles.length > 0)) {
    promptParts.push(
      `REGENERATION INSTRUCTION: Provide a SUBSTANTIALLY DIFFERENT itinerary from previous runs. Avoid these previously generated titles: ${(options?.previousTitles || []).slice(0, 25).join(", ")}.`,
    );
  }

  if (options?.lockedItems && options.lockedItems.length > 0) {
    const lockedDescriptions = options.lockedItems.map(
      (l) => `${l.title} on ${l.day_date} at ${l.start_time}`,
    );
    promptParts.push(
      `PRESERVED LOCKED ACTIVITIES: Include these locked activities: ${lockedDescriptions.join(", ")}.`,
    );
  }

  let attempt = 1;
  const maxAttempts = 2;

  while (attempt <= maxAttempts) {
    try {
      let rawJsonText: string | null = null;

      // Primary AI Execution: Direct Gemini API
      if (isGeminiConfigured) {
        console.log(
          `[REGENERATE] Calling Google Gemini API | attempt: ${attempt} | generationId: ${genId}`,
        );
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptParts.join("\n") }] }],
            systemInstruction: {
              parts: [
                {
                  text: 'You are RoamPulse\'s real-world travel planner. Return JSON matching object schema {"items": [...]}. Every item must have real-world place info, realistic timing, cost ranges, opening_hours, and rating if available.',
                },
              ],
            },
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        });

        if (res.ok) {
          const geminiData = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          rawJsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
        } else {
          console.warn(`[REGENERATE] Gemini API returned HTTP ${res.status}`);
        }
      }

      // Secondary AI Execution: Gateway Fallback if Gemini failed/unconfigured
      if (!rawJsonText && isGatewayConfigured) {
        console.log(
          `[REGENERATE] Calling AI Gateway | attempt: ${attempt} | generationId: ${genId}`,
        );
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { authorization: `Bearer ${gatewayApiKey}`, "content-type": "application/json" },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              {
                role: "system",
                content:
                  "You are RoamPulse's expert local travel planner. Always return structured JSON via emit_itinerary tool.",
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

      const parsed = itineraryResponseSchema.safeParse(JSON.parse(rawJsonText));
      if (!parsed.success) {
        throw new Error("Schema validation failed on AI output: " + parsed.error.message);
      }

      // Advanced Post-processing Deduplication & Constraint Enforcement
      const existingItems: GeneratedItem[] = [];
      const validItems: GeneratedItem[] = [];

      for (const item of parsed.data.items) {
        item.uniqueness_key = generateUniquenessKey(item);
        if (!isDuplicateOrNearDuplicate(item, existingItems)) {
          existingItems.push(item);
          validItems.push(item);
        }
      }

      const constrainedItems = enforceArrivalAndDepartureConstraints(
        validItems.length > 0 ? validItems : parsed.data.items,
        input,
      );

      const finalItems = validateAndCleanItineraryItems(constrainedItems, input);

      const overlap = calculateTitleOverlapRatio(finalItems, options?.previousTitles);
      if (
        mode === "regenerate" &&
        options?.previousTitles &&
        options.previousTitles.length > 0 &&
        attempt < maxAttempts
      ) {
        if (overlap > 0.6) {
          console.log(
            `[REGENERATE] title overlap too high (${Math.round(overlap * 100)}%) — retrying | generationId: ${genId}`,
          );
          attempt++;
          continue;
        }
      }

      console.log(
        `[REGENERATE] AI request succeeded | count: ${finalItems.length} | generationId: ${genId}`,
      );
      return {
        items: finalItems,
        source: "ai",
        error: null,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(
        `[REGENERATE] AI request failed | reason: ${errMsg} | fallback activated | generationId: ${genId}`,
      );
      const items = fallbackItinerary(input, options);
      return {
        items,
        source: "fallback",
        error: "AI planner is temporarily busy — generated a diverse backup schedule.",
      };
    }
  }

  const items = fallbackItinerary(input, options);
  return {
    items,
    source: "fallback",
    error: null,
  };
}

/**
 * Re-optimizes an existing itinerary after a disruption event.
 * Preserves locked items, adjusts schedules, and replaces invalid activities.
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
  for (const item of result.items) {
    if (!isDuplicateOrNearDuplicate(item, finalItems)) {
      finalItems.push(item);
    }
  }

  return {
    items: validateAndCleanItineraryItems(
      enforceArrivalAndDepartureConstraints(finalItems, input),
      input,
    ),
    source: result.source,
    error: result.error,
  };
}
