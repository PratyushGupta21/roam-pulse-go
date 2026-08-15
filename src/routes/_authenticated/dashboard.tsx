import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Gauge,
  MapPin,
  Plane,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  User,
  Wand2,
} from "lucide-react";
import { useState } from "react";

import { StatusBadge, DemoBadge } from "@/components/app/StatusBadge";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

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
  const [activeTab, setActiveTab] = useState<"overview" | "active" | "all">("overview");

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
                onClick={() => setActiveTab("overview")}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  activeTab === "overview" ? "bg-secondary text-foreground font-semibold" : "hover:text-foreground"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("active")}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  activeTab === "active" ? "bg-secondary text-foreground font-semibold" : "hover:text-foreground"
                }`}
              >
                Active Trip
              </button>
              <button
                onClick={() => setActiveTab("all")}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  activeTab === "all" ? "bg-secondary text-foreground font-semibold" : "hover:text-foreground"
                }`}
              >
                All Trips
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5 text-primary" />
              <span className="max-w-[150px] truncate">{user?.email}</span>
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
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Live Monitoring Active</span>
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {(user?.user_metadata?.["full_name"] as string | undefined) ?? user?.email?.split("@")[0] ?? "Traveller"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              RoamPulse is continuously checking flights, weather forecasts, and route feasibility for your trips.
            </p>
          </div>

          <div className="flex gap-2">
            <Button asChild variant="recover" size="sm" className="gap-1.5 shadow-sm">
              <Link to="/">
                <Plus className="h-4 w-4" />
                <span>New Trip</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Trips</span>
              <Plane className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">1</p>
            <p className="mt-1 text-xs text-muted-foreground">Amalfi & Rome Explorer</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monitoring Status</span>
              <Gauge className="h-4 w-4 text-success" />
            </div>
            <p className="mt-3 text-2xl font-bold text-success">Healthy</p>
            <p className="mt-1 text-xs text-muted-foreground">Last checked 2 mins ago</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Alerts</span>
              <AlertTriangle className="h-4 w-4 text-accent" />
            </div>
            <p className="mt-3 text-2xl font-bold text-accent">1</p>
            <p className="mt-1 text-xs text-muted-foreground">Flight delay detected (+45m)</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Autonomy Mode</span>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">Assisted</p>
            <p className="mt-1 text-xs text-muted-foreground">Auto-reroutes non-locked items</p>
          </div>
        </div>

        {/* Highlighted Active Trip Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status="at_risk" />
                <DemoBadge />
                <span className="text-xs font-mono text-muted-foreground">TRIP-IT-8924</span>
              </div>
              <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold text-foreground">
                Amalfi Coast & Rome Adventure
              </h2>
              <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Aug 18 – Aug 26
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> Italy (Rome, Positano, Capri)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                Edit Trip
              </Button>
              <Button size="sm" variant="recover">
                View Full Map
              </Button>
            </div>
          </div>

          {/* Real-Time Disruption Notice Panel */}
          <div className="rounded-xl border-2 border-accent/40 bg-accent/10 p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground shrink-0 mt-0.5">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground text-sm sm:text-base">
                    Disruption Detected: Flight AZ610 Delayed (+45 mins)
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Estimated arrival at Naples Airport shifted from 14:15 to 15:00. This conflicts with your scheduled
                    15:30 Positano Ferry transfer.
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-semibold text-accent shrink-0">At Risk</span>
            </div>

            {/* Recommended Recovery Solution */}
            <div className="mt-4 rounded-lg border border-primary/25 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-medium text-xs sm:text-sm">
                  <Sparkles className="h-4 w-4" />
                  <span>RoamPulse Autonomous Recommendation Ready</span>
                </div>
                <span className="font-mono text-[11px] text-success font-semibold">98% Fit Score</span>
              </div>
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                Reroute via 16:15 High-Speed hydrofoil ferry from Molo Beverello port. Preserves 19:30 dinner reservation at La Sponda with zero missed activities.
              </p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">Price difference: +₹0 (Covered by flexible ticket)</span>
                <Button size="sm" variant="recover" className="text-xs">
                  Apply Recovery Plan
                </Button>
              </div>
            </div>
          </div>

          {/* Itinerary Timeline Preview */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Today's Schedule & Status
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 p-3.5 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">11:30</span>
                  <div>
                    <span className="font-semibold text-foreground">Flight AZ610 to Naples</span>
                    <span className="ml-2 text-xs text-accent font-medium">(Delayed 45m)</span>
                  </div>
                </div>
                <StatusBadge status="at_risk" />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 p-3.5 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">16:15</span>
                  <div>
                    <span className="font-semibold text-foreground">Positano Hydrofoil Ferry Transfer</span>
                    <span className="ml-2 text-xs text-primary font-medium">(Recommended replacement)</span>
                  </div>
                </div>
                <StatusBadge status="confirmed" />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 p-3.5 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">19:30</span>
                  <div>
                    <span className="font-semibold text-foreground">Dinner at La Sponda, Positano</span>
                    <span className="ml-2 text-xs text-muted-foreground">(Locked reservation)</span>
                  </div>
                </div>
                <StatusBadge status="confirmed" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
