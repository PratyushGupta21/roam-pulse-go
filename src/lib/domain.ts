import { z } from "zod";

export const TRAVEL_STYLES = ["backpacker", "budget", "balanced", "comfort", "luxury"] as const;
export const INTERESTS = [
  "Food",
  "Nature",
  "Adventure",
  "Culture",
  "History",
  "Nightlife",
  "Shopping",
  "Photography",
  "Local experiences",
  "Wellness",
] as const;
export const RECOVERY_MODES = ["manual", "assisted", "autonomous"] as const;
export const ITEM_STATUSES = [
  "confirmed",
  "flexible",
  "at_risk",
  "disrupted",
  "replaced",
  "completed",
] as const;

export type TravelStyle = (typeof TRAVEL_STYLES)[number];
export type RecoveryMode = (typeof RECOVERY_MODES)[number];
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const tripInputSchema = z.object({
  name: z.string().min(2).max(80),
  origin: z.string().min(2).max(80),
  destination: z.string().min(2).max(80),
  extraDestinations: z.array(z.string().max(80)).max(5).default([]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(12),
  children: z.number().int().min(0).max(12),
  budget: z.number().min(0).max(100_000_000),
  currency: z.string().min(1).max(6),
  travelStyle: z.enum(TRAVEL_STYLES),
  interests: z.array(z.string().max(40)).max(12),
  preferences: z.object({
    indoorOutdoor: z.enum(["mostly_indoor", "balanced", "mostly_outdoor"]).default("balanced"),
    pace: z.enum(["relaxed", "moderate", "packed"]).default("moderate"),
    transport: z.enum(["walking", "public_transit", "rideshare", "rental_car"]).default("public_transit"),
    accommodation: z.enum(["hostel", "budget_hotel", "boutique", "hotel", "resort"]).default("budget_hotel"),
  }),
  recoveryMode: z.enum(RECOVERY_MODES),
  automationSettings: z.object({
    maxExtraSpend: z.number().min(0).max(10_000_000).default(2000),
    autoReplace: z.array(z.string()).default(["flexible", "weather_sensitive"]),
    alwaysAsk: z.array(z.string()).default(["flights", "hotels", "above_limit"]),
  }),
});

export type TripInput = z.infer<typeof tripInputSchema>;

export const itineraryItemSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(600).default(""),
  day_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  category: z.string().max(40).default("activity"),
  location: z.string().max(160).default(""),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
  estimated_cost: z.number().min(0).max(10_000_000).default(0),
  travel_minutes: z.number().int().min(0).max(600).default(0),
  indoor_outdoor: z.enum(["indoor", "outdoor", "mixed"]).default("indoor"),
  weather_suitability: z.enum(["any", "clear_only", "rain_ok"]).default("any"),
  booking_url: z.string().url().nullable().default(null),
  is_locked: z.boolean().default(false),
});

export const itineraryResponseSchema = z.object({
  items: z.array(itineraryItemSchema).min(1).max(80),
});

export type GeneratedItem = z.infer<typeof itineraryItemSchema>;

export interface RecoveryAlternative {
  id: string;
  title: string;
  category: string;
  description: string;
  distanceKm: number;
  durationMinutes: number;
  estimatedCost: number;
  indoorOutdoor: "indoor" | "outdoor" | "mixed";
  weatherSuitability: string;
  rating: number | null;
  reasons: string[];
  score: number;
  sponsored: boolean;
  latitude: number | null;
  longitude: number | null;
  bookingUrl: string | null;
  startTime: string;
  endTime: string;
}

export interface RecoveryPayload {
  affectedItemId: string;
  affectedItemTitle: string;
  reason: string;
  newStartTime: string;
  primary: RecoveryAlternative;
  alternatives: RecoveryAlternative[];
  costDelta: number;
  requiresApproval: boolean;
}

export const CATEGORY_ICON: Record<string, string> = {
  food: "🍜",
  breakfast: "☕",
  culture: "🏯",
  history: "🏛️",
  nature: "🌿",
  adventure: "🥾",
  nightlife: "🌃",
  shopping: "🛍️",
  transport: "🚆",
  flight: "✈️",
  accommodation: "🏨",
  wellness: "🧘",
  activity: "📍",
};
