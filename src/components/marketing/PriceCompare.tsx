import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

import { DemoBadge } from "@/components/app/StatusBadge";
import { formatMoney } from "@/lib/format";

const OFFERS = [
  { provider: "Duffel", detail: "Delhi → Tokyo · 1 stop · 12h 40m", price: 38_000, best: true },
  {
    provider: "Skyscanner",
    detail: "Delhi → Tokyo · 1 stop · 13h 15m",
    price: 40_600,
    best: false,
  },
  { provider: "Agoda", detail: "Tokyo · 7 nights · boutique", price: 26_400, best: true },
  { provider: "Booking.com", detail: "Tokyo · 7 nights · boutique", price: 28_900, best: false },
];

export function PriceCompare() {
  return (
    <motion.section
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.3 }}
      className="glass-card-3d relative overflow-hidden rounded-2xl border border-white/10 bg-roam-navy/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
    >
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-roam-cyan/10 blur-3xl" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-white">Price comparison across providers</h3>
          <p className="text-sm text-slate-400">
            Normalised offers from every connected provider. Prices can change — last checked 2
            minutes ago.
          </p>
        </div>
        <DemoBadge />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table style={{ minWidth: "520px" }} className="w-full text-left text-sm">
          <caption className="sr-only">Example provider prices</caption>
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
              <th scope="col" className="py-2.5 pr-4 font-semibold">
                Provider
              </th>
              <th scope="col" className="py-2.5 pr-4 font-semibold">
                Details
              </th>
              <th scope="col" className="py-2.5 pr-4 font-semibold">
                Price
              </th>
              <th scope="col" className="py-2.5 font-semibold">
                Book
              </th>
            </tr>
          </thead>
          <tbody>
            {OFFERS.map((offer) => (
              <tr
                key={`${offer.provider}-${offer.detail}`}
                className="border-b border-white/5 transition-colors hover:bg-white/5 last:border-0"
              >
                <td className="py-3.5 pr-4 font-semibold text-white">
                  {offer.provider}
                  {offer.best ? (
                    <span className="ml-2 rounded-full border border-roam-cyan/40 bg-roam-cyan/15 px-2.5 py-0.5 text-[11px] font-semibold text-roam-cyan shadow-[0_0_8px_rgba(30,193,203,0.3)]">
                      Best available
                    </span>
                  ) : null}
                </td>
                <td className="py-3.5 pr-4 text-slate-300">{offer.detail}</td>
                <td className="py-3.5 pr-4 font-mono font-semibold text-roam-cyan">{formatMoney(offer.price)}</td>
                <td className="py-3.5">
                  <span className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-roam-cyan">
                    Affiliate link <ExternalLink className="h-3.5 w-3.5 text-roam-cyan" aria-hidden="true" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-slate-400">
        RoamPulse charges no booking fees. Some booking links are affiliate links, always labelled.
      </p>
    </motion.section>
  );
}
