import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

import { pageBackgrounds } from "@/lib/pageBackgrounds";
import { MarketingLayout, PageHero } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

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
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-roam-cyan/40 bg-roam-cyan/15 text-roam-cyan shadow-[0_0_8px_rgba(30,193,203,0.3)]">
        <Check className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="sr-only">Included</span>
    </div>
  ) : (
    <div className="flex items-center justify-center">
      <Minus className="h-4 w-4 text-slate-600" aria-hidden="true" />
      <span className="sr-only">Not included</span>
    </div>
  );
}

function Pricing() {
  const { user } = useAuth();
  const planTripTarget = user ? "/trips/new" : "/signup";

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

      <section className="mx-auto max-w-5xl px-4 py-20">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Free Tier */}
          <motion.article
            whileHover={{ y: -6, scale: 1.015 }}
            transition={{ duration: 0.3 }}
            className="glass-card-3d relative flex flex-col justify-between rounded-3xl border border-white/10 bg-roam-navy/80 p-8 shadow-2xl backdrop-blur-xl"
          >
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-white">Free</h2>
                <span className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1 font-mono text-xs font-semibold uppercase text-slate-300">
                  Starter
                </span>
              </div>
              <p className="mt-4 text-4xl font-extrabold tracking-tight text-white">₹0</p>
              <p className="mt-2 text-sm text-slate-400">
                Everything you need to craft verified, intelligent travel plans.
              </p>

              <ul className="mt-6 space-y-3.5 border-t border-white/10 pt-6 text-sm text-slate-300">
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-roam-cyan shrink-0" />
                  <span>AI itinerary generation</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-roam-cyan shrink-0" />
                  <span>Trip editing, item locking &amp; history</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-roam-cyan shrink-0" />
                  <span>Basic daily monitoring checks</span>
                </li>
              </ul>
            </div>

            <Button asChild size="lg" variant="outline" className="mt-8 w-full rounded-xl border-white/20 bg-white/5 font-semibold text-white hover:bg-white/10">
              <Link to={planTripTarget}>Start Free</Link>
            </Button>
          </motion.article>

          {/* Premium Tier */}
          <motion.article
            whileHover={{ y: -6, scale: 1.015 }}
            transition={{ duration: 0.3 }}
            className="glass-card-3d relative flex flex-col justify-between rounded-3xl border-2 border-roam-cyan bg-roam-navy/90 p-8 shadow-[0_0_35px_-5px_rgba(30,193,203,0.4)] backdrop-blur-xl"
          >
            <div className="absolute -top-3.5 right-8">
              <span className="inline-flex items-center gap-1 rounded-full bg-roam-cyan px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-roam-navy shadow-[0_0_12px_rgba(30,193,203,0.6)]">
                <Sparkles className="h-3.5 w-3.5" />
                Recommended
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-white">Premium</h2>
                <span className="rounded-full border border-roam-cyan/40 bg-roam-cyan/15 px-3.5 py-1 font-mono text-xs font-semibold uppercase text-roam-cyan">
                  Full Power
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-roam-cyan">₹749</span>
                <span className="text-sm font-normal text-slate-400">/ month</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                For travellers on the go who need real-time monitoring and autonomous disruption
                recovery.
              </p>

              <ul className="mt-6 space-y-3.5 border-t border-white/10 pt-6 text-sm text-slate-200">
                <li className="flex items-center gap-3 font-medium">
                  <Check className="h-4 w-4 text-roam-cyan shrink-0" />
                  <span>Real-time flight tracking &amp; gate alerts</span>
                </li>
                <li className="flex items-center gap-3 font-medium">
                  <Check className="h-4 w-4 text-roam-cyan shrink-0" />
                  <span>Autonomous recovery recommendations</span>
                </li>
                <li className="flex items-center gap-3 font-medium">
                  <Check className="h-4 w-4 text-roam-cyan shrink-0" />
                  <span>High-frequency live weather &amp; route updates</span>
                </li>
                <li className="flex items-center gap-3 font-medium">
                  <Check className="h-4 w-4 text-roam-cyan shrink-0" />
                  <span>Custom automation limits &amp; spend controls</span>
                </li>
              </ul>
            </div>

            <Button asChild size="lg" className="mt-8 w-full rounded-xl bg-roam-cyan font-bold text-roam-navy shadow-[0_0_20px_rgba(30,193,203,0.5)] transition-all duration-300 hover:bg-roam-cyan/90">
              <Link to={planTripTarget}>Start with Premium</Link>
            </Button>
          </motion.article>
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-16 overflow-hidden rounded-3xl border border-white/10 bg-roam-navy/80 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-white/10 bg-black/30 px-6 py-5">
            <h3 className="font-display text-xl font-bold text-white">Detailed Feature Breakdown</h3>
            <p className="text-xs text-slate-400">
              Compare everything included in Free and Premium tiers
            </p>
          </div>
          <div className="overflow-x-auto">
            <table style={{ minWidth: "520px" }} className="w-full text-left text-sm">
              <caption className="sr-only">Plan comparison</caption>
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-xs uppercase tracking-wider text-slate-400">
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Capability
                  </th>
                  <th scope="col" className="px-6 py-4 text-center font-semibold">
                    Free
                  </th>
                  <th scope="col" className="px-6 py-4 text-center font-semibold text-roam-cyan">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <th
                      scope="row"
                      className="px-6 py-4 text-left font-normal text-slate-200"
                    >
                      {row.label}
                    </th>
                    <td className="px-6 py-4 text-center">
                      <Cell on={row.free} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Cell on={row.premium} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-roam-navy/60 p-4 text-center text-xs text-slate-400 backdrop-blur-md">
          Subscription state is verified securely server-side. Billing can be updated or paused
          anytime from Settings → Billing.
        </div>
      </section>
    </MarketingLayout>
  );
}
