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
    country: z.string().max(80).optional(),
    tripStyles: z.array(z.string().max(40)).max(12).optional(),
    budgetLevel: z.enum(["budget", "moderate", "premium", "luxury"]).optional(),
    foodPreference: z.enum(["street_food", "local_casual", "mixed", "fine_dining"]).optional(),
    wakeUpTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
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
