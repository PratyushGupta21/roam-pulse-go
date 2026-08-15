import { cn } from "@/lib/utils";

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-md",
          inverted ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground",
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 13h4l2.5-5 3 10L14 9l2 4h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span
        className={cn(
          "font-display text-lg font-semibold tracking-tight",
          inverted ? "text-background" : "text-foreground",
        )}
      >
        Roam<span className="text-accent">Pulse</span>
      </span>
    </span>
  );
}
