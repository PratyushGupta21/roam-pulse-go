import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  DollarSign,
  Edit3,
  Gauge,
  Globe,
  Info,
  Loader2,
  MapPin,
  Navigation,
  Plane,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  User,
  Users,
  X,
  CloudRain,
  Sun,
  Thermometer,
  Pencil,
} from "lucide-react";
import { useMemo, useState } from "react";

import { DemoBadge, StatusBadge } from "@/components/app/StatusBadge";
import { Logo } from "@/components/brand/Logo";
import { ConfigureFlightModal } from "@/components/flights/ConfigureFlightModal";
import { DeleteFlightModal } from "@/components/flights/DeleteFlightModal";
import { TripMap } from "@/components/maps/TripMap";
import { DeleteTripModal } from "@/components/trips/DeleteTripModal";
import { DuplicateTripModal } from "@/components/trips/DuplicateTripModal";
import { EditTripModal } from "@/components/trips/EditTripModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { daysBetween, formatActivityPrice, formatDate, formatMoney, formatTime, relativeTime } from "@/lib/format";
import { checkTripFlightStatus } from "@/lib/flights/flight.functions";
import { checkTripWeather } from "@/lib/weather/weather.functions";
import {
  activeRecoveryQuery,
  disruptionsQuery,
  flightsQuery,
  historyQuery,
  itineraryQuery,
  tripQuery,
  type ItineraryItem,
} from "@/lib/queries";
import { applyRecovery, resolveRecovery, triggerDisruption } from "@/lib/recovery.functions";
import { generateTripItinerary } from "@/lib/trips.functions";

export const Route = createFileRoute("/_authenticated/trips/$tripId")({
  head: () => ({
    meta: [
      { title: "Trip Details — RoamPulse" },
      { name: "description", content: "View real-time monitored trip details, AI itinerary, and route map." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TripDetailsPage,
});

function TripDetailsPage() {
  const { tripId } = useParams({ from: "/_authenticated/trips/$tripId" });
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"itinerary" | "map" | "flights" | "history">("itinerary");
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [itineraryNotice, setItineraryNotice] = useState<{ source: string; warning: string | null } | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showConfigureFlightModal, setShowConfigureFlightModal] = useState(false);
  const [showDeleteFlightModal, setShowDeleteFlightModal] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [selectedItineraryItemId, setSelectedItineraryItemId] = useState<string | null>(null);

  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [selectedDisruptionType, setSelectedDisruptionType] = useState<"flight_delay" | "weather" | "transport">("flight_delay");
  const [selectedDelayMinutes, setSelectedDelayMinutes] = useState(120);

  // Load trip from Supabase (enforces RLS: auth.uid() = user_id)
  const {
    data: trip,
    isLoading: isLoadingTrip,
    isError: isErrorTrip,
    error: tripError,
    refetch: refetchTrip,
  } = useQuery(tripQuery(tripId));

  // Load itinerary items from Supabase
  const {
    data: itinerary = [],
    isLoading: isLoadingItinerary,
    isError: isErrorItinerary,
    refetch: refetchItinerary,
  } = useQuery(itineraryQuery(tripId));

  // Load active disruption & recovery records from Supabase
  const { data: disruptions = [] } = useQuery(disruptionsQuery(tripId));
  const { data: recoveryList = [] } = useQuery(activeRecoveryQuery(tripId));
  const { data: history = [] } = useQuery(historyQuery(tripId));
  const { data: flights = [] } = useQuery(flightsQuery(tripId));

  const flight = flights[0] ?? null;
  const flightStatusLabel =
    flight?.status === "cancelled"
      ? "Cancelled"
      : flight?.status === "delayed"
      ? "Delayed"
      : flight?.status === "scheduled"
      ? "On Time"
      : flight?.status === "landed"
      ? "Landed"
      : flight?.status === "active"
      ? "In Air"
      : "Unknown";
  const flightDelayMinutes = Number(flight?.delay_minutes ?? 0);

  const pendingRec = useMemo(() => recoveryList.find((r) => r.status === "pending") ?? null, [recoveryList]);
  const appliedRec = useMemo(() => recoveryList.find((r) => r.status === "applied") ?? null, [recoveryList]);

  const disruptionStatus = useMemo(() => {
    if (pendingRec) return "disrupted";
    if (appliedRec) return "recovered";
    return "normal";
  }, [pendingRec, appliedRec]);

  // Derived payload metadata for pending recovery
  const pendingPayload = useMemo(() => {
    if (!pendingRec) return null;
    return pendingRec.recommendation_data as Record<string, unknown>;
  }, [pendingRec]);

  const affectedItem = useMemo(() => {
    if (!pendingPayload) return null;
    const id = pendingPayload["affectedItemId"] as string;
    return itinerary.find((i) => i.id === id) ?? null;
  }, [pendingPayload, itinerary]);

  const affectedTitle =
    affectedItem?.title ||
    (pendingPayload?.["affectedItemTitle"] as string) ||
    "Scheduled Activity";

  const affectedDateRaw =
    affectedItem?.day_date ||
    (pendingPayload?.["affectedItemDate"] as string) ||
    trip?.start_date;

  const affectedDateFormatted = affectedDateRaw
    ? formatDate(affectedDateRaw, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";

  const affectedStartTimeRaw =
    affectedItem?.start_time ||
    (pendingPayload?.["affectedItemStartTime"] as string) ||
    "";

  const affectedEndTimeRaw =
    affectedItem?.end_time ||
    (pendingPayload?.["affectedItemEndTime"] as string) ||
    "";

  const affectedTimeRange =
    affectedStartTimeRaw && affectedEndTimeRaw
      ? `${formatTime(affectedStartTimeRaw)} – ${formatTime(affectedEndTimeRaw)}`
      : affectedStartTimeRaw
      ? formatTime(affectedStartTimeRaw)
      : "";

  const affectedLocation =
    affectedItem?.location ||
    (pendingPayload?.["affectedItemLocation"] as string) ||
    trip?.destination ||
    "";

  const primaryRec = (pendingPayload?.["primary"] as Record<string, unknown>) ?? {};

  const replacementTitle = (primaryRec["title"] as string) || "Alternative Activity";

  const replacementStartTimeRaw = (primaryRec["startTime"] as string) || (pendingPayload?.["newStartTime"] as string) || "";
  const replacementEndTimeRaw = (primaryRec["endTime"] as string) || "";

  const replacementTimeRange =
    replacementStartTimeRaw && replacementEndTimeRaw
      ? `${formatTime(replacementStartTimeRaw)} – ${formatTime(replacementEndTimeRaw)}`
      : replacementStartTimeRaw
      ? formatTime(replacementStartTimeRaw)
      : "";

  const replacementDateRaw =
    (pendingPayload?.["replacementDate"] as string) || affectedDateRaw;

  const replacementDateFormatted = replacementDateRaw
    ? formatDate(replacementDateRaw, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";

  const isDifferentDate = Boolean(
    replacementDateRaw && affectedDateRaw && replacementDateRaw !== affectedDateRaw
  );

  const replacementLocation =
    (primaryRec["location"] as string) ||
    affectedLocation ||
    trip?.destination ||
    "";

  const replacementDuration = (primaryRec["durationMinutes"] as number) || 0;

  const costDeltaNum = Number(pendingPayload?.["costDelta"] ?? 0);

  const recoveryReasons = (primaryRec["reasons"] as string[]) || [];

  const disruptionHeading = useMemo(() => {
    if (!pendingPayload) return "";
    const type = (pendingPayload["disruptionType"] as string) || "flight_delay";
    const dateStr = affectedDateRaw
      ? formatDate(affectedDateRaw, { weekday: "long", month: "long", day: "numeric" })
      : "";
    const timeStr = affectedTimeRange;

    if (type === "weather") {
      return dateStr && timeStr
        ? `Heavy rain expected on ${dateStr} from ${timeStr}.`
        : (pendingPayload["reason"] as string) || "Severe weather disruption affecting your outdoor schedule.";
    }

    if (type === "flight_delay") {
      const mins = Number(pendingPayload["disruptionMinutes"] ?? 120);
      const hours = Math.floor(mins / 60);
      const extraMins = mins % 60;
      const delayText = hours > 0 ? `${hours} hour${hours > 1 ? "s" : ""}${extraMins > 0 ? ` ${extraMins}m` : ""}` : `${mins} minutes`;
      return timeStr
        ? `Your flight is delayed by ${delayText}, affecting your ${timeStr} activity.`
        : `Your flight is delayed by ${delayText}, forcing schedule shifts.`;
    }

    if (type === "transport") {
      return timeStr
        ? `Transit line disruption affecting your ${timeStr} schedule.`
        : "Local transit disruption detected along your route.";
    }

    return (pendingPayload["reason"] as string) || "A disruption event occurred affecting your travel plans.";
  }, [pendingPayload, affectedDateRaw, affectedTimeRange]);

  // Server-side AI Itinerary Generation Mutation
  const generateMutation = useMutation({
    mutationFn: async ({ replace }: { replace: boolean }) => {
      setShowRegenerateConfirm(false);
      return await generateTripItinerary({ data: { tripId, replaceExisting: replace } });
    },
    onSuccess: (res) => {
      setItineraryNotice({
        source: res.source,
        warning: res.warning ?? null,
      });
      void queryClient.invalidateQueries({ queryKey: ["itinerary", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["history", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["recovery", tripId] });
    },
  });

  // Disruption Simulation Mutation
  const triggerDisruptionMutation = useMutation({
    mutationFn: async () => {
      setShowSimulateModal(false);
      return await triggerDisruption({
        data: {
          tripId,
          type: selectedDisruptionType,
          minutes: selectedDelayMinutes,
        },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["itinerary", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["disruptions", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["recovery", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["history", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Check Weather Mutation (Open-Meteo)
  const checkWeatherMutation = useMutation({
    mutationFn: async () => {
      return await checkTripWeather({ data: { tripId } });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["itinerary", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["disruptions", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["recovery", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["history", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });

      if (data.overallStatus === "risk_detected") {
        setItineraryNotice({
          source: "weather",
          warning: data.summaryText,
        });
      } else {
        setNoticeMessage(data.summaryText);
      }
    },
    onError: (err: Error) => {
      setItineraryNotice({
        source: "weather",
        warning: err.message || "Failed to check Open-Meteo weather forecast.",
      });
    },
  });

  const checkFlightMutation = useMutation({
    mutationFn: async () => {
      return await checkTripFlightStatus({ data: { tripId } });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["flights", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["disruptions", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["recovery", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["history", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });

      if (data.message) {
        setNoticeMessage(data.message);
      }
    },
    onError: (err: Error) => {
      setNoticeMessage(err.message || "Flight status temporarly unavailable.");
    },
  });

  // Apply Recovery Mutation
  const applyRecoveryMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      return await applyRecovery({ data: { recommendationId } });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["itinerary", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["disruptions", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["recovery", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["history", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Resolve (Reject/Keep Original) Recovery Mutation
  const resolveRecoveryMutation = useMutation({
    mutationFn: async ({ recommendationId, action }: { recommendationId: string; action: "keep_original" | "dismissed" }) => {
      return await resolveRecovery({ data: { recommendationId, action } });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["itinerary", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["disruptions", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["recovery", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["history", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Group itinerary items by day_date
  const groupedItinerary = useMemo(() => {
    const map = new Map<string, ItineraryItem[]>();
    for (const item of itinerary) {
      const dateKey = item.day_date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [itinerary]);

  // Total itinerary cost breakdown summary
  const itineraryTotalSummary = useMemo(() => {
    let sum = 0;
    let freeCount = 0;
    let estimatedCount = 0;
    let liveCount = 0;
    let unavailableCount = 0;

    for (const item of itinerary) {
      const cost = item.estimated_cost !== null && item.estimated_cost !== undefined ? Number(item.estimated_cost) : null;
      const info = formatActivityPrice(cost, trip?.currency || "INR", false, false, item.title, item.category);

      if (info.status === "free") {
        freeCount++;
      } else if (info.status === "estimated") {
        sum += info.numericAmount || 0;
        estimatedCount++;
      } else if (info.status === "live") {
        sum += info.numericAmount || 0;
        liveCount++;
      } else {
        unavailableCount++;
      }
    }

    return {
      totalAmount: sum,
      freeCount,
      estimatedCount,
      liveCount,
      unavailableCount,
      formattedTotal: formatMoney(sum, trip?.currency || "INR"),
    };
  }, [itinerary, trip?.currency]);

  const isLoading = isLoadingTrip || isLoadingItinerary;
  const isError = isErrorTrip || isErrorItinerary;

  return (
    <div className="min-h-screen bg-app-atmosphere text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to My Trips</span>
              </Link>
            </Button>
            <span className="h-4 w-px bg-border hidden sm:block" />
            <Link to="/" aria-label="RoamPulse Home">
              <Logo />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5 text-primary" />
              <span className="max-w-[160px] truncate">{user?.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => void signOut()} className="text-xs">
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        {/* LOADING SKELETON */}
        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-44 rounded-2xl bg-card border border-border" />
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 h-96 rounded-2xl bg-card border border-border" />
              <div className="h-96 rounded-2xl bg-card border border-border" />
            </div>
          </div>
        ) : null}

        {/* ERROR STATE */}
        {!isLoading && isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center space-y-4 shadow-sm">
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
            <div className="max-w-md mx-auto space-y-1">
              <h2 className="font-display text-xl font-bold text-foreground">Could not load trip data</h2>
              <p className="text-sm text-muted-foreground">
                {(tripError as Error)?.message || "A database query error occurred while fetching your trip."}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void refetchTrip();
                void refetchItinerary();
              }}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry Database Query</span>
            </Button>
          </div>
        ) : null}

        {/* TRIP NOT FOUND / ACCESS DENIED STATE */}
        {!isLoading && !isError && !trip ? (
          <div className="rounded-2xl border border-border bg-card p-10 sm:p-14 text-center space-y-5 shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent-foreground">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="font-display text-2xl font-bold text-foreground">Trip Not Found or Access Denied</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This trip does not exist in your database or you do not have permission to view it. Row Level Security prevents accessing other users' trips.
              </p>
            </div>
            <div className="pt-2">
              <Button asChild variant="recover" size="default" className="gap-2 font-semibold">
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Return to Dashboard</span>
                </Link>
              </Button>
            </div>
          </div>
        ) : null}

        {/* REAL TRIP CONTENT */}
        {!isLoading && !isError && trip ? (
          <>
            {/* Top Banner Card */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/80 pb-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={trip.status} />

                    {/* Disruption Sentinel Badge */}
                    {disruptionStatus === "disrupted" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/15 px-3 py-0.5 text-xs font-bold text-destructive animate-pulse">
                        <ShieldAlert className="h-3.5 w-3.5" /> ⚠️ DISRUPTION DETECTED
                      </span>
                    ) : disruptionStatus === "recovered" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/15 px-3 py-0.5 text-xs font-bold text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> ✓ RECOVERY APPLIED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        <CheckCircle2 className="h-3 w-3" /> NORMAL · Monitoring Active
                      </span>
                    )}

                    {trip.is_demo ? (
                      <DemoBadge />
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        Real Database Trip
                      </span>
                    )}
                    <span className="font-mono text-xs text-muted-foreground">ID: {trip.id.slice(0, 8)}…</span>
                  </div>

                  <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                    {trip.name}
                  </h1>

                  <p className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      {trip.origin ? (
                        <>
                          <span className="text-foreground font-medium">{trip.origin}</span>
                          <span className="mx-1 text-primary">→</span>
                        </>
                      ) : null}
                      <strong className="text-foreground font-semibold">{trip.destination}</strong>
                    </span>
                    {trip.extra_destinations && trip.extra_destinations.length > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        (+{trip.extra_destinations.join(", ")})
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowEditModal(true)}
                    className="gap-1.5 text-xs font-medium"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-primary" />
                    <span>Edit Trip</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDuplicateModal(true)}
                    className="gap-1.5 text-xs font-medium"
                  >
                    <Copy className="h-3.5 w-3.5 text-primary" />
                    <span>Duplicate Trip</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="recover"
                    onClick={() => setShowSimulateModal(true)}
                    disabled={triggerDisruptionMutation.isPending}
                    className="gap-1.5 text-xs font-semibold shadow-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Simulate Disruption</span>
                    <span className="ml-1 rounded bg-black/20 px-1.5 py-0.5 text-[10px] uppercase font-mono">Demo</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowDeleteModal(true)}
                    className="gap-1.5 text-xs font-medium"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Trip</span>
                  </Button>

                  <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Link to="/dashboard">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back to Dashboard</span>
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Quick Metadata Bar */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <div className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Dates &amp; Duration
                  </span>
                  <p className="font-semibold text-foreground text-sm">
                    {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {daysBetween(trip.start_date, trip.end_date)} Days Trip
                  </p>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 font-medium">
                    <Users className="h-3.5 w-3.5 text-primary" /> Travelers
                  </span>
                  <p className="font-semibold text-foreground text-sm">
                    {trip.adults} Adult{trip.adults > 1 ? "s" : ""}
                    {trip.children > 0 ? `, ${trip.children} Child${trip.children > 1 ? "ren" : ""}` : ""}
                  </p>
                  <p className="text-muted-foreground text-[11px]">Travel Party</p>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 font-medium">
                    <DollarSign className="h-3.5 w-3.5 text-primary" /> Budget
                  </span>
                  <p className="font-semibold text-foreground text-sm">
                    {formatMoney(Number(trip.budget), trip.currency)}
                  </p>
                  <p className="text-muted-foreground text-[11px] capitalize">Style: {trip.travel_style}</p>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 font-medium">
                    <Gauge className="h-3.5 w-3.5 text-success" /> Autonomous Mode
                  </span>
                  <p className="font-semibold text-foreground text-sm capitalize">{trip.recovery_mode}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {trip.recovery_mode === "assisted"
                      ? "Proactive prompt before changes"
                      : trip.recovery_mode === "autonomous"
                      ? "Auto-executes within policy"
                      : "Manual notifications only"}
                  </p>
                </div>
              </div>

              {/* Preferences & Interests Badges */}
              {trip.interests && trip.interests.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/60 text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <Tag className="h-3 w-3 text-primary" /> Interests:
                  </span>
                  {trip.interests.map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full border border-border bg-secondary/80 px-2.5 py-0.5 text-xs text-foreground font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* ENHANCED DISRUPTION & RECOVERY RECOMMENDATION TIMELINE CARD */}
            {pendingRec && pendingPayload ? (
              <div className="rounded-2xl border-2 border-amber-500/80 bg-amber-500/10 p-6 sm:p-8 space-y-6 shadow-md">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1.5 max-w-3xl">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4" /> ⚠️ DISRUPTION DETECTED
                    </span>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-snug">
                      {disruptionHeading}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      RoamPulse Sentinel detected an issue with your schedule. Review the original timeline vs proposed replacement below.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground bg-card/80 px-3 py-1.5 rounded-lg border border-border font-semibold">
                    User Approval Required
                  </span>
                </div>

                {/* Timeline Comparison Box */}
                <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-6 shadow-xs">
                  <div className="flex items-center justify-between text-xs border-b border-border/80 pb-3 flex-wrap gap-2">
                    <span className="font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" /> Proposed Recovery Plan
                    </span>
                    <span className="text-muted-foreground font-semibold">
                      Cost Impact:{" "}
                      {costDeltaNum > 0
                        ? `+${formatMoney(costDeltaNum, trip.currency)}`
                        : costDeltaNum < 0
                        ? `${formatMoney(costDeltaNum, trip.currency)}`
                        : "₹0 (No extra cost)"}
                    </span>
                  </div>

                  {/* Two Column / Stacked Timeline Comparison Grid */}
                  <div className="grid gap-6 md:grid-cols-11 items-stretch">
                    
                    {/* AFFECTED ACTIVITY (RED / WARNING AREA - Span 5) */}
                    <div className="md:col-span-5 rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-destructive">
                            <ShieldAlert className="h-3.5 w-3.5" /> Affected Activity
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground uppercase font-medium">Original Plan</span>
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-display text-lg font-bold text-foreground leading-snug">
                            {affectedTitle}
                          </h3>

                          {/* Date */}
                          {affectedDateFormatted ? (
                            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>{affectedDateFormatted}</span>
                            </p>
                          ) : null}

                          {/* Time Range */}
                          {affectedTimeRange ? (
                            <p className="text-xs font-mono font-bold text-foreground flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>{affectedTimeRange}</span>
                            </p>
                          ) : null}

                          {/* Location */}
                          {affectedLocation ? (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span>{affectedLocation}</span>
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-destructive/20 text-xs text-destructive font-medium flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>⚠️ {(pendingPayload["reason"] as string) || "Schedule conflict prevents completing this activity."}</span>
                      </div>
                    </div>

                    {/* ARROW DIVIDER (Span 1) */}
                    <div className="md:col-span-1 flex items-center justify-center py-2 md:py-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-primary shadow-xs">
                        <ArrowRight className="h-5 w-5 md:rotate-0 rotate-90" />
                      </div>
                    </div>

                    {/* PROPOSED REPLACEMENT (GREEN / SAFE AREA - Span 5) */}
                    <div className="md:col-span-5 rounded-xl border border-success/40 bg-success/5 p-5 space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Proposed Replacement
                          </span>

                          {/* Date Indicator Badge */}
                          {isDifferentDate ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                              <Calendar className="h-3 w-3" /> Moved to New Date
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                              ⚡ Same Day Adjustment
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-display text-lg font-bold text-foreground leading-snug">
                            {replacementTitle}
                          </h3>

                          {/* Date */}
                          {replacementDateFormatted ? (
                            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-success shrink-0" />
                              <span>{replacementDateFormatted}</span>
                            </p>
                          ) : null}

                          {/* Time Range */}
                          {replacementTimeRange ? (
                            <p className="text-xs font-mono font-bold text-foreground flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-success shrink-0" />
                              <span>{replacementTimeRange}</span>
                            </p>
                          ) : null}

                          {/* Location & Duration */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            {replacementLocation ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {replacementLocation}
                              </span>
                            ) : null}
                            {replacementDuration > 0 ? (
                              <span className="font-medium text-foreground">
                                • Duration: {replacementDuration} min
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Recovery Reasons */}
                        {recoveryReasons.length > 0 ? (
                          <ul className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t border-success/20">
                            {recoveryReasons.map((reason) => (
                              <li key={reason} className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-4 flex-wrap pt-2">
                  <Button
                    variant="recover"
                    size="lg"
                    onClick={() => applyRecoveryMutation.mutate(pendingRec.id)}
                    disabled={applyRecoveryMutation.isPending || resolveRecoveryMutation.isPending}
                    className="gap-2 font-bold shadow-md text-sm px-6"
                  >
                    {applyRecoveryMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Applying Recovery…</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4.5 w-4.5" />
                        <span>Apply Recovery</span>
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => resolveRecoveryMutation.mutate({ recommendationId: pendingRec.id, action: "keep_original" })}
                    disabled={applyRecoveryMutation.isPending || resolveRecoveryMutation.isPending}
                    className="gap-2 font-semibold border-amber-500/50 hover:bg-amber-500/10 text-sm px-6"
                  >
                    {resolveRecoveryMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Updating…</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4" />
                        <span>Keep My Original Plan</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* TWO-COLUMN LAYOUT */}
            <div className="grid gap-8 lg:grid-cols-3">
              {/* LEFT COLUMN: ITINERARY SCHEDULE (Span 2) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
                  {/* Itinerary Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-display text-xl font-bold text-foreground">YOUR ITINERARY</h2>
                        {itineraryNotice ? (
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                            {itineraryNotice.source === "ai" ? "AI Generated" : "Starter Schedule"}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {itinerary.length > 0
                          ? `Structured day-by-day travel schedule for ${trip.destination}`
                          : "No itinerary generated yet."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {itinerary.length > 0 ? (
                        !showRegenerateConfirm ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowRegenerateConfirm(true)}
                            disabled={generateMutation.isPending}
                            className="gap-1.5 text-xs"
                          >
                            <RotateCcw className="h-3.5 w-3.5 text-primary" />
                            <span>Regenerate Itinerary</span>
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-secondary/80 p-1 rounded-lg border border-border">
                            <span className="text-[11px] text-muted-foreground font-medium px-2">Replace existing?</span>
                            <Button
                              size="sm"
                              variant="recover"
                              disabled={generateMutation.isPending}
                              onClick={() => void generateMutation.mutate({ replace: true })}
                              className="gap-1 text-[11px] h-7 px-2.5"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Yes, Replace</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowRegenerateConfirm(false)}
                              className="text-[11px] h-7 px-2"
                            >
                              Cancel
                            </Button>
                          </div>
                        )
                      ) : (
                        <Button
                          size="sm"
                          variant="recover"
                          disabled={generateMutation.isPending}
                          onClick={() => void generateMutation.mutate({ replace: true })}
                          className="gap-2 font-semibold shadow-xs"
                        >
                          <Sparkles className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
                          <span>
                            {generateMutation.isPending ? "Generating your itinerary..." : "Generate Itinerary"}
                          </span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* ITINERARY TOTAL SUMMARY BAR */}
                  {itinerary.length > 0 ? (
                    <div className="rounded-xl border border-border bg-background/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground uppercase tracking-wide font-medium">
                          Estimated Itinerary Total
                        </span>
                        <p className="font-display text-lg font-bold text-foreground mt-0.5">
                          ~{itineraryTotalSummary.formattedTotal}
                        </p>
                      </div>
                      <div className="text-left sm:text-right text-[11px] text-muted-foreground space-y-0.5">
                        <p>
                          {itineraryTotalSummary.estimatedCount > 0 ? `${itineraryTotalSummary.estimatedCount} Estimated` : ""}
                          {itineraryTotalSummary.freeCount > 0 ? `, ${itineraryTotalSummary.freeCount} Free` : ""}
                        </p>
                        {itineraryTotalSummary.unavailableCount > 0 ? (
                          <p className="text-accent font-medium">
                            {itineraryTotalSummary.unavailableCount} items without price (excluded)
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {/* MUTATION ERROR ALERT */}
                  {generateMutation.isError ? (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">Unable to generate itinerary</p>
                        <p className="opacity-90">
                          {(generateMutation.error as Error)?.message || "An unexpected error occurred during generation."}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void generateMutation.mutate({ replace: true })}
                          className="mt-2 text-xs h-7 gap-1"
                        >
                          <RefreshCw className="h-3 w-3" /> Retry Generation
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {/* GENERATING LOADING OVERLAY */}
                  {generateMutation.isPending ? (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center space-y-3">
                      <Sparkles className="mx-auto h-8 w-8 text-primary animate-spin" />
                      <h3 className="font-display text-base font-bold text-foreground">
                        Generating your itinerary...
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Structuring day-by-day activities in {trip.destination} matching your budget and travel preferences.
                      </p>
                    </div>
                  ) : null}

                  {/* EMPTY ITINERARY STATE */}
                  {itinerary.length === 0 && !generateMutation.isPending ? (
                    <div className="py-12 text-center space-y-4">
                      <Compass className="mx-auto h-10 w-10 text-muted-foreground" />
                      <div className="max-w-sm mx-auto space-y-1">
                        <h3 className="font-display text-base font-bold text-foreground">
                          No itinerary has been generated yet
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Click "Generate Itinerary" to create a personalized day-by-day travel schedule for {trip.destination}.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="recover"
                        disabled={generateMutation.isPending}
                        onClick={() => void generateMutation.mutate({ replace: true })}
                        className="gap-2 font-semibold shadow-xs"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Generate Itinerary</span>
                      </Button>
                    </div>
                  ) : null}

                  {/* GROUPED ITINERARY BY DAY */}
                  {!generateMutation.isPending && itinerary.length > 0 ? (
                    <div className="space-y-8">
                      {groupedItinerary.map(([dayDate, items], dayIdx) => (
                        <div key={dayDate} className="space-y-3">
                          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                              DAY {dayIdx + 1}
                            </span>
                            <span className="font-display text-sm font-bold text-foreground">
                              {formatDate(dayDate, { weekday: "long", day: "numeric", month: "long" })}
                            </span>
                          </div>

                          <div className="space-y-3 pt-1">
                            {items.map((item) => {
                              const costNum =
                                item.estimated_cost !== null && item.estimated_cost !== undefined
                                  ? Number(item.estimated_cost)
                                  : null;
                              const priceInfo = formatActivityPrice(
                                costNum,
                                trip.currency || "INR",
                                false,
                                false,
                                item.title,
                                item.category,
                              );

                              const isSelected = item.id === selectedItineraryItemId;

                              return (
                                <div
                                  key={item.id}
                                  id={`itinerary-item-${item.id}`}
                                  onClick={() => setSelectedItineraryItemId(item.id)}
                                  className={`flex flex-col sm:flex-row sm:items-start justify-between gap-4 rounded-xl border p-4 text-sm transition-all shadow-2xs cursor-pointer ${
                                    isSelected
                                      ? "border-primary bg-primary/10 ring-2 ring-primary"
                                      : "border-border/70 bg-background/60 hover:border-primary/40"
                                  }`}
                                >
                                  <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-primary" />
                                        {formatTime(item.start_time)} – {formatTime(item.end_time)}
                                      </span>
                                      <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                                        {item.category}
                                      </span>
                                      <StatusBadge status={item.status} />
                                      {item.status === "at_risk" ? (
                                        <span className="rounded-md border border-destructive/40 bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive flex items-center gap-1">
                                          🌧️ Weather Risk
                                        </span>
                                      ) : null}
                                      {item.is_locked ? (
                                        <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                          🔒 Locked
                                        </span>
                                      ) : null}
                                    </div>

                                    <h4 className="font-semibold text-foreground text-base leading-snug">
                                      {item.title}
                                    </h4>

                                    {item.description ? (
                                      <p className="text-xs text-muted-foreground leading-relaxed">
                                        {item.description}
                                      </p>
                                    ) : null}

                                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-1">
                                      {item.location ? (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3 text-primary" />
                                          {item.location}
                                        </span>
                                      ) : null}
                                      {item.travel_minutes > 0 ? (
                                        <span>• {item.travel_minutes}m travel buffer</span>
                                      ) : null}
                                      <span className="capitalize">• {item.indoor_outdoor}</span>
                                    </div>
                                  </div>

                                  <div className="text-left sm:text-right shrink-0 pt-1 border-t sm:border-t-0 border-border/60">
                                    <span
                                      className={
                                        priceInfo.status === "free"
                                          ? "text-success font-semibold text-xs rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5"
                                          : priceInfo.status === "estimated"
                                          ? "text-foreground font-medium text-xs rounded-full border border-border bg-secondary/60 px-2.5 py-0.5"
                                          : priceInfo.status === "live"
                                          ? "text-primary font-semibold text-xs rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5"
                                          : "text-muted-foreground text-xs rounded-full border border-border bg-muted/40 px-2.5 py-0.5"
                                      }
                                    >
                                      {priceInfo.label}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* RIGHT COLUMN: REAL MAPBOX MAP & SENTINEL SIDEBAR */}
              <div className="space-y-6">
                <TripMap
                  items={itinerary}
                  selectedItemId={selectedItineraryItemId}
                  onSelectItem={(itemId) => {
                    setSelectedItineraryItemId(itemId);
                    const el = document.getElementById(`itinerary-item-${itemId}`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                  }}
                  destination={trip.destination}
                  origin={trip.origin || undefined}
                />

                {/* FLIGHT SENTINEL CARD */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-border/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4 text-primary" />
                      <h3 className="font-display text-sm font-bold text-foreground">Flight Sentinel</h3>
                    </div>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Aviationstack
                    </span>
                  </div>

                  {flight ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Flight</span>
                        <span className="font-semibold text-foreground">{flight.flight_number}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Airline</span>
                        <span className="font-semibold text-foreground">{flight.airline || "Airline"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Route</span>
                        <span className="font-semibold text-foreground">
                          {flight.departure_airport || "-"} → {flight.arrival_airport || "-"}
                        </span>
                      </div>

                      <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Status</span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
                              flight?.status === "cancelled"
                                ? "bg-red-500/15 text-red-600"
                                : flight?.status === "delayed"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {flight?.status === "cancelled" ? "🚨" : flight?.status === "delayed" ? "⚠️" : "✓"} {flightStatusLabel}
                          </span>
                        </div>
                        {flightDelayMinutes > 0 ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Delay</span>
                            <span className="font-semibold text-foreground">{flightDelayMinutes} min</span>
                          </div>
                        ) : null}
                        {flight.estimated_arrival ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Estimated arrival</span>
                            <span className="font-semibold text-foreground">{formatTime(flight.estimated_arrival.slice(11, 16))}</span>
                          </div>
                        ) : null}
                        {flight.last_updated ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Last checked</span>
                            <span className="font-semibold text-foreground">{relativeTime(flight.last_updated)}</span>
                          </div>
                        ) : null}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => checkFlightMutation.mutate()}
                        disabled={checkFlightMutation.isPending || !flight}
                        className="w-full gap-2 text-xs font-semibold"
                      >
                        {checkFlightMutation.isPending ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Checking Flight Status…</span>
                          </>
                        ) : (
                          <>
                            <Plane className="h-3.5 w-3.5 text-primary" />
                            <span>Check Flight Status</span>
                          </>
                        )}
                      </Button>

                      <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowConfigureFlightModal(true)}
                          className="flex-1 gap-1.5 text-xs font-semibold"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit Flight</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteFlightModal(true)}
                          className="flex-1 gap-1.5 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          <span>Remove Flight</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <p className="text-muted-foreground leading-relaxed">
                        No flight has been configured for this trip yet.
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => setShowConfigureFlightModal(true)}
                        className="w-full gap-2 text-xs font-semibold shadow-xs"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Flight</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* WEATHER SENTINEL CARD (OPEN-METEO) */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-border/80 pb-3">
                    <div className="flex items-center gap-2">
                      <CloudRain className="h-4 w-4 text-primary" />
                      <h3 className="font-display text-sm font-bold text-foreground">
                        Weather Sentinel
                      </h3>
                    </div>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Open-Meteo
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Monitoring Destination</span>
                      <span className="font-semibold text-foreground">{trip.destination}</span>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/40 p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Sun className="h-5 w-5 text-amber-500 shrink-0" />
                        <div>
                          <p className="font-bold text-foreground">Live Forecast Engine</p>
                          <p className="text-[11px] text-muted-foreground">Keyless hourly weather risk analysis</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => checkWeatherMutation.mutate()}
                      disabled={checkWeatherMutation.isPending}
                      className="w-full gap-2 text-xs font-semibold"
                    >
                      {checkWeatherMutation.isPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Checking Weather…</span>
                        </>
                      ) : (
                        <>
                          <CloudRain className="h-3.5 w-3.5 text-primary" />
                          <span>Check Weather</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* TRIP EVENT HISTORY LOG */}
                {history && history.length > 0 ? (
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-border/80 pb-3">
                      <Clock className="h-4 w-4 text-primary" />
                      <h3 className="font-display text-sm font-bold text-foreground">
                        Trip Activity Log
                      </h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      {history.slice(0, 5).map((log) => (
                        <div key={log.id} className="space-y-1 border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                            <span className="font-semibold text-foreground">{log.event}</span>
                            <span>{new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          {log.detail ? <p className="text-muted-foreground text-[11px] leading-snug">{log.detail}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* SENTINEL PROTECTION STATUS */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-border/80 pb-3">
                    <ShieldCheck className="h-4 w-4 text-success" />
                    <h3 className="font-display text-sm font-bold text-foreground">
                      Sentinel Protection Status
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 p-2.5">
                      <span>Flight Status Polling</span>
                      <span className="font-semibold text-success flex items-center gap-1">
                        <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-success" /> Active
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 p-2.5">
                      <span>Weather Forecast Sentinel</span>
                      <span className="font-semibold text-success flex items-center gap-1">
                        <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-success" /> Nominal
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 p-2.5">
                      <span>Row Level Database Security</span>
                      <span className="font-semibold text-primary">Enforced</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SIMULATE DISRUPTION MODAL (DEMO SIMULATION) */}
            {showSimulateModal ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 space-y-5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 rounded bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                        Demo Simulation Mode
                      </span>
                      <h3 className="font-display text-lg font-bold text-foreground">Simulate Disruption Event</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowSimulateModal(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Select a simulated disruption scenario to test RoamPulse's real-time impact detection and automated recovery recommendation loop.
                  </p>

                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-foreground">Disruption Scenario</label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDisruptionType("flight_delay");
                          setSelectedDelayMinutes(120);
                        }}
                        className={`rounded-xl border p-3.5 text-left transition-all ${
                          selectedDisruptionType === "flight_delay" && selectedDelayMinutes === 120
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border bg-background hover:bg-secondary"
                        }`}
                      >
                        <p className="text-xs font-bold text-foreground">✈️ Flight Delay (2 Hours)</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Simulates a 2-hour arrival delay shift on Day 1.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDisruptionType("flight_delay");
                          setSelectedDelayMinutes(240);
                        }}
                        className={`rounded-xl border p-3.5 text-left transition-all ${
                          selectedDisruptionType === "flight_delay" && selectedDelayMinutes === 240
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border bg-background hover:bg-secondary"
                        }`}
                      >
                        <p className="text-xs font-bold text-foreground">✈️ Flight Delay (4 Hours)</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Simulates a major 4-hour delay shift.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDisruptionType("weather");
                          setSelectedDelayMinutes(120);
                        }}
                        className={`rounded-xl border p-3.5 text-left transition-all ${
                          selectedDisruptionType === "weather"
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border bg-background hover:bg-secondary"
                        }`}
                      >
                        <p className="text-xs font-bold text-foreground">🌧️ Severe Rain Forecast</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Marks outdoor activities as weather-sensitive.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDisruptionType("transport");
                          setSelectedDelayMinutes(90);
                        }}
                        className={`rounded-xl border p-3.5 text-left transition-all ${
                          selectedDisruptionType === "transport"
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border bg-background hover:bg-secondary"
                        }`}
                      >
                        <p className="text-xs font-bold text-foreground">🚌 Transit Disruption</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Simulates local transit delays between activities.</p>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                    <Button variant="outline" size="sm" onClick={() => setShowSimulateModal(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="recover"
                      size="sm"
                      onClick={() => triggerDisruptionMutation.mutate()}
                      disabled={triggerDisruptionMutation.isPending}
                      className="gap-2 font-bold"
                    >
                      {triggerDisruptionMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Simulating…</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Trigger Simulation</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* MODALS */}
            {trip && showEditModal ? (
              <EditTripModal
                trip={trip}
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onNotice={(msg) => setNoticeMessage(msg)}
              />
            ) : null}

            {trip && showDeleteModal ? (
              <DeleteTripModal
                tripId={trip.id}
                tripName={trip.name}
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onSuccessRedirect={() => {
                  window.location.href = "/dashboard";
                }}
              />
            ) : null}

            {trip && showDuplicateModal ? (
              <DuplicateTripModal
                sourceTripId={trip.id}
                sourceTripName={trip.name}
                sourceStartDate={trip.start_date}
                sourceEndDate={trip.end_date}
                isOpen={showDuplicateModal}
                onClose={() => setShowDuplicateModal(false)}
              />
            ) : null}

            {trip ? (
              <ConfigureFlightModal
                open={showConfigureFlightModal}
                onOpenChange={setShowConfigureFlightModal}
                tripId={trip.id}
                defaultDate={trip.start_date}
                existingFlight={flight}
                onSuccess={() => {
                  void queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
                  void queryClient.invalidateQueries({ queryKey: ["flights", tripId] });
                  void queryClient.invalidateQueries({ queryKey: ["history", tripId] });
                  setNoticeMessage(flight ? "Flight configuration updated." : "Flight configured successfully.");
                }}
              />
            ) : null}

            {trip && flight ? (
              <DeleteFlightModal
                open={showDeleteFlightModal}
                onOpenChange={setShowDeleteFlightModal}
                tripId={trip.id}
                flight={flight}
                onSuccess={() => {
                  void queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
                  void queryClient.invalidateQueries({ queryKey: ["flights", tripId] });
                  void queryClient.invalidateQueries({ queryKey: ["history", tripId] });
                  setNoticeMessage("Flight removed from trip.");
                }}
              />
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
