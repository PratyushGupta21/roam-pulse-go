import { itineraryResponseSchema, type GeneratedItem, type TripInput } from "./domain";
import { addMinutes } from "./format";

const MODEL = "google/gemini-3.5-flash";

function dayList(start: string, end: string) {
  const days: string[] = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cursor <= last && days.length < 30) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days.length ? days : [start];
}

/** Deterministic fallback itinerary — used when the AI gateway is unavailable. */
export function fallbackItinerary(input: TripInput): GeneratedItem[] {
  const days = dayList(input.startDate, input.endDate);
  const template = [
    { title: "Local breakfast spot", category: "breakfast", start: "09:00", mins: 60, cost: 450, io: "indoor" as const },
    { title: "Landmark & heritage walk", category: "culture", start: "10:30", mins: 120, cost: 800, io: "outdoor" as const },
    { title: "Neighbourhood lunch", category: "food", start: "13:00", mins: 75, cost: 900, io: "indoor" as const },
    { title: "Guided walking tour", category: "adventure", start: "15:00", mins: 120, cost: 1500, io: "outdoor" as const },
    { title: "Local food experience", category: "food", start: "18:00", mins: 90, cost: 1200, io: "indoor" as const },
    { title: "Dinner", category: "food", start: "20:00", mins: 90, cost: 1400, io: "indoor" as const },
  ];
  return days.flatMap((day, dayIndex) =>
    template.map((t) => ({
      title: `${t.title} · Day ${dayIndex + 1}`,
      description: `${t.title} in ${input.destination}, matched to your ${input.travelStyle} travel style.`,
      day_date: day,
      start_time: t.start,
      end_time: addMinutes(t.start, t.mins),
      category: t.category,
      location: input.destination,
      latitude: null,
      longitude: null,
      estimated_cost: t.cost,
      travel_minutes: 20,
      indoor_outdoor: t.io,
      weather_suitability: t.io === "outdoor" ? ("clear_only" as const) : ("any" as const),
      booking_url: null,
      is_locked: false,
    })),
  );
}

/** Calls the Lovable AI gateway and validates the structured itinerary response. */
export async function generateItinerary(
  input: TripInput,
): Promise<{ items: GeneratedItem[]; source: "ai" | "fallback"; error: string | null }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return { items: fallbackItinerary(input), source: "fallback", error: null };
  }

  const days = dayList(input.startDate, input.endDate);
  const prompt = [
    `Plan a ${days.length}-day trip to ${input.destination} (origin: ${input.origin}).`,
    `Dates: ${days.join(", ")}.`,
    `Travellers: ${input.adults} adults, ${input.children} children.`,
    `Total budget: ${input.budget} ${input.currency}. Travel style: ${input.travelStyle}.`,
    `Interests: ${input.interests.join(", ") || "general"}.`,
    `Pace: ${input.preferences.pace}. Indoor/outdoor balance: ${input.preferences.indoorOutdoor}.`,
    `Transport preference: ${input.preferences.transport}.`,
    `Produce 5-7 items per day covering meals and activities, chronological, non-overlapping,`,
    `with realistic coordinates for ${input.destination}, realistic per-person costs in ${input.currency},`,
    `and correct indoor/outdoor + weather suitability flags.`,
  ].join(" ");

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
              "You are RoamPulse's itinerary planner. Always answer by calling the emit_itinerary tool with structured data. Never return prose.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_itinerary",
              description: "Return the structured itinerary",
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
      return { items: fallbackItinerary(input), source: "fallback", error: "AI is busy right now — we used a starter itinerary you can edit." };
    }
    if (!res.ok) throw new Error(`gateway ${res.status}`);

    const json = (await res.json()) as {
      choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
    };
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("no tool call");
    const parsed = itineraryResponseSchema.safeParse(JSON.parse(args));
    if (!parsed.success) throw new Error("schema mismatch");
    return { items: parsed.data.items, source: "ai", error: null };
  } catch {
    return {
      items: fallbackItinerary(input),
      source: "fallback",
      error: "We couldn't reach the AI planner, so we built a starter itinerary you can edit.",
    };
  }
}
