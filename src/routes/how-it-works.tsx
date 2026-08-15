import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Compass,
  Gauge,
  MapPin,
  PlaneTakeoff,
  RotateCw,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";

import { pageBackgrounds } from "@/lib/pageBackgrounds";
import { MarketingLayout, PageHero } from "@/components/marketing/MarketingLayout";
import { RecoveryDemo } from "@/components/marketing/RecoveryDemo";
import { Button } from "@/components/ui/button";

const TITLE = "How RoamPulse works — monitoring, detection and recovery";
const DESCRIPTION =
  "See the exact recovery loop: how RoamPulse detects disruptions, scores alternatives and rebuilds your itinerary.";

export const Route = createFileRoute("/how-it-works")({
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
  component: HowItWorks,
});

const PROCESS_STAGES = [
  {
    stage: "PLAN",
    icon: Wand2,
    desc: "AI builds a structured, verified day schedule.",
    color: "border-primary/40 text-primary",
  },
  {
    stage: "MONITOR",
    icon: Gauge,
    desc: "Continuous flight, weather & transit checks.",
    color: "border-primary/40 text-primary",
  },
  {
    stage: "DETECT",
    icon: Sparkles,
    desc: "Identifies conflicts against locked milestones.",
    color: "border-accent/50 text-accent",
  },
  {
    stage: "ADAPT",
    icon: RouteIcon,
    desc: "Scores nearby feasible alternatives in seconds.",
    color: "border-accent text-accent",
  },
  {
    stage: "RECOVER",
    icon: ShieldCheck,
    desc: "Applies validated itinerary version instantly.",
    color: "border-success/50 text-success",
  },
];

const FOUR_STEPS = [
  {
    n: "01",
    title: "Build your trip",
    body: "Eight guided steps capture destination, dates, budget, travel style, interests and automation spend limits.",
  },
  {
    n: "02",
    title: "RoamPulse monitors it",
    body: "Flight status, weather forecasts, transit conditions and live prices are polled on an intelligent schedule.",
  },
  {
    n: "03",
    title: "A disruption happens",
    body: "The engine instantly calculates impact on your real timeline while preserving all locked activities.",
  },
  {
    n: "04",
    title: "Your itinerary adapts",
    body: "Scored alternatives are recommended and applied according to your autonomy mode with full history.",
  },
];

const LOGIC_STEPS = [
  "Identify affected itinerary items and schedule slips",
  "Preserve locked items and non-negotiable reservations",
  "Calculate the new available time window and route constraints",
  "Find conflicting outdoor and scheduled activities",
  "Search verified alternative activities within reachable radius",
  "Check live weather suitability and precipitation probability",
  "Check realistic transit times and traffic conditions",
  "Compare costs against your configured spend limits",
  "Score alternatives on fit, distance, budget and interests",
  "Generate a clean, structured recovery recommendation",
  "Request authorisation according to your chosen autonomy mode",
  "Save a new itinerary version and update timeline, map and alerts",
];

function HowItWorks() {
  return (
    <MarketingLayout transparentHeader>
      <PageHero
        imageSrc={pageBackgrounds.howItWorks.imageSrc}
        imageAlt={pageBackgrounds.howItWorks.alt}
        imagePosition={pageBackgrounds.howItWorks.position}
        eyebrow="Adaptive Travel Intelligence"
        title="Travel Planning That"
        titleAccent="Adapts With You"
        lede="RoamPulse continuously monitors your trip and rebuilds your plans when reality changes."
      >
        <Button asChild size="lg" variant="recover">
          <Link to="/signup">Plan My Trip</Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
        >
          <a href="#recovery-logic">Explore Recovery Loop</a>
        </Button>
      </PageHero>

      {/* Visual Process: PLAN -> MONITOR -> DETECT -> ADAPT -> RECOVER */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-primary font-semibold">
            Continuous Recovery Engine
          </span>
          <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">The 5-Stage Autonomous Loop</h2>
          <p className="mt-2 text-muted-foreground">
            From departure to arrival, your itinerary stays in sync with real-world conditions.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PROCESS_STAGES.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={s.stage}
                className="relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-panel"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">0{idx + 1}</span>
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold tracking-tight text-foreground">{s.stage}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
                {idx < PROCESS_STAGES.length - 1 ? (
                  <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4-Step User Journey */}
      <section className="border-y border-border/80 bg-card/60 backdrop-blur-xs">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">The four-step journey</h2>
          <p className="mt-2 text-muted-foreground">
            How RoamPulse turns a static itinerary into a monitored, resilient experience.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FOUR_STEPS.map((s) => (
              <li
                key={s.n}
                className="rounded-xl border border-border bg-card p-6 shadow-xs transition-all hover:border-primary/40"
              >
                <span className="font-mono text-sm font-semibold text-accent">{s.n}</span>
                <h3 className="mt-2 font-display text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Recovery Logic Step by Step */}
      <section id="recovery-logic" className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl border border-border bg-card/90 p-6 sm:p-10 shadow-sm">
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-widest text-primary font-semibold">
              Under the hood
            </span>
            <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">The recovery logic, step by step</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every decision is auditable, explainable, and bound to your personal budget and autonomy preferences.
            </p>
          </div>

          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LOGIC_STEPS.map((step, i) => (
              <li
                key={step}
                className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/80 p-3.5 text-sm"
              >
                <span className="font-mono text-xs font-semibold text-primary/80 pt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-foreground/90">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <p>
              <strong>Zero unapproved purchases:</strong> RoamPulse never automatically books paid flights, hotels, or tickets without your explicit consent.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Recovery Demo */}
      <div className="mx-auto max-w-6xl px-4 pb-20 space-y-12">
        <RecoveryDemo />
        <div className="text-center pt-6">
          <Button asChild size="lg" variant="recover">
            <Link to="/signup">Plan My Trip Now</Link>
          </Button>
        </div>
      </div>
    </MarketingLayout>
  );
}
