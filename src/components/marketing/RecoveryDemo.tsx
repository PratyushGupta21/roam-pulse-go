import { useState } from "react";
import { AlertTriangle, ArrowRight, PlaneTakeoff, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

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
    <motion.section
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.3 }}
      className="glass-card-3d relative overflow-hidden rounded-2xl border border-white/10 bg-roam-navy/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-roam-cyan/10 blur-3xl" />
      
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-white">Live recovery, in one tap</h3>
          <p className="text-sm text-slate-400">
            Try the flow travellers see when a flight slips.
          </p>
        </div>
        <DemoBadge />
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">Disruption: flight delayed by 3 hours</p>
          <p className="text-sm text-amber-200/80">
            Your 4:00 PM outdoor walking tour can no longer fit your schedule.
          </p>
        </div>
      </div>

      <ol className="mt-5 space-y-2.5" aria-live="polite">
        {rows.map((row) => (
          <li
            key={row.title}
            className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 transition-colors hover:border-roam-cyan/40"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-roam-cyan">{row.time}</span>
              <span className="font-medium text-slate-200">{row.title}</span>
            </div>
            <span className="text-xs font-mono text-slate-400">{row.kind}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap gap-3">
        {applied ? (
          <Button variant="outline" className="rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={() => setApplied(false)}>
            <RotateCcw className="h-4 w-4 text-roam-cyan" /> Reset demo
          </Button>
        ) : (
          <Button
            className="rounded-xl bg-roam-cyan text-roam-navy font-bold shadow-[0_0_20px_rgba(30,193,203,0.5)] hover:bg-roam-cyan/90 transition-all duration-300"
            onClick={() => setApplied(true)}
          >
            <PlaneTakeoff className="h-4 w-4" /> Apply Recovery
          </Button>
        )}
        <Button variant="ghost" className="rounded-xl text-slate-300 hover:text-white hover:bg-white/5" asChild>
          <a href="/how-it-works" className="inline-flex items-center gap-1.5">
            See the full logic <ArrowRight className="h-4 w-4 text-roam-cyan" />
          </a>
        </Button>
      </div>
      {applied ? (
        <p className="mt-4 text-sm font-semibold text-emerald-400 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Recovery applied — itinerary, route and budget updated. Locked dinner reservation preserved.
        </p>
      ) : null}
    </motion.section>
  );
}
