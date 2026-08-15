import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus, Sparkles, Zap } from "lucide-react";

import { pageBackgrounds } from "@/lib/pageBackgrounds";
import { MarketingLayout, PageHero } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";

const TITLE = "RoamPulse pricing — Free and Premium plans";
const DESCRIPTION =
  "Start free with AI itinerary planning. Upgrade to Premium for real-time flight tracking, advanced recovery and price monitoring.";

export const Route = createFileRoute("/pricing")({
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
  component: Pricing,
});

const ROWS: { label: string; free: boolean; premium: boolean }[] = [
  { label: "AI itinerary generation", free: true, premium: true },
  { label: "Trip editing, locking and history", free: true, premium: true },
  { label: "Basic monitoring (daily checks)", free: true, premium: true },
  { label: "Real-time flight tracking", free: false, premium: true },
  { label: "Advanced disruption alerts", free: false, premium: true },
  { label: "High-frequency monitoring", free: false, premium: true },
  { label: "Advanced recovery recommendations", free: false, premium: true },
  { label: "Autonomous recovery controls", free: false, premium: true },
  { label: "Advanced price monitoring", free: false, premium: true },
];

function Cell({ on }: { on: boolean }) {
  return on ? (
    <div className="flex items-center justify-center">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success">
        <Check className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="sr-only">Included</span>
    </div>
  ) : (
    <div className="flex items-center justify-center">
      <Minus className="h-4 w-4 text-muted-foreground/40" aria-hidden="true" />
      <span className="sr-only">Not included</span>
    </div>
  );
}

function Pricing() {
  return (
    <MarketingLayout transparentHeader>
      <PageHero
        imageSrc={pageBackgrounds.pricing.imageSrc}
        imageAlt={pageBackgrounds.pricing.alt}
        imagePosition={pageBackgrounds.pricing.position}
        eyebrow="Transparent Value"
        title="Free to plan."
        titleAccent="Premium to stay ahead."
        lede="No booking fees, ever. Upgrade anytime for continuous flight tracking and real-time autonomous recovery."
      />

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Free Tier */}
          <article className="relative flex flex-col justify-between rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:border-primary/40 hover:shadow-panel">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold">Free</h2>
                <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs font-semibold uppercase text-muted-foreground">
                  Starter
                </span>
              </div>
              <p className="mt-4 text-4xl font-extrabold tracking-tight">₹0</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Everything you need to craft verified, intelligent travel plans.
              </p>

              <ul className="mt-6 space-y-3 border-t border-border/80 pt-6 text-sm text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span>AI itinerary generation</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span>Trip editing, item locking & history</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span>Basic daily monitoring checks</span>
                </li>
              </ul>
            </div>

            <Button asChild size="lg" variant="outline" className="mt-8 w-full font-semibold">
              <Link to="/signup">Start Free</Link>
            </Button>
          </article>

          {/* Premium Tier */}
          <article className="relative flex flex-col justify-between rounded-2xl border-2 border-accent bg-card p-8 shadow-lift transition-all hover:border-accent">
            <div className="absolute -top-3.5 right-8">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Recommended
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold">Premium</h2>
                <span className="rounded-full bg-accent/15 px-3 py-1 font-mono text-xs font-semibold uppercase text-accent">
                  Full Power
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight">₹749</span>
                <span className="text-sm font-normal text-muted-foreground">/ month</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                For travellers on the go who need real-time monitoring and autonomous disruption recovery.
              </p>

              <ul className="mt-6 space-y-3 border-t border-border/80 pt-6 text-sm text-muted-foreground">
                <li className="flex items-center gap-2.5 text-foreground font-medium">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Real-time flight tracking & gate alerts</span>
                </li>
                <li className="flex items-center gap-2.5 text-foreground font-medium">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Autonomous recovery recommendations</span>
                </li>
                <li className="flex items-center gap-2.5 text-foreground font-medium">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>High-frequency live weather & route updates</span>
                </li>
                <li className="flex items-center gap-2.5 text-foreground font-medium">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Custom automation limits & spend controls</span>
                </li>
              </ul>
            </div>

            <Button asChild size="lg" variant="recover" className="mt-8 w-full font-semibold">
              <Link to="/signup">Start with Premium</Link>
            </Button>
          </article>
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-14 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-card px-6 py-4">
            <h3 className="font-display text-lg font-semibold">Detailed Feature Breakdown</h3>
            <p className="text-xs text-muted-foreground">Compare everything included in Free and Premium tiers</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <caption className="sr-only">Plan comparison</caption>
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-6 py-3.5 font-semibold">Capability</th>
                  <th scope="col" className="px-6 py-3.5 text-center font-semibold">Free</th>
                  <th scope="col" className="px-6 py-3.5 text-center font-semibold text-accent">Premium</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-border/70 last:border-0 hover:bg-secondary/20 transition-colors">
                    <th scope="row" className="px-6 py-3.5 text-left font-normal text-foreground/90">{row.label}</th>
                    <td className="px-6 py-3.5 text-center"><Cell on={row.free} /></td>
                    <td className="px-6 py-3.5 text-center"><Cell on={row.premium} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-border/80 bg-card/60 p-4 text-center text-xs text-muted-foreground">
          Subscription state is verified securely server-side. Billing can be updated or paused anytime from Settings → Billing.
        </div>
      </section>
    </MarketingLayout>
  );
}
