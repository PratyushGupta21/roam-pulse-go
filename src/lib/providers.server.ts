/**
 * Provider abstraction layer.
 *
 * Every external integration (flights, weather, prices, activities) is behind
 * an adapter with a demo implementation. When the matching environment
 * credentials exist the live adapter is used; otherwise the app runs in
 * Demo Mode and everything it returns is explicitly flagged as demo data.
 *
 * Server-only module: never import from client components.
 */

export interface ProviderResult<T> {
  data: T | null;
  demo: boolean;
  error: string | null;
  checkedAt: string;
}

export function providerMode() {
  return {
    flights: process.env["DUFFEL_API_KEY"] ? "live" : "demo",
    weather: process.env["WEATHER_API_KEY"] ? "live" : "demo",
    prices: process.env["PRICE_API_KEY"] ? "live" : "demo",
    maps: process.env["MAPBOX_PUBLIC_TOKEN"] ? "live" : "demo",
    n8n: process.env["N8N_WEBHOOK_URL"] ? "live" : "demo",
  } as const;
}

/* ------------------------------------------------------------------ flights */

export interface FlightStatus {
  airline: string;
  flightNumber: string;
  status: "scheduled" | "boarding" | "departed" | "delayed" | "landed" | "cancelled" | "unknown";
  delayMinutes: number;
  estimatedArrival: string | null;
}

export async function fetchFlightStatus(
  flightNumber: string,
): Promise<ProviderResult<FlightStatus>> {
  const checkedAt = new Date().toISOString();
  const key = process.env["DUFFEL_API_KEY"];
  if (!key) {
    return { data: null, demo: true, error: null, checkedAt };
  }
  try {
    const res = await fetch(
      `https://api.duffel.com/air/offers?flight=${encodeURIComponent(flightNumber)}`,
      {
        headers: { Authorization: `Bearer ${key}`, "Duffel-Version": "v2" },
      },
    );
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = (await res.json()) as { data?: unknown };
    return { data: json.data as unknown as FlightStatus, demo: false, error: null, checkedAt };
  } catch {
    return { data: null, demo: false, error: "Flight data couldn't be refreshed.", checkedAt };
  }
}

/* ------------------------------------------------------------------ weather */

export interface WeatherPoint {
  date: string;
  tempC: number;
  rainProbability: number;
  condition: string;
}

export async function fetchWeather(
  lat: number,
  lon: number,
  days: number,
): Promise<ProviderResult<WeatherPoint[]>> {
  const checkedAt = new Date().toISOString();
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_probability_max,weathercode&forecast_days=${Math.min(
      16,
      Math.max(1, days),
    )}&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = (await res.json()) as {
      daily?: {
        time: string[];
        temperature_2m_max: number[];
        precipitation_probability_max: (number | null)[];
        weathercode: number[];
      };
    };
    if (!json.daily) throw new Error("no daily data");
    const data = json.daily.time.map((date, i) => ({
      date,
      tempC: Math.round(json.daily!.temperature_2m_max[i] ?? 0),
      rainProbability: json.daily!.precipitation_probability_max[i] ?? 0,
      condition: weatherCodeLabel(json.daily!.weathercode[i] ?? 0),
    }));
    return { data, demo: false, error: null, checkedAt };
  } catch {
    return {
      data: null,
      demo: false,
      error: "Weather data is temporarily unavailable.",
      checkedAt,
    };
  }
}

function weatherCodeLabel(code: number) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  return "Storm";
}

/* ------------------------------------------------------------------- prices */

export interface PriceOffer {
  provider: string;
  productType: "flight" | "stay" | "experience";
  title: string;
  price: number;
  currency: string;
  bookingUrl: string;
  demo: boolean;
}

export async function fetchPriceOffers(
  destination: string,
  currency: string,
): Promise<ProviderResult<PriceOffer[]>> {
  const checkedAt = new Date().toISOString();
  if (!process.env["PRICE_API_KEY"]) {
    const base = 38_000;
    const demoOffers: PriceOffer[] = [
      {
        provider: "Duffel",
        productType: "flight",
        title: "Delhi → Tokyo, 1 stop",
        price: base,
        currency,
        bookingUrl: "https://duffel.com",
        demo: true,
      },
      {
        provider: "Skyscanner",
        productType: "flight",
        title: "Delhi → Tokyo, 1 stop",
        price: base + 2600,
        currency,
        bookingUrl: "https://www.skyscanner.co.in",
        demo: true,
      },
      {
        provider: "Agoda",
        productType: "stay",
        title: `${destination} · 7 nights, boutique`,
        price: 26_400,
        currency,
        bookingUrl: "https://www.agoda.com",
        demo: true,
      },
      {
        provider: "Booking.com",
        productType: "stay",
        title: `${destination} · 7 nights, boutique`,
        price: 28_900,
        currency,
        bookingUrl: "https://www.booking.com",
        demo: true,
      },
    ];
    return { data: demoOffers, demo: true, error: null, checkedAt };
  }
  return {
    data: [],
    demo: false,
    error: "Price providers are temporarily unavailable.",
    checkedAt,
  };
}

/* --------------------------------------------------------------- automation */

export async function notifyN8n(workflow: string, payload: Record<string, unknown>) {
  const url = process.env["N8N_WEBHOOK_URL"];
  if (!url) return { dispatched: false as const, reason: "n8n not configured (demo mode)" };
  try {
    await fetch(`${url.replace(/\/$/, "")}/${workflow}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env["N8N_WEBHOOK_TOKEN"]
          ? { authorization: `Bearer ${process.env["N8N_WEBHOOK_TOKEN"]}` }
          : {}),
      },
      body: JSON.stringify(payload),
    });
    return { dispatched: true as const };
  } catch {
    return { dispatched: false as const, reason: "n8n dispatch failed" };
  }
}
