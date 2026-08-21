import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  Bell,
  Clock,
  CloudRain,
  Compass,
  Gauge,
  Hand,
  Map,
  PlaneTakeoff,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  Wallet,
  Wand2,
} from "lucide-react";

import { pageBackgrounds } from "@/lib/pageBackgrounds";
import { HeroTimeline } from "@/components/marketing/HeroTimeline";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PriceCompare } from "@/components/marketing/PriceCompare";
import { RecoveryDemo } from "@/components/marketing/RecoveryDemo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const explorerSearchSchema = z.object({
  destination: z.string().optional(),
  highlight: z.string().optional(),
});

const TITLE = "RoamPulse — Your Trip Changes. RoamPulse Adapts.";
const DESCRIPTION =
  "AI-powered travel planning that continuously adapts your itinerary when flights, weather, prices, and plans change.";

export const Route = createFileRoute("/")({
  validateSearch: (search) => explorerSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const PROBLEMS = [
  {
    icon: Clock,
    title: "Flight Delayed 3h",
    body: "Losing your afternoon booking and arrival transit.",
  },
  {
    icon: CloudRain,
    title: "Heavy Rain Midday",
    body: "Outdoor walking tour cancelled with no indoor backup.",
  },
  {
    icon: Wallet,
    title: "Hotel Price Drops ₹4k",
    body: "Paying original price because nobody re-checked.",
  },
  {
    icon: Map,
    title: "Overbooked Rail",
    body: "Scrambling for buses while standing at the terminal.",
  },
  {
    icon: Search,
    title: "Scattered App Panic",
    body: "Juggling 5 tabs while trying to re-plan manually.",
  },
  {
    icon: Compass,
    title: "Zero Travel Context",
    body: "Generic recommendations that ignore your budget.",
  },
] as const;

const SOLUTION = [
  { icon: PlaneTakeoff, title: "1. Monitor", body: "Live flight, weather & price signals." },
  { icon: Bell, title: "2. Detect", body: "Impact identified before you land." },
  { icon: Wand2, title: "3. Re-plan", body: "Feasible alternative paths generated." },
  { icon: Sparkles, title: "4. Authorise", body: "You approve spending and changes." },
  { icon: Timer, title: "5. Repair", body: "Itinerary updated automatically." },
] as const;

const FEATURES = [
  {
    icon: RouteIcon,
    title: "Live Itinerary Graphs",
    body: "Every item connected to real-time status signals.",
  },
  {
    icon: ShieldCheck,
    title: "Autonomous Recovery Modes",
    body: "From manual prompts to auto-replacing flexible items.",
  },
  {
    icon: Wallet,
    title: "Spend Protection",
    body: "Strict spend limits — no surprise charges ever.",
  },
  {
    icon: CloudRain,
    title: "Weather Sentinel",
    body: "Swaps outdoor activities for indoor alternatives during rain.",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Create your trip",
    body: "Set origin, destination, dates, party & budget limits.",
  },
  {
    n: "02",
    title: "Generate AI itinerary",
    body: "Receive a destination-aware, pace-matched day-by-day plan.",
  },
  {
    n: "03",
    title: "Enable monitoring",
    body: "RoamPulse watches flights, weather & prices 24/7.",
  },
  {
    n: "04",
    title: "Enjoy smooth travel",
    body: "Disruptions resolved with one-click approved fixes.",
  },
] as const;

const MODES = [
  { icon: Hand, title: "Manual", body: "Recommendations only. Nothing changes without you." },
  {
    icon: Gauge,
    title: "Assisted",
    body: "Low-risk changes handled automatically; important ones ask first.",
  },
  {
    icon: ShieldCheck,
    title: "Autonomous",
    body: "Eligible items recovered automatically within your spend and preference limits.",
  },
];

function Home() {
  const { user } = useAuth();
  const { destination, highlight } = Route.useSearch();
  const planTripTarget = user ? "/trips/new" : "/signup";

  return (
    <MarketingLayout transparentHeader>
      {/* Hero */}
      <section className="relative isolate -mt-16 flex min-h-[650px] items-center overflow-hidden border-b border-border lg:min-h-[88vh]">
        <img
          src={pageBackgrounds.home.imageSrc}
          alt={pageBackgrounds.home.alt}
          width={1920}
          height={1088}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[62%_38%] md:object-center"
        />
        <div className="hero-scrim absolute inset-0 -z-10 hidden md:block" aria-hidden="true" />
        <div className="hero-scrim-mobile absolute inset-0 -z-10 md:hidden" aria-hidden="true" />

        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-28 lg:grid-cols-2 lg:items-center lg:pb-24 lg:pt-32">
          <div>
            {destination ? (
              <div className="mb-5 rounded-2xl border border-cyan-400/40 bg-slate-950/80 p-4 text-cyan-200 backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-top-3">
                <div className="flex items-center gap-2 font-semibold text-white text-base">
                  <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
                  <span>Explorer Spot Identified!</span>
                </div>
                <p className="mt-1 text-sm text-cyan-100/90">
                  Planning itinerary for <strong className="text-white underline">{destination}</strong>
                  {highlight ? <> centering around <strong className="text-amber-300">{highlight}</strong></> : ""}
                </p>
              </div>
            ) : null}

            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <span
                className="live-dot inline-block h-2 w-2 rounded-full bg-success"
                aria-hidden="true"
              />
              Real-time trip monitoring
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-white drop-shadow-sm sm:text-5xl">
              Your Trip Changes. <span className="text-accent">RoamPulse Adapts.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/85">{DESCRIPTION}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="recover">
                {user ? (
                  <Link
                    to="/trips/new"
                    search={
                      destination
                        ? { destination, ...(highlight ? { highlight } : {}) }
                        : {}
                    }
                  >
                    {destination ? `Plan Trip Around ${destination}` : "Plan My Trip"}
                  </Link>
                ) : (
                  <Link to="/signup">
                    {destination ? `Plan Trip Around ${destination}` : "Plan My Trip"}
                  </Link>
                )}
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
              >
                <Link to="/how-it-works">See How It Works</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-white/70">
              Free plan available · no booking fees · you always authorise spending.
            </p>
          </div>
          <HeroTimeline />
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">
          Travel breaks in predictable ways
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Every traveller runs the same manual recovery loop. RoamPulse automates it.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map((item) => (
            <article key={item.title} className="rounded-xl border border-border bg-card p-5">
              <item.icon className="h-5 w-5 text-accent" aria-hidden="true" />
              <h3 className="mt-3 font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Solution */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">
            One continuous loop, five jobs
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {SOLUTION.map((item) => (
              <li key={item.title} className="rounded-xl border border-border bg-background p-5">
                <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-16">
        <RecoveryDemo />
        <PriceCompare />
      </div>

      {/* Features */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">
            Everything the recovery loop needs
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <article key={f.title} className="rounded-xl border border-border bg-background p-5">
                <f.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">How it works</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-xl border border-border bg-card p-5">
              <span className="font-mono text-sm text-accent">{s.n}</span>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Automation modes */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">
            You choose how much autonomy to give
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {MODES.map((m) => (
              <article key={m.title} className="rounded-xl border border-border bg-background p-6">
                <m.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-display text-lg font-semibold">{m.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{m.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            RoamPulse never purchases anything automatically, in any mode.
          </p>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Simple pricing</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-semibold">Free</h3>
            <p className="mt-1 text-3xl font-semibold">₹0</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>Basic trip planning</li>
              <li>AI itinerary generation</li>
              <li>Limited monitoring</li>
            </ul>
            <Button asChild className="mt-6 w-full">
              <Link to="/signup">Start free</Link>
            </Button>
          </article>
          <article className="rounded-xl border-2 border-primary bg-card p-6">
            <h3 className="font-display text-lg font-semibold">Premium</h3>
            <p className="mt-1 text-3xl font-semibold">
              ₹749<span className="text-base font-normal text-muted-foreground">/month</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>Real-time flight tracking</li>
              <li>Advanced disruption alerts &amp; recovery</li>
              <li>Autonomous recovery controls</li>
              <li>Advanced price monitoring</li>
            </ul>
            <Button asChild className="mt-6 w-full" variant="recover">
              <Link to="/pricing">Compare plans</Link>
            </Button>
          </article>
        </div>
      </section>

      {/* Final CTA */}
      <section className="surface-ink">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center">
          <Bell className="h-7 w-7 text-accent" aria-hidden="true" />
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">
            Don't Let One Delay Ruin Your Trip.
          </h2>
          <p className="max-w-xl opacity-80">
            Build your trip once. RoamPulse keeps it alive while you travel.
          </p>
          <Button asChild size="lg" variant="recover">
            <Link to={planTripTarget}>Plan My Trip</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
