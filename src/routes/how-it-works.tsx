import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Compass,
  Gauge,
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
    color: "border-roam-cyan/40 bg-roam-cyan/10 text-roam-cyan",
  },
  {
    stage: "MONITOR",
    icon: PlaneTakeoff,
    desc: "24/7 background check on flight, weather & prices.",
    color: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  },
  {
    stage: "REPAIR",
    icon: RotateCw,
    desc: "Instant alternative path when reality slips.",
    color: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
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
        <Button
          asChild
          size="lg"
          className="rounded-full bg-roam-cyan px-8 text-roam-navy font-bold shadow-[0_0_25px_rgba(30,193,203,0.5)] hover:bg-roam-cyan/90 transition-all duration-300"
        >
          <Link to={planTripTarget}>Plan My Trip</Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="rounded-full border-white/20 bg-white/5 text-white backdrop-blur-md hover:border-roam-cyan/50 hover:bg-white/10 hover:text-white transition-all duration-300"
        >
          <a href="#recovery-logic">Explore Recovery Loop</a>
        </Button>
      </PageHero>

      {/* Process Overview */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {PROCESS_STAGES.map((s) => (
            <motion.div
              key={s.stage}
              whileHover={{ y: -6, scale: 1.015 }}
              transition={{ duration: 0.3 }}
              className={`glass-card-3d rounded-2xl border bg-roam-navy/80 p-7 shadow-2xl backdrop-blur-xl ${s.color}`}
            >
              <div className="flex items-center gap-3">
                <s.icon className="h-6 w-6" />
                <span className="font-mono text-xs font-extrabold tracking-widest">{s.stage}</span>
              </div>
              <p className="mt-3.5 text-sm text-slate-300 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Detail Steps */}
      <section className="border-t border-white/10 bg-roam-navy/60 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-20 space-y-12">
          <div className="max-w-2xl space-y-3">
            <span className="font-mono text-xs font-bold text-roam-cyan uppercase tracking-wider px-3 py-1 rounded-full bg-roam-cyan/10 border border-roam-cyan/30">
              Architecture Deep Dive
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How RoamPulse Monitors &amp; Repairs
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Unlike static PDF itineraries or passive calendar apps, RoamPulse treats your trip as
              a living state machine.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {STEPS.map((step) => (
              <motion.div
                key={step.n}
                whileHover={{ y: -6, scale: 1.015, rotateX: 2, rotateY: -2 }}
                transition={{ duration: 0.3 }}
                className="glass-card-3d rounded-2xl border border-white/10 bg-roam-navy/80 p-7 space-y-3.5 shadow-2xl backdrop-blur-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-roam-cyan bg-roam-cyan/15 px-3 py-1 rounded-full border border-roam-cyan/30">
                    STEP {step.n}
                  </span>
                  <step.icon className="h-5 w-5 text-roam-cyan" />
                </div>
                <h3 className="font-display text-xl font-bold text-white">{step.title}</h3>
                <p className="text-xs font-semibold text-roam-cyan">{step.subtitle}</p>
                <p className="text-xs text-slate-300 leading-relaxed">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recovery Logic List */}
      <section id="recovery-logic" className="mx-auto max-w-6xl px-4 py-20 space-y-8">
        <div className="max-w-2xl space-y-2">
          <h2 className="font-display text-2xl font-bold text-white sm:text-4xl">The 7-Step Recovery Algorithm</h2>
          <p className="text-sm text-slate-400">
            Every disruption passes through a deterministic evaluation engine before any alternative
            is recommended.
          </p>
        </div>

        <div className="glass-card-3d rounded-3xl border border-white/10 bg-roam-navy/80 p-8 shadow-2xl backdrop-blur-xl">
          <ol className="space-y-4">
            {LOGIC_BULLETS.map((bullet, idx) => (
              <li key={bullet} className="flex items-center gap-3.5 text-sm text-slate-200">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-roam-cyan/40 bg-roam-cyan/15 text-roam-cyan font-mono text-xs font-bold shadow-[0_0_8px_rgba(30,193,203,0.3)]">
                  {idx + 1}
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-2xl border border-roam-cyan/30 bg-roam-cyan/10 p-5 text-xs text-cyan-100 flex items-center gap-3.5 backdrop-blur-md">
            <Gauge className="h-6 w-6 text-roam-cyan shrink-0" />
            <p className="leading-relaxed">
              <strong className="text-white">Zero unapproved purchases:</strong> RoamPulse never automatically books paid
              flights, hotels, or tickets without your explicit consent.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Recovery Demo */}
      <div className="mx-auto max-w-6xl px-4 pb-24 space-y-12">
        <RecoveryDemo />
        <div className="text-center pt-6">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-roam-cyan px-10 py-6 text-lg text-roam-navy font-bold shadow-[0_0_30px_rgba(30,193,203,0.6)] hover:bg-roam-cyan/90 transition-all duration-300"
          >
            <Link to={planTripTarget}>Plan My Trip Now</Link>
          </Button>
        </div>
      </div>
    </MarketingLayout>
  );
}
