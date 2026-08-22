import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Bell,
  CheckCircle2,
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
      <section
        style={{ minHeight: "680px" }}
        className="relative isolate -mt-16 flex items-center overflow-hidden border-b border-white/10 bg-roam-navy lg:min-h-[90vh]"
      >
        {/* Full-bleed background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen pointer-events-none z-0"
        >
          <source src="https://designerstephen.github.io/public-assets/videos/serene-art-hero.mp4" type="video/mp4" />
        </video>
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-roam-navy/50 via-roam-navy/30 to-roam-navy z-0 pointer-events-none" />

        {/* Dynamic ambient radial light leaks */}
        <div
          style={{ height: "500px", width: "500px" }}
          className="pointer-events-none absolute left-1/4 top-16 -z-10 rounded-full bg-roam-cyan/15 blur-3xl"
        />
        <div
          style={{ height: "400px", width: "400px" }}
          className="pointer-events-none absolute bottom-10 right-10 -z-10 rounded-full bg-roam-cyan/10 blur-3xl"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 lg:px-8 pt-28 lg:pt-36">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Column 1: Left Content */}
            <div className="flex flex-col items-start text-left">
              {destination ? (
                <div className="mb-5 rounded-2xl border border-roam-cyan/50 bg-roam-navy/90 p-4 text-cyan-200 backdrop-blur-xl shadow-[0_0_25px_rgba(30,193,203,0.3)] animate-in fade-in slide-in-from-top-3">
                  <div className="flex items-center gap-2 font-semibold text-white text-base">
                    <Sparkles className="h-5 w-5 text-roam-cyan animate-pulse" />
                    <span>Explorer Spot Identified!</span>
                  </div>
                  <p className="mt-1 text-sm text-cyan-100/90">
                    Planning itinerary for <strong className="text-white underline">{destination}</strong>
                    {highlight ? <> centering around <strong className="text-amber-300">{highlight}</strong></> : ""}
                  </p>
                </div>
              ) : null}

              <span className="inline-flex items-center gap-2 rounded-full border border-roam-cyan/40 bg-roam-cyan/10 px-4 py-1.5 text-xs font-semibold text-roam-cyan backdrop-blur-md shadow-[0_0_15px_rgba(30,193,203,0.2)]">
                <span
                  className="live-dot inline-block h-2 w-2 rounded-full bg-roam-cyan"
                  aria-hidden="true"
                />
                Real-time telemetry monitoring
              </span>
              <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight text-white drop-shadow-md sm:text-5xl lg:text-6xl">
                Your Trip Changes.{" "}
                <span className="bg-clip-text bg-linear-to-r from-cyan-300 via-roam-cyan to-teal-400 text-transparent drop-shadow-[0_0_25px_rgba(30,193,203,0.5)]">
                  RoamPulse Adapts.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">{DESCRIPTION}</p>
              <div className="mt-9 flex flex-wrap gap-4">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-roam-cyan px-8 font-bold text-roam-navy shadow-[0_0_25px_rgba(30,193,203,0.5)] transition-all duration-300 hover:bg-roam-cyan/90 hover:shadow-[0_0_35px_rgba(30,193,203,0.8)]"
                >
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
                  className="rounded-full border-white/20 bg-white/5 text-white backdrop-blur-md hover:border-roam-cyan/50 hover:bg-white/10 hover:text-white transition-all duration-300"
                >
                  <Link to="/how-it-works">See How It Works</Link>
                </Button>
              </div>
              <p className="mt-5 text-sm text-slate-400">
                Free plan available · zero booking fees · full spending control.
              </p>
            </div>

            {/* Column 2: Terminal Widget */}
            <div className="w-full flex justify-center lg:justify-end">
              <HeroTimeline />
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-2xl space-y-3">
          <span className="font-mono text-xs font-bold text-rose-400 uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30">
            The Problem
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Why traditional travel plans break
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Static itineraries expect a perfect world. Reality has delays, rainstorms, and price spikes.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PROBLEMS.map((p) => (
            <motion.article
              key={p.title}
              whileHover={{ y: -6, scale: 1.015, rotateX: 2, rotateY: -2 }}
              transition={{ duration: 0.3 }}
              className="glass-card-3d rounded-2xl border border-white/10 bg-roam-navy/75 p-6 shadow-xl backdrop-blur-xl"
            >
              <div className="inline-flex rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-400">
                <p.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-white">{p.title}</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{p.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Solution */}
      <section className="border-y border-white/10 bg-roam-navy/60 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="max-w-2xl space-y-3">
            <span className="font-mono text-xs font-bold text-roam-cyan uppercase tracking-wider px-3 py-1 rounded-full bg-roam-cyan/10 border border-roam-cyan/30">
              The Solution
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              An itinerary that repairs itself
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              RoamPulse watches your flights, weather, and budget in real time to rebuild your trip instantly.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-5">
            {SOLUTION.map((s) => (
              <motion.article
                key={s.title}
                whileHover={{ y: -6, scale: 1.015, rotateX: 2, rotateY: -2 }}
                transition={{ duration: 0.3 }}
                className="glass-card-3d rounded-2xl border border-white/10 bg-roam-navy/80 p-6 shadow-xl backdrop-blur-xl"
              >
                <div className="inline-flex rounded-xl border border-roam-cyan/30 bg-roam-cyan/10 p-3 text-roam-cyan shadow-[0_0_12px_rgba(30,193,203,0.2)]">
                  <s.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">{s.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Live Recovery Demo Component */}
      <section className="mx-auto max-w-6xl px-4 py-20 space-y-12">
        <RecoveryDemo />
        <PriceCompare />
      </section>

      {/* Features Grid */}
      <section className="border-y border-white/10 bg-roam-navy/60 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="max-w-2xl space-y-3">
            <span className="font-mono text-xs font-bold text-roam-cyan uppercase tracking-wider px-3 py-1 rounded-full bg-roam-cyan/10 border border-roam-cyan/30">
              Core Capabilities
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Engineered for seamless journeys
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Every tool you need to stay on schedule and under budget when traveling.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {FEATURES.map((f) => (
              <motion.article
                key={f.title}
                whileHover={{ y: -6, scale: 1.015, rotateX: 2, rotateY: -2 }}
                transition={{ duration: 0.3 }}
                className="glass-card-3d rounded-2xl border border-white/10 bg-roam-navy/80 p-6 shadow-xl backdrop-blur-xl"
              >
                <div className="inline-flex rounded-xl border border-roam-cyan/30 bg-roam-cyan/10 p-3 text-roam-cyan shadow-[0_0_12px_rgba(30,193,203,0.2)]">
                  <f.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">{f.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works 4 steps */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-2xl space-y-3">
          <span className="font-mono text-xs font-bold text-roam-cyan uppercase tracking-wider px-3 py-1 rounded-full bg-roam-cyan/10 border border-roam-cyan/30">
            Step-by-step
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How RoamPulse works in practice
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            From initial prompt to continuous live recovery.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {STEPS.map((step) => (
            <motion.article
              key={step.n}
              whileHover={{ y: -6, scale: 1.015, rotateX: 2, rotateY: -2 }}
              transition={{ duration: 0.3 }}
              className="glass-card-3d rounded-2xl border border-white/10 bg-roam-navy/80 p-6 shadow-xl backdrop-blur-xl"
            >
              <span className="font-mono text-xs font-bold text-roam-cyan px-3 py-1 rounded-full bg-roam-cyan/10 border border-roam-cyan/30">
                {step.n}
              </span>
              <h3 className="mt-4 font-display text-xl font-bold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{step.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Autonomy Mode Teaser */}
      <section className="border-y border-white/10 bg-roam-navy/60 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="max-w-2xl space-y-3">
            <span className="font-mono text-xs font-bold text-roam-cyan uppercase tracking-wider px-3 py-1 rounded-full bg-roam-cyan/10 border border-roam-cyan/30">
              Autonomy Controls
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Choose your automation level
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              RoamPulse never spends money without authorization. You set the rules.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {MODES.map((mode) => (
              <motion.article
                key={mode.title}
                whileHover={{ y: -6, scale: 1.015, rotateX: 2, rotateY: -2 }}
                transition={{ duration: 0.3 }}
                className="glass-card-3d rounded-2xl border border-white/10 bg-roam-navy/80 p-7 shadow-xl backdrop-blur-xl hover:border-roam-cyan/50"
              >
                <div className="inline-flex rounded-xl border border-roam-cyan/30 bg-roam-cyan/10 p-3.5 text-roam-cyan shadow-[0_0_15px_rgba(30,193,203,0.3)]">
                  <mode.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-white">{mode.title}</h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">{mode.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="mx-auto max-w-6xl px-4 py-20 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="font-mono text-xs font-bold text-roam-cyan uppercase tracking-wider px-3 py-1 rounded-full bg-roam-cyan/10 border border-roam-cyan/30">
            Simple Pricing
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Plans for every traveler
          </h2>
          <p className="text-slate-400 text-sm">
            Start for free, upgrade when you need live telemetry monitoring.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Free Tier */}
          <motion.div
            whileHover={{ y: -6, scale: 1.015 }}
            transition={{ duration: 0.3 }}
            className="glass-card-3d rounded-3xl border border-white/10 bg-roam-navy/80 p-8 shadow-2xl backdrop-blur-xl"
          >
            <h3 className="font-display text-2xl font-bold text-white">Free Explorer</h3>
            <p className="mt-1 text-sm text-slate-400">Perfect for planning single trips</p>
            <p className="mt-6 text-4xl font-extrabold text-white">₹0</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-roam-cyan" /> Basic trip planning
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-roam-cyan" /> AI itinerary generation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-roam-cyan" /> Limited monitoring
              </li>
            </ul>
            <Button asChild variant="outline" className="mt-8 w-full rounded-xl border-white/20 text-white hover:bg-white/10">
              <Link to="/signup">Get Started Free</Link>
            </Button>
          </motion.div>

          {/* Pro Tier */}
          <motion.div
            whileHover={{ y: -6, scale: 1.015 }}
            transition={{ duration: 0.3 }}
            className="glass-card-3d relative rounded-3xl border-2 border-roam-cyan bg-roam-navy/90 p-8 shadow-[0_0_35px_-5px_rgba(30,193,203,0.4)] backdrop-blur-xl"
          >
            <span className="absolute -top-3.5 right-6 rounded-full bg-roam-cyan px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-roam-navy shadow-[0_0_12px_rgba(30,193,203,0.6)]">
              Most Popular
            </span>
            <h3 className="font-display text-2xl font-bold text-white">Pro Telemetry</h3>
            <p className="mt-1 text-sm text-slate-300">24/7 continuous monitoring & recovery</p>
            <p className="mt-6 text-4xl font-extrabold text-roam-cyan">
              ₹749 <span className="text-sm font-normal text-slate-300">/ trip</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-roam-cyan" /> Unlimited AI trip generation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-roam-cyan" /> 24/7 Sentinel Flight & Radar monitoring
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-roam-cyan" /> Automated recovery re-routing
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-roam-cyan" /> Live provider price alerts
              </li>
            </ul>
            <Button asChild className="mt-8 w-full rounded-xl bg-roam-cyan py-3 font-bold text-roam-navy shadow-[0_0_20px_rgba(30,193,203,0.5)] hover:bg-roam-cyan/90">
              <Link to="/pricing">Upgrade to Pro</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="relative overflow-hidden border-t border-white/10 bg-roam-navy/90 py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(ellipse_at_center,rgba(30,193,203,0.15),transparent_70%)]" />
        <div className="mx-auto max-w-4xl px-4 text-center space-y-6">
          <h2 className="font-display text-4xl font-extrabold text-white sm:text-5xl">
            Ready for stress-free travel?
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Build your first adaptive itinerary in under 60 seconds with RoamPulse.
          </p>
          <div className="pt-4">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-roam-cyan px-10 py-6 text-lg font-bold text-roam-navy shadow-[0_0_30px_rgba(30,193,203,0.6)] transition-all duration-300 hover:bg-roam-cyan/90 hover:shadow-[0_0_40px_rgba(30,193,203,0.9)]"
            >
              <Link to={user ? "/trips/new" : "/signup"}>Start Planning Now</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
