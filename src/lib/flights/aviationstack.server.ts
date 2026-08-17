export type AviationstackStatus =
  "scheduled" | "active" | "landed" | "delayed" | "cancelled" | "diverted" | "unknown";

export interface FlightStatusSnapshot {
  flightNumber: string;
  airlineName: string;
  airlineIata: string;
  flightDate: string;
  status: AviationstackStatus;
  departureAirport: string;
  departureIata: string;
  arrivalAirport: string;
  arrivalIata: string;
  scheduledDeparture: string | null;
  actualDeparture: string | null;
  estimatedDeparture: string | null;
  scheduledArrival: string | null;
  actualArrival: string | null;
  estimatedArrival: string | null;
  departureDelayMinutes: number;
  arrivalDelayMinutes: number;
  terminal: string | null;
  gate: string | null;
  lastUpdated: string;
}

interface AviationstackFlightRecord {
  flight_date?: string | null;
  flight_status?: string | null;
  flight?: {
    number?: string | null;
    iata?: string | null;
    icao?: string | null;
    codeshared?: {
      airline_name?: string | null;
      flight_number?: string | null;
      flight_iata?: string | null;
    } | null;
  };
  airline?: {
    name?: string | null;
    iata?: string | null;
    icao?: string | null;
  };
  departure?: {
    airport?: string | null;
    timezone?: string | null;
    iata?: string | null;
    icao?: string | null;
    terminal?: string | null;
    gate?: string | null;
    scheduled?: string | null;
    estimated?: string | null;
    actual?: string | null;
    delay?: number | null;
  };
  arrival?: {
    airport?: string | null;
    timezone?: string | null;
    iata?: string | null;
    icao?: string | null;
    terminal?: string | null;
    gate?: string | null;
    scheduled?: string | null;
    estimated?: string | null;
    actual?: string | null;
    delay?: number | null;
  };
  live?: {
    updated?: string | null;
  };
}

interface AviationstackApiResponse {
  pagination?: { total?: number };
  data?: AviationstackFlightRecord[];
}

const aviationstackCache = new Map<string, { data: FlightStatusSnapshot; expiresAt: number }>();
const CACHE_TTL_MS = 12 * 60 * 1000;

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeStatus(rawStatus?: string | null): AviationstackStatus {
  const value = (rawStatus || "unknown").toLowerCase();
  if (value.includes("cancel")) return "cancelled";
  if (value.includes("divert")) return "diverted";
  if (value.includes("land")) return "landed";
  if (value.includes("active")) return "active";
  if (value.includes("delay")) return "delayed";
  if (value.includes("sched")) return "scheduled";
  return "unknown";
}

function getMinutesDifference(scheduled: string | null, estimated: string | null): number {
  if (!scheduled || !estimated) return 0;
  const scheduledDate = new Date(scheduled);
  const estimatedDate = new Date(estimated);
  if (Number.isNaN(scheduledDate.getTime()) || Number.isNaN(estimatedDate.getTime())) return 0;
  const diffMinutes = Math.round((estimatedDate.getTime() - scheduledDate.getTime()) / 60000);
  return Math.max(diffMinutes, 0);
}

export function normalizeAviationstackFlight(
  raw: AviationstackFlightRecord | undefined,
): FlightStatusSnapshot | null {
  if (!raw) return null;

  const flightNum = safeString(raw.flight?.number || raw.flight?.iata || raw.flight?.icao);
  const airlineName = safeString(raw.airline?.name || "Unknown airline");
  const airlineIata = safeString(raw.airline?.iata || raw.flight?.iata || "");
  const departureAirport = safeString(raw.departure?.airport || "");
  const departureIata = safeString(raw.departure?.iata || "");
  const arrivalAirport = safeString(raw.arrival?.airport || "");
  const arrivalIata = safeString(raw.arrival?.iata || "");
  const scheduledDeparture = parseTimestamp(raw.departure?.scheduled ?? null);
  const estimatedDeparture = parseTimestamp(raw.departure?.estimated ?? null);
  const actualDeparture = parseTimestamp(raw.departure?.actual ?? null);
  const scheduledArrival = parseTimestamp(raw.arrival?.scheduled ?? null);
  const estimatedArrival = parseTimestamp(raw.arrival?.estimated ?? null);
  const actualArrival = parseTimestamp(raw.arrival?.actual ?? null);

  const normalizedStatus = normalizeStatus(raw.flight_status);
  const departureDelay = Number(raw.departure?.delay ?? 0);
  const arrivalDelay = Number(raw.arrival?.delay ?? 0);
  const fallbackDepartureDelay = getMinutesDifference(
    scheduledDeparture,
    estimatedDeparture || actualDeparture,
  );
  const fallbackArrivalDelay = getMinutesDifference(
    scheduledArrival,
    estimatedArrival || actualArrival,
  );

  const finalStatus: AviationstackStatus =
    normalizedStatus === "scheduled" &&
    (departureDelay > 0 ||
      arrivalDelay > 0 ||
      fallbackDepartureDelay > 0 ||
      fallbackArrivalDelay > 0)
      ? "delayed"
      : normalizedStatus;

  const flightDate = safeString(
    raw.flight_date || scheduledDeparture?.slice(0, 10) || new Date().toISOString().slice(0, 10),
  );
  const lastUpdated =
    parseTimestamp(raw.live?.updated ?? new Date().toISOString()) ?? new Date().toISOString();

  return {
    flightNumber: flightNum || "UNKNOWN",
    airlineName,
    airlineIata,
    flightDate,
    status: finalStatus,
    departureAirport,
    departureIata,
    arrivalAirport,
    arrivalIata,
    scheduledDeparture,
    actualDeparture,
    estimatedDeparture,
    scheduledArrival,
    actualArrival,
    estimatedArrival,
    departureDelayMinutes: Math.max(departureDelay, fallbackDepartureDelay),
    arrivalDelayMinutes: Math.max(arrivalDelay, fallbackArrivalDelay),
    terminal: safeString(raw.departure?.terminal || raw.arrival?.terminal || null),
    gate: safeString(raw.departure?.gate || raw.arrival?.gate || null),
    lastUpdated,
  };
}

export async function fetchAviationstackFlightStatus({
  flightNumber,
  flightDate,
  departureAirport,
  arrivalAirport,
}: {
  flightNumber?: string;
  flightDate?: string | null;
  departureAirport?: string | null;
  arrivalAirport?: string | null;
}): Promise<{ data: FlightStatusSnapshot | null; error: string | null; success: boolean }> {
  const accessKey = process.env["AVIATIONSTACK_ACCESS_KEY"];
  if (!accessKey) {
    return { data: null, error: "Aviationstack is not configured.", success: false };
  }

  if (process.env["VITE_FLIGHT_MOCK_MODE"] === "true" && process.env["NODE_ENV"] !== "production") {
    const mock: FlightStatusSnapshot = {
      flightNumber: flightNumber || "AI204",
      airlineName: "Air India",
      airlineIata: "AI",
      flightDate: flightDate || new Date().toISOString().slice(0, 10),
      status: "scheduled",
      departureAirport: departureAirport || "DEL",
      departureIata: departureAirport || "DEL",
      arrivalAirport: arrivalAirport || "NRT",
      arrivalIata: arrivalAirport || "NRT",
      scheduledDeparture: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      actualDeparture: null,
      estimatedDeparture: null,
      scheduledArrival: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      actualArrival: null,
      estimatedArrival: null,
      departureDelayMinutes: 0,
      arrivalDelayMinutes: 0,
      terminal: "2",
      gate: "A12",
      lastUpdated: new Date().toISOString(),
    };
    return { data: mock, error: null, success: true };
  }

  const query = new URLSearchParams({ access_key: accessKey, limit: "1" });
  if (flightNumber) query.set("flight_number", flightNumber);
  if (flightDate) query.set("flight_date", flightDate);
  if (departureAirport) query.set("dep_iata", departureAirport);
  if (arrivalAirport) query.set("arr_iata", arrivalAirport);

  const cacheKey = `${flightNumber || "unknown"}|${flightDate || ""}|${departureAirport || ""}|${arrivalAirport || ""}`;
  const now = Date.now();
  const cached = aviationstackCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return { data: cached.data, error: null, success: true };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`https://api.aviationstack.com/v1/flights?${query.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        data: null,
        error: `Flight provider responded with status ${response.status}.`,
        success: false,
      };
    }

    const payload = (await response.json()) as AviationstackApiResponse;
    const flight = payload.data?.[0];
    if (!flight) {
      return { data: null, error: "No flight match found for the current trip.", success: false };
    }

    const normalized = normalizeAviationstackFlight(flight);
    if (!normalized) {
      return { data: null, error: "Flight response was malformed.", success: false };
    }

    aviationstackCache.set(cacheKey, { data: normalized, expiresAt: now + CACHE_TTL_MS });
    return { data: normalized, error: null, success: true };
  } catch (error) {
    console.warn(
      "[Flight] Aviationstack request failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return { data: null, error: "Flight status temporarily unavailable.", success: false };
  }
}
