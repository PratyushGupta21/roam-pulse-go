import { ArrowDown, CheckCircle2, PlaneTakeoff, Sparkles, Umbrella, UtensilsCrossed } from "lucide-react";

const STEPS = [
  { time: "10:30 AM", icon: PlaneTakeoff, title: "Flight delayed", detail: "AI-247 · Delhi → Tokyo · +2h 45m", tone: "alert" },
  { time: "10:30 AM", icon: Sparkles, title: "RoamPulse detected a conflict", detail: "3 activities re-evaluated in 1.2s", tone: "info" },
  { time: "10:31 AM", icon: Umbrella, title: "Outdoor walking tour removed", detail: "No longer fits your arrival window", tone: "muted" },
  { time: "10:31 AM", icon: UtensilsCrossed, title: "Indoor food experience added", detail: "6:00 PM · 1.2 km away · ₹1,200", tone: "info" },
  { time: "10:32 AM", icon: CheckCircle2, title: "New itinerary ready", detail: "Timeline, route and budget updated", tone: "ok" },
] as const;

const TONE: Record<string, string> = {
  alert: "border-accent/50 bg-accent/10",
  info: "border-border bg-card",
  muted: "border-border bg-muted",
  ok: "border-success/40 bg-success/10",
};

export function HeroTimeline() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="live-dot inline-block h-2 w-2 rounded-full bg-success" aria-hidden="true" />
          <span className="text-sm font-semibold">Tokyo Adventure · Live recovery log</span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">Monitoring</span>
      </div>
      <ol className="space-y-2 p-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="rise-in" style={{ animationDelay: `${index * 90}ms` }}>
              <div className={`flex items-start gap-3 rounded-lg border p-3 ${TONE[step.tone]}`}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{step.time}</p>
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{step.detail}</p>
                </div>
              </div>
              {index < STEPS.length - 1 ? (
                <div className="flex justify-center py-1" aria-hidden="true">
                  <ArrowDown className="h-3 w-3 text-muted-foreground" />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
