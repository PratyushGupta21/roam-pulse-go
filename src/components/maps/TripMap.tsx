import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Compass, Maximize2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/format";
import { getDirectionsRoute, type RouteResult } from "@/lib/maps/geocoding";
import { type ItineraryItem } from "@/lib/queries";

interface TripMapProps {
  items: ItineraryItem[];
  selectedItemId?: string | null;
  onSelectItem?: (itemId: string) => void;
  destination?: string;
  origin?: string | undefined;
}

// Custom MapController child component to reactively update map camera and bounds
function MapController({
  mappedItems,
  selectedItemId,
  triggerFit,
}: {
  mappedItems: ItineraryItem[];
  selectedItemId?: string | null | undefined;
  triggerFit: number;
}) {
  const map = useMap();
  const prevItemsLength = useRef(mappedItems.length);
  const prevTriggerFit = useRef(triggerFit);

  // Auto-fit bounds when mapped items change or when Fit Trip button is clicked
  useEffect(() => {
    if (mappedItems.length === 0) return;

    const bounds = L.latLngBounds(mappedItems.map((item) => [item.latitude!, item.longitude!]));

    if (mappedItems.length !== prevItemsLength.current || triggerFit !== prevTriggerFit.current) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      prevItemsLength.current = mappedItems.length;
      prevTriggerFit.current = triggerFit;
    }
  }, [mappedItems, triggerFit, map]);

  // Pan to selected itinerary item
  useEffect(() => {
    if (!selectedItemId) return;

    const item = mappedItems.find((i) => i.id === selectedItemId);
    if (item && typeof item.latitude === "number" && typeof item.longitude === "number") {
      map.flyTo([item.latitude, item.longitude], 14, { duration: 1.2 });
    }
  }, [selectedItemId, mappedItems, map]);

  return null;
}

/**
 * Category color helper for markers
 */
function getCategoryColorClass(category?: string): string {
  switch (category?.toLowerCase()) {
    case "food":
    case "dining":
      return "bg-amber-500 border-amber-300";
    case "culture":
    case "history":
      return "bg-purple-500 border-purple-300";
    case "nature":
    case "adventure":
      return "bg-emerald-500 border-emerald-300";
    case "shopping":
      return "bg-rose-500 border-rose-300";
    case "transit":
      return "bg-blue-500 border-blue-300";
    case "accommodation":
    case "hotel":
      return "bg-cyan-500 border-cyan-300";
    default:
      return "bg-teal-500 border-teal-300";
  }
}

/**
 * Category icon helper for markers
 */
function getCategorySymbol(category?: string): string {
  switch (category?.toLowerCase()) {
    case "food":
    case "dining":
      return "🍴";
    case "culture":
    case "history":
      return "🏛️";
    case "nature":
    case "adventure":
      return "🌿";
    case "shopping":
      return "🛍️";
    case "transit":
      return "🚗";
    case "accommodation":
    case "hotel":
      return "🏨";
    default:
      return "📍";
  }
}

/**
 * Creates Leaflet custom DivIcon based on item status and category
 */
function createCustomDivIcon(item: ItineraryItem, isSelected: boolean, index: number): L.DivIcon {
  const colorClass = getCategoryColorClass(item.category);
  const symbol = item.is_locked ? "🔒" : item.status === "at_risk" ? "⚠️" : `${index + 1}`;

  const html = `
    <div class="relative flex items-center justify-center h-8 w-8 rounded-full border-2 shadow-lg font-mono text-xs font-bold text-white ${colorClass} ${
      isSelected ? "ring-4 ring-primary scale-110" : ""
    }">
      <span>${symbol}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-leaflet-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

export function getCityCoordinates(city?: string): [number, number] | null {
  if (!city) return null;
  const norm = city.toLowerCase().trim();
  if (norm.includes("shimla")) return [31.1048, 77.1734];
  if (norm.includes("kohima")) return [25.6747, 94.11];
  if (norm.includes("jaipur")) return [26.9124, 75.7873];
  if (norm.includes("delhi")) return [28.6139, 77.209];
  if (norm.includes("mumbai")) return [19.076, 72.8777];
  if (norm.includes("goa")) return [15.2993, 74.124];
  if (norm.includes("paris")) return [48.8566, 2.3522];
  if (norm.includes("tokyo")) return [35.6762, 139.6503];
  if (norm.includes("london")) return [51.5074, -0.1278];
  if (norm.includes("new york")) return [40.7128, -74.006];
  if (norm.includes("bangalore") || norm.includes("bengaluru")) return [12.9716, 77.5946];
  if (norm.includes("manali")) return [32.2432, 77.1892];
  if (norm.includes("agra")) return [27.1767, 78.0081];
  if (norm.includes("varanasi")) return [25.3176, 82.9739];
  if (norm.includes("udaipur")) return [24.5854, 73.7125];
  return null;
}

export function TripMap({ items = [], selectedItemId, onSelectItem, destination }: TripMapProps) {
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [routeInfo, setRouteInfo] = useState<RouteResult | null>(null);
  const [triggerFit, setTriggerFit] = useState(0);

  // Filter active items (excluding historical "replaced" activities)
  const activeItems = useMemo(() => {
    return items.filter((item) => item.status !== "replaced");
  }, [items]);

  // Extract unique day_date values
  const availableDays = useMemo(() => {
    return Array.from(new Set(activeItems.map((i) => i.day_date))).sort();
  }, [activeItems]);

  // Extract unique categories
  const availableCategories = useMemo(() => {
    return Array.from(new Set(activeItems.map((i) => i.category || "activity"))).sort();
  }, [activeItems]);

  // Mappable items filtered by day and category
  const mappedItems = useMemo(() => {
    return activeItems.filter((item) => {
      const hasCoords =
        typeof item.latitude === "number" &&
        typeof item.longitude === "number" &&
        (item.latitude !== 0 || item.longitude !== 0);

      if (!hasCoords) return false;

      if (selectedDay !== "all" && item.day_date !== selectedDay) return false;
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;

      return true;
    });
  }, [activeItems, selectedDay, selectedCategory]);

  // Fetch Directions polyline route for mapped items using free OSRM service
  useEffect(() => {
    let isCancelled = false;

    async function fetchRoute() {
      if (mappedItems.length < 2) {
        setRouteInfo(null);
        return;
      }

      const waypoints: [number, number][] = mappedItems.map((item) => [
        item.latitude!,
        item.longitude!,
      ]);

      const route = await getDirectionsRoute(waypoints, "driving");
      if (!isCancelled) {
        setRouteInfo(route);
      }
    }

    void fetchRoute();

    return () => {
      isCancelled = true;
    };
  }, [mappedItems]);

  // Default initial center (first mapped coordinate or destination lookup)
  const initialCenter: [number, number] = useMemo(() => {
    if (mappedItems.length > 0 && mappedItems[0]?.latitude && mappedItems[0]?.longitude) {
      return [mappedItems[0].latitude, mappedItems[0].longitude];
    }
    const cityCoords = getCityCoordinates(destination);
    if (cityCoords) return cityCoords;
    return [31.1048, 77.1734]; // Default destination center
  }, [mappedItems, destination]);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card shadow-panel overflow-hidden space-y-3">
      {/* MAP HEADER CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 p-4 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">
              Interactive OpenStreetMap
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {mappedItems.length} mapped locations{" "}
              {routeInfo ? `• ~${routeInfo.distanceKm} km route` : ""}
            </p>
          </div>
        </div>

        {/* Filters & Control Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Day Filter */}
          {availableDays.length > 0 ? (
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground focus:outline-hidden"
            >
              <option value="all">All Days ({availableDays.length})</option>
              {availableDays.map((day, index) => (
                <option key={day} value={day}>
                  Day {index + 1} ({formatDate(day, { month: "short", day: "numeric" })})
                </option>
              ))}
            </select>
          ) : null}

          {/* Category Filter */}
          {availableCategories.length > 0 ? (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground capitalize focus:outline-hidden"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategorySymbol(cat)} {cat}
                </option>
              ))}
            </select>
          ) : null}

          {/* Fit Trip Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTriggerFit((prev) => prev + 1)}
            title="Frame all trip markers"
            className="h-8 gap-1 text-xs"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fit Trip</span>
          </Button>
        </div>
      </div>

      {/* LEAFLET MAP CONTAINER */}
      <div className="relative w-full h-[380px] sm:h-[440px] bg-background">
        <MapContainer
          center={initialCenter}
          zoom={12}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%", zIndex: 10 }}
          attributionControl={true}
        >
          {/* OpenStreetMap Base Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Map Controller for flying & bounds fitting */}
          <MapController
            mappedItems={mappedItems}
            selectedItemId={selectedItemId}
            triggerFit={triggerFit}
          />

          {/* OSRM Route Polyline Layer */}
          {routeInfo && routeInfo.coordinates.length >= 2 ? (
            <Polyline
              positions={routeInfo.coordinates}
              pathOptions={{ color: "#10b981", weight: 3.5, dashArray: "6, 6" }}
            />
          ) : null}

          {/* Markers */}
          {mappedItems.map((item, index) => {
            const isSelected = item.id === selectedItemId;
            const customIcon = createCustomDivIcon(item, isSelected, index);

            const dateFormatted = item.day_date
              ? formatDate(item.day_date, { weekday: "short", month: "short", day: "numeric" })
              : "";
            const timeRange = `${formatTime(item.start_time)} – ${formatTime(item.end_time)}`;

            return (
              <Marker
                key={item.id}
                position={[item.latitude!, item.longitude!]}
                icon={customIcon}
                eventHandlers={{
                  click: () => {
                    if (onSelectItem) {
                      onSelectItem(item.id);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1.5 text-xs text-foreground font-sans min-w-[180px]">
                    <div className="font-bold text-sm leading-snug">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {dateFormatted} • {timeRange}
                    </div>
                    <div className="text-[11px] font-medium text-primary">
                      {item.location || destination}
                    </div>

                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      {item.is_locked ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                          🔒 Locked
                        </span>
                      ) : null}

                      {item.status === "at_risk" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-destructive/20 text-destructive px-1.5 py-0.5 text-[10px] font-bold">
                          ⚠️ At Risk
                        </span>
                      ) : item.status === "confirmed" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-success/20 text-success px-1.5 py-0.5 text-[10px] font-bold">
                          ✓ Confirmed
                        </span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectItem) {
                          onSelectItem(item.id);
                        }
                      }}
                      className="mt-2.5 w-full rounded-md bg-primary px-2.5 py-1 text-center text-[11px] font-bold text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      View in Itinerary
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* FOOTER LEGEND */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 px-4 py-2 text-[11px] text-muted-foreground bg-muted/20">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Food
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Culture
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Nature
          </span>
          <span className="flex items-center gap-1">
            <span>🔒</span> Locked
          </span>
          <span className="flex items-center gap-1">
            <span>⚠️</span> At Risk
          </span>
        </div>

        {routeInfo ? (
          <span className="font-mono text-foreground font-semibold">
            Est. Transit: ~{routeInfo.durationMinutes} mins
          </span>
        ) : null}
      </div>
    </div>
  );
}
