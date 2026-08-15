import { createFileRoute, Link } from "@tanstack/react-router";

import { MarketingLayout, PageHeader } from "@/components/marketing/MarketingLayout";
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

const LOGIC = [
  "Identify affected itinerary items",
  "Preserve locked items",
  "Calculate the new available time window",
  "Find conflicting activities",
  "Search alternative activities nearby",
  "Check weather suitability",
  "Check travel time",
  "Compare costs against your limits",
  "Score alternatives on fit, distance, budget and interests",
  "Generate a recovery recommendation",
  "Ask for authorisation according to your automation mode",
  "Save a new itinerary version and update timeline, map and notifications",
];

function HowItWorks() {
  return (
    <MarketingLayout>
      <PageHeader
        eyebrow="How it works"
        title="Plan once. Recover continuously."
        lede="RoamPulse turns a static itinerary into a monitored system with an explicit, auditable recovery process."
      />

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="font-display text-2xl font-semibold">The four-step loop</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["01", "Build your trip", "Eight guided steps capture destination, dates, budget, style, interests and automation limits."],
            ["02", "RoamPulse monitors it", "Flight status, weather forecasts, transit conditions and prices are polled on a schedule."],
            ["03", "A disruption happens", "The engine calculates the impact on your real timeline, respecting locked items."],
            ["04", "Your itinerary adapts", "Scored alternatives are recommended, applied on approval, then persisted with full history."],
          ].map(([n, title, body]) => (
            <li key={n} className="rounded-xl border border-border bg-card p-5">
              <span className="font-mono text-sm text-accent">{n}</span>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="font-display text-2xl font-semibold">The recovery logic, step by step</h2>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2">
            {LOGIC.map((step, i) => (
              <li key={step} className="flex gap-3 rounded-lg border border-border bg-background p-4 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-muted-foreground">
            RoamPulse never automatically purchases anything, even in Autonomous mode.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-14">
        <RecoveryDemo />
        <div className="mt-10 text-center">
          <Button asChild size="lg">
            <Link to="/signup">Plan My Trip</Link>
          </Button>
        </div>
      </div>
    </MarketingLayout>
  );
}
