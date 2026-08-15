import { createFileRoute } from "@tanstack/react-router";
import { Compass, Eye, HeartHandshake, Shield, Sparkles } from "lucide-react";

import { pageBackgrounds } from "@/lib/pageBackgrounds";
import { MarketingLayout, PageHero } from "@/components/marketing/MarketingLayout";

const TITLE = "About RoamPulse — autonomous trip recovery";
const DESCRIPTION =
  "RoamPulse is built for independent travellers who lose hours to delays, weather and manual rebooking.";

export const Route = createFileRoute("/about")({
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
  component: About,
});

const PRINCIPLES = [
  {
    icon: Eye,
    title: "Never invent data",
    desc: "Simulated and demo scenarios are always explicitly labelled as demo data, never masquerading as live provider quotes.",
  },
  {
    icon: Shield,
    title: "Never spend without authorisation",
    desc: "Autonomy is strictly for rescheduling, rerouting, and alternatives. We never perform automated financial transactions.",
  },
  {
    icon: Sparkles,
    title: "Never hide paid placement",
    desc: "Sponsored activities or affiliate partnerships are clearly designated with complete transparency.",
  },
  {
    icon: HeartHandshake,
    title: "Never leak traveller data",
    desc: "Your trips, preferences, and personal details are strictly isolated and scoped to your account with row-level database security.",
  },
];

function About() {
  return (
    <MarketingLayout transparentHeader>
      <PageHero
        imageSrc={pageBackgrounds.about.imageSrc}
        imageAlt={pageBackgrounds.about.alt}
        imagePosition={pageBackgrounds.about.position}
        eyebrow="Our Mission"
        title="Built for the traveller in the"
        titleAccent="middle of the disruption"
        lede="Independent explorers, backpackers, and frequent flyers whose entire day shouldn't crumble when a flight or forecast changes."
      />

      <div className="mx-auto max-w-4xl px-4 py-16 space-y-12">
        {/* Why We Built It */}
        <section className="rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-sm">
          <div className="flex items-center gap-2.5 text-primary mb-3">
            <Compass className="h-5 w-5" />
            <span className="font-mono text-xs uppercase tracking-widest font-semibold">The Core Problem</span>
          </div>
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Why we built RoamPulse</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Travel planning software typically abandons you the moment you leave your front door. Bookings live in one app,
            weather in another, flight notifications in a third, and local discovery in a browser tab jungle. When something slips,
            the traveller becomes the exhausted manual integration layer trying to salvage the trip.
          </p>
        </section>

        {/* What RoamPulse Does Differently */}
        <section className="rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-sm">
          <div className="flex items-center gap-2.5 text-accent mb-3">
            <Sparkles className="h-5 w-5" />
            <span className="font-mono text-xs uppercase tracking-widest font-semibold">Our Approach</span>
          </div>
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">What RoamPulse does differently</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            RoamPulse treats your trip as an active, monitored state machine. It understands which activities are fixed
            milestones, which are flexible adventures, and which depend on good weather or timely arrivals. When real-world
            signals shift, the engine recalculates feasibility, discovers scored alternatives, and presents ready-to-execute recovery.
          </p>
        </section>

        {/* Operating Principles */}
        <section className="rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-sm">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Our operating principles</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Uncompromising standards that guide every line of code in RoamPulse.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {PRINCIPLES.map((p) => {
              const Icon = p.icon;
              return (
                <article
                  key={p.title}
                  className="rounded-xl border border-border/80 bg-background/80 p-5 transition-all hover:border-primary/40"
                >
                  <div className="flex items-center gap-2.5 text-primary">
                    <Icon className="h-5 w-5" />
                    <h3 className="font-display font-semibold text-foreground">{p.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
