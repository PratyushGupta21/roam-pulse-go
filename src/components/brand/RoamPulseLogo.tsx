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
    <svg
      viewBox="0 0 512 512"
      style={{ width: `${iconPx}px`, height: `${iconPx}px` }}
      className="shrink-0 drop-shadow-sm"
      aria-label="RoamPulse icon"
    >
      <defs>
        <linearGradient id="rpBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0b2436" />
          <stop offset="100%" stopColor="#04121c" />
        </linearGradient>
        <linearGradient id="rpPinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="rpPulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>

      <rect width="512" height="512" rx="112" fill="url(#rpBgGrad)" />

      <path
        d="M 90 320 C 60 210, 160 110, 320 120 C 400 125, 440 170, 420 220 C 390 280, 240 340, 120 330"
        fill="none"
        stroke="#ffffff"
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.85"
      />

      <path
        d="M 256 90 C 180 90, 130 148, 130 225 C 130 310, 240 410, 256 425 C 272 410, 382 310, 382 225 C 382 148, 332 90, 256 90 Z"
        fill="none"
        stroke="url(#rpPinGrad)"
        strokeWidth="28"
        strokeLinejoin="round"
      />

      <path d="M 165 260 L 215 195 L 255 240 L 305 175 L 347 260 Z" fill="#0369a1" opacity="0.9" />
      <path d="M 215 195 L 230 215 L 200 230 Z" fill="#e0f2fe" opacity="0.9" />
      <path d="M 305 175 L 320 198 L 292 212 Z" fill="#e0f2fe" opacity="0.9" />

      <path
        d="M 100 315 L 200 315 L 220 275 L 245 355 L 275 255 L 300 335 L 320 315 L 412 315"
        fill="none"
        stroke="url(#rpPulseGrad)"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <g transform="translate(380, 130) rotate(35) scale(1.4)">
        <path
          d="M 0 -20 L 6 10 L 22 18 L 6 15 L 4 28 L 10 33 L 0 30 L -10 33 L -4 28 L -6 15 L -22 18 L -6 10 Z"
          fill="#ffffff"
        />
      </g>
    </svg>
  );

  const wordmarkElement = (
    <div className="flex flex-col justify-center leading-none">
      <span
        className={cn(
          "font-display font-extrabold tracking-tight",
          textClass,
          inverted ? "text-white" : "text-slate-900 dark:text-white",
        )}
      >
        Roam
        <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 bg-clip-text text-transparent">
          Pulse
        </span>
      </span>

      {showSlogan ? (
        <span
          className={cn(
            "font-semibold tracking-[0.2em] uppercase mt-0.5 opacity-80",
            sloganClass,
            inverted ? "text-slate-300" : "text-slate-500 dark:text-slate-400",
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
