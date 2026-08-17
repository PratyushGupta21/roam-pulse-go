import { itineraryResponseSchema, type GeneratedItem, type TripInput } from "./domain";
import { addMinutes, formatDateStr, minutesOf, parseDateParts } from "./format";
import { fetchRealWorldPlaces, type RealPlace } from "./places/real-places.server";
import { getAccommodationPricing } from "./hotels/hotel-pricing.server";

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

    // Sort flexible activities by nearest neighbor
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

    if (candNormTitle === existNormTitle) return true;
    if (
      candNormTitle.length > 5 &&
      existNormTitle.length > 5 &&
      (candNormTitle.includes(existNormTitle) || existNormTitle.includes(candNormTitle))
    ) {
      return true;
    }

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
 * Evaluates candidate activity quality against user preferences, interests, pacing, and budget.
 */
export function scoreCandidateActivity(
  item: GeneratedItem,
  input: TripInput,
  existingTripItems: GeneratedItem[],
  dayItemsCount: number,
): number {
  let score = 50;

  const userInterests = (input.interests || []).map((i) => i.toLowerCase());
  const matchesInterest = userInterests.some(
    (interest) =>
      item.category.toLowerCase().includes(interest) || item.title.toLowerCase().includes(interest),
  );
  if (matchesInterest) score += 30;

  if (item.location && item.location.toLowerCase().includes(input.destination.toLowerCase())) {
    score += 20;
  }

  if (!isDuplicateOrNearDuplicate(item, existingTripItems)) {
    score += 25;
  } else {
    score -= 100;
  }

  if (dayItemsCount >= 5) score -= 40;

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
 * Rich Dynamic Fallback Itinerary Generator with Real-Place Priority.
 */
export function fallbackItinerary(
  input: TripInput,
  options?: GenerateItineraryOptions,
): GeneratedItem[] {
  const days = dayList(input.startDate, input.endDate);
  const places = options?.realPlacesOverride || [];

  const rawItems: GeneratedItem[] = [];

  days.forEach((day, dayIndex) => {
    let currentTimeMins = 9 * 60;
    if (dayIndex === 0) {
      currentTimeMins = minutesOf(input.arrivalTime || "14:00") + 120;
    }

    // Pick 2-3 real places for this day if available
    const dayPlaces = places.slice(dayIndex * 3, dayIndex * 3 + 3);

    if (dayPlaces.length > 0) {
      dayPlaces.forEach((p, idx) => {
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
      // Generic backup items if no real places available
      const backupTitle = `Sightseeing & Local Exploration Day ${dayIndex + 1}`;
      rawItems.push({
        title: backupTitle,
        description: `Explore historic attractions and dining in ${input.destination}.`,
        day_date: day,
        start_time: "10:00",
        end_time: "13:00",
        category: "culture",
        location: input.destination,
        latitude: null,
        longitude: null,
        estimated_cost: Math.round(input.currency === "USD" ? 15 : 800),
        cost_type: "estimated",
        verification_status: "estimated",
        travel_minutes: 20,
        indoor_outdoor: "mixed",
        weather_suitability: "any",
        booking_url: null,
        is_locked: false,
        uniqueness_key: generateUniquenessKey({ title: backupTitle, location: input.destination }),
      });
    }
  });

  return validateAndCleanItineraryItems(
    enforceArrivalAndDepartureConstraints(rawItems, input),
    input,
  );
}

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
    const items = fallbackItinerary(input, { ...options, realPlacesOverride: realPlaces });
    return { items, source: "fallback", error: null };
  }

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
    `STRICT REAL-PLACE MANDATE:`,
    `1. Use ONLY places supplied in the verified real-place context when a real place is required. Do NOT invent attractions, restaurants, hotels, museums, cafés, or landmarks.`,
    `2. Every attraction and dining stop must represent a real physical venue in ${input.destination}.`,
    `3. PACING: Schedule 2 to 4 major activities per day plus lunch and dinner. Do not overload days.`,
    `4. GEOGRAPHY & CLUSTERING: Cluster places on the same day in the same district or neighborhood to eliminate unnecessary transit across the city.`,
    `5. OPENING HOURS: Respect opening hours provided in the context (e.g. 09:00 - 17:30). Never schedule visits when a place is closed.`,
    `STRICT REAL-WORLD PRICING RULES:`,
    `1. Mark price type explicitly ("free", "estimated", or "listed").`,
    `2. If an activity is genuinely free (public viewpoint, park, beach, photo spot), set estimated_cost: 0 and cost_type: "free".`,
    `3. If an activity has a cost, provide realistic non-zero cost estimates in ${input.currency} (e.g. cost_min: 200, cost_max: 500, estimated_cost: 350, cost_type: "estimated").`,
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
      `INSTRUCTION: Select your attractions and restaurants strictly from this verified real-place list for ${input.destination}.`,
    );
  }

  if (mode === "regenerate" || (options?.previousTitles && options.previousTitles.length > 0)) {
    promptParts.push(
      `REGENERATION INSTRUCTION: Provide a SUBSTANTIALLY DIFFERENT itinerary from previous runs. Avoid these previously generated titles: ${(options?.previousTitles || []).slice(0, 25).join(", ")}.`,
    );
  }

  const attempt = 1;
  const maxAttempts = 2;

  while (attempt <= maxAttempts) {
    try {
      let rawJsonText: string | null = null;

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
                  text: 'You are RoamPulse\'s real-world travel planner. Return JSON matching object schema {"items": [...]}. Every item must use real-world place info, realistic timing, cost ranges, opening_hours, and rating if available.',
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
        }
      }

      if (!rawJsonText && isGatewayConfigured) {
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

      // Real-place matching & metadata attachment
      const matchedItems = parsed.data.items.map((item) => {
        if (realPlaces.length > 0) {
          const matched = realPlaces.find((p) => {
            const normP = normalizeTitle(p.name);
            const normI = normalizeTitle(item.title);
            return (
              normP === normI ||
              (normP.length > 4 &&
                normI.length > 4 &&
                (normI.includes(normP) || normP.includes(normI)))
            );
          });

          if (matched) {
            return {
              ...item,
              title: matched.name,
              latitude: matched.latitude ?? item.latitude ?? null,
              longitude: matched.longitude ?? item.longitude ?? null,
              location: matched.address || item.location,
              rating: matched.rating ?? item.rating ?? null,
              opening_hours: matched.openingHours || item.opening_hours || null,
              verification_status: "verified" as const,
              cost_type: matched.costType || item.cost_type || "estimated",
            };
          }
        }
        return item;
      });

      const existingItems: GeneratedItem[] = [];
      const validItems: GeneratedItem[] = [];

      for (const item of matchedItems) {
        item.uniqueness_key = generateUniquenessKey(item);
        if (!isDuplicateOrNearDuplicate(item, existingItems)) {
          existingItems.push(item);
          validItems.push(item);
        }
      }

      const constrainedItems = enforceArrivalAndDepartureConstraints(
        validItems.length > 0 ? validItems : matchedItems,
        input,
      );

      // Geographic proximity clustering & sorting per day
      const clusteredItems = clusterAndSortItemsByProximity(constrainedItems);

      const finalItems = validateAndCleanItineraryItems(clusteredItems, input);

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
      const items = fallbackItinerary(input, { ...options, realPlacesOverride: realPlaces });
      return {
        items,
        source: "fallback",
        error: "AI planner is temporarily busy — generated a diverse backup schedule.",
      };
    }
  }

  const items = fallbackItinerary(input, { ...options, realPlacesOverride: realPlaces });
  return {
    items,
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
