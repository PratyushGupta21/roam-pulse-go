import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Calendar, Edit3, Loader2, RefreshCw, Save, Sparkles, Tag, Users, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ACCESSIBILITY_OPTIONS,
  ACCOMMODATION_OPTIONS,
  BUDGET_LEVELS,
  CURRENCIES,
  DIETARY_OPTIONS,
  FOOD_OPTIONS,
  INTEREST_CARDS,
  PACE_OPTIONS,
  RECOVERY_MODES,
  TRANSPORT_OPTIONS,
  type RecoveryMode,
  type TravelStyle,
  type TripInput,
} from "@/lib/domain";

import { type Trip } from "@/lib/queries";
import { updateTrip } from "@/lib/trips.functions";

interface EditTripModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  onNotice?: (msg: string) => void;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function EditTripModal({ trip, isOpen, onClose, onNotice }: EditTripModalProps) {
  const queryClient = useQueryClient();

  // Form State
  const [name, setName] = useState(trip.name);
  const [origin, setOrigin] = useState(trip.origin || "");
  const [destination, setDestination] = useState(trip.destination);
  const [extraDestinationsStr, setExtraDestinationsStr] = useState(
    (trip.extra_destinations || []).join(", ")
  );
  const [startDate, setStartDate] = useState(trip.start_date);
  const [endDate, setEndDate] = useState(trip.end_date);
  const [arrivalTime, setArrivalTime] = useState(
    (trip as { arrival_time?: string }).arrival_time || "14:00"
  );
  const [departureTime, setDepartureTime] = useState(
    (trip as { departure_time?: string }).departure_time || "16:00"
  );
  const [adults, setAdults] = useState(trip.adults || 1);
  const [children, setChildren] = useState(trip.children || 0);
  const [budget, setBudget] = useState(Number(trip.budget || 50000));
  const [currency, setCurrency] = useState(trip.currency || "INR");

  const [travelStyle, setTravelStyle] = useState<TravelStyle>(
    (trip.travel_style as TravelStyle) || "balanced"
  );
  const [interests, setInterests] = useState<string[]>(trip.interests || []);

  const pref = (trip.preferences as Record<string, unknown>) || {};
  const [indoorOutdoor, setIndoorOutdoor] = useState<"mostly_indoor" | "balanced" | "mostly_outdoor">(
    (pref["indoorOutdoor"] as any) || "balanced"
  );
  const [pace, setPace] = useState<string>((pref["pace"] as string) || "moderate");
  const [transport, setTransport] = useState<string>((pref["transport"] as string) || "public_transit");
  const [accommodation, setAccommodation] = useState<string>(
    (pref["accommodation"] as string) || "budget_hotel"
  );
  const [foodPreference, setFoodPreference] = useState<string>(
    (pref["foodPreference"] as string) || "mixed"
  );
  const [wakeUpTime, setWakeUpTime] = useState<string>((pref["wakeUpTime"] as string) || "08:00");
  const [dietary, setDietary] = useState<string[]>((pref["dietary"] as string[]) || []);
  const [accessibility, setAccessibility] = useState<string[]>(
    (pref["accessibility"] as string[]) || []
  );
  const [specialRequests, setSpecialRequests] = useState<string>(
    (pref["specialRequests"] as string) || ""
  );

  const [recoveryMode, setRecoveryMode] = useState<RecoveryMode>(
    (trip.recovery_mode as RecoveryMode) || "assisted"
  );

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && trip) {
      setName(trip.name);
      setOrigin(trip.origin || "");
      setDestination(trip.destination);
      setExtraDestinationsStr((trip.extra_destinations || []).join(", "));
      setStartDate(trip.start_date);
      setEndDate(trip.end_date);
      setArrivalTime((trip as { arrival_time?: string }).arrival_time || "14:00");
      setDepartureTime((trip as { departure_time?: string }).departure_time || "16:00");
      setAdults(trip.adults || 1);
      setChildren(trip.children || 0);
      setBudget(Number(trip.budget || 50000));
      setCurrency(trip.currency || "INR");
      setTravelStyle((trip.travel_style as TravelStyle) || "balanced");
      setInterests(trip.interests || []);

      const p = (trip.preferences as Record<string, unknown>) || {};
      setIndoorOutdoor((p["indoorOutdoor"] as any) || "balanced");
      setPace((p["pace"] as string) || "moderate");
      setTransport((p["transport"] as string) || "public_transit");
      setAccommodation((p["accommodation"] as string) || "budget_hotel");
      setFoodPreference((p["foodPreference"] as string) || "mixed");
      setWakeUpTime((p["wakeUpTime"] as string) || "08:00");
      setDietary((p["dietary"] as string[]) || []);
      setAccessibility((p["accessibility"] as string[]) || []);
      setSpecialRequests((p["specialRequests"] as string) || "");

      setRecoveryMode((trip.recovery_mode as RecoveryMode) || "assisted");
      setError(null);
    }
  }, [isOpen, trip]);

  const updateMutation = useMutation({
    mutationFn: async ({ regenerate }: { regenerate: boolean }) => {
      const extraDestinations = extraDestinationsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const tripData: TripInput = {
        name: name.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        extraDestinations,
        startDate,
        endDate,
        arrivalTime,
        departureTime,
        adults: Number(adults),
        children: Number(children),
        budget: Number(budget),
        currency,
        travelStyle,
        interests: interests.slice(0, 12),
        preferences: {
          indoorOutdoor,
          pace: pace as any,
          transport: transport as any,
          accommodation: accommodation as any,
          foodPreference: foodPreference as any,
          wakeUpTime,
          dietary,
          accessibility,
          specialRequests: specialRequests.trim() || undefined,
        },
        recoveryMode,
        automationSettings: (trip.automation_settings as any) || {
          maxExtraSpend: 2000,
          autoReplace: ["flexible", "weather_sensitive"],
          alwaysAsk: ["flights", "hotels", "above_limit"],
        },
      };

      return await updateTrip({
        data: {
          tripId: trip.id,
          regenerateItinerary: regenerate,
          tripData,
        },
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
      void queryClient.invalidateQueries({ queryKey: ["trip", trip.id] });
      void queryClient.invalidateQueries({ queryKey: ["itinerary", trip.id] });
      void queryClient.invalidateQueries({ queryKey: ["history", trip.id] });

      onClose();

      if (!variables.regenerate && onNotice) {
        onNotice("Your trip details were updated, but your current itinerary was kept unchanged.");
      }
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to update trip. Please try again.");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">Edit Trip Configuration</h3>
              <p className="text-xs text-muted-foreground">
                Update parameters for {trip.destination}. Choose whether to keep or regenerate the schedule.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={updateMutation.isPending}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Edit Form */}
        <div className="space-y-6 text-xs">
          {/* Basic Details */}
          <div className="space-y-4 rounded-xl border border-border/70 bg-background/50 p-4">
            <h4 className="font-display text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Edit3 className="h-3.5 w-3.5 text-primary" /> Basic Information
            </h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="editName" className="text-xs font-semibold">
                  Trip Name
                </Label>
                <Input
                  id="editName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tokyo Family Vacation"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editOrigin" className="text-xs font-semibold">
                  Starting Location / Origin
                </Label>
                <Input
                  id="editOrigin"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. Delhi"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editDestination" className="text-xs font-semibold">
                  Destination
                </Label>
                <Input
                  id="editDestination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Tokyo, Japan"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="editExtra" className="text-xs font-semibold">
                  Additional Destinations (Comma Separated)
                </Label>
                <Input
                  id="editExtra"
                  value={extraDestinationsStr}
                  onChange={(e) => setExtraDestinationsStr(e.target.value)}
                  placeholder="e.g. Kyoto, Osaka"
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Dates & Times */}
          <div className="space-y-4 rounded-xl border border-border/70 bg-background/50 p-4">
            <h4 className="font-display text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Dates &amp; Arrival / Departure
            </h4>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="editStart" className="text-xs font-semibold">
                  Start Date
                </Label>
                <Input
                  id="editStart"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editEnd" className="text-xs font-semibold">
                  End Date
                </Label>
                <Input
                  id="editEnd"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editArrTime" className="text-xs font-semibold">
                  Arrival Time (Day 1)
                </Label>
                <Input
                  id="editArrTime"
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editDepTime" className="text-xs font-semibold">
                  Departure Time (Final Day)
                </Label>
                <Input
                  id="editDepTime"
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Travelers & Budget */}
          <div className="space-y-4 rounded-xl border border-border/70 bg-background/50 p-4">
            <h4 className="font-display text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" /> Party &amp; Budget
            </h4>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="editAdults" className="text-xs font-semibold">
                  Adults
                </Label>
                <Input
                  id="editAdults"
                  type="number"
                  min={1}
                  max={12}
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editChildren" className="text-xs font-semibold">
                  Children
                </Label>
                <Input
                  id="editChildren"
                  type="number"
                  min={0}
                  max={12}
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editBudget" className="text-xs font-semibold">
                  Estimated Total Budget
                </Label>
                <Input
                  id="editBudget"
                  type="number"
                  min={0}
                  step={5000}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editCurrency" className="text-xs font-semibold">
                  Currency
                </Label>
                <select
                  id="editCurrency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-medium"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Style & Preferences */}
          <div className="space-y-4 rounded-xl border border-border/70 bg-background/50 p-4">
            <h4 className="font-display text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-primary" /> Style &amp; Pacing Preferences
            </h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Travel Style</Label>
                <select
                  value={travelStyle}
                  onChange={(e) => setTravelStyle(e.target.value as TravelStyle)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs capitalize font-medium"
                >
                  {BUDGET_LEVELS.map((b) => (
                    <option key={b.id} value={b.style}>
                      {b.label} ({b.style})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pace</Label>
                <select
                  value={pace}
                  onChange={(e) => setPace(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs capitalize font-medium"
                >
                  {PACE_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} — {p.hint}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Transport Preference</Label>
                <select
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs capitalize font-medium"
                >
                  {TRANSPORT_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Autonomous Recovery Mode</Label>
                <select
                  value={recoveryMode}
                  onChange={(e) => setRecoveryMode(e.target.value as RecoveryMode)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs capitalize font-medium"
                >
                  {RECOVERY_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m === "assisted"
                        ? "Assisted (Proactive approval required)"
                        : m === "autonomous"
                        ? "Autonomous (Auto-apply within budget limit)"
                        : "Manual (Notifications only)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/80 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={updateMutation.isPending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                updateMutation.mutate({ regenerate: false });
              }}
              disabled={updateMutation.isPending}
              className="gap-2 text-xs font-semibold flex-1 sm:flex-none"
            >
              {updateMutation.isPending && !updateMutation.variables?.regenerate ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 text-primary" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="recover"
              size="sm"
              onClick={() => {
                setError(null);
                updateMutation.mutate({ regenerate: true });
              }}
              disabled={updateMutation.isPending}
              className="gap-2 text-xs font-bold shadow-xs flex-1 sm:flex-none"
            >
              {updateMutation.isPending && updateMutation.variables?.regenerate ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving &amp; Regenerating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Save &amp; Regenerate</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
