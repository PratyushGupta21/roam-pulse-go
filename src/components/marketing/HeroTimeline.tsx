import {
  ArrowDown,
  CheckCircle2,
  PlaneTakeoff,
  Sparkles,
  Terminal,
  Umbrella,
  UtensilsCrossed,
} from "lucide-react";
import { motion } from "framer-motion";

const STEPS = [
  {
    time: "10:30 AM",
    icon: PlaneTakeoff,
    title: "Flight delayed",
    detail: "AI-247 · Delhi → Tokyo · +2h 45m",
    tone: "alert",
    dotColor: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
  },
  {
    time: "10:30 AM",
    icon: Sparkles,
    title: "RoamPulse detected a conflict",
    detail: "3 activities re-evaluated in 1.2s",
    tone: "cyan",
    dotColor: "bg-roam-cyan shadow-[0_0_8px_rgba(30,193,203,0.9)]",
  },
  {
    time: "10:31 AM",
    icon: Umbrella,
    title: "Outdoor walking tour removed",
    detail: "No longer fits your arrival window",
    tone: "muted",
    dotColor: "bg-slate-400",
  },
  {
    time: "10:31 AM",
    icon: UtensilsCrossed,
    title: "Indoor food experience added",
    detail: "6:00 PM · 1.2 km away · ₹1,200",
    tone: "cyan",
    dotColor: "bg-roam-cyan shadow-[0_0_8px_rgba(30,193,203,0.9)]",
  },
  {
    time: "10:32 AM",
    icon: CheckCircle2,
    title: "New itinerary ready",
    detail: "Timeline, route and budget updated",
    tone: "ok",
    dotColor: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
  },
] as const;

const TONE: Record<string, string> = {
  alert: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  cyan: "border-roam-cyan/40 bg-roam-cyan/10 text-cyan-100 shadow-[0_0_15px_-3px_rgba(30,193,203,0.2)]",
  muted: "border-white/10 bg-white/5 text-slate-300",
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
};

export function HeroTimeline() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      whileHover={{ y: -6, scale: 1.015, rotateX: 2, rotateY: -2 }}
      className="glass-card-3d relative overflow-hidden rounded-2xl border border-white/15 bg-roam-navy/85 p-1 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl"
    >
      {/* Dynamic ambient cyan light leak inside terminal */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-roam-cyan/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-roam-cyan/15 blur-3xl" />

      {/* Terminal Header */}
      <div className="flex items-center justify-between rounded-t-xl border-b border-white/10 bg-black/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          {/* Glowing LED Telemetry Dots */}
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500/80 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
            <span className="h-3 w-3 rounded-full bg-roam-cyan shadow-[0_0_8px_rgba(30,193,203,0.8)] animate-pulse" />
          </div>
          <div className="ml-2 flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-200">
            <Terminal className="h-3.5 w-3.5 text-roam-cyan" />
            <span>telemetry://tokyo-live.recovery</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-roam-cyan opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-roam-cyan" />
          </span>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-roam-cyan">
            LIVE ENGINE
          </span>
        </div>
      </div>

      {/* Terminal Telemetry Log Stream */}
      <ol className="space-y-2.5 p-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.12, duration: 0.4 }}
            >
              <div
                className={`flex items-start gap-3 rounded-xl border p-3.5 transition-all duration-300 ${TONE[step.tone]}`}
              >
                <div className="relative mt-0.5 flex shrink-0 items-center justify-center">
                  <Icon className="h-4 w-4 text-roam-cyan" aria-hidden="true" />
                  <span className={`absolute -bottom-1 -right-1 h-2 w-2 rounded-full ${step.dotColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      {step.time}
                    </p>
                    <span className="font-mono text-[10px] text-roam-cyan/70">SYS_OK</span>
                  </div>
                  <p className="text-sm font-semibold text-white drop-shadow-xs">{step.title}</p>
                  <p className="truncate text-xs text-slate-300">{step.detail}</p>
                </div>
              </div>
              {index < STEPS.length - 1 ? (
                <div className="flex justify-center py-1" aria-hidden="true">
                  <ArrowDown className="h-3 w-3 text-roam-cyan/50 animate-bounce" />
                </div>
              ) : null}
            </motion.li>
          );
        })}
      </ol>
    </motion.div>
  );
}
