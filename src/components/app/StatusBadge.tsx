import { AlertTriangle, CalendarCheck, CheckCircle2, CircleDashed, RefreshCcw, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const MAP = {
  confirmed: { label: "Confirmed", icon: CalendarCheck, className: "border-primary/30 bg-primary/10 text-primary" },
  flexible: { label: "Flexible", icon: CircleDashed, className: "border-border bg-muted text-muted-foreground" },
  at_risk: { label: "At risk", icon: AlertTriangle, className: "border-accent/40 bg-accent/15 text-accent-foreground" },
  disrupted: { label: "Disrupted", icon: ShieldAlert, className: "border-destructive/30 bg-destructive/10 text-destructive" },
  replaced: { label: "Replaced", icon: RefreshCcw, className: "border-border bg-muted text-muted-foreground line-through" },
  completed: { label: "Completed", icon: CheckCircle2, className: "border-success/30 bg-success/10 text-success" },
} as const;

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const entry = MAP[status as keyof typeof MAP] ?? MAP.flexible;
  const Icon = entry.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        entry.className,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {entry.label}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground",
        className,
      )}
    >
      Demo data
    </span>
  );
}
