import { useState } from "react";
import { AlertTriangle, ArrowRight, PlaneTakeoff, RotateCcw } from "lucide-react";

import { DemoBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";

const BEFORE = [
  { time: "2:00 PM", title: "Flight arrives", kind: "Flight" },
  { time: "4:00 PM", title: "Old town walking tour", kind: "Outdoor · 2h" },
  { time: "7:00 PM", title: "Dinner reservation", kind: "Locked" },
];

const AFTER = [
  { time: "5:00 PM", title: "Flight arrives", kind: "Delayed 3h" },
  { time: "6:00 PM", title: "Indoor food experience", kind: "Indoor · 1h 45m · ₹1,200" },
  { time: "8:30 PM", title: "Dinner reservation", kind: "Moved · still locked" },
];

export function RecoveryDemo() {
  const [applied, setApplied] = useState(false);
  const rows = applied ? AFTER : BEFORE;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-panel sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold">Live recovery, in one tap</h3>
          <p className="text-sm text-muted-foreground">Try the flow travellers see when a flight slips.</p>
        </div>
        <DemoBadge />
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-lg border border-accent/40 bg-accent/10 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-accent-foreground" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">Disruption: flight delayed by 3 hours</p>
          <p className="text-sm text-muted-foreground">
            Your 4:00 PM outdoor walking tour can no longer fit your schedule.
          </p>
        </div>
      </div>

      <ol className="mt-5 space-y-2" aria-live="polite">
        {rows.map((row) => (
          <li
            key={row.title}
            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">{row.time}</span>
              <span className="font-medium">{row.title}</span>
            </div>
            <span className="text-xs text-muted-foreground">{row.kind}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex flex-wrap gap-3">
        {applied ? (
          <Button variant="outline" onClick={() => setApplied(false)}>
            <RotateCcw /> Reset demo
          </Button>
        ) : (
          <Button variant="recover" onClick={() => setApplied(true)}>
            <PlaneTakeoff /> Apply Recovery
          </Button>
        )}
        <Button variant="ghost" asChild>
          <a href="/how-it-works">
            See the full logic <ArrowRight />
          </a>
        </Button>
      </div>
      {applied ? (
        <p className="mt-3 text-sm text-success">
          Recovery applied — itinerary, route and budget updated. Locked dinner reservation preserved.
        </p>
      ) : null}
    </section>
  );
}
