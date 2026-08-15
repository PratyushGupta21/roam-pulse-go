import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Gauge,
  MapPin,
  Plane,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";

import { DemoBadge, StatusBadge } from "@/components/app/StatusBadge";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatMoney } from "@/lib/format";
import { tripsQuery, type Trip } from "@/lib/queries";
import { createDemoTrip } from "@/lib/trips.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — RoamPulse" },
      { name: "description", content: "Your monitored trips, disruptions and recovery activity." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

export function Dashboard() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [filterTab, setFilterTab] = useState<"all" | "active" | "completed">("all");

  // Fetch real trips belonging to the authenticated user via RLS
  const {
    data: trips = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(tripsQuery());

  // Mutation to create a demo trip for 1-click manual testing
  const createDemoMutation = useMutation({
    mutationFn: async () => {
      return await createDemoTrip();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });

  const userName =
    (user?.user_metadata?.["full_name"] as string | undefined) ?? user?.email?.split("@")[0] ?? "Traveller";

  // Filter logic
  const now = new Date().toISOString().slice(0, 10);
  const activeTrips = trips.filter((t) => t.end_date >= now && t.status !== "completed");
  const completedTrips = trips.filter((t) => t.status === "completed" || t.end_date < now);

  const displayedTrips =
    filterTab === "active" ? activeTrips : filterTab === "completed" ? completedTrips : trips;

  // Featured active trip (first upcoming or active trip)
  const featuredTrip = activeTrips[0] || trips[0];

  return (
    <div className="min-h-screen bg-app-atmosphere text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" aria-label="RoamPulse Home">
              <Logo />
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <button
                onClick={() => setFilterTab("all")}
                className={`rounded-md px-3 py-1.5 transition-colors cursor-pointer ${
                  filterTab === "all" ? "bg-secondary text-foreground font-semibold" : "hover:text-foreground"
                }`}
              >
                All Trips ({trips.length})
              </button>
              <button
                onClick={() => setFilterTab("active")}
                className={`rounded-md px-3 py-1.5 transition-colors cursor-pointer ${
                  filterTab === "active" ? "bg-secondary text-foreground font-semibold" : "hover:text-foreground"
                }`}
              >
                Active / Upcoming ({activeTrips.length})
              </button>
              <button
                onClick={() => setFilterTab("completed")}
                className={`rounded-md px-3 py-1.5 transition-colors cursor-pointer ${
                  filterTab === "completed" ? "bg-secondary text-foreground font-semibold" : "hover:text-foreground"
                }`}
              >
                Completed ({completedTrips.length})
              </button>
            </nav>
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

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        {/* Top greeting banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="live-dot inline-block h-2 w-2 rounded-full bg-success" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Database Connected & RLS Active
              </span>
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {userName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your real-time trips are securely queried from Supabase and isolated to your account.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => void createDemoMutation.mutate()}
              disabled={createDemoMutation.isPending}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${createDemoMutation.isPending ? "animate-spin" : ""}`} />
              <span>{createDemoMutation.isPending ? "Creating Demo Trip…" : "Create Demo Trip"}</span>
            </Button>

            <Button asChild variant="recover" size="sm" className="gap-1.5 shadow-sm text-xs font-semibold">
              <Link to="/">
                <Plus className="h-4 w-4" />
                <span>Plan My Trip</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Trips</span>
              <Plane className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{trips.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeTrips.length} active, {completedTrips.length} completed
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Database Security</span>
              <ShieldCheck className="h-4 w-4 text-success" />
            </div>
            <p className="mt-3 text-2xl font-bold text-success">RLS Enabled</p>
            <p className="mt-1 text-xs text-muted-foreground">Scoped to user: {user?.id.slice(0, 8)}…</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monitoring Status</span>
              <Gauge className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">
              {activeTrips.length > 0 ? "Active" : "Idle"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeTrips.length > 0 ? "Continuous polling active" : "No active trips"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account Email</span>
              <User className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-sm font-bold text-foreground truncate">{user?.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">Authenticated user</p>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 rounded-2xl border border-border bg-card p-6 animate-pulse space-y-4">
                  <div className="h-5 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                  <div className="h-16 w-full bg-muted/60 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ERROR STATE */}
        {!isLoading && isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 sm:p-8 text-center space-y-3">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <h3 className="font-display text-lg font-bold text-foreground">Failed to load trips from Supabase</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {(error as Error)?.message || "An unexpected database error occurred. Please try refetching."}
            </p>
            <Button size="sm" variant="outline" onClick={() => void refetch()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Query</span>
            </Button>
          </div>
        ) : null}

        {/* EMPTY STATE */}
        {!isLoading && !isError && trips.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-12 text-center space-y-5 shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Compass className="h-7 w-7" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="font-display text-xl font-bold text-foreground">No trips found in your database</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You haven't created any trips yet. Create a trip or generate an instant demo trip to test database persistence and recovery features.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void createDemoMutation.mutate()}
                disabled={createDemoMutation.isPending}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${createDemoMutation.isPending ? "animate-spin" : ""}`} />
                <span>{createDemoMutation.isPending ? "Generating Demo Trip…" : "Create Instant Demo Trip"}</span>
              </Button>
              <Button asChild variant="recover" size="sm" className="gap-1.5 font-semibold">
                <Link to="/">
                  <Plus className="h-4 w-4" />
                  <span>Plan My Trip</span>
                </Link>
              </Button>
            </div>
          </div>
        ) : null}

        {/* DATA DISPLAY: FEATURED ACTIVE TRIP BANNER */}
        {!isLoading && !isError && featuredTrip ? (
          <div className="rounded-2xl border border-primary/30 bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-2">
                <span className="live-dot inline-block h-2 w-2 rounded-full bg-primary" />
                <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-primary">
                  Featured Active Trip
                </h2>
              </div>
              <StatusBadge status={featuredTrip.status} />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {featuredTrip.is_demo ? <DemoBadge /> : null}
                  <span className="font-mono text-xs text-muted-foreground">ID: {featuredTrip.id.slice(0, 8)}</span>
                </div>
                <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  {featuredTrip.name}
                </h3>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    {featuredTrip.origin ? `${featuredTrip.origin} → ` : ""}
                    <strong className="text-foreground font-medium">{featuredTrip.destination}</strong>
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button asChild variant="recover" size="sm" className="gap-1.5">
                  <Link to="/trips/$tripId" params={{ tripId: featuredTrip.id }}>
                    <span>View Trip Details & Map</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Quick Metadata */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2 border-t border-border/60 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  {formatDate(featuredTrip.start_date)} – {formatDate(featuredTrip.end_date)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  {featuredTrip.adults} Adult{featuredTrip.adults > 1 ? "s" : ""}
                  {featuredTrip.children > 0 ? `, ${featuredTrip.children} Child${featuredTrip.children > 1 ? "ren" : ""}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{formatMoney(Number(featuredTrip.budget), featuredTrip.currency)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Gauge className="h-3.5 w-3.5 text-success shrink-0" />
                <span>Mode: <strong className="text-foreground capitalize">{featuredTrip.recovery_mode}</strong></span>
              </div>
            </div>
          </div>
        ) : null}

        {/* REAL TRIPS GRID */}
        {!isLoading && !isError && displayedTrips.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground">
                Your Real Database Trips ({displayedTrips.length})
              </h2>
              <span className="text-xs text-muted-foreground">Sorted by start date</span>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {displayedTrips.map((trip: Trip) => (
                <div
                  key={trip.id}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-panel"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge status={trip.status} />
                          {trip.is_demo ? <DemoBadge /> : null}
                        </div>
                        <h3 className="font-display text-lg font-bold text-foreground leading-snug pt-1">
                          {trip.name}
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" /> Destination
                        </span>
                        <span className="font-medium text-foreground">{trip.destination}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" /> Dates
                        </span>
                        <span className="font-medium text-foreground">
                          {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-primary shrink-0" /> Travelers
                        </span>
                        <span className="font-medium text-foreground">
                          {trip.adults + trip.children} ({trip.adults}A, {trip.children}C)
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-primary shrink-0" /> Budget
                        </span>
                        <span className="font-medium text-foreground">
                          {formatMoney(Number(trip.budget), trip.currency)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Gauge className="h-3.5 w-3.5 text-success shrink-0" /> Recovery
                        </span>
                        <span className="font-medium text-foreground capitalize">{trip.recovery_mode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/80 flex items-center justify-between">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      ID: {trip.id.slice(0, 8)}
                    </span>
                    <Button asChild size="sm" variant="ghost" className="gap-1 text-xs text-primary font-medium hover:text-primary">
                      <Link to="/trips/$tripId" params={{ tripId: trip.id }}>
                        <span>Open Trip</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
