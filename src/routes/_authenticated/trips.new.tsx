import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  Compass,
  DollarSign,
  Gauge,
  Globe,
  MapPin,
  Plane,
  Plus,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { INTERESTS, RECOVERY_MODES, TRAVEL_STYLES, type TravelStyle, type RecoveryMode } from "@/lib/domain";
import { createTrip } from "@/lib/trips.functions";

export const Route = createFileRoute("/_authenticated/trips/new")({
  head: () => ({
    meta: [
      { title: "Plan a New Trip — RoamPulse" },
      { name: "description", content: "Create a new real-time monitored travel itinerary." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewTripPage,
});

function NewTripPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const todayStr = new Date().toISOString().slice(0, 10);
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeekStr = nextWeekDate.toISOString().slice(0, 10);

  // Form State
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("Delhi");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(nextWeekStr);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [budget, setBudget] = useState(100000);
  const [currency, setCurrency] = useState("INR");
  const [travelStyle, setTravelStyle] = useState<TravelStyle>("balanced");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["Nature", "Culture", "Food"]);
  const [recoveryMode, setRecoveryMode] = useState<RecoveryMode>("assisted");

  // Validation Error State
  const [validationError, setValidationError] = useState<string | null>(null);

  // Create Trip Mutation
  const createTripMutation = useMutation({
    mutationFn: async () => {
      setValidationError(null);

      // Client-side Validation
      if (!name.trim()) {
        throw new Error("Please enter a name for your trip.");
      }
      if (!origin.trim()) {
        throw new Error("Please enter an origin location.");
      }
      if (!destination.trim()) {
        throw new Error("Please enter a destination.");
      }
      if (startDate > endDate) {
        throw new Error("Start date must be before or equal to end date.");
      }
      if (budget < 0) {
        throw new Error("Budget cannot be negative.");
      }

      const payload = {
        data: {
          name: name.trim(),
          origin: origin.trim(),
          destination: destination.trim(),
          extraDestinations: [],
          startDate,
          endDate,
          adults,
          children,
          budget: Number(budget),
          currency,
          travelStyle,
          interests: selectedInterests,
          preferences: {
            indoorOutdoor: "balanced" as const,
            pace: "moderate" as const,
            transport: "public_transit" as const,
            accommodation: "budget_hotel" as const,
          },
          recoveryMode,
          automationSettings: {
            maxExtraSpend: 2000,
            autoReplace: ["flexible", "weather_sensitive"],
            alwaysAsk: ["flights", "hotels", "above_limit"],
          },
        },
      };

      const result = await createTrip(payload);
      return result;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
      void navigate({ to: "/trips/$tripId", params: { tripId: data.tripId } });
    },
    onError: (err: Error) => {
      setValidationError(err.message || "We couldn't save your trip. Please try again.");
    },
  });

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createTripMutation.isPending) return;
    createTripMutation.mutate();
  };

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

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="live-dot inline-block h-2 w-2 rounded-full bg-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Authenticated Trip Creation
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Plan a Real-Time Monitored Trip
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your trip details will be saved to your private database with real-time flight, weather, and itinerary monitoring.
          </p>
        </div>

        {/* Validation / Database Error Alert */}
        {validationError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Validation Error</p>
              <p className="mt-0.5 text-xs text-destructive/90">{validationError}</p>
            </div>
          </div>
        ) : null}

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
          {/* Section 1: Trip Basics */}
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground border-b border-border/80 pb-3 flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              <span>1. Basic Details</span>
            </h2>

            <div>
              <label htmlFor="trip-name" className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5">
                Trip Name <span className="text-destructive">*</span>
              </label>
              <input
                id="trip-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Paris Getaway 2026, Singapore Business & Leisure"
                required
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="origin" className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5">
                  Origin City / Airport <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    id="origin"
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Delhi (DEL)"
                    required
                    className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="destination" className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5">
                  Destination City <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-3 h-4 w-4 text-primary" />
                  <input
                    id="destination"
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Paris, Singapore, Tokyo"
                    required
                    className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Dates & Travelers */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <h2 className="font-display text-lg font-bold text-foreground border-b border-border/80 pb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span>2. Dates & Travelers</span>
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="start-date" className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5">
                  Start Date <span className="text-destructive">*</span>
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="end-date" className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5">
                  End Date <span className="text-destructive">*</span>
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="adults" className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5">
                  Adults (18+)
                </label>
                <input
                  id="adults"
                  type="number"
                  min={1}
                  max={12}
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="children" className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5">
                  Children
                </label>
                <input
                  id="children"
                  type="number"
                  min={0}
                  max={12}
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Budget & Preferences */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <h2 className="font-display text-lg font-bold text-foreground border-b border-border/80 pb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span>3. Budget & Travel Preferences</span>
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="budget" className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5">
                  Total Budget
                </label>
                <input
                  id="budget"
                  type="number"
                  min={0}
                  step={1000}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="currency" className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5">
                  Currency
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="SGD">SGD ($)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="travel-style" className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5">
                Travel Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {TRAVEL_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setTravelStyle(style)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium capitalize transition-all cursor-pointer ${
                      travelStyle === style
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5">
                Interests & Focus Areas
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground font-semibold"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {isSelected ? <Check className="h-3 w-3" /> : null}
                      <span>{interest}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Autonomous Recovery Mode */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <h2 className="font-display text-lg font-bold text-foreground border-b border-border/80 pb-3 flex items-center gap-2">
              <Gauge className="h-5 w-5 text-success" />
              <span>4. Disruption Recovery Mode</span>
            </h2>

            <div className="grid gap-3 sm:grid-cols-3">
              {RECOVERY_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setRecoveryMode(mode)}
                  className={`rounded-xl border p-4 text-left space-y-1 transition-all cursor-pointer ${
                    recoveryMode === mode
                      ? "border-success bg-success/10 text-foreground shadow-xs"
                      : "border-border bg-background text-muted-foreground hover:border-success/40"
                  }`}
                >
                  <p className="font-bold text-sm text-foreground capitalize flex items-center justify-between">
                    <span>{mode} Mode</span>
                    {recoveryMode === mode ? <Check className="h-4 w-4 text-success" /> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mode === "assisted"
                      ? "Recommends recovery options & asks before booking."
                      : mode === "autonomous"
                      ? "Auto-replaces flexible items within spend limits."
                      : "Notifies only. Manual control over all changes."}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-border/80">
            <Button asChild variant="outline" size="default">
              <Link to="/dashboard">Cancel</Link>
            </Button>
            <Button
              type="submit"
              variant="recover"
              size="default"
              disabled={createTripMutation.isPending}
              className="gap-2 font-semibold shadow-sm px-6"
            >
              {createTripMutation.isPending ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>Creating Trip & Generating Itinerary…</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create Trip & Monitor</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
