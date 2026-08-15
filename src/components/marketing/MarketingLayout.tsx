import type { ReactNode } from "react";

import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHeader({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: string }) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">{eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{lede}</p>
      </div>
    </header>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-14 text-base leading-relaxed text-muted-foreground [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
      {children}
    </div>
  );
}
