import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  DollarSign,
  Edit3,
  Gauge,
  Info,
  MapPin,
  MoreVertical,
  Plane,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

import { DemoBadge, StatusBadge } from "@/components/app/StatusBadge";
import { Logo } from "@/components/brand/Logo";
import { DeleteTripModal } from "@/components/trips/DeleteTripModal";
import { DuplicateTripModal } from "@/components/trips/DuplicateTripModal";
import { EditTripModal } from "@/components/trips/EditTripModal";
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

  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deletingTrip, setDeletingTrip] = useState<{ id: string; name: string } | null>(null);
  const [duplicatingTrip, setDuplicatingTrip] = useState<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Fetch real trips belonging to the authenticated user via RLS
  const { data: trips = [], isLoading, isError, error, refetch } = useQuery(tripsQuery());

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
    (user?.user_metadata?.["full_name"] as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Traveller";

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
                  filterTab === "all"
                    ? "bg-secondary text-foreground font-semibold"
                    : "hover:text-foreground"
                }`}
              >
                All Trips ({trips.length})
              </button>
              <button
                onClick={() => setFilterTab("active")}
                className={`rounded-md px-3 py-1.5 transition-colors cursor-pointer ${
                  filterTab === "active"
                    ? "bg-secondary text-foreground font-semibold"
                    : "hover:text-foreground"
                }`}
              >
                Active / Upcoming ({activeTrips.length})
              </button>
              <button
                onClick={() => setFilterTab("completed")}
                className={`rounded-md px-3 py-1.5 transition-colors cursor-pointer ${
                  filterTab === "completed"
                    ? "bg-secondary text-foreground font-semibold"
                    : "hover:text-foreground"
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

      {/* MAIN CONTAINER */}
      <main className="mx-auto flex-1 w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Notice Message */}
        {noticeMessage ? (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-xs text-foreground flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <span>{noticeMessage}</span>
            </div>
            <button
              onClick={() => setNoticeMessage(null)}
              className="text-muted-foreground hover:text-foreground p-1 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {/* HERO DASHBOARD BANNER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="live-dot inline-block h-2 w-2 rounded-full bg-success" />
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Live Monitoring Engine Active
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {userName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your trips, monitor live disruptions, edit itineraries, or duplicate trip
              plans.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void createDemoMutation.mutate()}
              disabled={createDemoMutation.isPending}
              className="gap-1.5 text-xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${createDemoMutation.isPending ? "animate-spin" : ""}`}
              />
              <span>{createDemoMutation.isPending ? "Generating Demo…" : "1-Click Demo Trip"}</span>
            </Button>

            <Button
              asChild
              variant="recover"
              size="sm"
              className="gap-1.5 font-semibold text-xs shadow-xs"
            >
              <Link to="/trips/new">
                <Plus className="h-3.5 w-3.5" />
                <span>Create New Trip</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total Trips
              </span>
              <Plane className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{trips.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeTrips.length} currently active
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Database Security
              </span>
              <ShieldCheck className="h-4 w-4 text-success" />
            </div>
            <p className="mt-3 text-2xl font-bold text-success">RLS Enabled</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Scoped to user: {user?.id.slice(0, 8)}…
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Monitoring Status
              </span>
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
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Account Email
              </span>
              <User className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-sm font-bold text-foreground truncate">{user?.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">Authenticated user</p>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-56 rounded-2xl border border-border bg-card p-6 animate-pulse space-y-4"
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* ERROR STATE */}
        {!isLoading && isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 sm:p-8 text-center space-y-3">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <h3 className="font-display text-lg font-bold text-foreground">Failed to load trips</h3>
            <Button size="sm" variant="outline" onClick={() => void refetch()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Query</span>
            </Button>
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
                  className="relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-panel"
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

                      {/* CONTEXT ACTION MENU */}
                      <div className="relative">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setActiveMenuId(activeMenuId === trip.id ? null : trip.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>

                        {activeMenuId === trip.id ? (
                          <div
                            className="absolute right-0 top-9 z-30 w-44 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-fadeIn"
                            onClick={() => setActiveMenuId(null)}
                          >
                            <button
                              onClick={() => setEditingTrip(trip)}
                              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-primary" />
                              <span>Edit Trip</span>
                            </button>

                            <button
                              onClick={() =>
                                setDuplicatingTrip({
                                  id: trip.id,
                                  name: trip.name,
                                  startDate: trip.start_date,
                                  endDate: trip.end_date,
                                })
                              }
                              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                            >
                              <Copy className="h-3.5 w-3.5 text-primary" />
                              <span>Duplicate Trip</span>
                            </button>

                            <div className="my-1 border-t border-border/80" />

                            <button
                              onClick={() => setDeletingTrip({ id: trip.id, name: trip.name })}
                              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete Trip</span>
                            </button>
                          </div>
                        ) : null}
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
                        <span className="font-medium text-foreground capitalize">
                          {trip.recovery_mode}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/80 flex items-center justify-between">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      ID: {trip.id.slice(0, 8)}
                    </span>
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-xs text-primary font-medium hover:text-primary"
                    >
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

        {/* MODALS */}
        {editingTrip ? (
          <EditTripModal
            trip={editingTrip}
            isOpen={Boolean(editingTrip)}
            onClose={() => setEditingTrip(null)}
            onNotice={(msg) => setNoticeMessage(msg)}
          />
        ) : null}

        {deletingTrip ? (
          <DeleteTripModal
            tripId={deletingTrip.id}
            tripName={deletingTrip.name}
            isOpen={Boolean(deletingTrip)}
            onClose={() => setDeletingTrip(null)}
          />
        ) : null}

        {duplicatingTrip ? (
          <DuplicateTripModal
            sourceTripId={duplicatingTrip.id}
            sourceTripName={duplicatingTrip.name}
            sourceStartDate={duplicatingTrip.startDate}
            sourceEndDate={duplicatingTrip.endDate}
            isOpen={Boolean(duplicatingTrip)}
            onClose={() => setDuplicatingTrip(null)}
          />
        ) : null}
      </main>
    </div>
  );
}
