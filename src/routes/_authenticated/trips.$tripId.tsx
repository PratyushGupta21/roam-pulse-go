import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Gauge,
  MapPin,
  Plane,
  ShieldCheck,
  Users,
} from "lucide-react";

import { DemoBadge, StatusBadge } from "@/components/app/StatusBadge";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatMoney } from "@/lib/format";
import { itineraryQuery, tripQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/trips/$tripId")({
  head: () => ({
    meta: [
      { title: "Trip Details — RoamPulse" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TripDetailsPage,
});

function TripDetailsPage() {
  const { tripId } = useParams({ from: "/_authenticated/trips/$tripId" });
  const { user, signOut } = useAuth();

  const { data: trip, isLoading, isError, error, refetch } = useQuery(tripQuery(tripId));
  const { data: itinerary } = useQuery(itineraryQuery(tripId));

  return (
    <div className="min-h-screen bg-app-atmosphere text-foreground">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Dashboard
              </Link>
            </Button>
            <span className="h-4 w-px bg-border hidden sm:block" />
            <Link to="/" aria-label="RoamPulse Home">
              <Logo />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden md:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => void signOut()} className="text-xs">
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-32 rounded-2xl bg-card border border-border" />
            <div className="h-64 rounded-2xl bg-card border border-border" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-3">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <h2 className="font-display text-lg font-bold text-foreground">Could not load trip details</h2>
            <p className="text-sm text-muted-foreground">{(error as Error)?.message || "Database error"}</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : !trip ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-4">
            <Compass className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="font-display text-xl font-bold">Trip not found</h2>
            <p className="text-sm text-muted-foreground">
              This trip doesn't exist or you don't have permission to access it.
            </p>
            <Button asChild variant="recover" size="sm">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Trip Header Banner */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={trip.status} />
                    {trip.is_demo ? <DemoBadge /> : null}
                    <span className="font-mono text-xs text-muted-foreground uppercase">{trip.recovery_mode} mode</span>
                  </div>
                  <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {trip.name}
                  </h1>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      {trip.origin ? `${trip.origin} → ` : ""}
                      <strong className="text-foreground font-medium">{trip.destination}</strong>
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </Button>
                  <Button size="sm" variant="recover">
                    Simulate Delay
                  </Button>
                </div>
              </div>

              {/* Quick Trip Metadata */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Dates
                  </span>
                  <p className="font-medium text-foreground">
                    {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                  </p>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" /> Travelers
                  </span>
                  <p className="font-medium text-foreground">
                    {trip.adults} Adult{trip.adults > 1 ? "s" : ""}
                    {trip.children > 0 ? `, ${trip.children} Child${trip.children > 1 ? "ren" : ""}` : ""}
                  </p>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-primary" /> Budget
                  </span>
                  <p className="font-medium text-foreground">
                    {formatMoney(Number(trip.budget), trip.currency)}
                  </p>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5 text-success" /> Autonomy Mode
                  </span>
                  <p className="font-medium text-foreground capitalize">{trip.recovery_mode}</p>
                </div>
              </div>
            </div>

            {/* Itinerary Schedule */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-border/80 pb-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Itinerary Schedule</h2>
                  <p className="text-xs text-muted-foreground">Monitored activities & locations for this trip</p>
                </div>
                <span className="font-mono text-xs font-semibold text-primary">
                  {itinerary?.length ?? 0} Planned Items
                </span>
              </div>

              {!itinerary || itinerary.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No itinerary items generated yet for this trip.
                </div>
              ) : (
                <div className="space-y-3">
                  {itinerary.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-4 text-sm hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                          {formatDate(item.day_date)}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{item.title}</span>
                            <StatusBadge status={item.status} />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                            </span>
                            {item.location ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {item.location}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>

                      <div className="text-right text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {formatMoney(Number(item.estimated_cost), item.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
