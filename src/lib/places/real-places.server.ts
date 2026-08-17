/**
 * Real-World Place Data Retrieval Service
 *
 * Provides real attractions, restaurants, landmarks, and neighborhoods for trip planning.
 * Hierarchy:
 * 1. Google Places API (Text Search) if GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_API_KEY is configured.
 * 2. OpenStreetMap Nominatim POI Search (free real-world location data).
 * 3. Curated real-world landmark database for popular global & regional destinations.
 */

export interface RealPlace {
  name: string;
  category:
    | "attraction"
    | "restaurant"
    | "shopping"
    | "nature"
    | "history"
    | "culture"
    | "transit"
    | "wellness";
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  priceLevel?: number;
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  costType?: "free" | "estimated" | "listed";
  openingHours?: string;
  description?: string;
  isVerified: boolean;
  source: "google_places" | "osm" | "curated";
}

// Curated landmark & activity database for instant, zero-latency real-world place fallback
const CURATED_DESTINATION_PLACES: Record<string, RealPlace[]> = {
  jaipur: [
    {
      name: "Amber Fort (Amer Fort)",
      category: "history",
      address: "Devisinghpura, Amer, Jaipur, Rajasthan 302001",
      latitude: 26.9855,
      longitude: 75.8513,
      rating: 4.7,
      estimatedCostMin: 200,
      estimatedCostMax: 500,
      costType: "listed",
      openingHours: "08:00 – 17:30",
      description:
        "Majestic hilltop fort featuring red sandstone and marble palaces, Sheesh Mahal (Mirror Palace), and panoramic ramparts.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Johari Bazaar & Old City Lanes",
      category: "shopping",
      address: "Johari Bazaar, Pink City, Jaipur, Rajasthan 302003",
      latitude: 26.9213,
      longitude: 75.8267,
      rating: 4.5,
      estimatedCostMin: 0,
      estimatedCostMax: 1500,
      costType: "estimated",
      openingHours: "10:00 – 21:00",
      description:
        "Famous heritage market for Jaipur jewelry, textiles, handicrafts, bandhani sarees, and local street snacks.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "City Palace, Jaipur",
      category: "culture",
      address: "Jaleb Chowk, Near Jantar Mantar, Tripolia Bazaar, Jaipur 302002",
      latitude: 26.9258,
      longitude: 75.8237,
      rating: 4.6,
      estimatedCostMin: 300,
      estimatedCostMax: 700,
      costType: "listed",
      openingHours: "09:30 – 17:00",
      description:
        "Royal residence complex blending Rajasthani and Mughal architecture with museums, courtyards, and Peacock Gate.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Jantar Mantar Observatory",
      category: "history",
      address: "Gangori Bazaar, J.D.A. Market, Pink City, Jaipur 302002",
      latitude: 26.9248,
      longitude: 75.8246,
      rating: 4.6,
      estimatedCostMin: 200,
      estimatedCostMax: 400,
      costType: "listed",
      openingHours: "09:00 – 16:30",
      description:
        "UNESCO World Heritage site containing 19 architectural astronomical instruments built by King Sawai Jai Singh II.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Hawa Mahal (Palace of Winds)",
      category: "history",
      address: "Hawa Mahal Rd, Badi Choupad, J.D.A. Market, Pink City, Jaipur 302002",
      latitude: 26.9239,
      longitude: 75.8267,
      rating: 4.6,
      estimatedCostMin: 50,
      estimatedCostMax: 200,
      costType: "listed",
      openingHours: "09:00 – 17:00",
      description:
        "Iconic five-story pink sandstone facade with 953 intricate jharokhas (windows) built for royal women.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Nahargarh Fort & Sunset Viewpoint",
      category: "attraction",
      address: "Krishna Nagar, Brahampuri, Jaipur, Rajasthan 302007",
      latitude: 26.9378,
      longitude: 75.8155,
      rating: 4.6,
      estimatedCostMin: 100,
      estimatedCostMax: 300,
      costType: "listed",
      openingHours: "10:00 – 22:00",
      description:
        "Perched on the Aravalli hills offering spectacular panoramic sunset views of the Jaipur city skyline.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "LMB (Laxmi Misthan Bhandar)",
      category: "restaurant",
      address: "Johari Bazaar, Pink City, Jaipur, Rajasthan 302003",
      latitude: 26.9218,
      longitude: 75.8262,
      rating: 4.4,
      estimatedCostMin: 400,
      estimatedCostMax: 900,
      costType: "estimated",
      openingHours: "08:00 – 23:00",
      description:
        "Legendary heritage sweet shop and restaurant serving authentic Rajasthani Thali, Ghewar, and Pyaz Kachori.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Albert Hall Museum",
      category: "culture",
      address: "Museum Rd, Ram Niwas Garden, Kailash Puri, Jaipur 302004",
      latitude: 26.9116,
      longitude: 75.8195,
      rating: 4.5,
      estimatedCostMin: 150,
      estimatedCostMax: 300,
      costType: "listed",
      openingHours: "09:00 – 17:00, 19:00 – 22:00",
      description:
        "Oldest museum of Rajasthan in Indo-Saracenic architecture displaying royal artifacts, carpets, and sculptures.",
      isVerified: true,
      source: "curated",
    },
  ],
  tokyo: [
    {
      name: "Senso-ji Temple & Nakamise Street",
      category: "history",
      address: "2-3-1 Asakusa, Taito City, Tokyo 111-0032",
      latitude: 35.7148,
      longitude: 139.7967,
      rating: 4.7,
      estimatedCostMin: 0,
      estimatedCostMax: 500,
      costType: "free",
      openingHours: "06:00 – 17:00 (Grounds 24/7)",
      description:
        "Tokyo's oldest and most significant Buddhist temple entered through Kaminarimon Gate with giant red lantern.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Meiji Jingu Shrine & Yoyogi Forest",
      category: "culture",
      address: "1-1 Yoyogikamizonocho, Shibuya City, Tokyo 151-8557",
      latitude: 35.6764,
      longitude: 139.6993,
      rating: 4.6,
      estimatedCostMin: 0,
      estimatedCostMax: 0,
      costType: "free",
      openingHours: "05:00 – 18:00",
      description:
        "Tranquil Shinto shrine surrounded by a dense 170-acre forest in the heart of Shibuya.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Shibuya Crossing & Hachiko Statue",
      category: "attraction",
      address: "2-1 Dogenzaka, Shibuya City, Tokyo 150-0043",
      latitude: 35.6595,
      longitude: 139.7005,
      rating: 4.6,
      estimatedCostMin: 0,
      estimatedCostMax: 0,
      costType: "free",
      openingHours: "Open 24/7",
      description:
        "World's busiest pedestrian scramble crossing surrounded by neon screens and bustling Shibuya energy.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Tsukiji Outer Market Food Tour",
      category: "restaurant",
      address: "4-16-2 Tsukiji, Chuo City, Tokyo 104-0045",
      latitude: 35.6654,
      longitude: 139.7707,
      rating: 4.5,
      estimatedCostMin: 1000,
      estimatedCostMax: 3000,
      costType: "estimated",
      openingHours: "05:00 – 14:00",
      description:
        "Bustling market streets offering fresh sushi, tamagoyaki omelets, grilled seafood skewers, and Wagyu bites.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Tokyo Skytree Observation Deck",
      category: "attraction",
      address: "1-1-2 Oshiage, Sumida City, Tokyo 131-0045",
      latitude: 35.7101,
      longitude: 139.8107,
      rating: 4.6,
      estimatedCostMin: 2100,
      estimatedCostMax: 3500,
      costType: "listed",
      openingHours: "10:00 – 21:00",
      description:
        "Japan's tallest structure offering 360-degree panoramic views of Greater Tokyo and Mount Fuji on clear days.",
      isVerified: true,
      source: "curated",
    },
  ],
};

/**
 * Searches Google Places Text Search API if API Key is configured.
 */
async function searchGooglePlaces(query: string, apiKey: string): Promise<RealPlace[]> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = (await res.json()) as {
      results?: Array<{
        name?: string;
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
        rating?: number;
        price_level?: number;
        types?: string[];
        opening_hours?: { open_now?: boolean };
      }>;
    };

    if (!json.results || json.results.length === 0) return [];

    return json.results.slice(0, 10).map((p) => {
      const types = p.types || [];
      let category: RealPlace["category"] = "attraction";
      if (types.includes("restaurant") || types.includes("food") || types.includes("cafe"))
        category = "restaurant";
      else if (types.includes("shopping_mall") || types.includes("store")) category = "shopping";
      else if (types.includes("park") || types.includes("natural_feature")) category = "nature";
      else if (types.includes("museum") || types.includes("art_gallery")) category = "culture";
      else if (
        types.includes("place_of_worship") ||
        types.includes("church") ||
        types.includes("hindu_temple")
      )
        category = "history";

      return {
        name: p.name || query,
        category,
        address: p.formatted_address || "",
        latitude: p.geometry?.location?.lat,
        longitude: p.geometry?.location?.lng,
        rating: p.rating,
        priceLevel: p.price_level,
        costType: p.price_level === 0 ? "free" : "estimated",
        isVerified: true,
        source: "google_places",
      };
    });
  } catch (err) {
    console.warn("[REAL PLACES] Google Places API fetch error:", (err as Error).message);
    return [];
  }
}

/**
 * Searches OpenStreetMap Nominatim for real points of interest for a destination.
 */
async function searchOSMPlaces(destination: string): Promise<RealPlace[]> {
  try {
    const query = `tourist attraction in ${destination}`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "RoamPulseTravelApp/1.0 (roampulse@example.com)",
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as Array<{
      display_name?: string;
      lat?: string;
      lon?: string;
      type?: string;
    }>;

    if (!data || data.length === 0) return [];

    return data.map((item) => {
      const nameParts = (item.display_name || destination).split(",");
      const name = nameParts[0]?.trim() || destination;
      return {
        name,
        category: "attraction" as const,
        address: item.display_name,
        latitude: item.lat ? parseFloat(item.lat) : undefined,
        longitude: item.lon ? parseFloat(item.lon) : undefined,
        costType: "estimated" as const,
        isVerified: true,
        source: "osm" as const,
      };
    });
  } catch (err) {
    console.warn("[REAL PLACES] OSM fetch warning:", (err as Error).message);
    return [];
  }
}

/**
 * Fetches real-world place candidates for a destination to feed into Gemini.
 */
export async function fetchRealWorldPlaces(
  destination: string,
  _interests: string[] = [],
): Promise<RealPlace[]> {
  const normDest = destination.toLowerCase().trim();

  // Level 1: Google Places API if key exists
  const googleApiKey = process.env["GOOGLE_PLACES_API_KEY"] || process.env["GOOGLE_MAPS_API_KEY"];
  if (googleApiKey && googleApiKey.trim().length > 0) {
    console.log(`[REAL PLACES] Fetching live Google Places API for ${destination}`);
    const places = await searchGooglePlaces(
      `top attractions and restaurants in ${destination}`,
      googleApiKey,
    );
    if (places.length > 0) return places;
  }

  // Level 2: Curated knowledge base if available
  const matchedKey = Object.keys(CURATED_DESTINATION_PLACES).find((k) => normDest.includes(k));
  if (matchedKey && CURATED_DESTINATION_PLACES[matchedKey]) {
    console.log(`[REAL PLACES] Using curated real-world place catalog for ${destination}`);
    return CURATED_DESTINATION_PLACES[matchedKey]!;
  }

  // Level 3: OpenStreetMap Nominatim POI search
  console.log(`[REAL PLACES] Fetching OpenStreetMap POIs for ${destination}`);
  const osmPlaces = await searchOSMPlaces(destination);
  if (osmPlaces.length > 0) return osmPlaces;

  return [];
}
