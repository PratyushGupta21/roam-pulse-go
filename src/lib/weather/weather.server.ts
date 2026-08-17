import { minutesOf } from "../format";

export interface HourlyForecast {
  time: string[]; // YYYY-MM-THH:00 ISO strings
  temperature_2m: number[];
  precipitation_probability: number[];
  precipitation: number[];
  weather_code: number[];
  wind_speed_10m: number[];
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly?: HourlyForecast;
}

export interface ActivityWeatherEvaluation {
  itemId: string;
  title: string;
  day_date: string;
  start_time: string;
  end_time: string;
  indoor_outdoor: string;
  is_locked: boolean;
  status: string;
  riskLevel: "none" | "low" | "moderate" | "high";
  weatherCode: number;
  conditionText: string;
  conditionIcon: string;
  maxPrecipProbability: number;
  maxPrecipMm: number;
  avgTempC: number;
  reason?: string | undefined;
}

export interface ForecastSummary {
  destination: string;
  latitude: number;
  longitude: number;
  timezone: string;
  evaluations: ActivityWeatherEvaluation[];
  overallStatus: "ok" | "risk_detected" | "unavailable";
  highRiskCount: number;
  summaryText: string;
  checkedAt: string;
}

// In-memory cache for Open-Meteo forecasts (10 min TTL)
const weatherCache = new Map<string, { data: OpenMeteoResponse; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * WMO Weather Interpretation Codes to human readable label & icon.
 */
export function formatWmoWeatherCode(code: number): { label: string; icon: string } {
  switch (code) {
    case 0:
      return { label: "Clear Sky", icon: "☀️" };
    case 1:
      return { label: "Mainly Clear", icon: "🌤️" };
    case 2:
      return { label: "Partly Cloudy", icon: "⛅" };
    case 3:
      return { label: "Overcast", icon: "☁️" };
    case 45:
    case 48:
      return { label: "Foggy", icon: "🌫️" };
    case 51:
    case 53:
    case 55:
      return { label: "Drizzle", icon: "🌧️" };
    case 56:
    case 57:
      return { label: "Freezing Drizzle", icon: "🌧️" };
    case 61:
      return { label: "Slight Rain", icon: "🌧️" };
    case 63:
      return { label: "Moderate Rain", icon: "🌧️" };
    case 65:
      return { label: "Heavy Rain", icon: "🌧️" };
    case 66:
    case 67:
      return { label: "Freezing Rain", icon: "🌧️" };
    case 71:
    case 73:
    case 75:
      return { label: "Snowfall", icon: "❄️" };
    case 77:
      return { label: "Snow Grains", icon: "❄️" };
    case 80:
    case 81:
    case 82:
      return { label: "Rain Showers", icon: "🌧️" };
    case 85:
    case 86:
      return { label: "Snow Showers", icon: "❄️" };
    case 95:
      return { label: "Thunderstorm", icon: "🌩️" };
    case 96:
    case 99:
      return { label: "Heavy Thunderstorm", icon: "🌩️" };
    default:
      return { label: "Variable", icon: "🌤️" };
  }
}

/**
 * Server-side Open-Meteo forecast client.
 * Free keyless API fetching hourly weather metrics.
 */
export async function fetchOpenMeteoForecast({
  latitude,
  longitude,
  startDate,
  endDate,
}: {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
}): Promise<OpenMeteoResponse | null> {
  const cacheKey = `${latitude.toFixed(3)}_${longitude.toFixed(3)}_${startDate}_${endDate}`;
  const now = Date.now();

  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    console.log(`[Weather] cache hit for ${cacheKey}`);
    return cached.data;
  }

  console.log(`[Weather] fetching forecast from Open-Meteo for ${cacheKey}`);

  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      start_date: startDate,
      end_date: endDate,
      hourly: "temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m",
      timezone: "auto",
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Weather] API unavailable (HTTP ${res.status})`);
      return null;
    }

    const data = (await res.json()) as OpenMeteoResponse;
    weatherCache.set(cacheKey, { data, expiresAt: now + CACHE_TTL_MS });
    return data;
  } catch (err) {
    console.warn(`[Weather] API unavailable: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Weather Risk Evaluation Engine.
 * Compares itinerary activity time windows against Open-Meteo hourly metrics.
 */
export function evaluateActivityWeather(
  item: {
    id: string;
    title: string;
    day_date: string;
    start_time: string;
    end_time: string;
    indoor_outdoor?: string | null;
    is_locked?: boolean | null;
    status?: string | null;
  },
  forecast: OpenMeteoResponse | null,
): ActivityWeatherEvaluation {
  const itemType = (item.indoor_outdoor || "outdoor").toLowerCase();

  const defaultEval: ActivityWeatherEvaluation = {
    itemId: item.id,
    title: item.title,
    day_date: item.day_date,
    start_time: item.start_time,
    end_time: item.end_time,
    indoor_outdoor: itemType,
    is_locked: Boolean(item.is_locked),
    status: item.status || "confirmed",
    riskLevel: "none",
    weatherCode: 0,
    conditionText: "Clear Sky",
    conditionIcon: "☀️",
    maxPrecipProbability: 0,
    maxPrecipMm: 0,
    avgTempC: 22,
  };

  if (!forecast || !forecast.hourly || !forecast.hourly.time) {
    return defaultEval;
  }

  const { time, precipitation_probability, precipitation, weather_code, temperature_2m } =
    forecast.hourly;

  const startMin = minutesOf(item.start_time);
  const endMin = minutesOf(item.end_time);

  // Find matching hourly indices for item's day_date and time window
  const matchingIndices: number[] = [];

  for (let i = 0; i < time.length; i++) {
    const tStr = time[i]; // e.g. "2026-08-18T14:00"
    if (!tStr) continue;

    const [datePart, timePart] = tStr.split("T");
    if (datePart === item.day_date && timePart) {
      const hourMin = minutesOf(timePart);
      // Compare hour window against activity start & end time
      if (hourMin >= startMin - 60 && hourMin <= endMin) {
        matchingIndices.push(i);
      }
    }
  }

  if (matchingIndices.length === 0) {
    return defaultEval;
  }

  let maxProb = 0;
  let maxMm = 0;
  let maxWeatherCode = 0;
  let tempSum = 0;

  for (const idx of matchingIndices) {
    const prob = precipitation_probability[idx] ?? 0;
    const mm = precipitation[idx] ?? 0;
    const code = weather_code[idx] ?? 0;
    const temp = temperature_2m[idx] ?? 20;

    if (prob > maxProb) maxProb = prob;
    if (mm > maxMm) maxMm = mm;
    if (code > maxWeatherCode) maxWeatherCode = code;
    tempSum += temp;
  }

  const avgTempC = Math.round(tempSum / matchingIndices.length);
  const { label: conditionText, icon: conditionIcon } = formatWmoWeatherCode(maxWeatherCode);

  let riskLevel: "none" | "low" | "moderate" | "high" = "none";
  let reason: string | undefined;

  // Outdoor Risk Logic
  if (itemType === "outdoor") {
    if (maxProb >= 60 || maxMm >= 2.0 || maxWeatherCode >= 61) {
      riskLevel = "high";
      reason = `${conditionText} expected with ${maxProb}% precipitation probability (${maxMm}mm rain)`;
    } else if (maxProb >= 40 || maxMm >= 0.5 || maxWeatherCode >= 51) {
      riskLevel = "moderate";
      reason = `${conditionText} possible (${maxProb}% chance of rain)`;
    } else if (maxProb >= 25) {
      riskLevel = "low";
      reason = `Light weather variation (${maxProb}% chance)`;
    }
  } else {
    // Indoor activities generally protected unless severe thunderstorm
    if (maxWeatherCode >= 95) {
      riskLevel = "moderate";
      reason = `Severe thunderstorm outside (${conditionText})`;
    }
  }

  return {
    itemId: item.id,
    title: item.title,
    day_date: item.day_date,
    start_time: item.start_time,
    end_time: item.end_time,
    indoor_outdoor: itemType,
    is_locked: Boolean(item.is_locked),
    status: item.status || "confirmed",
    riskLevel,
    weatherCode: maxWeatherCode,
    conditionText,
    conditionIcon,
    maxPrecipProbability: maxProb,
    maxPrecipMm: maxMm,
    avgTempC,
    reason,
  };
}
