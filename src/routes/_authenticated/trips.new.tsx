import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, Plus, Sparkles } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { DestinationInput } from "@/components/wizard/DestinationInput";
import {
  Chip,
  Field,
  OptionCard,
  StepProgress,
  StepShell,
  SummaryRow,
  inputClass,
} from "@/components/wizard/WizardPrimitives";
import { useAuth } from "@/hooks/useAuth";
import {
  ACCESSIBILITY_OPTIONS,
  ACCOMMODATION_OPTIONS,
  BUDGET_LEVELS,
  CURRENCIES,
  DIETARY_OPTIONS,
  FOOD_OPTIONS,
  INTEREST_CARDS,
  PACE_OPTIONS,
  TRANSPORT_OPTIONS,
  TRIP_STYLE_OPTIONS,
  type TravelStyle,
} from "@/lib/domain";
import { createTrip } from "@/lib/trips.functions";

export const Route = createFileRoute("/_authenticated/trips/new")({
  head: () => ({
    meta: [
      { title: "Plan a New Trip — RoamPulse" },
      { name: "description", content: "Create a new real-time monitored travel itinerary in six guided steps." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewTripPage,
});

const STEPS = ["Destination", "Trip style", "Budget", "Interests", "Preferences", "Review"] as const;

type Pace = (typeof PACE_OPTIONS)[number]["id"];
type BudgetLevel = (typeof BUDGET_LEVELS)[number]["id"];
type Accommodation = (typeof ACCOMMODATION_OPTIONS)[number]["id"];
type Transport = (typeof TRANSPORT_OPTIONS)[number]["id"];
type Food = (typeof FOOD_OPTIONS)[number]["id"];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function NewTripPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const todayStr = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().slice(0, 10);

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("Delhi");
  const [destination, setDestination] = useState("");
  const [country, setCountry] = useState("");
  const [extraDestinations, setExtraDestinations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(nextWeekStr);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // Step 2
  const [tripStyles, setTripStyles] = useState<string[]>(["culture"]);

  // Step 3
  const [budget, setBudget] = useState(100000);
  const [currency, setCurrency] = useState("INR");
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel>("moderate");
  const [accommodation, setAccommodation] = useState<Accommodation>("budget_hotel");
  const [transport, setTransport] = useState<Transport>("public_transit");
  const [food, setFood] = useState<Food>("mixed");

  // Step 4
  const [interests, setInterests] = useState<string[]>(["Local food", "History"]);

  // Step 5
  const [pace, setPace] = useState<Pace>("moderate");
  const [wakeUpTime, setWakeUpTime] = useState("08:00");
  const [maxTravelMinutes, setMaxTravelMinutes] = useState(45);
  const [dietary, setDietary] = useState<string[]>([]);
  const [accessibility, setAccessibility] = useState<string[]>([]);
  const [specialRequests, setSpecialRequests] = useState("");

  const travelStyle = (BUDGET_LEVELS.find((b) => b.id === budgetLevel)?.style ?? "balanced") as TravelStyle;

  const createTripMutation = useMutation({
    mutationFn: async () => {
      const result = await createTrip({
        data: {
          name: name.trim(),
          origin: origin.trim(),
          destination: destination.trim(),
          extraDestinations: extraDestinations.map((d) => d.trim()).filter(Boolean).slice(0, 5),
          startDate,
          endDate,
          adults,
          children,
          budget: Number(budget),
          currency,
          travelStyle,
          interests: interests.slice(0, 12),
          preferences: {
            indoorOutdoor: "balanced" as const,
            pace,
            transport,
            accommodation,
            country: country.trim() || undefined,
            tripStyles,
            budgetLevel,
            foodPreference: food,
            wakeUpTime,
            maxTravelMinutes,
            dietary,
            accessibility,
            specialRequests: specialRequests.trim() || undefined,
          },
          recoveryMode: "assisted" as const,
          automationSettings: {
            maxExtraSpend: 2000,
            autoReplace: ["flexible", "weather_sensitive"],
            alwaysAsk: ["flights", "hotels", "above_limit"],
          },
        },
      });
      return result;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
      void navigate({ to: "/trips/$tripId", params: { tripId: data.tripId } });
    },
    onError: (err: Error) => setError(err.message || "We couldn't save your trip. Please try again."),
  });

  const validateStep = (index: number): string | null => {
    if (index === 0) {
      if (!name.trim()) return "Please give your trip a name.";
      if (!origin.trim()) return "Please enter where you're departing from.";
      if (!destination.trim()) return "Please enter a destination city.";
      if (!startDate || !endDate) return "Please pick both start and end dates.";
      if (startDate > endDate) return "Your end date must be on or after your start date.";
      if (adults < 1) return "At least one adult traveler is required.";
      return null;
    }
    if (index === 1) return tripStyles.length ? null : "Pick at least one trip style.";
    if (index === 2) {
      if (!(budget > 0)) return "Enter a total trip budget greater than zero.";
      return null;
    }
    if (index === 3) return interests.length ? null : "Pick at least one interest.";
    return null;
  };

  const goNext = () => {
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const jumpTo = (index: number) => {
    for (let i = 0; i < index; i += 1) {
      const problem = validateStep(i);
      if (problem) {
        setError(problem);
        setStep(i);
        return;
      }
    }
    setError(null);
    setStep(index);
  };

  const submit = () => {
    for (let i = 0; i < STEPS.length - 1; i += 1) {
      const problem = validateStep(i);
      if (problem) {
        setError(problem);
        setStep(i);
        return;
      }
    }
    setError(null);
    createTripMutation.mutate();
  };

  const nights = Math.max(
    0,
    Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000),
  );

  if (createTripMutation.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-atmosphere px-4 text-foreground">
        <div className="rise-in max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <h1 className="mt-4 font-display text-xl font-bold">Building your {destination} itinerary…</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We're generating a day-by-day plan for {nights + 1} days, matching your interests and budget, then
            switching on live flight and weather monitoring.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-atmosphere text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Link>
            </Button>
            <span className="hidden h-4 w-px bg-border sm:block" />
            <Link to="/" aria-label="RoamPulse Home" className="hidden sm:block">
              <Logo />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground md:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => void signOut()} className="text-xs">
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="live-dot inline-block h-2 w-2 rounded-full bg-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Trip planner</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Plan a real-time monitored trip
          </h1>
        </div>

        <StepProgress current={step} steps={STEPS} onJump={jumpTo} />

        {error ? (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
          {step === 0 ? (
            <StepShell title="Where are you going?" description="Destinations, dates and who's travelling.">
              <Field label="Trip name" htmlFor="trip-name" required>
                <input
                  id="trip-name"
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tokyo Spring Escape"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Departing from" htmlFor="origin" required>
                  <DestinationInput id="origin" value={origin} placeholder="e.g. Delhi" onChange={setOrigin} />
                </Field>
                <Field label="Destination city" htmlFor="destination" required>
                  <DestinationInput
                    id="destination"
                    value={destination}
                    placeholder="Search a city"
                    onChange={setDestination}
                    onPick={(s) => {
                      setCountry(s.country);
                      if (!name.trim()) setName(`${s.city} Trip`);
                    }}
                  />
                </Field>
              </div>

              <Field label="Country" htmlFor="country" hint="Auto-filled when you pick a suggested city.">
                <input
                  id="country"
                  className={inputClass}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Japan"
                />
              </Field>

              <Field label="Additional destinations" hint="Optional — add up to 5 more stops.">
                <div className="space-y-2">
                  {extraDestinations.map((value, index) => (
                    <DestinationInput
                      key={index}
                      id={`extra-${index}`}
                      value={value}
                      placeholder="Another city"
                      onChange={(next) =>
                        setExtraDestinations((prev) => prev.map((v, i) => (i === index ? next : v)))
                      }
                      onClear={() => setExtraDestinations((prev) => prev.filter((_, i) => i !== index))}
                    />
                  ))}
                  {extraDestinations.length < 5 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => setExtraDestinations((prev) => [...prev, ""])}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add destination
                    </Button>
                  ) : null}
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start date" htmlFor="start-date" required>
                  <input
                    id="start-date"
                    type="date"
                    className={inputClass}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </Field>
                <Field label="End date" htmlFor="end-date" required hint={`${nights + 1} days planned`}>
                  <input
                    id="end-date"
                    type="date"
                    min={startDate}
                    className={inputClass}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Adults (18+)" htmlFor="adults" required>
                  <input
                    id="adults"
                    type="number"
                    min={1}
                    max={12}
                    className={inputClass}
                    value={adults}
                    onChange={(e) => setAdults(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                  />
                </Field>
                <Field label="Children" htmlFor="children">
                  <input
                    id="children"
                    type="number"
                    min={0}
                    max={12}
                    className={inputClass}
                    value={children}
                    onChange={(e) => setChildren(Math.max(0, Math.min(12, Number(e.target.value) || 0)))}
                  />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground">
                {adults + children} traveler{adults + children === 1 ? "" : "s"} total
              </p>
            </StepShell>
          ) : null}

          {step === 1 ? (
            <StepShell title="What kind of trip is this?" description="Select every style that applies.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TRIP_STYLE_OPTIONS.map((option) => (
                  <OptionCard
                    key={option.id}
                    emoji={option.emoji}
                    title={option.label}
                    selected={tripStyles.includes(option.id)}
                    onClick={() => setTripStyles((prev) => toggle(prev, option.id as string))}
                  />
                ))}
              </div>
            </StepShell>
          ) : null}

          {step === 2 ? (
            <StepShell title="Set your budget" description="We plan and re-plan inside these limits.">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Field label="Total trip budget" htmlFor="budget" required>
                    <input
                      id="budget"
                      type="number"
                      min={0}
                      step={1000}
                      className={inputClass}
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value) || 0)}
                    />
                  </Field>
                </div>
                <Field label="Currency" htmlFor="currency">
                  <select
                    id="currency"
                    className={inputClass}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Budget level">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {BUDGET_LEVELS.map((level) => (
                    <OptionCard
                      key={level.id}
                      title={level.label}
                      hint={level.hint}
                      selected={budgetLevel === level.id}
                      onClick={() => setBudgetLevel(level.id)}
                    />
                  ))}
                </div>
              </Field>

              <Field label="Accommodation preference">
                <div className="flex flex-wrap gap-2">
                  {ACCOMMODATION_OPTIONS.map((o) => (
                    <Chip
                      key={o.id}
                      label={o.label}
                      selected={accommodation === o.id}
                      onClick={() => setAccommodation(o.id)}
                    />
                  ))}
                </div>
              </Field>

              <Field label="Transportation preference">
                <div className="flex flex-wrap gap-2">
                  {TRANSPORT_OPTIONS.map((o) => (
                    <Chip key={o.id} label={o.label} selected={transport === o.id} onClick={() => setTransport(o.id)} />
                  ))}
                </div>
              </Field>

              <Field label="Food preference">
                <div className="flex flex-wrap gap-2">
                  {FOOD_OPTIONS.map((o) => (
                    <Chip key={o.id} label={o.label} selected={food === o.id} onClick={() => setFood(o.id)} />
                  ))}
                </div>
              </Field>
            </StepShell>
          ) : null}

          {step === 3 ? (
            <StepShell title="What do you want to do?" description="Your picks drive itinerary and recovery choices.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {INTEREST_CARDS.map((card) => (
                  <OptionCard
                    key={card.id}
                    emoji={card.emoji}
                    title={card.id}
                    selected={interests.includes(card.id)}
                    onClick={() => setInterests((prev) => toggle(prev, card.id as string))}
                  />
                ))}
              </div>
            </StepShell>
          ) : null}

          {step === 4 ? (
            <StepShell title="Fine-tune your days" description="Pace, timings and anything we must plan around.">
              <Field label="Daily activity intensity">
                <div className="grid gap-3 sm:grid-cols-3">
                  {PACE_OPTIONS.map((o) => (
                    <OptionCard
                      key={o.id}
                      title={o.label}
                      hint={o.hint}
                      selected={pace === o.id}
                      onClick={() => setPace(o.id)}
                    />
                  ))}
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Preferred wake-up time" htmlFor="wake">
                  <input
                    id="wake"
                    type="time"
                    className={inputClass}
                    value={wakeUpTime}
                    onChange={(e) => setWakeUpTime(e.target.value || "08:00")}
                  />
                </Field>
                <Field
                  label="Max travel between activities"
                  htmlFor="max-travel"
                  hint={`${maxTravelMinutes} minutes`}
                >
                  <input
                    id="max-travel"
                    type="range"
                    min={10}
                    max={180}
                    step={5}
                    value={maxTravelMinutes}
                    onChange={(e) => setMaxTravelMinutes(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </Field>
              </div>

              <Field label="Dietary preferences">
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((d) => (
                    <Chip
                      key={d}
                      label={d}
                      selected={dietary.includes(d)}
                      onClick={() => setDietary((prev) => toggle(prev, d as string))}
                    />
                  ))}
                </div>
              </Field>

              <Field label="Accessibility requirements">
                <div className="flex flex-wrap gap-2">
                  {ACCESSIBILITY_OPTIONS.map((a) => (
                    <Chip
                      key={a}
                      label={a}
                      selected={accessibility.includes(a)}
                      onClick={() => setAccessibility((prev) => toggle(prev, a as string))}
                    />
                  ))}
                </div>
              </Field>

              <Field label="Special requests" htmlFor="requests" hint="Optional — anything else we should know.">
                <textarea
                  id="requests"
                  rows={3}
                  maxLength={600}
                  className={inputClass}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Celebrating an anniversary, travelling with a toddler, need late checkouts…"
                />
              </Field>
            </StepShell>
          ) : null}

          {step === 5 ? (
            <StepShell title="Review your trip" description="Check everything, then we'll build the itinerary.">
              {[
                {
                  index: 0,
                  title: "Destination & dates",
                  rows: [
                    ["Trip name", name],
                    ["From", origin],
                    ["To", country ? `${destination}, ${country}` : destination],
                    ["Extra stops", extraDestinations.filter(Boolean).join(", ") || "None"],
                    ["Dates", `${startDate} → ${endDate} (${nights + 1} days)`],
                    ["Travelers", `${adults} adult${adults === 1 ? "" : "s"}, ${children} child${children === 1 ? "" : "ren"}`],
                  ] as [string, string][],
                },
                {
                  index: 1,
                  title: "Trip style",
                  rows: [
                    [
                      "Styles",
                      TRIP_STYLE_OPTIONS.filter((o) => tripStyles.includes(o.id))
                        .map((o) => o.label)
                        .join(", "),
                    ],
                  ] as [string, string][],
                },
                {
                  index: 2,
                  title: "Budget",
                  rows: [
                    ["Total", `${currency} ${budget.toLocaleString()}`],
                    ["Level", BUDGET_LEVELS.find((b) => b.id === budgetLevel)?.label ?? ""],
                    ["Stay", ACCOMMODATION_OPTIONS.find((a) => a.id === accommodation)?.label ?? ""],
                    ["Transport", TRANSPORT_OPTIONS.find((t) => t.id === transport)?.label ?? ""],
                    ["Food", FOOD_OPTIONS.find((f) => f.id === food)?.label ?? ""],
                  ] as [string, string][],
                },
                {
                  index: 3,
                  title: "Interests",
                  rows: [["Selected", interests.join(", ")]] as [string, string][],
                },
                {
                  index: 4,
                  title: "Preferences",
                  rows: [
                    ["Pace", PACE_OPTIONS.find((p) => p.id === pace)?.label ?? ""],
                    ["Wake-up", wakeUpTime],
                    ["Max travel", `${maxTravelMinutes} min`],
                    ["Dietary", dietary.join(", ") || "None"],
                    ["Accessibility", accessibility.join(", ") || "None"],
                    ["Special requests", specialRequests || "None"],
                  ] as [string, string][],
                },
              ].map((section) => (
                <div key={section.title} className="rounded-xl border border-border/70 bg-background p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-bold text-foreground">{section.title}</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => jumpTo(section.index)}
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="mt-2">
                    {section.rows.map(([label, value]) => (
                      <SummaryRow key={label} label={label} value={value} />
                    ))}
                  </div>
                </div>
              ))}
            </StepShell>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/70 pt-5">
            <Button type="button" variant="outline" onClick={goBack} disabled={step === 0} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext} className="gap-1">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="recover"
                size="lg"
                onClick={submit}
                disabled={createTripMutation.isPending}
                className="gap-2"
              >
                {createTripMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Trip…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Create My Trip
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
