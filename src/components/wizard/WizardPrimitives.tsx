import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StepProgress({
  current,
  steps,
  onJump,
}: {
  current: number;
  steps: readonly string[];
  onJump?: (index: number) => void;
}) {
  const pct = ((current + 1) / steps.length) * 100;
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Step {current + 1} of {steps.length}
        </p>
        <p className="text-xs text-muted-foreground">{steps[current]}</p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="hidden flex-wrap gap-1.5 sm:flex">
        {steps.map((label, index) => {
          const done = index < current;
          const active = index === current;
          const clickable = Boolean(onJump) && index <= current;
          return (
            <li key={label}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onJump?.(index)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active && "border-primary bg-primary/10 text-primary",
                  done && "border-border bg-background text-muted-foreground hover:border-primary/50",
                  !active && !done && "border-dashed border-border/70 text-muted-foreground/70",
                  clickable ? "cursor-pointer" : "cursor-default",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : <span className="text-[10px]">{index + 1}</span>}
                {label}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function StepShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rise-in space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wide text-foreground">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary";

export function OptionCard({
  selected,
  onClick,
  title,
  hint,
  emoji,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  hint?: string;
  emoji?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "group relative flex w-full cursor-pointer flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all duration-200",
        selected
          ? "border-primary bg-primary/10 shadow-xs"
          : "border-border bg-background hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs",
        className,
      )}
    >
      {selected ? (
        <span className="absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </span>
      ) : null}
      {emoji ? <span className="text-lg leading-none">{emoji}</span> : null}
      <span className={cn("text-sm font-semibold", selected ? "text-primary" : "text-foreground")}>{title}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </button>
  );
}

export function Chip({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary/40",
      )}
    >
      {label}
    </button>
  );
}

export function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 py-2 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="max-w-[65%] text-right text-sm text-foreground">{value}</span>
    </div>
  );
}
