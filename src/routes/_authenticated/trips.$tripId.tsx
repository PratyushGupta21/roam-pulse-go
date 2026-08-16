import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Gauge,
  Globe,
  Info,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { DemoBadge, StatusBadge } from "@/components/app/StatusBadge";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { daysBetween, formatActivityPrice, formatDate, formatMoney, formatTime } from "@/lib/format";
import { itineraryQuery, tripQuery, type ItineraryItem } from "@/lib/queries";
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

  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [itineraryNotice, setItineraryNotice] = useState<{
    source: "ai" | "fallback";
    warning: string | null;
  } | null>(null);

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
                    {trip.is_demo ? (
                      <DemoBadge />
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        <CheckCircle2 className="h-3 w-3" /> Real Database Trip
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
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Dates & Duration
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

            {/* TWO-COLUMN LAYOUT (Desktop) / SINGLE-COLUMN (Mobile) */}
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
                        <span className="text-muted-foreground uppercase tracking-wide font-medium">Estimated Itinerary Total</span>
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

                  {/* AI / FALLBACK NOTICE BANNER */}
                  {itineraryNotice?.warning ? (
                    <div className="rounded-xl border border-accent/40 bg-accent/15 p-3.5 text-xs text-accent-foreground flex items-start gap-2.5">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">{itineraryNotice.warning}</p>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          Starter itineraries can be fully customized, edited, or regenerated at any time.
                        </p>
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

                              return (
                                <div
                                  key={item.id}
                                  className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 rounded-xl border border-border/70 bg-background/60 p-4 text-sm hover:border-primary/40 transition-all shadow-2xs"
                                >
                                  <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-xs text-muted-foreground flex items-center gap-1 font-semibold">
                                        <Clock className="h-3 w-3 text-primary shrink-0" />
                                        {formatTime(item.start_time)} – {formatTime(item.end_time)}
                                      </span>
                                      <StatusBadge status={item.status} />
                                      <span className="rounded bg-secondary px-2 py-0.5 text-[11px] font-medium uppercase text-muted-foreground">
                                        {item.category}
                                      </span>
                                    </div>

                                    <h4 className="font-display text-base font-bold text-foreground">
                                      {item.title}
                                    </h4>

                                    {item.description ? (
                                      <p className="text-xs text-muted-foreground leading-relaxed">
                                        {item.description}
                                      </p>
                                    ) : null}

                                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
                                      {item.location ? (
                                        <span className="flex items-center gap-1 text-foreground font-medium">
                                          <MapPin className="h-3 w-3 text-primary shrink-0" />
                                          {item.location}
                                        </span>
                                      ) : null}

                                      {item.indoor_outdoor ? (
                                        <span className="capitalize">
                                          {item.indoor_outdoor === "indoor" ? "🏠 Indoor" : "🌲 Outdoor"}
                                        </span>
                                      ) : null}

                                      {item.weather_suitability ? (
                                        <span className="capitalize">
                                          🌤️ Weather: {item.weather_suitability}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  {/* PRICING SEMANTICS BADGE */}
                                  <div className="text-right sm:self-center shrink-0 border-t sm:border-t-0 border-border/60 pt-2 sm:pt-0">
                                    {priceInfo.status === "free" ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success font-mono">
                                        <CheckCircle2 className="h-3 w-3" /> Free
                                      </span>
                                    ) : priceInfo.status === "estimated" ? (
                                      <span className="font-mono text-xs font-medium text-foreground bg-secondary/80 border border-border px-2.5 py-1 rounded-full inline-block">
                                        {priceInfo.label}
                                      </span>
                                    ) : priceInfo.status === "live" ? (
                                      <span className="font-mono text-xs font-semibold text-primary bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                                        <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                                        {priceInfo.label}
                                      </span>
                                    ) : (
                                      <span className="font-mono text-xs text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border inline-block">
                                        Price unavailable
                                      </span>
                                    )}
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

              {/* RIGHT COLUMN: MAP PLACEHOLDER & SENTINEL (Span 1) */}
              <div className="space-y-6">
                {/* INTERACTIVE MAP PLACEHOLDER */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-border/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-primary" />
                      <h3 className="font-display text-sm font-bold text-foreground">
                        Interactive Map & Route
                      </h3>
                    </div>
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                      Coming Next
                    </span>
                  </div>

                  {/* Visual Map Placeholder Frame */}
                  <div className="relative isolate overflow-hidden rounded-xl border border-border bg-slate-900/90 p-6 text-center space-y-3 min-h-[220px] flex flex-col justify-center items-center">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(#005F73_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />

                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/20 text-primary shadow-lg animate-pulse">
                      <Globe className="h-6 w-6" />
                    </div>

                    <div className="space-y-1 max-w-xs">
                      <p className="font-display text-sm font-bold text-white">
                        Interactive map coming next
                      </p>
                      <p className="text-xs text-white/70 leading-relaxed">
                        Interactive Mapbox visualization with live flight paths, activity pins, and weather overlays.
                      </p>
                    </div>

                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-mono text-white/90">
                        <MapPin className="h-3 w-3 text-accent" />
                        {trip.origin ? `${trip.origin} → ` : ""}{trip.destination} Route
                      </span>
                    </div>
                  </div>
                </div>

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
          </>
        ) : null}
      </main>
    </div>
  );
}
