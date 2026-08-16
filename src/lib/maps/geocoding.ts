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

/**
  * Free OpenStreetMap Nominatim Geocoding service.
  * Resolves location names to latitude and longitude with destination context.
  */
export async function geocodeLocation(
  locationName: string,
  destinationContext?: string
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
      fullQuery
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
        destinationContext
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
  T extends { location?: string | null; latitude?: number | null; longitude?: number | null }
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
    })
  );

  return updatedItems;
}

/**
  * Free OSRM Directions Routing Service.
  * Calculates driving/walking route polyline between consecutive points.
  */
export async function getDirectionsRoute(
  waypoints: [number, number][], // [[lat, lng], ...]
  profile: "driving" | "walking" = "driving"
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
      const leafletCoords: [number, number][] = route.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng]
      );

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
  lon2: number
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
