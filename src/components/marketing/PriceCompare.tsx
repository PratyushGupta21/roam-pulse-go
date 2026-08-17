import { ExternalLink } from "lucide-react";

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
    <section className="rounded-xl border border-border bg-card p-5 shadow-panel sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold">Price comparison across providers</h3>
          <p className="text-sm text-muted-foreground">
            Normalised offers from every connected provider. Prices can change — last checked 2
            minutes ago.
          </p>
        </div>
        <DemoBadge />
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <caption className="sr-only">Example provider prices</caption>
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="py-2 pr-4 font-medium">
                Provider
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Details
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Price
              </th>
              <th scope="col" className="py-2 font-medium">
                Book
              </th>
            </tr>
          </thead>
          <tbody>
            {OFFERS.map((offer) => (
              <tr
                key={`${offer.provider}-${offer.detail}`}
                className="border-b border-border/70 last:border-0"
              >
                <td className="py-3 pr-4 font-medium">
                  {offer.provider}
                  {offer.best ? (
                    <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                      Best available
                    </span>
                  ) : null}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{offer.detail}</td>
                <td className="py-3 pr-4 font-mono">{formatMoney(offer.price)}</td>
                <td className="py-3">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    Affiliate link <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        RoamPulse charges no booking fees. Some booking links are affiliate links, always labelled.
      </p>
    </section>
  );
}
