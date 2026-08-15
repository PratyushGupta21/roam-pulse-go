/**
 * Local experience catalog used by the recovery engine when no live activity
 * provider is configured. Clearly surfaced as demo data in the UI.
 */
export interface CatalogActivity {
  id: string;
  title: string;
  category: string;
  description: string;
  indoorOutdoor: "indoor" | "outdoor" | "mixed";
  durationMinutes: number;
  estimatedCost: number;
  distanceKm: number;
  rating: number;
  interests: string[];
  sponsored?: boolean;
  latOffset: number;
  lonOffset: number;
  bookingUrl?: string;
}

export const ACTIVITY_CATALOG: CatalogActivity[] = [
  {
    id: "indoor-food-experience",
    title: "Indoor Food Experience",
    category: "food",
    description: "Chef-guided tasting through a covered market hall with 6 local tastings.",
    indoorOutdoor: "indoor",
    durationMinutes: 105,
    estimatedCost: 1200,
    distanceKm: 1.2,
    rating: 4.8,
    interests: ["Food", "Local experiences", "Culture"],
    latOffset: 0.006,
    lonOffset: 0.004,
    bookingUrl: "https://www.getyourguide.com",
  },
  {
    id: "museum-of-modern-art",
    title: "Modern Art Museum",
    category: "culture",
    description: "Rotating contemporary exhibitions, fully indoor, quiet mid-evening slots.",
    indoorOutdoor: "indoor",
    durationMinutes: 120,
    estimatedCost: 850,
    distanceKm: 2.4,
    rating: 4.6,
    interests: ["Culture", "History", "Photography"],
    latOffset: -0.008,
    lonOffset: 0.011,
  },
  {
    id: "craft-workshop",
    title: "Traditional Craft Workshop",
    category: "activity",
    description: "Hands-on two-hour workshop with a local maker. Small groups, indoor studio.",
    indoorOutdoor: "indoor",
    durationMinutes: 110,
    estimatedCost: 1600,
    distanceKm: 3.1,
    rating: 4.7,
    interests: ["Local experiences", "Culture", "Shopping"],
    latOffset: 0.012,
    lonOffset: -0.007,
    bookingUrl: "https://www.viator.com",
  },
  {
    id: "sponsored-onsen-lounge",
    title: "City Onsen & Relaxation Lounge",
    category: "wellness",
    description: "Indoor bathing lounge with late hours, five minutes from the metro.",
    indoorOutdoor: "indoor",
    durationMinutes: 90,
    estimatedCost: 950,
    distanceKm: 1.8,
    rating: 4.5,
    interests: ["Wellness", "Local experiences"],
    sponsored: true,
    latOffset: -0.004,
    lonOffset: -0.009,
    bookingUrl: "https://www.klook.com",
  },
  {
    id: "night-photo-walk",
    title: "Covered Arcade Night Walk",
    category: "photography",
    description: "Roofed shopping arcade route — stays comfortable in rain, great neon light.",
    indoorOutdoor: "mixed",
    durationMinutes: 75,
    estimatedCost: 0,
    distanceKm: 0.9,
    rating: 4.3,
    interests: ["Photography", "Shopping", "Nightlife"],
    latOffset: 0.003,
    lonOffset: 0.014,
  },
  {
    id: "ramen-masterclass",
    title: "Ramen Masterclass",
    category: "food",
    description: "Cook and eat your own bowl with a neighbourhood ramen chef.",
    indoorOutdoor: "indoor",
    durationMinutes: 120,
    estimatedCost: 2100,
    distanceKm: 4.2,
    rating: 4.9,
    interests: ["Food", "Local experiences"],
    latOffset: 0.017,
    lonOffset: 0.006,
    bookingUrl: "https://www.getyourguide.com",
  },
  {
    id: "observation-deck",
    title: "Indoor Observation Deck",
    category: "activity",
    description: "Glass-walled skyline deck, open late, unaffected by weather.",
    indoorOutdoor: "indoor",
    durationMinutes: 60,
    estimatedCost: 1400,
    distanceKm: 2.9,
    rating: 4.4,
    interests: ["Photography", "Nature"],
    latOffset: -0.011,
    lonOffset: 0.003,
  },
];
