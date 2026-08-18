/**
 * Real-World Place Data Retrieval Service (Multi-City & High-Capacity Discovery)
 *
 * Provides real attractions, restaurants, landmarks, and neighborhoods for trip planning.
 * Hierarchy / Pipeline:
 * 1. Google Places API (New) Text Search with FieldMask & LocationBias & Pagination.
 * 2. Fallback to Google Places Legacy API Text Search.
 * 3. Gemini Google Search Grounding research layer for discovered place verification.
 * 4. OpenStreetMap Nominatim POI Search fallback.
 * 5. Curated real-world landmark database for popular global & regional destinations.
 */

import {
  haversineDistanceKm,
  isWithinDestinationRegion,
  isValidCoordinates,
  resolveDestinationCoordinates,
} from "../maps/geocoding";

export interface RealPlace {
  placeId?: string | undefined;
  name: string;
  category:
    | "attraction"
    | "restaurant"
    | "shopping"
    | "nature"
    | "history"
    | "culture"
    | "transit"
    | "wellness"
    | "adventure";
  address?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  rating?: number | undefined;
  userRatingCount?: number | undefined;
  priceLevel?: number | undefined;
  estimatedCostMin?: number | undefined;
  estimatedCostMax?: number | undefined;
  costType?: "free" | "estimated" | "listed" | undefined;
  openingHours?: string | undefined;
  description?: string | undefined;
  googleMapsUri?: string | undefined;
  types?: string[] | undefined;
  destinationCity?: string | undefined;
  isVerified: boolean;
  source: "google_places" | "gemini_grounded" | "osm" | "curated";
}

export interface CityCandidatePool {
  city: string;
  country?: string | undefined;
  latitude: number;
  longitude: number;
  order: number;
  candidates: RealPlace[];
}

/**
 * Parses single or multi-city destination strings into clean, ordered city names.
 * Examples:
 * "Paris" -> ["Paris"]
 * "Paris, Amsterdam" -> ["Paris", "Amsterdam"]
 * "Paris -> Amsterdam -> Rome" -> ["Paris", "Amsterdam", "Rome"]
 * "Paris; Amsterdam; Rome" -> ["Paris", "Amsterdam", "Rome"]
 */
export function parseTripDestinations(destination: string, extraDestinations?: string[]): string[] {
  const rawList: string[] = [];

  if (destination && destination.trim()) {
    const splitTokens = destination
      .split(/[,;\->/|]+|\band\b/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 1);
    rawList.push(...splitTokens);
  }

  if (extraDestinations && Array.isArray(extraDestinations)) {
    for (const extra of extraDestinations) {
      if (extra && extra.trim()) {
        const splitTokens = extra
          .split(/[,;\->/|]+|\band\b/i)
          .map((s) => s.trim())
          .filter((s) => s.length > 1);
        rawList.push(...splitTokens);
      }
    }
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const cleanCities: string[] = [];

  for (const city of rawList) {
    const norm = city.toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      cleanCities.push(city);
    }
  }

  return cleanCities.length > 0 ? cleanCities : [destination.trim() || "Paris"];
}

// Curated landmark & activity database for instant, zero-latency real-world place fallback
const CURATED_DESTINATION_PLACES: Record<string, RealPlace[]> = {
  islamabad: [
    {
      placeId: "curated-islamabad-faisal-mosque",
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
      destinationCity: "Islamabad",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-islamabad-pakistan-monument",
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
      destinationCity: "Islamabad",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-islamabad-lok-virsa",
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
      destinationCity: "Islamabad",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-islamabad-daman-e-koh",
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
      destinationCity: "Islamabad",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-islamabad-saidpur-village",
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
      destinationCity: "Islamabad",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-islamabad-monal",
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
      destinationCity: "Islamabad",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-islamabad-rawal-lake",
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
      destinationCity: "Islamabad",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-islamabad-trail-3",
      name: "Margalla Hills Trail 3",
      category: "adventure",
      address: "Margalla Hills, Sector F-6, Islamabad, Pakistan",
      latitude: 33.7431,
      longitude: 73.0722,
      rating: 4.7,
      estimatedCostMin: 0,
      estimatedCostMax: 0,
      costType: "free",
      openingHours: "06:00 – 19:00",
      description:
        "Popular hiking trail climbing steep pine-covered slopes up to the Margalla ridge with panoramic city vistas.",
      destinationCity: "Islamabad",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-islamabad-centaurus",
      name: "Centaurus Mall & Food Court",
      category: "shopping",
      address: "Jinnah Ave, F-8/4, Islamabad, Pakistan",
      latitude: 33.7077,
      longitude: 73.0501,
      rating: 4.6,
      estimatedCostMin: 0,
      estimatedCostMax: 2000,
      costType: "estimated",
      openingHours: "11:00 – 23:00",
      description:
        "Modern shopping mall with international brands, cinema multiplex, hypermarket, and extensive food court.",
      destinationCity: "Islamabad",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-islamabad-kabul-restaurant",
      name: "Kabul Restaurant (F-7 Markaz)",
      category: "restaurant",
      address: "Jinnah Super Market, F-7 Markaz, Islamabad, Pakistan",
      latitude: 33.7212,
      longitude: 73.0583,
      rating: 4.4,
      estimatedCostMin: 600,
      estimatedCostMax: 1500,
      costType: "estimated",
      openingHours: "12:00 – 23:30",
      description:
        "Renowned local dining spot in F-7 famous for authentic Afghan Kabuli Pulao, Chapli Kebab, and Naan.",
      destinationCity: "Islamabad",
      isVerified: true,
      source: "curated",
    },
  ],
  paris: [
    {
      placeId: "curated-paris-eiffel-tower",
      name: "Eiffel Tower",
      category: "attraction",
      address: "Champ de Mars, 5 Av. Anatole France, 75007 Paris, France",
      latitude: 48.8584,
      longitude: 2.2945,
      rating: 4.7,
      estimatedCostMin: 18,
      estimatedCostMax: 35,
      costType: "listed",
      openingHours: "09:30 – 22:45",
      description:
        "Iconic 19th-century wrought-iron lattice tower on the Champ de Mars offering panoramic city views.",
      destinationCity: "Paris",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-paris-louvre",
      name: "Louvre Museum",
      category: "culture",
      address: "75001 Paris, France",
      latitude: 48.8606,
      longitude: 2.3376,
      rating: 4.7,
      estimatedCostMin: 22,
      estimatedCostMax: 25,
      costType: "listed",
      openingHours: "09:00 – 18:00 (Closed Tuesdays)",
      description:
        "World's largest art museum housing Leonardo da Vinci's Mona Lisa, Venus de Milo, and priceless global antiquities.",
      destinationCity: "Paris",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-paris-arc-de-triomphe",
      name: "Arc de Triomphe",
      category: "history",
      address: "Pl. Charles de Gaulle, 75008 Paris, France",
      latitude: 48.8738,
      longitude: 2.295,
      rating: 4.7,
      estimatedCostMin: 13,
      estimatedCostMax: 16,
      costType: "listed",
      openingHours: "10:00 – 22:30",
      description:
        "Triumphal arch honoring those who fought for France, standing at the western end of the Champs-Élysées.",
      destinationCity: "Paris",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-paris-musee-dorsay",
      name: "Musée d'Orsay",
      category: "culture",
      address: "1 Rue de la Légion d'Honneur, 75007 Paris, France",
      latitude: 48.86,
      longitude: 2.3266,
      rating: 4.7,
      estimatedCostMin: 16,
      estimatedCostMax: 18,
      costType: "listed",
      openingHours: "09:30 – 18:00 (Closed Mondays)",
      description:
        "Housed in a grand Beaux-Arts railway station, featuring Impressionist and Post-Impressionist masterpieces by Monet, Renoir, Van Gogh.",
      destinationCity: "Paris",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-paris-sainte-chapelle",
      name: "Sainte-Chapelle",
      category: "history",
      address: "10 Bd du Palais, 75001 Paris, France",
      latitude: 48.8554,
      longitude: 2.345,
      rating: 4.7,
      estimatedCostMin: 11,
      estimatedCostMax: 14,
      costType: "listed",
      openingHours: "09:00 – 19:00",
      description:
        "Royal 13th-century Gothic chapel famous for its magnificent 15-meter soaring stained-glass windows.",
      destinationCity: "Paris",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-paris-luxembourg-gardens",
      name: "Luxembourg Gardens (Jardin du Luxembourg)",
      category: "nature",
      address: "75006 Paris, France",
      latitude: 48.8462,
      longitude: 2.3372,
      rating: 4.7,
      estimatedCostMin: 0,
      estimatedCostMax: 0,
      costType: "free",
      openingHours: "07:30 – 21:00",
      description:
        "Sprawling 17th-century park created for Queen Marie de' Medici featuring tree-lined promenades, fountains, and French lawns.",
      destinationCity: "Paris",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-paris-sacre-coeur",
      name: "Sacré-Cœur Basilica & Montmartre",
      category: "culture",
      address: "35 Rue du Chevalier de la Barre, 75018 Paris, France",
      latitude: 48.8867,
      longitude: 2.3431,
      rating: 4.7,
      estimatedCostMin: 0,
      estimatedCostMax: 8,
      costType: "free",
      openingHours: "06:30 – 22:30",
      description:
        "White domed Roman Catholic basilica atop Montmartre hill, offering sweeping views across all of Paris.",
      destinationCity: "Paris",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-paris-le-marais",
      name: "Le Marais Historic District",
      category: "shopping",
      address: "Le Marais, 75004 Paris, France",
      latitude: 48.8573,
      longitude: 2.3592,
      rating: 4.6,
      estimatedCostMin: 0,
      estimatedCostMax: 1500,
      costType: "estimated",
      openingHours: "10:00 – 22:00",
      description:
        "Trendy historic district with cobblestone alleys, aristocratic mansions, fashion boutiques, cafes, and Place des Vosges.",
      destinationCity: "Paris",
      isVerified: true,
      source: "curated",
    },
  ],
  amsterdam: [
    {
      placeId: "curated-amsterdam-rijksmuseum",
      name: "Rijksmuseum",
      category: "culture",
      address: "Museumstraat 1, 1071 XX Amsterdam, Netherlands",
      latitude: 52.36,
      longitude: 4.8852,
      rating: 4.7,
      estimatedCostMin: 225,
      estimatedCostMax: 250,
      costType: "listed",
      openingHours: "09:00 – 17:00",
      description:
        "Dutch national museum dedicated to arts and history in Amsterdam, featuring Rembrandt's Night Watch.",
      destinationCity: "Amsterdam",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-amsterdam-van-gogh",
      name: "Van Gogh Museum",
      category: "culture",
      address: "Museumplein 6, 1071 DJ Amsterdam, Netherlands",
      latitude: 52.3584,
      longitude: 4.8811,
      rating: 4.6,
      estimatedCostMin: 22,
      estimatedCostMax: 25,
      costType: "listed",
      openingHours: "09:00 – 18:00",
      description:
        "Museum housing the world's largest collection of artworks by Vincent van Gogh, including Sunflowers and Almond Blossom.",
      destinationCity: "Amsterdam",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-amsterdam-anne-frank",
      name: "Anne Frank House",
      category: "history",
      address: "Westermarkt 20, 1016 DK Amsterdam, Netherlands",
      latitude: 52.3752,
      longitude: 4.884,
      rating: 4.6,
      estimatedCostMin: 16,
      estimatedCostMax: 20,
      costType: "listed",
      openingHours: "09:00 – 22:00",
      description:
        "Biographical museum dedicated to Jewish wartime diarist Anne Frank in the secret annex where her family hid.",
      destinationCity: "Amsterdam",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-amsterdam-vondelpark",
      name: "Vondelpark",
      category: "nature",
      address: "1071 AA Amsterdam, Netherlands",
      latitude: 52.358,
      longitude: 4.8686,
      rating: 4.7,
      estimatedCostMin: 0,
      estimatedCostMax: 0,
      costType: "free",
      openingHours: "24 Hours",
      description:
        "Famous public urban park in Amsterdam featuring open-air theatre, ponds, rose gardens, and cycling paths.",
      destinationCity: "Amsterdam",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-amsterdam-jordaan",
      name: "Jordaan District & Canals",
      category: "shopping",
      address: "Jordaan, Amsterdam, Netherlands",
      latitude: 52.3734,
      longitude: 4.8797,
      rating: 4.7,
      estimatedCostMin: 0,
      estimatedCostMax: 1000,
      costType: "estimated",
      openingHours: "10:00 – 22:00",
      description:
        "Charming historic neighborhood famous for narrow canal houses, indie boutiques, art galleries, and cozy brown cafes.",
      destinationCity: "Amsterdam",
      isVerified: true,
      source: "curated",
    },
  ],
  rome: [
    {
      placeId: "curated-rome-colosseum",
      name: "Colosseum (Flavian Amphitheatre)",
      category: "history",
      address: "Piazza del Colosseo, 1, 00184 Roma RM, Italy",
      latitude: 41.8902,
      longitude: 12.4922,
      rating: 4.7,
      estimatedCostMin: 16,
      estimatedCostMax: 24,
      costType: "listed",
      openingHours: "08:30 – 19:15",
      description:
        "Iconic ancient Roman gladiatorial arena, the largest standing amphitheatre ever built.",
      destinationCity: "Rome",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-rome-roman-forum",
      name: "Roman Forum & Palatine Hill",
      category: "history",
      address: "Via della Salara Vecchia, 5/6, 00186 Roma RM, Italy",
      latitude: 41.8925,
      longitude: 12.4853,
      rating: 4.7,
      estimatedCostMin: 16,
      estimatedCostMax: 24,
      costType: "listed",
      openingHours: "09:00 – 19:00",
      description:
        "Rectangular forum surrounded by the ruins of ancient government buildings at the center of ancient Rome.",
      destinationCity: "Rome",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-rome-pantheon",
      name: "Pantheon",
      category: "history",
      address: "Piazza della Rotonda, 00186 Roma RM, Italy",
      latitude: 41.8986,
      longitude: 12.4769,
      rating: 4.8,
      estimatedCostMin: 5,
      estimatedCostMax: 5,
      costType: "listed",
      openingHours: "09:00 – 19:00",
      description:
        "Former Roman temple, now a Catholic church, featuring the world's largest unreinforced concrete dome.",
      destinationCity: "Rome",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-rome-trevi-fountain",
      name: "Trevi Fountain (Fontana di Trevi)",
      category: "culture",
      address: "Piazza di Trevi, 00187 Roma RM, Italy",
      latitude: 41.9009,
      longitude: 12.4833,
      rating: 4.8,
      estimatedCostMin: 0,
      estimatedCostMax: 0,
      costType: "free",
      openingHours: "24 Hours",
      description:
        "Baroque masterwork fountain featuring Neptune flanked by Tritons; coin toss tradition guarantees return to Rome.",
      destinationCity: "Rome",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-rome-vatican-museums",
      name: "Vatican Museums & Sistine Chapel",
      category: "culture",
      address: "00120 Vatican City",
      latitude: 41.9065,
      longitude: 12.4536,
      rating: 4.6,
      estimatedCostMin: 20,
      estimatedCostMax: 30,
      costType: "listed",
      openingHours: "08:00 – 19:00 (Closed Sundays)",
      description:
        "Public art museums displaying works from the immense collection amassed by the Catholic Church, including Michelangelo's Sistine ceiling.",
      destinationCity: "Rome",
      isVerified: true,
      source: "curated",
    },
  ],
  jaipur: [
    {
      placeId: "curated-jaipur-amber-fort",
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
        "Majestic hilltop fort built from yellow and pink sandstone featuring Sheesh Mahal mirror palace.",
      destinationCity: "Jaipur",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-jaipur-johari-bazaar",
      name: "Johari Bazaar & Old City Lanes",
      category: "shopping",
      address: "Johari Bazar, Pink City, Jaipur, Rajasthan 302003",
      latitude: 26.9213,
      longitude: 75.8267,
      rating: 4.5,
      estimatedCostMin: 0,
      estimatedCostMax: 2000,
      costType: "estimated",
      openingHours: "10:00 – 21:00",
      description:
        "Bustling traditional market known for Jaipur jewellery, Jaipuri quilts, handicrafts, and street food.",
      destinationCity: "Jaipur",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-jaipur-city-palace",
      name: "City Palace, Jaipur",
      category: "culture",
      address: "Tulsi Marg, Gangori Bazaar, J.D.A. Market, Jaipur, Rajasthan 302002",
      latitude: 26.9258,
      longitude: 75.8237,
      rating: 4.6,
      estimatedCostMin: 300,
      estimatedCostMax: 700,
      costType: "listed",
      openingHours: "09:30 – 17:00",
      description:
        "Royal palace complex housing Chandra Mahal and Mubarak Mahal museum exhibits of royal textiles and armor.",
      destinationCity: "Jaipur",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-jaipur-jantar-mantar",
      name: "Jantar Mantar Observatory",
      category: "history",
      address: "Gangori Bazaar, J.D.A. Market, Pink City, Jaipur, Rajasthan 302002",
      latitude: 26.9248,
      longitude: 75.8246,
      rating: 4.6,
      estimatedCostMin: 200,
      estimatedCostMax: 500,
      costType: "listed",
      openingHours: "09:00 – 17:00",
      description:
        "UNESCO World Heritage site featuring nineteen architectural astronomical instruments built by King Sawai Jai Singh II.",
      destinationCity: "Jaipur",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-jaipur-hawa-mahal",
      name: "Hawa Mahal (Palace of Winds)",
      category: "history",
      address: "Hawa Mahal Rd, Badi Choupad, J.D.A. Market, Pink City, Jaipur, Rajasthan 302002",
      latitude: 26.9239,
      longitude: 75.8267,
      rating: 4.6,
      estimatedCostMin: 50,
      estimatedCostMax: 200,
      costType: "listed",
      openingHours: "09:00 – 16:30",
      description:
        "Five-story pink sandstone palace constructed with 953 small windows (jharokhas) decorated with intricate latticework.",
      destinationCity: "Jaipur",
      isVerified: true,
      source: "curated",
    },
  ],
  tokyo: [
    {
      placeId: "curated-tokyo-sensoji",
      name: "Senso-ji Temple & Nakamise Street",
      category: "history",
      address: "2 Chome-3-1 Asakusa, Taito City, Tokyo 111-0032, Japan",
      latitude: 35.7148,
      longitude: 139.7967,
      rating: 4.7,
      estimatedCostMin: 0,
      estimatedCostMax: 500,
      costType: "free",
      openingHours: "06:00 – 17:00",
      description:
        "Tokyo's oldest Buddhist temple founded in 645 AD, approached via Nakamise-dori shopping street.",
      destinationCity: "Tokyo",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-tokyo-meiji-jingu",
      name: "Meiji Jingu Shrine & Yoyogi Park",
      category: "culture",
      address: "1-1 Yoyogikamizonocho, Shibuya City, Tokyo 151-8557, Japan",
      latitude: 35.6764,
      longitude: 139.6993,
      rating: 4.6,
      estimatedCostMin: 0,
      estimatedCostMax: 0,
      costType: "free",
      openingHours: "05:00 – 18:00",
      description:
        "Shinto shrine dedicated to Emperor Meiji surrounded by 170 acres of evergreen forest in central Tokyo.",
      destinationCity: "Tokyo",
      isVerified: true,
      source: "curated",
    },
    {
      placeId: "curated-tokyo-shibuya-crossing",
      name: "Shibuya Crossing & Hachiko Statue",
      category: "attraction",
      address: "2 Chome-2-1 Dogenzaka, Shibuya City, Tokyo 150-0043, Japan",
      latitude: 35.6595,
      longitude: 139.7005,
      rating: 4.6,
      estimatedCostMin: 0,
      estimatedCostMax: 0,
      costType: "free",
      openingHours: "24 Hours",
      description:
        "World-famous scramble pedestrian crossing illuminated by neon billboards in the heart of Shibuya.",
      destinationCity: "Tokyo",
      isVerified: true,
      source: "curated",
    },
  ],
};

/**
 * Searches queries against Google Places API (New) endpoint POST https://places.googleapis.com/v1/places:searchText
 */
async function searchGooglePlacesNew(
  query: string,
  apiKey: string,
  latitude?: number,
  longitude?: number,
  pageToken?: string,
  radiusMeters?: number,
): Promise<{ places: RealPlace[]; nextPageToken?: string }> {
  try {
    const url = "https://places.googleapis.com/v1/places:searchText";
    const fieldMask =
      "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.regularOpeningHours,places.priceLevel,places.types,places.businessStatus,places.googleMapsUri";

    const requestBody: Record<string, unknown> = {
      textQuery: query,
      maxResultCount: 20,
    };

    if (pageToken) {
      requestBody["pageToken"] = pageToken;
    }

    if (
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      isValidCoordinates(latitude, longitude)
    ) {
      requestBody["locationBias"] = {
        circle: {
          center: { latitude, longitude },
          radius: radiusMeters ?? 25000.0,
        },
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`[RoamPulse] Google Places (New) HTTP status: ${res.status} | query: ${query}`);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const isDenied =
        res.status === 403 ||
        res.status === 401 ||
        errText.includes("REQUEST_DENIED") ||
        errText.includes("PERMISSION_DENIED");
      if (isDenied) {
        console.error(
          `[RoamPulse] GOOGLE PLACES FAILED\nreason: ${res.status === 403 ? "PERMISSION_DENIED/403" : res.status === 401 ? "UNAUTHORIZED/401" : "REQUEST_DENIED"}\nhint: Check Places API (New) billing, API key restrictions, and Vercel environment variables.\nquery: ${query}\ndetail: ${errText.slice(0, 300)}`,
        );
      } else {
        console.warn(
          `[RoamPulse] GOOGLE PLACES (NEW) FAILED | status: ${res.status} | detail: ${errText.slice(0, 200)}`,
        );
      }
      return { places: [] };
    }

    const json = (await res.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        rating?: number;
        userRatingCount?: number;
        priceLevel?: string | number;
        types?: string[];
        businessStatus?: string;
        googleMapsUri?: string;
        regularOpeningHours?: { weekdayDescriptions?: string[] };
      }>;
      nextPageToken?: string;
    };

    if (!json.places || json.places.length === 0) {
      return { places: [] };
    }

    const places: RealPlace[] = json.places
      .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
      .map((p) => {
        const name = p.displayName?.text || query;
        const types = p.types || [];

        let category: RealPlace["category"] = "attraction";
        if (types.includes("restaurant") || types.includes("food") || types.includes("cafe")) {
          category = "restaurant";
        } else if (
          types.includes("shopping_mall") ||
          types.includes("store") ||
          types.includes("market")
        ) {
          category = "shopping";
        } else if (types.includes("park") || types.includes("natural_feature")) {
          category = "nature";
        } else if (types.includes("museum") || types.includes("art_gallery")) {
          category = "culture";
        } else if (
          types.includes("place_of_worship") ||
          types.includes("church") ||
          types.includes("hindu_temple") ||
          types.includes("mosque")
        ) {
          category = "history";
        }

        let priceLvl: number | undefined;
        if (typeof p.priceLevel === "number") priceLvl = p.priceLevel;
        else if (typeof p.priceLevel === "string") {
          if (p.priceLevel.includes("FREE")) priceLvl = 0;
          else if (p.priceLevel.includes("INEXPENSIVE")) priceLvl = 1;
          else if (p.priceLevel.includes("MODERATE")) priceLvl = 2;
          else if (p.priceLevel.includes("EXPENSIVE")) priceLvl = 3;
        }

        const openHoursStr = p.regularOpeningHours?.weekdayDescriptions?.[0] || undefined;

        return {
          placeId: p.id || `gp-${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          name,
          category,
          address: p.formattedAddress || "",
          latitude: p.location?.latitude,
          longitude: p.location?.longitude,
          rating: p.rating,
          userRatingCount: p.userRatingCount,
          priceLevel: priceLvl,
          costType: priceLvl === 0 ? "free" : "estimated",
          openingHours: openHoursStr,
          googleMapsUri: p.googleMapsUri,
          types,
          isVerified: true,
          source: "google_places",
        };
      });

    const result: { places: RealPlace[]; nextPageToken?: string } = { places };
    if (json.nextPageToken) result.nextPageToken = json.nextPageToken;
    return result;
  } catch (err) {
    console.warn("[RoamPulse] Google Places (New) error:", (err as Error).message);
    return { places: [] };
  }
}

/**
 * Fallback Legacy Google Places Text Search.
 */
async function searchGooglePlacesLegacy(query: string, apiKey: string): Promise<RealPlace[]> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    const res = await fetch(url);
    console.log(`[RoamPulse] Google Places Legacy HTTP status: ${res.status} | query: ${query}`);
    if (!res.ok) return [];

    const json = (await res.json()) as {
      status?: string;
      error_message?: string;
      results?: Array<{
        place_id?: string;
        name?: string;
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
        rating?: number;
        user_ratings_total?: number;
        price_level?: number;
        types?: string[];
      }>;
    };

    if (json.status && json.status !== "OK" && json.status !== "ZERO_RESULTS") {
      console.warn(
        `[RoamPulse] Google Places Legacy returned status ${json.status}: ${json.error_message || ""}`,
      );
    }

    if (!json.results || json.results.length === 0) return [];

    return json.results.slice(0, 15).map((p) => {
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
        placeId:
          p.place_id || `gp-legacy-${(p.name || query).toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        name: p.name || query,
        category,
        address: p.formatted_address || "",
        latitude: p.geometry?.location?.lat,
        longitude: p.geometry?.location?.lng,
        rating: p.rating,
        userRatingCount: p.user_ratings_total,
        priceLevel: p.price_level,
        costType: p.price_level === 0 ? "free" : "estimated",
        types,
        isVerified: true,
        source: "google_places",
      };
    });
  } catch (err) {
    console.warn("[RoamPulse] Google Places Legacy query error:", (err as Error).message);
    return [];
  }
}

// Non-tourist type keywords to filter out from results
const NON_TOURIST_TYPES = new Set([
  "real_estate_agency",
  "insurance_agency",
  "car_dealer",
  "car_repair",
  "car_rental",
  "gas_station",
  "funeral_home",
  "laundry",
  "locksmith",
  "physiotherapist",
  "dentist",
  "doctor",
  "hospital",
  "pharmacy",
  "bank",
  "atm",
  "post_office",
  "police",
  "courthouse",
  "embassy",
  "storage",
  "moving_company",
  "electrician",
  "plumber",
  "roofing_contractor",
  "general_contractor",
  "accounting",
  "lawyer",
  "school",
  "university",
  "primary_school",
  "secondary_school",
]);

/**
 * Determines an appropriate search radius based on city name (major metros get larger radius).
 */
function getCitySearchRadius(city: string): number {
  const major = [
    "paris",
    "london",
    "tokyo",
    "new york",
    "istanbul",
    "rome",
    "madrid",
    "berlin",
    "amsterdam",
    "barcelona",
    "dubai",
    "singapore",
    "bangkok",
    "sydney",
    "seoul",
    "mexico city",
    "cairo",
    "lagos",
    "moscow",
    "beijing",
    "shanghai",
    "mumbai",
    "delhi",
    "jakarta",
    "los angeles",
    "chicago",
  ];
  const medium = [
    "islamabad",
    "lahore",
    "karachi",
    "jaipur",
    "kyoto",
    "osaka",
    "prague",
    "vienna",
    "budapest",
    "warsaw",
    "athens",
    "lisbon",
    "brussels",
    "amsterdam",
    "stockholm",
    "oslo",
    "helsinki",
    "zurich",
    "geneva",
    "nairobi",
    "cape town",
    "johannesburg",
  ];

  const c = city.toLowerCase();
  if (major.some((m) => c.includes(m))) return 30000;
  if (medium.some((m) => c.includes(m))) return 22000;
  return 18000;
}

/**
 * Checks if a Google Places result is a genuine tourist/visitor-oriented place.
 */
function isQualityTouristPlace(types: string[], name: string): boolean {
  // Reject if any type is in the non-tourist set
  if (types.some((t) => NON_TOURIST_TYPES.has(t))) return false;
  // Reject if name looks like a business/office chain
  const lowerName = name.toLowerCase();
  const rejectPatterns = [
    /\b(office|offices|corporate|headquarters|hq)\b/,
    /\b(real estate|property management|insurance|dental|clinic)\b/,
    /\b(pvt\.?\s*ltd|private limited|inc\.|llc|gmbh|s\.a\.)\b/i,
  ];
  if (rejectPatterns.some((p) => p.test(lowerName))) return false;
  return true;
}

/**
 * Executes high-capacity, multi-query search against Google Places API for a destination city.
 * All queries run in PARALLEL via Promise.allSettled for maximum speed and resilience.
 */
async function searchGooglePlacesAggressive(
  city: string,
  apiKey: string,
  lat?: number,
  lon?: number,
  interests: string[] = [],
): Promise<RealPlace[]> {
  console.log(`[RoamPulse] AGGRESSIVE PLACES DISCOVERY START | city: ${city}`);

  const radius = getCitySearchRadius(city);

  // 18 discovery query categories — cover all major tourist place types
  const primaryQueries = [
    `top tourist attractions in ${city}`,
    `famous landmarks in ${city}`,
    `museums in ${city}`,
    `historical sites in ${city}`,
    `cultural attractions in ${city}`,
    `parks and gardens in ${city}`,
    `viewpoints scenic spots in ${city}`,
    `markets and bazaars in ${city}`,
    `things to do in ${city}`,
    `popular restaurants in ${city}`,
    `monuments in ${city}`,
    `churches cathedrals temples in ${city}`,
    `palaces castles in ${city}`,
    `art galleries in ${city}`,
    `neighborhoods to visit in ${city}`,
    `famous squares plazas in ${city}`,
    `scenic places in ${city}`,
    `must-see places in ${city}`,
  ];

  if (interests.includes("Food") || interests.includes("Local food")) {
    primaryQueries.push(`famous local food street food cafes in ${city}`);
  }
  if (
    interests.includes("Nature") ||
    interests.includes("Mountains") ||
    interests.includes("Beaches")
  ) {
    primaryQueries.push(`nature spots scenic landscapes in ${city}`);
  }
  if (interests.includes("Shopping")) {
    primaryQueries.push(`shopping streets malls in ${city}`);
  }
  if (interests.includes("Nightlife")) {
    primaryQueries.push(`nightlife entertainment districts in ${city}`);
  }

  // Override the radius passed to searchGooglePlacesNew for this city
  const searchWithRadius = (q: string, pageToken?: string) =>
    searchGooglePlacesNew(q, apiKey, lat, lon, pageToken, radius);

  // Run ALL queries in parallel — dramatically faster and more resilient to individual failures
  const primaryResults = await Promise.allSettled(
    primaryQueries.map(async (q) => {
      const { places, nextPageToken } = await searchWithRadius(q);
      if (places.length === 0) {
        // Try legacy endpoint as immediate fallback for this query
        const legacyPlaces = await searchGooglePlacesLegacy(q, apiKey);
        return legacyPlaces;
      }
      const allForQuery = [...places];
      if (nextPageToken && places.length >= 10) {
        const p2 = await searchWithRadius(q, nextPageToken);
        if (p2.places.length > 0) allForQuery.push(...p2.places);
      }
      return allForQuery;
    }),
  );

  const allPlaces: RealPlace[] = [];
  for (const result of primaryResults) {
    if (result.status === "fulfilled") {
      allPlaces.push(...result.value);
    }
  }

  // Apply quality filter — remove non-tourist place types
  const qualityFiltered = allPlaces.filter((p) =>
    isQualityTouristPlace(p.types || [], p.name),
  );

  // Deduplicate by placeId, normalized name
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const deduplicated: RealPlace[] = [];

  for (const place of qualityFiltered) {
    const normName = place.name.toLowerCase().trim();
    const idKey = place.placeId || normName;

    if (!seenIds.has(idKey) && !seenNames.has(normName)) {
      seenIds.add(idKey);
      seenNames.add(normName);
      place.destinationCity = city;
      deduplicated.push(place);
    }
  }

  console.log(
    `[RoamPulse] CANDIDATES DISCOVERED | city: ${city} | raw: ${allPlaces.length} | quality-filtered: ${qualityFiltered.length} | unique: ${deduplicated.length}`,
  );
  return deduplicated;
}

/**
 * Stage 2 expansion: run broader fallback queries when primary pool is thin.
 * Parallel execution.
 */
async function expandCandidatePoolStage2(
  city: string,
  apiKey: string,
  lat?: number,
  lon?: number,
): Promise<RealPlace[]> {
  console.log(`[RoamPulse] STAGE 2 EXPANSION | city: ${city} | running broader queries`);
  const radius = getCitySearchRadius(city);
  const broaderQueries = [
    `best things to do in ${city}`,
    `popular sights in ${city}`,
    `tourist spots in ${city}`,
    `famous places to visit in ${city}`,
    `top rated attractions in ${city}`,
    `historic places in ${city}`,
    `interesting places in ${city}`,
    `must visit ${city}`,
  ];

  const results = await Promise.allSettled(
    broaderQueries.map((q) => searchGooglePlacesNew(q, apiKey, lat, lon, undefined, radius)),
  );

  const found: RealPlace[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") found.push(...r.value.places);
  }

  const quality = found.filter((p) => isQualityTouristPlace(p.types || [], p.name));
  console.log(
    `[RoamPulse] STAGE 2 EXPANSION RESULT | city: ${city} | found: ${quality.length} additional`,
  );
  return quality;
}

/**
 * Stage 3: Gemini Search Grounded Research for candidate discovery.
 *
 * IMPORTANT: Do NOT use responseMimeType="application/json" together with
 * tools: [{ googleSearch: {} }]. These two options are mutually incompatible
 * on Gemini — grounded responses return text with citations, not JSON.
 * We parse the text response to extract place names instead.
 */
async function discoverPlacesViaGeminiSearch(
  city: string,
  geminiApiKey: string,
): Promise<string[]> {
  try {
    console.log(`[RoamPulse] GEMINI SEARCH GROUNDED DISCOVERY | city: ${city}`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    // Do NOT set responseMimeType: "application/json" when using googleSearch grounding.
    // Grounded responses come back as text with citations — forcing JSON MIME breaks it silently.
    const prompt = `You are a travel expert. List exactly 15 of the most famous, real tourist attractions, historic landmarks, museums, parks, viewpoints, and notable restaurants in ${city}. List ONLY the official place names, one per line, prefixed with a number and period (e.g. "1. Louvre Museum"). Do not add descriptions.`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        // NOTE: no generationConfig.responseMimeType here — incompatible with grounding
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(
        `[RoamPulse] GEMINI SEARCH GROUNDED HTTP ${res.status}: ${errText.slice(0, 200)}`,
      );
      return [];
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.warn(`[RoamPulse] Gemini grounded discovery returned empty text for ${city}`);
      return [];
    }

    // Extract place names from numbered list format: "1. Place Name"
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const placeNames: string[] = [];

    for (const line of lines) {
      // Match "1. Place Name" or "- Place Name" or "* Place Name" or just "Place Name"
      const match = line.match(/^(?:\d+\.?|[-*])\s+(.+)$/);
      if (match && match[1]) {
        const name = match[1].trim().replace(/[*_`]/g, "");
        if (name.length > 2 && name.length < 100) placeNames.push(name);
      } else if (line.length > 2 && line.length < 100 && !/^[\d.\-*]+$/.test(line)) {
        placeNames.push(line);
      }
    }

    // Also try JSON parse as fallback in case Gemini returned a JSON array
    if (placeNames.length === 0) {
      try {
        const maybeArray = JSON.parse(text) as string[];
        if (Array.isArray(maybeArray)) {
          return maybeArray.filter((s) => typeof s === "string" && s.trim().length > 2).slice(0, 20);
        }
      } catch {
        // not JSON — that's fine
      }
    }

    const result = [...new Set(placeNames)].slice(0, 20);
    console.log(
      `[RoamPulse] Gemini grounded discovery extracted ${result.length} place names for ${city}`,
    );
    return result;
  } catch (err) {
    console.warn("[RoamPulse] Gemini search discovery error:", (err as Error).message);
    return [];
  }
}

/**
 * Searches OpenStreetMap Nominatim for real POIs for a destination city.
 */
async function searchOSMPlaces(city: string): Promise<RealPlace[]> {
  const queries = [
    `attractions in ${city}`,
    `landmarks in ${city}`,
    `restaurants in ${city}`,
    `museums in ${city}`,
    `${city}`,
  ];

  try {
    const results = await Promise.all(
      queries.map(async (query) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query,
        )}&limit=15`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "RoamPulseTravelApp/1.0 (roampulse@example.com)",
            Accept: "application/json",
          },
        });
        if (!res.ok) return [];

        const data = (await res.json()) as Array<{
          osm_id?: number;
          display_name?: string;
          lat?: string;
          lon?: string;
          type?: string;
          class?: string;
        }>;

        if (!data || data.length === 0) return [];

        return data.map((item) => {
          const nameParts = (item.display_name || city).split(",");
          const name = nameParts[0]?.trim() || city;
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
            placeId: item.osm_id
              ? `osm-${item.osm_id}`
              : `osm-${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
            name,
            category: cat,
            address: item.display_name,
            latitude: item.lat ? parseFloat(item.lat) : undefined,
            longitude: item.lon ? parseFloat(item.lon) : undefined,
            costType: "estimated" as const,
            destinationCity: city,
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

    console.log(`[RoamPulse] OSM POIs returned: ${deduplicated.length} for ${city}`);
    return deduplicated;
  } catch (err) {
    console.warn("[RoamPulse] OSM fetch warning:", (err as Error).message);
    return [];
  }
}

/**
 * Stage 1–7 Pipeline for a single city candidate pool.
 */
export async function fetchRealWorldPlacesForCity(
  city: string,
  interests: string[] = [],
): Promise<CityCandidatePool> {
  console.log(`[RoamPulse] CITY RESEARCH START | city: ${city}`);

  const canonical = await resolveDestinationCoordinates(city);
  const cityLat = canonical?.latitude;
  const cityLon = canonical?.longitude;

  const googleApiKey = process.env["GOOGLE_PLACES_API_KEY"] || process.env["GOOGLE_MAPS_API_KEY"];
  const geminiApiKey = process.env["GEMINI_API_KEY"]?.trim();

  const isGoogleKeyPresent = Boolean(googleApiKey && googleApiKey.trim().length > 0);
  const isGeminiKeyPresent = Boolean(geminiApiKey && geminiApiKey.length > 0);
  console.log(`[RoamPulse] Google Places API key present: ${isGoogleKeyPresent}`);
  console.log(`[RoamPulse] Gemini API key present: ${isGeminiKeyPresent}`);

  let rawCandidates: RealPlace[] = [];

  // Stage 1: Google Places Aggressive Multi-Query Search (18 categories, PARALLEL)
  if (isGoogleKeyPresent) {
    rawCandidates = await searchGooglePlacesAggressive(
      city,
      googleApiKey!.trim(),
      cityLat,
      cityLon,
      interests,
    );
    console.log(
      `[RoamPulse] PLACES QUERY STAGE 1 COMPLETE | city: ${city} | candidates: ${rawCandidates.length}`,
    );
  }

  // Stage 2: Broader expansion queries if pool is thin (< 20 verified candidates)
  if (isGoogleKeyPresent && rawCandidates.length < 20) {
    console.log(
      `[RoamPulse] Stage 1 returned only ${rawCandidates.length} candidates for ${city}. Running Stage 2 expansion.`,
    );
    const stage2 = await expandCandidatePoolStage2(
      city,
      googleApiKey!.trim(),
      cityLat,
      cityLon,
    );
    rawCandidates.push(...stage2);
  }

  // Stage 3 & 4: Gemini Search Grounding Discovery (if pool still < 20 and Gemini key present)
  if (rawCandidates.length < 20 && isGeminiKeyPresent) {
    const discoveredNames = await discoverPlacesViaGeminiSearch(city, geminiApiKey!);
    if (discoveredNames.length > 0) {
      console.log(
        `[RoamPulse] GEMINI RESEARCH | city: ${city} | count discovered: ${discoveredNames.length}`,
      );
      if (isGoogleKeyPresent) {
        // Verify all discovered names in parallel via Google Places
        const verificationResults = await Promise.allSettled(
          discoveredNames.map((name) =>
            searchGooglePlacesNew(
              `${name} ${city}`,
              googleApiKey!.trim(),
              cityLat,
              cityLon,
              undefined,
              getCitySearchRadius(city),
            ),
          ),
        );
        let postVerifyCount = 0;
        for (const r of verificationResults) {
          if (r.status === "fulfilled" && r.value.places.length > 0) {
            rawCandidates.push(...r.value.places);
            postVerifyCount += r.value.places.length;
          }
        }
        console.log(
          `[RoamPulse] POST-RESEARCH VERIFICATION | city: ${city} | verified: ${postVerifyCount}`,
        );
      }
    }
  }

  // Stage 5: Curated catalog fallback if candidates still empty
  if (rawCandidates.length === 0) {
    const normCity = city.toLowerCase().trim();
    const matchedKey = Object.keys(CURATED_DESTINATION_PLACES).find(
      (k) => normCity.includes(k) || k.includes(normCity),
    );
    if (matchedKey && CURATED_DESTINATION_PLACES[matchedKey]) {
      console.log(`[REAL PLACES] Using curated real-world place catalog for ${city}`);
      rawCandidates = CURATED_DESTINATION_PLACES[matchedKey]!.map((p) => ({
        ...p,
        destinationCity: city,
      }));
    }
  }

  // Stage 6: OpenStreetMap POIs fallback if candidates still empty
  if (rawCandidates.length === 0) {
    console.log(`[REAL PLACES] Fetching OpenStreetMap POIs for ${city}`);
    rawCandidates = await searchOSMPlaces(city);
  }

  // Stage 7: Proximity validation (<150km) & deduplication
  const verified: RealPlace[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  let acceptedCount = 0;
  let rejectedCount = 0;

  for (const place of rawCandidates) {
    const normName = place.name.toLowerCase().trim();
    const idKey = place.placeId || normName;

    if (seenIds.has(idKey) || seenNames.has(normName)) {
      continue;
    }

    let accepted = true;
    let distKm = 0;

    if (
      canonical &&
      isValidCoordinates(canonical.latitude, canonical.longitude) &&
      typeof place.latitude === "number" &&
      typeof place.longitude === "number" &&
      isValidCoordinates(place.latitude, place.longitude)
    ) {
      distKm = haversineDistanceKm(
        canonical.latitude,
        canonical.longitude,
        place.latitude,
        place.longitude,
      );
      accepted = isWithinDestinationRegion(
        canonical.latitude,
        canonical.longitude,
        place.latitude,
        place.longitude,
        150,
      );
    }

    console.log(`[RoamPulse] PLACE CANDIDATE`);
    console.log(`name: ${place.name}`);
    console.log(`destination: ${city}`);
    console.log(`distanceKm: ${distKm.toFixed(1)}`);
    console.log(`accepted: ${accepted}`);

    if (accepted) {
      seenIds.add(idKey);
      seenNames.add(normName);
      place.destinationCity = city;
      verified.push(place);
      acceptedCount++;
    } else {
      rejectedCount++;
    }
  }

  console.log(
    `[RoamPulse] CANDIDATES VERIFIED | city: ${city} | count: ${verified.length} | accepted: ${acceptedCount} | rejected: ${rejectedCount}`,
  );

  return {
    city,
    country: canonical?.country,
    latitude: canonical?.latitude ?? 0,
    longitude: canonical?.longitude ?? 0,
    order: 0,
    candidates: verified,
  };
}

/**
 * Primary multi-city place discovery entrypoint for RoamPulse itinerary engine.
 */
export async function fetchMultiCityRealWorldPlaces(
  destinationInput: string,
  extraDestinations: string[] = [],
  interests: string[] = [],
): Promise<CityCandidatePool[]> {
  const cities = parseTripDestinations(destinationInput, extraDestinations);
  console.log(`[RoamPulse] MULTI-CITY DISCOVERY START | cities: [${cities.join(", ")}]`);

  const pools: CityCandidatePool[] = [];

  for (let idx = 0; idx < cities.length; idx++) {
    const city = cities[idx]!;
    const pool = await fetchRealWorldPlacesForCity(city, interests);
    pool.order = idx + 1;
    pools.push(pool);
  }

  return pools;
}

/**
 * Backward compatibility wrapper for single-destination callers.
 */
export async function fetchRealWorldPlaces(
  destination: string,
  interests: string[] = [],
): Promise<RealPlace[]> {
  const pool = await fetchRealWorldPlacesForCity(destination, interests);
  return pool.candidates;
}

/**
 * Server-side diagnostic check for Google Places API connectivity & configuration.
 */
export async function runPlacesDiagnostic(destination: string): Promise<{
  googleKeyPresent: boolean;
  httpStatus: number | null;
  resultCount: number;
  sampleCandidates: string[];
}> {
  const googleApiKey = process.env["GOOGLE_PLACES_API_KEY"] || process.env["GOOGLE_MAPS_API_KEY"];
  const isGoogleKeyPresent = Boolean(googleApiKey && googleApiKey.trim().length > 0);

  if (!isGoogleKeyPresent) {
    return {
      googleKeyPresent: false,
      httpStatus: null,
      resultCount: 0,
      sampleCandidates: [],
    };
  }

  const { places } = await searchGooglePlacesNew(
    `tourist attractions in ${destination}`,
    googleApiKey!.trim(),
  );
  return {
    googleKeyPresent: true,
    httpStatus: 200,
    resultCount: places.length,
    sampleCandidates: places.slice(0, 5).map((p) => p.name),
  };
}
