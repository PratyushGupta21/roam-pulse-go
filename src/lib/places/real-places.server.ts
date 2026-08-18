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
  address?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  rating?: number | undefined;
  priceLevel?: number | undefined;
  estimatedCostMin?: number | undefined;
  estimatedCostMax?: number | undefined;
  costType?: "free" | "estimated" | "listed" | undefined;
  openingHours?: string | undefined;
  description?: string | undefined;
  isVerified: boolean;
  source: "google_places" | "osm" | "curated";
}

// Curated landmark & activity database for instant, zero-latency real-world place fallback
const CURATED_DESTINATION_PLACES: Record<string, RealPlace[]> = {
  islamabad: [
    {
      name: "Faisal Mosque",
      category: "history",
      address: "Shah Faisal Ave, E-8, Islamabad, Pakistan",
      latitude: 33.7297,
      longitude: 73.0372,
      rating: 4.8,
      estimatedCostMin: 0,
      estimatedCostMax: 0,
      costType: "free",
      openingHours: "08:00 – 20:00",
      description:
        "Iconic contemporary mosque with distinctive bedouin tent architecture at the foot of Margalla Hills.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Pakistan Monument & Museum",
      category: "culture",
      address: "Shakarparian Hills, Islamabad, Pakistan",
      latitude: 33.6934,
      longitude: 73.0683,
      rating: 4.7,
      estimatedCostMin: 50,
      estimatedCostMax: 200,
      costType: "listed",
      openingHours: "10:00 – 20:00",
      description:
        "National monument shaped like a blooming flower representing the four provinces and three territories.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Lok Virsa Heritage Museum",
      category: "culture",
      address: "Garden Ave, Shakarparian, Islamabad, Pakistan",
      latitude: 33.6896,
      longitude: 73.0726,
      rating: 4.6,
      estimatedCostMin: 100,
      estimatedCostMax: 500,
      costType: "listed",
      openingHours: "10:00 – 19:00",
      description:
        "Cultural museum exhibiting Pakistani folk music, art, traditional handicrafts, and heritage dioramas.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Daman-e-Koh Hilltop Viewpoint",
      category: "nature",
      address: "Margalla Hills National Park, Daman-e-Koh Rd, Islamabad, Pakistan",
      latitude: 33.7471,
      longitude: 73.0575,
      rating: 4.6,
      estimatedCostMin: 0,
      estimatedCostMax: 0,
      costType: "free",
      openingHours: "09:00 – 23:00",
      description:
        "Garden and terrace viewpoint in the Margalla Hills offering panoramic views of Islamabad and Rawal Lake.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Saidpur Heritage Village",
      category: "history",
      address: "Saidpur Road, Off Garden Ave, Islamabad, Pakistan",
      latitude: 33.7408,
      longitude: 73.0673,
      rating: 4.5,
      estimatedCostMin: 0,
      estimatedCostMax: 1000,
      costType: "estimated",
      openingHours: "09:00 – 23:00",
      description:
        "Historic Mughal-era village featuring restored Hindu temples, traditional architecture, and hillside cafes.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Monal Restaurant (Margalla Hills)",
      category: "restaurant",
      address: "Pir Sohawa Rd, Islamabad, Pakistan",
      latitude: 33.7661,
      longitude: 73.0617,
      rating: 4.6,
      estimatedCostMin: 1200,
      estimatedCostMax: 3000,
      costType: "estimated",
      openingHours: "09:00 – 00:00",
      description:
        "Famous hilltop restaurant serving authentic Pakistani BBQ, Karahi, and Continental dishes with city lights view.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Rawal Lake Promenade & Lake View Park",
      category: "nature",
      address: "Murree Rd, Islamabad, Pakistan",
      latitude: 33.7025,
      longitude: 73.1256,
      rating: 4.5,
      estimatedCostMin: 50,
      estimatedCostMax: 300,
      costType: "listed",
      openingHours: "08:00 – 22:00",
      description:
        "Recreational park along Rawal Dam reservoir featuring boating, bird aviaries, and lakeside walking trails.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Margalla Hills Trail 3",
      category: "nature",
      address: "Margalla Road, F-6, Islamabad, Pakistan",
      latitude: 33.7381,
      longitude: 73.0722,
      rating: 4.7,
      estimatedCostMin: 0,
      estimatedCostMax: 0,
      costType: "free",
      openingHours: "06:00 – 19:00",
      description:
        "Popular hiking trail climbing through Margalla Hills National Park up to Viewpoint and Monal.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Centaurus Mall & Food Court",
      category: "shopping",
      address: "Jinnah Ave, F-8/4, Islamabad, Pakistan",
      latitude: 33.7082,
      longitude: 73.0487,
      rating: 4.5,
      estimatedCostMin: 300,
      estimatedCostMax: 2000,
      costType: "estimated",
      openingHours: "11:00 – 23:00",
      description:
        "Premier shopping complex in central Islamabad with international brands, cinema, and extensive food court.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Kabul Restaurant (F-7 Markaz)",
      category: "restaurant",
      address: "Jinnah Super Market, F-7 Markaz, Islamabad, Pakistan",
      latitude: 33.7214,
      longitude: 73.0568,
      rating: 4.5,
      estimatedCostMin: 800,
      estimatedCostMax: 2000,
      costType: "estimated",
      openingHours: "12:00 – 00:00",
      description:
        "Renowned traditional restaurant serving authentic Afghan Kabuli Pulao, Lamb Tikka, and Naan in F-7 Markaz.",
      isVerified: true,
      source: "curated",
    },
  ],
  shimla: [
    {
      name: "The Ridge & Christ Church",
      category: "culture",
      address: "The Ridge, Mall Road, Shimla, Himachal Pradesh 171001",
      latitude: 31.1048,
      longitude: 77.1734,
      rating: 4.7,
      estimatedCostMin: 0,
      estimatedCostMax: 0,
      costType: "free",
      openingHours: "Open 24 Hours",
      description:
        "Open pedestrian esplanade with neo-Gothic Christ Church built in 1857 and vistas of the Himalayas.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Mall Road Promenade",
      category: "shopping",
      address: "Mall Road, Shimla, Himachal Pradesh 171001",
      latitude: 31.1042,
      longitude: 77.1725,
      rating: 4.6,
      estimatedCostMin: 200,
      estimatedCostMax: 1500,
      costType: "estimated",
      openingHours: "09:00 – 21:00",
      description:
        "Pedestrian street lined with heritage shops, cafes, wooden handicrafts, Himachali shawls, and eateries.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Jakhu Temple & Hanuman Statue",
      category: "history",
      address: "Jakhu Hill, Shimla, Himachal Pradesh 171001",
      latitude: 31.1014,
      longitude: 77.1849,
      rating: 4.6,
      estimatedCostMin: 0,
      estimatedCostMax: 500,
      costType: "free",
      openingHours: "07:00 – 20:00",
      description:
        "Ancient temple atop Shimla's highest peak (8,051 ft) featuring a 108-ft statue of Lord Hanuman.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Viceregal Lodge (Rashtrapati Niwas)",
      category: "history",
      address: "Observatory Hill, Shimla, Himachal Pradesh 171005",
      latitude: 31.1028,
      longitude: 77.1408,
      rating: 4.6,
      estimatedCostMin: 50,
      estimatedCostMax: 150,
      costType: "listed",
      openingHours: "10:00 – 17:00",
      description:
        "Jacobethan-style summer residence of British viceroys, now housing the Indian Institute of Advanced Study.",
      isVerified: true,
      source: "curated",
    },
  ],
  paris: [
    {
      name: "Eiffel Tower",
      category: "attraction",
      address: "Champ de Mars, 5 Av. Anatole France, 75007 Paris, France",
      latitude: 48.8584,
      longitude: 2.2945,
      rating: 4.7,
      estimatedCostMin: 18,
      estimatedCostMax: 35,
      costType: "listed",
      openingHours: "09:30 – 23:45",
      description: "Iconic wrought-iron lattice tower on the Champ de Mars in Paris.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Louvre Museum",
      category: "culture",
      address: "75001 Paris, France",
      latitude: 48.8606,
      longitude: 2.3376,
      rating: 4.7,
      estimatedCostMin: 22,
      estimatedCostMax: 22,
      costType: "listed",
      openingHours: "09:00 – 18:00",
      description:
        "World's largest art museum housing masterworks like the Mona Lisa and Venus de Milo.",
      isVerified: true,
      source: "curated",
    },
  ],
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
    {
      name: "Panna Meena ka Kund",
      category: "history",
      address: "Near Anokhi Museum, Amer, Jaipur, Rajasthan 302001",
      latitude: 26.9892,
      longitude: 75.8496,
      rating: 4.5,
      estimatedCostMin: 0,
      estimatedCostMax: 100,
      costType: "free",
      openingHours: "07:00 – 18:00",
      description:
        "16th-century symmetrical stepwell near Amer Fort, famous for geometric staircases.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Jaigarh Fort & Jaivana Cannon",
      category: "history",
      address: "Devisinghpura, Amer, Jaipur, Rajasthan 302001",
      latitude: 26.9839,
      longitude: 75.8427,
      rating: 4.6,
      estimatedCostMin: 150,
      estimatedCostMax: 300,
      costType: "listed",
      openingHours: "09:00 – 16:30",
      description:
        "Formidable hilltop fortress connected to Amer Fort, housing the world's largest cannon on wheels.",
      isVerified: true,
      source: "curated",
    },
    {
      name: "Tapri Central Tea House",
      category: "restaurant",
      address: "C-Scheme, Ashok Nagar, Jaipur, Rajasthan 302001",
      latitude: 26.9085,
      longitude: 75.8089,
      rating: 4.6,
      estimatedCostMin: 300,
      estimatedCostMax: 700,
      costType: "estimated",
      openingHours: "07:30 – 22:15",
      description:
        "Vibrant rooftop tea café overlooking Central Park, serving cutting chai, vada pav, and fusion bites.",
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

import {
  haversineDistanceKm,
  isWithinDestinationRegion,
  isValidCoordinates,
  resolveDestinationCoordinates,
} from "../maps/geocoding";

/**
 * Searches single query against Google Places Text Search API.
 */
async function fetchGooglePlacesQuery(query: string, apiKey: string): Promise<RealPlace[]> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    const res = await fetch(url);
    console.log(`[RoamPulse] Google Places HTTP status: ${res.status} | query: ${query}`);
    if (!res.ok) {
      console.warn(`[RoamPulse] Google Places API HTTP error: ${res.status}`);
      return [];
    }

    const json = (await res.json()) as {
      status?: string;
      error_message?: string;
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

    console.log(`[RoamPulse] Google Places JSON status: ${json.status || "UNKNOWN"}`);
    if (json.status && json.status !== "OK" && json.status !== "ZERO_RESULTS") {
      console.warn(
        `[RoamPulse] Google Places API returned error status ${json.status}: ${json.error_message || "No detail message"}`,
      );
    }

    if (!json.results || json.results.length === 0) return [];

    return json.results.slice(0, 12).map((p) => {
      const types = p.types || [];
      let category: RealPlace["category"] = "attraction";
      if (types.includes("restaurant") || types.includes("food") || types.includes("cafe"))
        category = "restaurant";
      else if (
        types.includes("shopping_mall") ||
        types.includes("store") ||
        types.includes("market")
      )
        category = "shopping";
      else if (types.includes("park") || types.includes("natural_feature")) category = "nature";
      else if (types.includes("museum") || types.includes("art_gallery")) category = "culture";
      else if (
        types.includes("place_of_worship") ||
        types.includes("church") ||
        types.includes("hindu_temple") ||
        types.includes("mosque")
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
    console.warn("[RoamPulse] Google Places query error:", (err as Error).message);
    return [];
  }
}

/**
 * Executes multi-query search against Google Places API to gather diverse attractions and restaurants.
 */
async function searchGooglePlaces(destination: string, apiKey: string): Promise<RealPlace[]> {
  console.log(`[RoamPulse] Google Places lookup started | destination: ${destination}`);
  const queries = [
    `top tourist attractions in ${destination}`,
    `best restaurants and cafes in ${destination}`,
    `historic landmarks and culture in ${destination}`,
    `famous parks viewpoints and markets in ${destination}`,
  ];

  try {
    const resultsArrays = await Promise.all(queries.map((q) => fetchGooglePlacesQuery(q, apiKey)));
    const combined = resultsArrays.flat();

    // Deduplicate by normalized name
    const seen = new Set<string>();
    const deduplicated: RealPlace[] = [];

    for (const place of combined) {
      const norm = place.name.toLowerCase().trim();
      if (!seen.has(norm)) {
        seen.add(norm);
        deduplicated.push(place);
      }
    }

    console.log(
      `[RoamPulse] Google Places candidates returned: ${combined.length} | unique: ${deduplicated.length}`,
    );
    return deduplicated;
  } catch (err) {
    console.warn("[RoamPulse] Google Places multi-query search error:", (err as Error).message);
    return [];
  }
}

/**
 * Searches OpenStreetMap Nominatim for real points of interest for a destination.
 */
async function searchOSMPlaces(destination: string): Promise<RealPlace[]> {
  const queries = [
    `attractions in ${destination}`,
    `landmarks in ${destination}`,
    `restaurants in ${destination}`,
    `museums in ${destination}`,
    `${destination}`,
  ];

  try {
    const results = await Promise.all(
      queries.map(async (query) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query,
        )}&limit=12`;
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
          class?: string;
        }>;

        if (!data || data.length === 0) return [];

        return data.map((item) => {
          const nameParts = (item.display_name || destination).split(",");
          const name = nameParts[0]?.trim() || destination;
          let cat: RealPlace["category"] = "attraction";
          if (
            item.class === "amenity" &&
            (item.type === "restaurant" || item.type === "cafe" || item.type === "fast_food")
          ) {
            cat = "restaurant";
          } else if (item.class === "tourism" || item.class === "historic") {
            cat = "culture";
          } else if (item.class === "leisure" || item.type === "park") {
            cat = "nature";
          }
          return {
            name,
            category: cat,
            address: item.display_name,
            latitude: item.lat ? parseFloat(item.lat) : undefined,
            longitude: item.lon ? parseFloat(item.lon) : undefined,
            costType: "estimated" as const,
            isVerified: true,
            source: "osm" as const,
          };
        });
      }),
    );

    const combined = results.flat();
    const seen = new Set<string>();
    const deduplicated: RealPlace[] = [];

    for (const place of combined) {
      const norm = place.name.toLowerCase().trim();
      if (!seen.has(norm) && norm.length > 3) {
        seen.add(norm);
        deduplicated.push(place);
      }
    }

    console.log(`[RoamPulse] OSM POIs returned: ${deduplicated.length} for ${destination}`);
    return deduplicated;
  } catch (err) {
    console.warn("[RoamPulse] OSM fetch warning:", (err as Error).message);
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
  console.log(`[RoamPulse] PLACE SEARCH START`);
  console.log(`[RoamPulse] place search destination: ${destination}`);

  const normDest = destination.toLowerCase().trim();
  const canonical = await resolveDestinationCoordinates(destination);

  let rawCandidates: RealPlace[] = [];

  // Level 1: Google Places API if key exists
  const googleApiKey = process.env["GOOGLE_PLACES_API_KEY"] || process.env["GOOGLE_MAPS_API_KEY"];
  const isGoogleKeyPresent = Boolean(googleApiKey && googleApiKey.trim().length > 0);
  console.log(`[RoamPulse] Google Places API key present: ${isGoogleKeyPresent}`);

  if (isGoogleKeyPresent) {
    console.log(`[REAL PLACES] Fetching multi-query Google Places API for ${destination}`);
    rawCandidates = await searchGooglePlaces(destination, googleApiKey!.trim());
  }

  // Level 2: Curated knowledge base fallback if Google Places returned nothing
  if (rawCandidates.length === 0) {
    const matchedKey = Object.keys(CURATED_DESTINATION_PLACES).find((k) => normDest.includes(k));
    if (matchedKey && CURATED_DESTINATION_PLACES[matchedKey]) {
      console.log(`[REAL PLACES] Using curated real-world place catalog for ${destination}`);
      rawCandidates = [...CURATED_DESTINATION_PLACES[matchedKey]!];
    }
  }

  // Level 3: OpenStreetMap Nominatim POI search fallback
  if (rawCandidates.length === 0) {
    console.log(`[REAL PLACES] Fetching OpenStreetMap POIs for ${destination}`);
    rawCandidates = await searchOSMPlaces(destination);
  }

  // Filter candidates against canonical destination proximity and log candidate distance checks
  let verifiedCandidates: RealPlace[] = rawCandidates;
  let acceptedCount = 0;
  let rejectedCount = 0;

  if (canonical && isValidCoordinates(canonical.latitude, canonical.longitude)) {
    const valid: RealPlace[] = [];

    for (const place of rawCandidates) {
      if (
        typeof place.latitude === "number" &&
        typeof place.longitude === "number" &&
        isValidCoordinates(place.latitude, place.longitude)
      ) {
        const distKm = haversineDistanceKm(
          canonical.latitude,
          canonical.longitude,
          place.latitude,
          place.longitude,
        );
        const accepted = isWithinDestinationRegion(
          canonical.latitude,
          canonical.longitude,
          place.latitude,
          place.longitude,
          150,
        );

        console.log(`[RoamPulse] PLACE CANDIDATE`);
        console.log(`name: ${place.name}`);
        console.log(`destination: ${destination}`);
        console.log(`distanceKm: ${distKm.toFixed(1)}`);
        console.log(`accepted: ${accepted}`);

        if (accepted) {
          valid.push(place);
          acceptedCount++;
        } else {
          rejectedCount++;
        }
      } else {
        // Place candidate without lat/lon is kept
        valid.push(place);
        acceptedCount++;
      }
    }

    verifiedCandidates = valid;
  } else {
    acceptedCount = rawCandidates.length;
  }

  console.log(`[RoamPulse] Google Places candidates accepted: ${acceptedCount}`);
  console.log(`[RoamPulse] Google Places candidates rejected: ${rejectedCount}`);
  console.log(
    `[RoamPulse] verified place candidates: ${verifiedCandidates.length} for ${destination}`,
  );
  return verifiedCandidates;
}
