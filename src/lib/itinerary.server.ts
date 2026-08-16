import { itineraryResponseSchema, type GeneratedItem, type TripInput } from "./domain";
import { addMinutes, formatDateStr, minutesOf, parseDateParts } from "./format";

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
    .replace(/\b(visit|explore|experience|tour|attend|go to|see|famous|historic|historical|local|traditional|morning|evening|afternoon|night|day \d+|discover|stroll|walk|around)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Generates a unique deterministic key for an itinerary item.
 */
export function generateUniquenessKey(item: { title: string; category?: string; location?: string }): string {
  const normTitle = normalizeTitle(item.title);
  const normLoc = item.location ? normalizeTitle(item.location) : "";
  const cat = (item.category || "activity").toLowerCase().trim();
  return `${normTitle}_${cat}_${normLoc}`;
}

/**
 * Checks if a candidate activity title/location is a duplicate or near-duplicate of any previously planned activity.
 */
export function isDuplicateOrNearDuplicate(candidate: GeneratedItem, existingItems: GeneratedItem[]): boolean {
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
    (interest) => item.category.toLowerCase().includes(interest) || item.title.toLowerCase().includes(interest),
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
  if (item.estimated_cost > 0 || item.title.toLowerCase().includes("free") || item.title.toLowerCase().includes("viewpoint")) {
    score += 15;
  }

  return score;
}

/**
 * Post-processes itinerary items to enforce arrival & departure time constraints, meal windows, and buffers.
 */
export function enforceArrivalAndDepartureConstraints(items: GeneratedItem[], input: TripInput): GeneratedItem[] {
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
      const hasArrival = validDay1Items.some((i) => i.category === "transit" || i.title.toLowerCase().includes("arrival"));
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
          travel_minutes: 30,
          indoor_outdoor: "mixed",
          weather_suitability: "any",
          booking_url: null,
          is_locked: true,
          uniqueness_key: `arrival_transit_${day}`,
        });

        processed.push({
          title: `Hotel Check-in & Refresh`,
          description: `Check in at hotel, unpack, and sytematically sytematically sytematically refresh before evening activities.`,
          day_date: day,
          start_time: addMinutes(input.arrivalTime || "14:00", 60),
          end_time: addMinutes(input.arrivalTime || "14:00", 120),
          category: "wellness",
          location: input.destination,
          latitude: null,
          longitude: null,
          estimated_cost: 0,
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
        travel_minutes: 15,
        indoor_outdoor: "indoor",
        weather_suitability: "any",
        booking_url: null,
        is_locked: true,
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
        travel_minutes: 45,
        indoor_outdoor: "mixed",
        weather_suitability: "any",
        booking_url: null,
        is_locked: true,
        uniqueness_key: `departure_transfer_${day}`,
      });
    } else {
      // FULL SIGHTSEEING DAYS
      processed.push(...dayItems);
    }
  }

  return processed;
}

/**
 * Intelligent Fallback Itinerary Generator with Multi-Theme Days & Zero Repetition.
 */
export function fallbackItinerary(input: TripInput): GeneratedItem[] {
  const days = dayList(input.startDate, input.endDate);

  const dailyThemes = [
    {
      theme: "Arrival & Orientation",
      items: [
        { title: `${input.destination} Orientation & Historic Walk`, category: "culture", start: "15:30", mins: 120, cost: 350, io: "outdoor" as const },
        { title: `Sunset Viewpoint & Promenade`, category: "sightseeing", start: "18:00", mins: 90, cost: 0, io: "outdoor" as const },
        { title: `Welcome Dinner at Regional Restaurant`, category: "food", start: "20:00", mins: 90, cost: 1250, io: "indoor" as const },
      ],
    },
    {
      theme: "Cultural Heritage & Icons",
      items: [
        { title: `Artisanal Breakfast Cafe`, category: "food", start: "09:00", mins: 60, cost: 450, io: "indoor" as const },
        { title: `Primary Heritage Monument & Museum`, category: "culture", start: "10:30", mins: 150, cost: 850, io: "indoor" as const },
        { title: `Traditional Midday Dining`, category: "food", start: "13:30", mins: 75, cost: 900, io: "indoor" as const },
        { title: `Old Town Architecture & Temple Walk`, category: "history", start: "15:30", mins: 120, cost: 400, io: "outdoor" as const },
        { title: `Evening Cultural Performance or Ceremony`, category: "culture", start: "18:30", mins: 90, cost: 1100, io: "indoor" as const },
      ],
    },
    {
      theme: "Nature & Botanical Exploration",
      items: [
        { title: `Morning Garden & Park Promenade`, category: "nature", start: "08:30", mins: 90, cost: 0, io: "outdoor" as const },
        { title: `Scenic Overlook & Nature Trail`, category: "adventure", start: "10:30", mins: 120, cost: 500, io: "outdoor" as const },
        { title: `Riverside / Lakeview Lunch`, category: "food", start: "13:00", mins: 75, cost: 950, io: "indoor" as const },
        { title: `Botanical Sanctuary Exploration`, category: "nature", start: "15:00", mins: 120, cost: 450, io: "outdoor" as const },
        { title: `Relaxed Evening Dinner`, category: "food", start: "19:30", mins: 90, cost: 1150, io: "indoor" as const },
      ],
    },
    {
      theme: "Local Neighborhoods & Street Food",
      items: [
        { title: `Neighborhood Bakery & Coffee`, category: "food", start: "09:00", mins: 45, cost: 380, io: "indoor" as const },
        { title: `Bustling Local Spice & Craft Market`, category: "shopping", start: "10:15", mins: 120, cost: 650, io: "outdoor" as const },
        { title: `Street Food Sampling Tour`, category: "food", start: "12:45", mins: 90, cost: 800, io: "outdoor" as const },
        { title: `Independent Artisan Shops & Galleries`, category: "culture", start: "15:00", mins: 120, cost: 550, io: "indoor" as const },
        { title: `Neighborhood Bistro Dinner`, category: "food", start: "19:30", mins: 90, cost: 1350, io: "indoor" as const },
      ],
    },
    {
      theme: "Adventure & Panoramic Views",
      items: [
        { title: `Early Morning Viewpoint Trek`, category: "adventure", start: "08:00", mins: 120, cost: 0, io: "outdoor" as const },
        { title: `Mountain / Coastal Scenic Corridor`, category: "nature", start: "10:30", mins: 120, cost: 750, io: "outdoor" as const },
        { title: `Hilltop Cafe Lunch`, category: "food", start: "13:00", mins: 75, cost: 950, io: "indoor" as const },
        { title: `Local Craft & Souvenir Pavilion`, category: "shopping", start: "15:00", mins: 120, cost: 550, io: "indoor" as const },
        { title: `Panoramic Rooftop Dinner`, category: "food", start: "20:00", mins: 90, cost: 1650, io: "indoor" as const },
      ],
    },
    {
      theme: "Relaxation & Free Exploration",
      items: [
        { title: `Leisurely Late Morning Breakfast`, category: "food", start: "09:30", mins: 60, cost: 550, io: "indoor" as const },
        { title: `Wellness Spa or Quiet Garden Rest`, category: "wellness", start: "11:00", mins: 120, cost: 1600, io: "indoor" as const },
        { title: `Shaded Courtyard Lunch`, category: "food", start: "13:30", mins: 75, cost: 850, io: "outdoor" as const },
        { title: `Free Exploration & Photo Spot Hour`, category: "culture", start: "15:30", mins: 120, cost: 0, io: "outdoor" as const },
        { title: `Farewell Celebration Dinner`, category: "food", start: "19:30", mins: 105, cost: 1900, io: "indoor" as const },
      ],
    },
    {
      theme: "Final Sightseeing & Departure",
      items: [
        { title: `Final Morning Cafe Breakfast`, category: "food", start: "09:00", mins: 60, cost: 450, io: "indoor" as const },
        { title: `Last-minute Souvenir & Gift Shopping`, category: "shopping", start: "10:30", mins: 90, cost: 650, io: "indoor" as const },
      ],
    },
  ];

  const existingItems: GeneratedItem[] = [];

  const rawItems = days.flatMap((day, dayIndex) => {
    const themeObj = dailyThemes[dayIndex % dailyThemes.length]!;
    return themeObj.items.map((t) => {
      let itemTitle = `${t.title} (${input.destination})`;
      const candItem: GeneratedItem = {
        title: itemTitle,
        description: `Explore ${t.title.toLowerCase()} in ${input.destination}, curated for your ${input.travelStyle} trip.`,
        day_date: day,
        start_time: t.start,
        end_time: addMinutes(t.start, t.mins),
        category: t.category,
        location: input.destination,
        latitude: null,
        longitude: null,
        estimated_cost: Math.round(t.cost * (input.currency === "USD" ? 0.012 : 1)),
        travel_minutes: 20,
        indoor_outdoor: t.io,
        weather_suitability: t.io === "outdoor" ? ("clear_only" as const) : ("any" as const),
        booking_url: null,
        is_locked: false,
        uniqueness_key: generateUniquenessKey({ title: itemTitle, category: t.category, location: input.destination }),
      };

      if (isDuplicateOrNearDuplicate(candItem, existingItems)) {
        itemTitle = `${t.title} · Day ${dayIndex + 1}`;
        candItem.title = itemTitle;
        candItem.uniqueness_key = generateUniquenessKey({ title: itemTitle, category: t.category, location: input.destination });
      }

      existingItems.push(candItem);
      return candItem;
    });
  });

  return enforceArrivalAndDepartureConstraints(rawItems, input);
}

/**
 * Calls the Lovable AI gateway to generate a highly diverse, destination-specific itinerary.
 */
export async function generateItinerary(
  input: TripInput,
  options?: { previousTitles?: string[]; isRegeneration?: boolean },
): Promise<{ items: GeneratedItem[]; source: "ai" | "fallback"; error: string | null }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return { items: fallbackItinerary(input), source: "fallback", error: null };
  }

  const days = dayList(input.startDate, input.endDate);

  const promptParts = [
    `Create an authentic, non-repetitive ${days.length}-day travel itinerary for ${input.destination} (traveling from ${input.origin}).`,
    `Calendar Dates: ${days.join(", ")} (Day 1 is ${days[0]}, Day ${days.length} is ${days[days.length - 1]}).`,
    `Travelers: ${input.adults} adults, ${input.children} children.`,
    `Budget: ${input.budget} ${input.currency}. Travel style: ${input.travelStyle}.`,
    `Interests: ${input.interests.join(", ") || "General exploration"}.`,
    `Arrival Time on Day 1: ${input.arrivalTime || "14:00"}. Departure Time on Day ${days.length}: ${input.departureTime || "16:00"}.`,
    `Pace: ${input.preferences.pace}. Indoor/outdoor balance: ${input.preferences.indoorOutdoor}. Transport: ${input.preferences.transport}.`,
    `STRICT ARRIVAL & DEPARTURE TIMING RULES:`,
    `1. DAY 1 ARRIVAL: Do NOT schedule any activities before ${input.arrivalTime || "14:00"}. Start Day 1 with Arrival and Hotel Check-in.`,
    `2. FINAL DAY DEPARTURE: Do NOT schedule any major tours within 3 hours of departure (${input.departureTime || "16:00"}). Include Checkout and Transit.`,
    `STRICT PRICING RULES:`,
    `1. If an activity is genuinely free (e.g. public viewpoint, public park, free beach, promenade walk, photo spot, self-guided walking, free temple grounds), set estimated_cost: 0.`,
    `2. If an activity has a cost (meals, museum entry, guided tour, paid attraction, transport, tickets), provide a realistic non-zero per-person cost estimate in ${input.currency} (e.g. 350-1500 ${input.currency}). NEVER set estimated_cost: 0 for a paid activity like lunch or museum.`,
    `STRICT QUALITY & DIVERSITY RULES:`,
    `1. EVERY DAY MUST HAVE A DISTINCT THEME AND GEOGRAPHIC FOCUS within ${input.destination}.`,
    `2. DO NOT REPEAT THE SAME ATTRACTION OR UNDERLYING LOCATION across multiple days.`,
    `3. DO NOT USE TRIVIAL TITLE VARIATIONS to disguise the same attraction (e.g. 'Haridwar Market' vs 'Explore Haridwar Market').`,
    `4. PACING: Schedule 3 to 5 meaningful activities per day plus meals and free time. Do not overload days or fill every single hour.`,
    `5. VARY MEALS: Use specific local food experiences rather than repetitive generic "Breakfast".`,
    `6. INCLUDE REASONABLE FREE TIME or neighborhood exploration periods.`,
  ];

  if (options?.previousTitles && options.previousTitles.length > 0) {
    promptParts.push(
      `REGENERATION INSTRUCTION: Provide a SUBSTANTIALLY DIFFERENT itinerary from previous runs. Avoid these previously generated attraction titles: ${options.previousTitles.slice(0, 20).join(", ")}.`,
    );
  }

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are RoamPulse's expert local travel planner. Always return structured JSON via emit_itinerary tool. Ensure zero repeated attraction titles across days. Respect arrival & departure times.",
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
                        day_date: { type: "string", description: "YYYY-MM-DD" },
                        start_time: { type: "string", description: "HH:MM 24h" },
                        end_time: { type: "string", description: "HH:MM 24h" },
                        category: { type: "string" },
                        location: { type: "string" },
                        latitude: { type: "number" },
                        longitude: { type: "number" },
                        estimated_cost: { type: "number" },
                        travel_minutes: { type: "number" },
                        indoor_outdoor: { type: "string", enum: ["indoor", "outdoor", "mixed"] },
                        weather_suitability: { type: "string", enum: ["any", "clear_only", "rain_ok"] },
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
                      additionalProperties: false,
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_itinerary" } },
      }),
    });

    if (res.status === 429) {
      return {
        items: fallbackItinerary(input),
        source: "fallback",
        error: "AI planner gateway is currently busy — generated a diverse starter schedule.",
      };
    }
    if (!res.ok) throw new Error(`Gateway returned HTTP ${res.status}`);

    const json = (await res.json()) as {
      choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
    };
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No tool call returned from AI gateway");

    const parsed = itineraryResponseSchema.safeParse(JSON.parse(args));
    if (!parsed.success) throw new Error("Schema validation failed on AI output");

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

    return {
      items: constrainedItems,
      source: "ai",
      error: null,
    };
  } catch {
    return {
      items: fallbackItinerary(input),
      source: "fallback",
      error: "Could not connect to AI gateway — built a diverse starter itinerary.",
    };
  }
}
