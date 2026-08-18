export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  coordinates: [number, number][]; // [latitude, longitude] pairs for Leaflet Polyline
  distanceKm: number;
  durationMinutes: number;
}

// In-memory cache for Nominatim geocoded queries
const geocodeCache = new Map<string, Coordinates | null>();

export interface ResolvedDestination {
  destinationInput: string;
  city: string;
  country?: string | undefined;
  latitude: number;
  longitude: number;
}

const destinationCache = new Map<string, ResolvedDestination | null>();

/**
 * Validates latitude and longitude ranges.
 */
export function isValidCoordinates(lat?: number | null, lon?: number | null): lat is number {
  if (typeof lat !== "number" || typeof lon !== "number") return false;
  if (isNaN(lat) || isNaN(lon)) return false;
  if (lat === 0 && lon === 0) return false;
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Checks if a coordinate is within a reasonable radius (km) of destination center.
 */
export function isWithinDestinationRegion(
  destLat: number,
  destLon: number,
  itemLat?: number | null,
  itemLon?: number | null,
  radiusKm = 150,
): boolean {
  if (typeof itemLat !== "number" || typeof itemLon !== "number") return false;
  if (!isValidCoordinates(destLat, destLon) || !isValidCoordinates(itemLat, itemLon)) {
    return false;
  }
  const dist = haversineDistanceKm(destLat, destLon, itemLat, itemLon);
  return dist <= radiusKm;
}

/**
 * Canonical Destination Resolution Service.
 * Dynamically geocodes the user's destination string into city, country, and lat/lon.
 */
export async function resolveDestinationCoordinates(
  destination: string,
): Promise<ResolvedDestination | null> {
  const inputNorm = destination.trim();
  if (!inputNorm) return null;

  const cacheKey = inputNorm.toLowerCase();
  if (destinationCache.has(cacheKey)) {
    return destinationCache.get(cacheKey) ?? null;
  }

  console.log(`[RoamPulse] DESTINATION RESOLUTION START`);
  console.log(`[RoamPulse] destination input: ${inputNorm}`);

  // Level 1: Open-Meteo keyless geocoding API
  try {
    const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      inputNorm,
    )}&count=1&language=en&format=json`;
    const omRes = await fetch(omUrl);
    if (omRes.ok) {
      const omJson = (await omRes.json()) as {
        results?: Array<{
          name?: string;
          country?: string;
          latitude?: number;
          longitude?: number;
        }>;
      };
      if (omJson.results && omJson.results.length > 0 && omJson.results[0]) {
        const item = omJson.results[0];
        if (isValidCoordinates(item.latitude, item.longitude)) {
          const resolved: ResolvedDestination = {
            destinationInput: inputNorm,
            city: item.name || inputNorm,
            country: item.country,
            latitude: item.latitude!,
            longitude: item.longitude!,
          };
          console.log(`[RoamPulse] resolved city: ${resolved.city}`);
          if (resolved.country) console.log(`[RoamPulse] resolved country: ${resolved.country}`);
          console.log(
            `[RoamPulse] resolved coordinates: ${resolved.latitude.toFixed(4)}, ${resolved.longitude.toFixed(4)}`,
          );
          destinationCache.set(cacheKey, resolved);
          return resolved;
        }
      }
    }
  } catch (err) {
    console.warn(`[RoamPulse] Open-Meteo geocoding warning: ${(err as Error).message}`);
  }

  // Level 2: Nominatim fallback
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      inputNorm,
    )}&limit=1&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "RoamPulseTravelApp/1.0 (roampulse@example.com)",
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = (await res.json()) as Array<{
        lat?: string;
        lon?: string;
        display_name?: string;
        address?: {
          city?: string;
          town?: string;
          village?: string;
          state?: string;
          country?: string;
        };
      }>;

      if (data && data.length > 0 && data[0]?.lat && data[0]?.lon) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        if (isValidCoordinates(lat, lon)) {
          const addr = data[0].address;
          const city = addr?.city || addr?.town || addr?.village || addr?.state || inputNorm;
          const country = addr?.country;

          const resolved: ResolvedDestination = {
            destinationInput: inputNorm,
            city,
            country,
            latitude: lat,
            longitude: lon,
          };

          console.log(`[RoamPulse] resolved city: ${city}`);
          if (country) console.log(`[RoamPulse] resolved country: ${country}`);
          console.log(`[RoamPulse] resolved coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);

          destinationCache.set(cacheKey, resolved);
          return resolved;
        }
      }
    }

    console.warn(`[RoamPulse] DESTINATION RESOLUTION WARNING: Could not resolve '${inputNorm}'`);
    destinationCache.set(cacheKey, null);
    return null;
  } catch (err) {
    console.warn(
      `[RoamPulse] DESTINATION RESOLUTION ERROR for '${inputNorm}':`,
      (err as Error).message,
    );
    destinationCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Free OpenStreetMap Nominatim Geocoding service.
 * Resolves location names to latitude and longitude with destination context.
 */
export async function geocodeLocation(
  locationName: string,
  destinationContext?: string,
): Promise<Coordinates | null> {
  const queryStr = locationName.trim();
  if (!queryStr) return null;

  // Build destination-aware query string (e.g., "Amber Fort, Jaipur, India")
  const fullQuery =
    destinationContext && !queryStr.toLowerCase().includes(destinationContext.toLowerCase())
      ? `${queryStr}, ${destinationContext}`
      : queryStr;

  const cacheKey = fullQuery.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) ?? null;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      fullQuery,
    )}&limit=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "RoamPulseTravelApp/1.0 (roampulse@example.com)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`[NOMINATIM GEOCODE WARN] HTTP ${res.status}`);
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;

    if (data && data.length > 0 && data[0]?.lat && data[0]?.lon) {
      const coords: Coordinates = {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
      geocodeCache.set(cacheKey, coords);
      return coords;
    }

    // Secondary fallback: Try geocoding just the destination context if specific location fails
    if (destinationContext && queryStr !== destinationContext) {
      const destUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        destinationContext,
      )}&limit=1`;

      const destRes = await fetch(destUrl, {
        headers: {
          "User-Agent": "RoamPulseTravelApp/1.0 (roampulse@example.com)",
          Accept: "application/json",
        },
      });

      if (destRes.ok) {
        const destData = (await destRes.json()) as Array<{ lat?: string; lon?: string }>;
        if (destData && destData.length > 0 && destData[0]?.lat && destData[0]?.lon) {
          const coords: Coordinates = {
            latitude: parseFloat(destData[0].lat),
            longitude: parseFloat(destData[0].lon),
          };
          geocodeCache.set(cacheKey, coords);
          return coords;
        }
      }
    }

    geocodeCache.set(cacheKey, null);
    return null;
  } catch (err) {
    console.warn(`[NOMINATIM GEOCODE WARN] Failed to geocode location:`, (err as Error).message);
    geocodeCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Batch geocode multiple itinerary items concurrently.
 */
export async function geocodeItineraryItems<
  T extends { location?: string | null; latitude?: number | null; longitude?: number | null },
>(items: T[], destinationContext?: string): Promise<T[]> {
  const updatedItems = await Promise.all(
    items.map(async (item) => {
      if (
        typeof item.latitude === "number" &&
        typeof item.longitude === "number" &&
        (item.latitude !== 0 || item.longitude !== 0)
      ) {
        return item;
      }

      if (!item.location) return item;

      const coords = await geocodeLocation(item.location, destinationContext);
      if (coords) {
        return {
          ...item,
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
      }

      return item;
    }),
  );

  return updatedItems;
}

/**
 * Free OSRM Directions Routing Service.
 * Calculates driving/walking route polyline between consecutive points.
 */
export async function getDirectionsRoute(
  waypoints: [number, number][], // [[lat, lng], ...]
  profile: "driving" | "walking" = "driving",
): Promise<RouteResult | null> {
  if (waypoints.length < 2) return null;

  try {
    // OSRM expects coordinates in [lng, lat] format
    const coordsString = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const osrmProfile = profile === "walking" ? "foot" : "car";
    const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${coordsString}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return calculateFallbackPolyline(waypoints);
    }

    const data = (await res.json()) as {
      routes?: Array<{
        geometry?: { coordinates: [number, number][] }; // [[lng, lat], ...]
        distance?: number;
        duration?: number;
      }>;
    };

    const route = data.routes?.[0];
    if (route && route.geometry?.coordinates) {
      // Convert OSRM [lng, lat] back to Leaflet [lat, lng]
      const leafletCoords: [number, number][] = route.geometry.coordinates.map(([lng, lat]) => [
        lat,
        lng,
      ]);

      return {
        coordinates: leafletCoords,
        distanceKm: Number(((route.distance ?? 0) / 1000).toFixed(2)),
        durationMinutes: Math.max(1, Math.round((route.duration ?? 0) / 60)),
      };
    }

    return calculateFallbackPolyline(waypoints);
  } catch {
    return calculateFallbackPolyline(waypoints);
  }
}

/**
 * Fallback polyline and distance estimator when OSRM routing is offline or times out.
 */
function calculateFallbackPolyline(waypoints: [number, number][]): RouteResult {
  let totalKm = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i]!;
    const p2 = waypoints[i + 1]!;
    totalKm += haversineDistanceKm(p1[0], p1[1], p2[0], p2[1]);
  }

  // Estimate travel duration: ~25 km/h avg city speed
  const durationMinutes = Math.max(5, Math.round((totalKm / 25) * 60));

  return {
    coordinates: waypoints,
    distanceKm: Number(totalKm.toFixed(2)),
    durationMinutes,
  };
}

/**
 * Haversine formula to compute great-circle distance between two coordinates in km.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
