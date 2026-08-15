import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TravelBackgroundProps {
  children?: ReactNode;
  variant?: "hero" | "marketing" | "app" | "auth" | "subtle";
  className?: string;
  imageSrc?: string;
  imageAlt?: string;
  imagePosition?: string;
  priority?: boolean;
}

/**
 * RoamPulse centralized background system.
 * Level 1: hero (cinematic image + deep teal/slate scrim)
 * Level 2: marketing (subtle multi-point radial travel atmosphere)
 * Level 3: app (application mesh gradient + faint contour grid)
 * Level 4: auth (split-screen travel backdrop)
 */
export function TravelBackground({
  children,
  variant = "marketing",
  className,
  imageSrc,
  imageAlt = "RoamPulse scenic travel backdrop",
  imagePosition = "center",
  priority = false,
}: TravelBackgroundProps) {
  if (variant === "hero" || variant === "auth") {
    return (
      <div className={cn("relative isolate overflow-hidden", className)}>
        {imageSrc ? (
          <>
            <img
              src={imageSrc}
              alt={imageAlt}
              width={1920}
              height={1080}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
              className={cn(
                "absolute inset-0 -z-20 h-full w-full object-cover",
                imagePosition ? `object-[${imagePosition}]` : "object-center",
              )}
              style={{ objectPosition: imagePosition }}
            />
            <div
              className={cn(
                "absolute inset-0 -z-10",
                variant === "auth" ? "auth-scrim" : "hero-scrim-subtle",
              )}
              aria-hidden="true"
            />
          </>
        ) : (
          <div className="absolute inset-0 -z-10 surface-ink" aria-hidden="true" />
        )}
        {children}
      </div>
    );
  }

  if (variant === "app") {
    return <div className={cn("min-h-screen bg-app-atmosphere text-foreground", className)}>{children}</div>;
  }

  if (variant === "subtle") {
    return <div className={cn("bg-travel-subtle text-foreground", className)}>{children}</div>;
  }

  // Level 2 marketing background
  return <div className={cn("min-h-screen bg-travel-atmosphere text-foreground", className)}>{children}</div>;
}
