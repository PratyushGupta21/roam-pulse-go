import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
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

import heroImage from "@/assets/hero-travel.webp";
import { HeroTimeline } from "@/components/marketing/HeroTimeline";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PriceCompare } from "@/components/marketing/PriceCompare";
import { RecoveryDemo } from "@/components/marketing/RecoveryDemo";
import { Button } from "@/components/ui/button";

const TITLE = "RoamPulse — Your Trip Changes. RoamPulse Adapts.";
const DESCRIPTION =
  "AI-powered travel planning that continuously adapts your itinerary when flights, weather, prices, and plans change.";

export const Route = createFileRoute("/")({
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
  { icon: PlaneTakeoff, title: "Flight delays", body: "One slipped arrival cascades through every booking of the day." },
  { icon: CloudRain, title: "Bad weather", body: "Outdoor plans collapse and you rebuild them from a phone in the rain." },
  { icon: Timer, title: "Lost time", body: "Hours disappear into rescheduling instead of exploring." },
  { icon: Wallet, title: "Manual rebooking", body: "Refunds, rebooking rules and price differences, all by hand." },
  { icon: Search, title: "Too many booking sites", body: "Six tabs to answer one question: what should I do now?" },
  { icon: Compass, title: "Hard local discovery", body: "Finding a good indoor option nearby, fast, is genuinely difficult." },
];

const SOLUTION = [
  { icon: Wand2, title: "Plans", body: "AI builds a structured, validated itinerary from your budget, pace and interests." },
  { icon: Gauge, title: "Monitors", body: "Flights, weather, transit and prices are checked continuously." },
  { icon: Sparkles, title: "Detects", body: "Conflicts are identified against your real schedule, not a generic template." },
  { icon: RouteIcon, title: "Adapts", body: "Affected items are scored against nearby alternatives that fit your day." },
  { icon: Map, title: "Re-routes", body: "Maps, travel times and costs update the moment recovery is applied." },
];

const FEATURES = [
  { icon: Wand2, title: "AI itinerary generation", body: "Structured, schema-validated day plans — never free-form guesswork." },
  { icon: PlaneTakeoff, title: "Live flight tracking", body: "Delay, cancellation and gate changes trigger the recovery workflow." },
  { icon: CloudRain, title: "Weather-aware planning", body: "Rain probability is evaluated per outdoor activity." },
  { icon: RouteIcon, title: "Dynamic rerouting", body: "New arrival time in, new feasible day out." },
  { icon: Wallet, title: "Price comparison", body: "Normalised offers across providers with clear affiliate labelling." },
  { icon: Map, title: "Live maps", body: "Hotel, airport, activities and the updated route in one view." },
  { icon: Compass, title: "Local experiences", body: "Nearby alternatives scored on distance, weather, budget and interests." },
  { icon: ShieldCheck, title: "Autonomous recovery", body: "Within your limits — and never an automatic purchase." },
];

const STEPS = [
  { n: "01", title: "Build your trip", body: "Destination, dates, budget, style, interests and recovery preferences." },
  { n: "02", title: "RoamPulse monitors it", body: "Flights, weather, transit and prices are watched continuously." },
  { n: "03", title: "A disruption happens", body: "Impact is calculated against your locked and flexible items." },
  { n: "04", title: "Your itinerary adapts", body: "Recovery is recommended, applied and reflected on your map." },
];

const MODES = [
  { icon: Hand, title: "Manual", body: "Recommendations only. Nothing changes without you." },
  { icon: Gauge, title: "Assisted", body: "Low-risk changes handled automatically; important ones ask first." },
  { icon: ShieldCheck, title: "Autonomous", body: "Eligible items recovered automatically within your spend and preference limits." },
];

function Home() {
  return (
    <MarketingLayout transparentHeader>
      {/* Hero */}
      <section className="relative isolate -mt-16 flex min-h-[650px] items-center overflow-hidden border-b border-border lg:min-h-[88vh]">
        <img
          src={heroImage}
          alt="A traveller looking out over a coastal mountain road at sunset"
          width={1920}
          height={1088}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[68%_center] md:object-center"
        />
        <div className="hero-scrim absolute inset-0 -z-10 hidden md:block" aria-hidden="true" />
        <div className="hero-scrim-mobile absolute inset-0 -z-10 md:hidden" aria-hidden="true" />

        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-28 lg:grid-cols-2 lg:items-center lg:pb-24 lg:pt-32">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <span className="live-dot inline-block h-2 w-2 rounded-full bg-success" aria-hidden="true" />
              Real-time trip monitoring
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-white drop-shadow-sm sm:text-5xl">
              Your Trip Changes. <span className="text-accent">RoamPulse Adapts.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/85">{DESCRIPTION}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="recover">
                <Link to="/signup">Plan My Trip</Link>
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
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Travel breaks in predictable ways</h2>
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
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">One continuous loop, five jobs</h2>
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
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Everything the recovery loop needs</h2>
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
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">You choose how much autonomy to give</h2>
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
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Don't Let One Delay Ruin Your Trip.</h2>
          <p className="max-w-xl opacity-80">
            Build your trip once. RoamPulse keeps it alive while you travel.
          </p>
          <Button asChild size="lg" variant="recover">
            <Link to="/signup">Plan My Trip</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
