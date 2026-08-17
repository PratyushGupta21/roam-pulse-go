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
import { useAuth } from "@/hooks/useAuth";

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
    icon: PlaneTakeoff,
    desc: "24/7 background check on flight, weather & prices.",
    color: "border-accent/40 text-accent",
  },
  {
    stage: "REPAIR",
    icon: RotateCw,
    desc: "Instant alternative path when reality slips.",
    color: "border-success/40 text-success",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Trip Graph Construction",
    subtitle: "Every item linked to live data signals",
    body: "When you create a trip, RoamPulse parses destinations, accommodation locations, transport legs, and activity intervals into a connected graph.",
    icon: RouteIcon,
  },
  {
    n: "02",
    title: "Sentinel Network Monitoring",
    subtitle: "Continuous flight, weather & price checks",
    body: "Background worker processes poll live flight statuses, rain radar probabilities, and accommodation rate changes.",
    icon: Compass,
  },
  {
    n: "03",
    title: "Disruption Impact Scoring",
    subtitle: "Downstream conflict detection",
    body: "When a delay or weather shift occurs, the impact engine calculates exactly which downstream activities become invalid.",
    icon: Sparkles,
  },
  {
    n: "04",
    title: "Autonomous Recovery Execution",
    subtitle: "User-controlled automation modes",
    body: "Depending on your selected autonomy mode (Manual, Assisted, Autonomous), RoamPulse either prompts for approval or applies fixes.",
    icon: ShieldCheck,
  },
] as const;

const LOGIC_BULLETS = [
  "Verify real-time flight delay / weather impact",
  "Calculate remaining daylight, transit time & budget buffer",
  "Search nearby alternative attractions, dining & indoor venues",
  "Score candidates by distance, weather suitability & traveler interests",
  "Generate a clean, structured recovery recommendation",
  "Request authorisation according to your chosen autonomy mode",
  "Save a new itinerary version and update timeline, map and alerts",
];

function HowItWorks() {
  const { user } = useAuth();
  const planTripTarget = user ? "/trips/new" : "/signup";

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
          <Link to={planTripTarget}>Plan My Trip</Link>
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

      {/* Process Overview */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {PROCESS_STAGES.map((s) => (
            <div key={s.stage} className={`rounded-xl border bg-card p-6 shadow-xs ${s.color}`}>
              <div className="flex items-center gap-3">
                <s.icon className="h-6 w-6" />
                <span className="font-mono text-xs font-bold tracking-wider">{s.stage}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Detail Steps */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 space-y-12">
          <div className="max-w-2xl space-y-3">
            <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider">
              Architecture Deep Dive
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight">
              How RoamPulse Monitors &amp; Repairs
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Unlike static PDF itineraries or passive calendar apps, RoamPulse treats your trip as
              a living state machine.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="rounded-xl border border-border bg-background p-6 space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded">
                    STEP {step.n}
                  </span>
                  <step.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="font-display text-lg font-bold">{step.title}</h3>
                <p className="text-xs font-semibold text-accent">{step.subtitle}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recovery Logic List */}
      <section id="recovery-logic" className="mx-auto max-w-6xl px-4 py-16 space-y-8">
        <div className="max-w-2xl space-y-2">
          <h2 className="font-display text-2xl font-bold">The 7-Step Recovery Algorithm</h2>
          <p className="text-sm text-muted-foreground">
            Every disruption passes through a deterministic evaluation engine before any alternative
            is recommended.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <ol className="space-y-4">
            {LOGIC_BULLETS.map((bullet, idx) => (
              <li key={bullet} className="flex items-center gap-3 text-sm text-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent font-mono text-xs font-bold">
                  {idx + 1}
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs text-muted-foreground flex items-center gap-3">
            <Gauge className="h-5 w-5 text-primary shrink-0" />
            <p>
              <strong>Zero unapproved purchases:</strong> RoamPulse never automatically books paid
              flights, hotels, or tickets without your explicit consent.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Recovery Demo */}
      <div className="mx-auto max-w-6xl px-4 pb-20 space-y-12">
        <RecoveryDemo />
        <div className="text-center pt-6">
          <Button asChild size="lg" variant="recover">
            <Link to={planTripTarget}>Plan My Trip Now</Link>
          </Button>
        </div>
      </div>
    </MarketingLayout>
  );
}
