import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function MarketingLayout({
  children,
  transparentHeader = true,
}: {
  children: ReactNode;
  transparentHeader?: boolean | undefined;
}) {
  return (
    <div className="min-h-screen bg-travel-atmosphere text-foreground">
      <SiteHeader transparent={transparentHeader} />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}

export interface PageHeroProps {
  eyebrow?: string | undefined;
  title: string;
  titleAccent?: string | undefined;
  lede: string;
  imageSrc?: string | undefined;
  imageAlt?: string | undefined;
  imagePosition?: string | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  badge?: ReactNode | undefined;
}

export function PageHero({
  eyebrow,
  title,
  titleAccent,
  lede,
  imageSrc,
  imageAlt = "RoamPulse scenic travel view",
  imagePosition = "center",
  children,
  className,
  badge,
}: PageHeroProps) {
  return (
    <section className={cn("relative isolate -mt-16 overflow-hidden border-b border-border", className)}>
      {imageSrc ? (
        <>
          <img
            src={imageSrc}
            alt={imageAlt}
            width={1920}
            height={1080}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
            style={{ objectPosition: imagePosition }}
          />
          <div className="hero-scrim-subtle absolute inset-0 -z-10 hidden md:block" aria-hidden="true" />
          <div className="hero-scrim-mobile absolute inset-0 -z-10 md:hidden" aria-hidden="true" />
        </>
      ) : (
        <div className="hero-scrim-subtle absolute inset-0 -z-10" aria-hidden="true" />
      )}

      <div className="mx-auto max-w-5xl px-4 pb-14 pt-28 sm:pb-18 sm:pt-36 text-center">
        {badge ? (
          <div className="mb-4 flex justify-center">{badge}</div>
        ) : eyebrow ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-xs font-medium uppercase tracking-widest text-white backdrop-blur">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            {eyebrow}
          </span>
        ) : null}

        <h1 className="mt-4 font-display text-3xl font-semibold leading-tight text-white drop-shadow-sm sm:text-4xl lg:text-5xl">
          {title} {titleAccent ? <span className="text-accent">{titleAccent}</span> : null}
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
          {lede}
        </p>

        {children ? <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div> : null}
      </div>
    </section>
  );
}

export function PageHeader({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: string }) {
  return (
    <PageHero
      eyebrow={eyebrow}
      title={title}
      lede={lede}
    />
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-sm space-y-6 text-base leading-relaxed text-muted-foreground [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
        {children}
      </div>
    </div>
  );
}
