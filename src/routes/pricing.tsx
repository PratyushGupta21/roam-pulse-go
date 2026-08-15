import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";

import { MarketingLayout, PageHeader } from "@/components/marketing/MarketingLayout";
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
    <>
      <Check className="mx-auto h-4 w-4 text-success" aria-hidden="true" />
      <span className="sr-only">Included</span>
    </>
  ) : (
    <>
      <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Not included</span>
    </>
  );
}

function Pricing() {
  return (
    <MarketingLayout>
      <PageHeader
        eyebrow="Pricing"
        title="Free to plan. Premium to stay ahead."
        lede="No booking fees, ever. Premium adds real-time monitoring and the autonomous recovery controls."
      />

      <section className="mx-auto max-w-5xl px-4 py-14">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold">Free</h2>
            <p className="mt-1 text-4xl font-semibold">₹0</p>
            <p className="mt-2 text-sm text-muted-foreground">For planning your next trip.</p>
            <Button asChild className="mt-6 w-full">
              <Link to="/signup">Start free</Link>
            </Button>
          </article>
          <article className="rounded-xl border-2 border-primary bg-card p-6">
            <h2 className="font-display text-xl font-semibold">Premium</h2>
            <p className="mt-1 text-4xl font-semibold">
              ₹749<span className="text-base font-normal text-muted-foreground">/month</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">For travellers who are actually on the road.</p>
            <Button asChild variant="recover" className="mt-6 w-full">
              <Link to="/signup">Start with Premium</Link>
            </Button>
          </article>
        </div>

        <div className="mt-10 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[520px] text-left text-sm">
            <caption className="sr-only">Plan comparison</caption>
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Feature</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">Free</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">Premium</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b border-border/70 last:border-0">
                  <th scope="row" className="px-4 py-3 text-left font-normal">{row.label}</th>
                  <td className="px-4 py-3 text-center"><Cell on={row.free} /></td>
                  <td className="px-4 py-3 text-center"><Cell on={row.premium} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Subscription state is verified server-side. Billing is managed from Settings → Billing once a payment
          provider is connected.
        </p>
      </section>
    </MarketingLayout>
  );
}
