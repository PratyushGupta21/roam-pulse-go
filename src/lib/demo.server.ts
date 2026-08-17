import type { GeneratedItem } from "./domain";

const TOKYO = { lat: 35.6762, lon: 139.6503 };

export function demoTripDates() {
  const start = new Date();
  start.setDate(start.getDate() + 3);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function demoTripPayload(userId: string) {
  const { start, end } = demoTripDates();
  return {
    user_id: userId,
    name: "Tokyo Adventure",
    origin: "Delhi (DEL)",
    destination: "Tokyo, Japan",
    start_date: start,
    end_date: end,
    adults: 1,
    children: 0,
    budget: 75000,
    currency: "INR",
    travel_style: "balanced",
    interests: ["Food", "Culture", "Photography", "Local experiences"],
    preferences: {
      indoorOutdoor: "balanced",
      pace: "moderate",
      transport: "public_transit",
      accommodation: "boutique",
    },
    recovery_mode: "assisted",
    automation_settings: {
      maxExtraSpend: 3000,
      autoReplace: ["flexible", "weather_sensitive"],
      alwaysAsk: ["flights", "hotels", "above_limit"],
    },
    status: "active",
    is_demo: true,
  };
}

export function demoItinerary(startDate: string): GeneratedItem[] {
  const day = startDate;
  const day2 = new Date(`${startDate}T00:00:00`);
  day2.setDate(day2.getDate() + 1);
  const second = day2.toISOString().slice(0, 10);

  const base: Omit<GeneratedItem, "day_date">[] = [
    {
      title: "Breakfast at a local coffee shop",
      description: "Slow pour-over and tamago sando at a neighbourhood kissaten near your hotel.",
      start_time: "09:00",
      end_time: "10:00",
      category: "breakfast",
      location: "Shibuya, Tokyo",
      latitude: TOKYO.lat + 0.004,
      longitude: TOKYO.lon - 0.006,
      estimated_cost: 450,
      cost_type: "estimated",
      verification_status: "estimated",
      travel_minutes: 20,
      indoor_outdoor: "indoor",
      weather_suitability: "any",
      booking_url: null,
      is_locked: false,
    },
    {
      title: "Temple visit — Sensō-ji",
      description: "Tokyo's oldest temple and the Nakamise shopping street approach.",
      start_time: "10:30",
      end_time: "12:30",
      category: "culture",
      location: "Asakusa, Tokyo",
      latitude: TOKYO.lat + 0.033,
      longitude: TOKYO.lon + 0.144,
      estimated_cost: 0,
      cost_type: "free",
      verification_status: "verified",
      travel_minutes: 35,
      indoor_outdoor: "outdoor",
      weather_suitability: "clear_only",
      booking_url: null,
      is_locked: false,
    },
    {
      title: "Lunch — soba counter",
      description: "Handmade soba at a standing counter loved by locals.",
      start_time: "13:00",
      end_time: "14:00",
      category: "food",
      location: "Ueno, Tokyo",
      latitude: TOKYO.lat + 0.02,
      longitude: TOKYO.lon + 0.09,
      estimated_cost: 900,
      cost_type: "estimated",
      verification_status: "estimated",
      travel_minutes: 15,
      indoor_outdoor: "indoor",
      weather_suitability: "any",
      booking_url: null,
      is_locked: false,
    },
    {
      title: "Old Town Walking Tour",
      description: "Two-hour guided outdoor walk through Yanaka's backstreets.",
      start_time: "15:00",
      end_time: "17:00",
      category: "adventure",
      location: "Yanaka, Tokyo",
      latitude: TOKYO.lat + 0.045,
      longitude: TOKYO.lon + 0.06,
      estimated_cost: 1500,
      cost_type: "estimated",
      verification_status: "estimated",
      travel_minutes: 25,
      indoor_outdoor: "outdoor",
      weather_suitability: "clear_only",
      booking_url: null,
      is_locked: false,
    },
    {
      title: "Local food experience",
      description: "Izakaya hopping with a local host in a covered alley.",
      start_time: "18:00",
      end_time: "19:30",
      category: "food",
      location: "Shinjuku, Tokyo",
      latitude: TOKYO.lat + 0.014,
      longitude: TOKYO.lon - 0.0,
      estimated_cost: 1800,
      cost_type: "estimated",
      verification_status: "estimated",
      travel_minutes: 20,
      indoor_outdoor: "indoor",
      weather_suitability: "any",
      booking_url: null,
      is_locked: false,
    },
    {
      title: "Dinner reservation",
      description: "Booked table — locked so RoamPulse never changes it automatically.",
      start_time: "20:00",
      end_time: "21:30",
      category: "food",
      location: "Ginza, Tokyo",
      latitude: TOKYO.lat - 0.006,
      longitude: TOKYO.lon + 0.06,
      estimated_cost: 3200,
      cost_type: "estimated",
      verification_status: "verified",
      travel_minutes: 20,
      indoor_outdoor: "indoor",
      weather_suitability: "any",
      booking_url: null,
      is_locked: true,
    },
  ];

  const secondDay: Omit<GeneratedItem, "day_date">[] = [
    {
      title: "Tsukiji outer market breakfast",
      description: "Seafood breakfast crawl through the outer market stalls.",
      start_time: "08:30",
      end_time: "10:00",
      category: "food",
      location: "Tsukiji, Tokyo",
      latitude: TOKYO.lat - 0.011,
      longitude: TOKYO.lon + 0.07,
      estimated_cost: 1200,
      cost_type: "estimated",
      verification_status: "verified",
      travel_minutes: 25,
      indoor_outdoor: "mixed",
      weather_suitability: "any",
      booking_url: null,
      is_locked: false,
    },
    {
      title: "teamLab digital art museum",
      description: "Immersive indoor digital art — great rainy-day option.",
      start_time: "11:30",
      end_time: "13:30",
      category: "culture",
      location: "Toyosu, Tokyo",
      latitude: TOKYO.lat - 0.02,
      longitude: TOKYO.lon + 0.13,
      estimated_cost: 2400,
      cost_type: "listed",
      verification_status: "verified",
      travel_minutes: 30,
      indoor_outdoor: "indoor",
      weather_suitability: "any",
      booking_url: "https://www.teamlab.art",
      is_locked: false,
    },
    {
      title: "Sumida river park stroll",
      description: "Riverside walk with skyline views.",
      start_time: "16:00",
      end_time: "17:30",
      category: "nature",
      location: "Sumida, Tokyo",
      latitude: TOKYO.lat + 0.03,
      longitude: TOKYO.lon + 0.12,
      estimated_cost: 0,
      cost_type: "free",
      verification_status: "verified",
      travel_minutes: 20,
      indoor_outdoor: "outdoor",
      weather_suitability: "clear_only",
      booking_url: null,
      is_locked: false,
    },
  ];

  return [
    ...base.map((item) => ({ ...item, day_date: day })),
    ...secondDay.map((item) => ({ ...item, day_date: second })),
  ];
}

export function demoFlight(tripId: string, startDate: string) {
  const dep = new Date(`${startDate}T06:30:00Z`);
  const arr = new Date(`${startDate}T08:30:00Z`);
  return {
    trip_id: tripId,
    provider: "demo",
    airline: "AirIndia (demo)",
    flight_number: "AI-247",
    departure_airport: "DEL",
    arrival_airport: "HND",
    scheduled_departure: dep.toISOString(),
    scheduled_arrival: arr.toISOString(),
    estimated_departure: dep.toISOString(),
    estimated_arrival: arr.toISOString(),
    status: "scheduled",
    delay_minutes: 0,
  };
}
