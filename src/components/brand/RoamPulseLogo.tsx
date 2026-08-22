import React from "react";

import { cn } from "@/lib/utils";

interface RoamPulseLogoProps {
  variant?: "full" | "icon" | "wordmark" | undefined;
  size?: "sm" | "md" | "lg" | "xl" | number | undefined;
  inverted?: boolean | undefined;
  showSlogan?: boolean | undefined;
  className?: string | undefined;
}

export function RoamPulseLogo({
  variant = "full",
  size = "md",
  inverted = false,
  showSlogan = false,
  className,
}: RoamPulseLogoProps) {
  let iconPx = 32;
  let textClass = "text-xl";
  let sloganClass = "text-[9px]";

  if (typeof size === "number") {
    iconPx = size;
  } else {
    switch (size) {
      case "sm":
        iconPx = 24;
        textClass = "text-base";
        sloganClass = "text-[7px]";
        break;
      case "md":
        iconPx = 32;
        textClass = "text-xl";
        sloganClass = "text-[9px]";
        break;
      case "lg":
        iconPx = 44;
        textClass = "text-2xl";
        sloganClass = "text-[10px]";
        break;
      case "xl":
        iconPx = 56;
        textClass = "text-3xl";
        sloganClass = "text-[11px]";
        break;
    }
  }

  const iconElement = (
    <img
      src="/logo.png"
      alt="RoamPulse Logo"
      style={{ width: `${iconPx}px`, height: `${iconPx}px` }}
      className="shrink-0 rounded-xl border border-white/10 object-cover shadow-[0_0_15px_rgba(30,193,203,0.25)]"
    />
  );

  const wordmarkElement = (
    <div className="flex flex-col justify-center leading-none">
      <span
        className={cn(
          "flex items-center gap-1.5 font-display font-extrabold tracking-tight",
          textClass,
          inverted ? "text-white" : "text-white",
        )}
      >
        <span>Roam</span>
        <span className="bg-clip-text bg-linear-to-r from-cyan-300 via-roam-cyan to-teal-400 text-transparent drop-shadow-[0_0_12px_rgba(30,193,203,0.4)]">
          Pulse
        </span>
        <span className="relative flex h-2 w-2 ml-0.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-roam-cyan opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-roam-cyan"></span>
        </span>
      </span>

      {showSlogan ? (
        <span
          className={cn(
            "mt-0.5 font-semibold uppercase tracking-[0.2em] opacity-80",
            sloganClass,
            inverted ? "text-slate-300" : "text-slate-400",
          )}
        >
          Plan • Travel • Stay Ahead
        </span>
      ) : null}
    </div>
  );

  if (variant === "icon") return iconElement;
  if (variant === "wordmark") return wordmarkElement;

  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      {iconElement}
      {wordmarkElement}
    </span>
  );
}
