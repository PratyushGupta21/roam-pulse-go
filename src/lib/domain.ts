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
  arrivalTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .default("14:00"),
  departureTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .default("16:00"),
  adults: z.number().int().min(1).max(12),
  children: z.number().int().min(0).max(12),
  budget: z.number().min(0).max(100_000_000),
  currency: z.string().min(1).max(6),
  travelStyle: z.enum(TRAVEL_STYLES),
  interests: z.array(z.string().max(40)).max(12),
  preferences: z.object({
    indoorOutdoor: z.enum(["mostly_indoor", "balanced", "mostly_outdoor"]).default("balanced"),
    pace: z.enum(["relaxed", "moderate", "packed"]).default("moderate"),
    transport: z
      .enum(["walking", "public_transit", "rideshare", "rental_car"])
      .default("public_transit"),
    accommodation: z
      .enum(["hostel", "budget_hotel", "boutique", "hotel", "resort"])
      .default("budget_hotel"),
    country: z.string().max(80).optional(),
    tripStyles: z.array(z.string().max(40)).max(12).optional(),
    budgetLevel: z.enum(["budget", "moderate", "premium", "luxury"]).optional(),
    foodPreference: z.enum(["street_food", "local_casual", "mixed", "fine_dining"]).optional(),
    wakeUpTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    maxTravelMinutes: z.number().int().min(5).max(240).optional(),
    dietary: z.array(z.string().max(40)).max(12).optional(),
    accessibility: z.array(z.string().max(60)).max(12).optional(),
    specialRequests: z.string().max(600).optional(),
  }),

  recoveryMode: z.enum(RECOVERY_MODES),
  automationSettings: z.object({
    maxExtraSpend: z.number().min(0).max(10_000_000).default(2000),
    autoReplace: z.array(z.string()).default(["flexible", "weather_sensitive"]),
    alwaysAsk: z.array(z.string()).default(["flights", "hotels", "above_limit"]),
  }),
});

export type TripInput = z.infer<typeof tripInputSchema>;

export const updateTripSchema = z.object({
  tripId: z.string().uuid(),
  regenerateItinerary: z.boolean().default(false),
  tripData: tripInputSchema,
});

export const duplicateTripSchema = z.object({
  sourceTripId: z.string().uuid(),
  newName: z.string().min(2).max(80).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type DuplicateTripInput = z.infer<typeof duplicateTripSchema>;

export interface ItineraryItemMetadata {
  cost_min?: number | null;
  cost_max?: number | null;
  cost_type?: "free" | "estimated" | "listed" | "unknown";
  opening_hours?: string | null;
  rating?: number | null;
  verification_status?: "verified" | "estimated" | "ai_planned";
  why_fits?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  provider?: string | null;
  place_id?: string | null;
  [key: string]: unknown;
}

export type GenerationState =
  | "RESEARCHING"
  | "PLACES_FOUND"
  | "PLACES_VERIFIED"
  | "PLANNING"
  | "VALIDATING"
  | "COMPLETE"
  | "DEGRADED"
  | "FAILED";

export const itineraryItemSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(1000).default(""),
  day_date: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const parts = val.trim().split("-");
        if (parts.length === 3) {
          const y = parts[0];
          const m = parts[1]?.padStart(2, "0");
          const d = parts[2]?.padStart(2, "0");
          return `${y}-${m}-${d}`;
        }
      }
      return val;
    },
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ),
  start_time: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const parts = val.trim().split(":");
        if (parts.length === 2) {
          return `${parts[0]?.padStart(2, "0")}:${parts[1]?.padStart(2, "0")}`;
        }
      }
      return val;
    },
    z.string().regex(/^\d{2}:\d{2}$/),
  ),
  end_time: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const parts = val.trim().split(":");
        if (parts.length === 2) {
          return `${parts[0]?.padStart(2, "0")}:${parts[1]?.padStart(2, "0")}`;
        }
      }
      return val;
    },
    z.string().regex(/^\d{2}:\d{2}$/),
  ),
  category: z.string().max(40).default("activity"),
  location: z.string().max(200).default(""),
  latitude: z.coerce.number().min(-90).max(90).nullable().default(null),
  longitude: z.coerce.number().min(-180).max(180).nullable().default(null),
  estimated_cost: z.coerce.number().min(0).max(10_000_000).default(0),
  cost_min: z.coerce.number().min(0).nullable().optional(),
  cost_max: z.coerce.number().min(0).nullable().optional(),
  cost_type: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const norm = val.toLowerCase();
        if (norm === "free") return "free";
        if (norm === "listed") return "listed";
        if (norm === "unknown") return "unknown";
        return "estimated";
      }
      return "estimated";
    },
    z.enum(["free", "estimated", "listed", "unknown"]).default("estimated"),
  ),
  opening_hours: z.string().nullable().optional(),
  rating: z.coerce.number().min(0).max(5).nullable().optional(),
  verification_status: z.enum(["verified", "estimated", "ai_planned"]).default("estimated"),
  why_fits: z.string().max(500).nullable().optional(),
  travel_minutes: z.coerce.number().int().min(0).max(600).default(0),
  indoor_outdoor: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const norm = val.toLowerCase();
        if (norm.includes("outdoor") || norm === "outside") return "outdoor";
        if (norm.includes("indoor") || norm === "inside") return "indoor";
        return "mixed";
      }
      return "mixed";
    },
    z.enum(["indoor", "outdoor", "mixed"]).default("indoor"),
  ),
  weather_suitability: z.enum(["any", "clear_only", "rain_ok"]).default("any"),
  booking_url: z.string().url().nullable().default(null),
  is_locked: z.boolean().default(false),
  is_structural: z.boolean().optional(),
  place_id: z.string().nullable().optional(),
  uniqueness_key: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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
  disruptionId?: string | undefined;
  tripId?: string | undefined;
  type?: string | undefined;
  severity?: "low" | "medium" | "high" | "critical" | undefined;
  affectedItemId: string;
  affectedItemTitle: string;
  affectedItemDate?: string | undefined;
  affectedItemStartTime?: string | undefined;
  affectedItemEndTime?: string | undefined;
  affectedItemLocation?: string | undefined;
  affectedItemCategory?: string | undefined;
  affectedItemCost?: number | undefined;
  affectedItemIndoorOutdoor?: string | undefined;
  disruptionType?: string | undefined;
  disruptionMinutes?: number | undefined;
  disruptionFromTime?: string | undefined;
  rainProbability?: number | undefined;
  replacementDate?: string | undefined;
  reason: string;
  newStartTime?: string | undefined;
  proposedAction?: "replace" | "reschedule" | "cancel" | undefined;
  primary: RecoveryAlternative;
  alternatives: RecoveryAlternative[];
  costDelta: number;
  requiresApproval: boolean;
  autoExecutable?: boolean | undefined;
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

export const TRIP_STYLE_OPTIONS = [
  { id: "adventure", label: "Adventure", emoji: "🧗" },
  { id: "relaxation", label: "Relaxation", emoji: "🌴" },
  { id: "culture", label: "Culture", emoji: "🏛️" },
  { id: "food_nightlife", label: "Food & nightlife", emoji: "🍷" },
  { id: "nature", label: "Nature", emoji: "🌲" },
  { id: "luxury", label: "Luxury", emoji: "💎" },
  { id: "budget", label: "Budget", emoji: "🎒" },
  { id: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { id: "romantic", label: "Romantic", emoji: "💞" },
  { id: "business", label: "Business", emoji: "💼" },
] as const;

export const INTEREST_CARDS = [
  { id: "Beaches", emoji: "🏖️" },
  { id: "Mountains", emoji: "🏔️" },
  { id: "Museums", emoji: "🖼️" },
  { id: "History", emoji: "🏺" },
  { id: "Local food", emoji: "🍜" },
  { id: "Shopping", emoji: "🛍️" },
  { id: "Nightlife", emoji: "🌃" },
  { id: "Photography", emoji: "📷" },
  { id: "Hiking", emoji: "🥾" },
  { id: "Wellness", emoji: "🧘" },
  { id: "Hidden gems", emoji: "💫" },
  { id: "Events", emoji: "🎫" },
] as const;

export const BUDGET_LEVELS = [
  { id: "budget", label: "Budget", hint: "Hostels, street food, transit", style: "backpacker" },
  { id: "moderate", label: "Moderate", hint: "3-star stays, mixed dining", style: "balanced" },
  { id: "premium", label: "Premium", hint: "Boutique hotels, guided tours", style: "comfort" },
  { id: "luxury", label: "Luxury", hint: "5-star stays, private transfers", style: "luxury" },
] as const;

export const ACCOMMODATION_OPTIONS = [
  { id: "hostel", label: "Hostel" },
  { id: "budget_hotel", label: "Budget hotel" },
  { id: "boutique", label: "Boutique" },
  { id: "hotel", label: "Hotel" },
  { id: "resort", label: "Resort" },
] as const;

export const TRANSPORT_OPTIONS = [
  { id: "walking", label: "Mostly walking" },
  { id: "public_transit", label: "Public transit" },
  { id: "rideshare", label: "Rideshare / taxi" },
  { id: "rental_car", label: "Rental car" },
] as const;

export const FOOD_OPTIONS = [
  { id: "street_food", label: "Street food" },
  { id: "local_casual", label: "Local casual" },
  { id: "mixed", label: "Mixed" },
  { id: "fine_dining", label: "Fine dining" },
] as const;

export const PACE_OPTIONS = [
  { id: "relaxed", label: "Relaxed", hint: "2-3 activities a day" },
  { id: "moderate", label: "Balanced", hint: "4-5 activities a day" },
  { id: "packed", label: "Packed", hint: "6+ activities a day" },
] as const;

export const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Kosher",
  "Gluten-free",
  "Nut allergy",
  "Jain",
  "No beef",
] as const;

export const ACCESSIBILITY_OPTIONS = [
  "Step-free access",
  "Wheelchair friendly",
  "Limited walking",
  "Elevator required",
  "Sensory-friendly",
  "Service animal",
] as const;

export const CURRENCIES = [
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "AED", label: "AED — UAE Dirham" },
] as const;

export const DESTINATION_SUGGESTIONS = [
  { city: "Tokyo", country: "Japan" },
  { city: "Kyoto", country: "Japan" },
  { city: "Bali", country: "Indonesia" },
  { city: "Bangkok", country: "Thailand" },
  { city: "Singapore", country: "Singapore" },
  { city: "Dubai", country: "United Arab Emirates" },
  { city: "Paris", country: "France" },
  { city: "Rome", country: "Italy" },
  { city: "Barcelona", country: "Spain" },
  { city: "Lisbon", country: "Portugal" },
  { city: "London", country: "United Kingdom" },
  { city: "Amsterdam", country: "Netherlands" },
  { city: "Istanbul", country: "Türkiye" },
  { city: "New York", country: "United States" },
  { city: "San Francisco", country: "United States" },
  { city: "Reykjavik", country: "Iceland" },
  { city: "Cape Town", country: "South Africa" },
  { city: "Sydney", country: "Australia" },
  { city: "Queenstown", country: "New Zealand" },
  { city: "Goa", country: "India" },
  { city: "Jaipur", country: "India" },
  { city: "Leh", country: "India" },
  { city: "Kerala", country: "India" },
  { city: "Seoul", country: "South Korea" },
  { city: "Hanoi", country: "Vietnam" },
  { city: "Colombo", country: "Sri Lanka" },
  { city: "Zurich", country: "Switzerland" },
  { city: "Prague", country: "Czechia" },
] as const;
