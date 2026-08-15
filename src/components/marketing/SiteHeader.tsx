import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!transparent) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent]);

  // Over the hero image the header floats with light-on-dark chrome; elsewhere
  // (and once scrolled past the hero) it uses the standard surface.
  const overHero = transparent && !scrolled;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors",
        overHero
          ? "border-white/15 bg-slate-ink/25 backdrop-blur-sm"
          : "border-border bg-background/90 backdrop-blur",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" aria-label="RoamPulse home" className={cn(overHero && "text-white")}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                overHero
                  ? "text-white/80 hover:bg-white/10 hover:text-white"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
              activeProps={{
                className: overHero ? "bg-white/15 text-white" : "bg-secondary text-foreground",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>


        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button asChild>
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className={cn(overHero && "text-white hover:bg-white/15 hover:text-white")}
              >
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link to="/signup">Plan My Trip</Link>
              </Button>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={cn("md:hidden", overHero && "text-white hover:bg-white/15 hover:text-white")}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      {open ? (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-base font-medium text-foreground hover:bg-secondary"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              {user ? (
                <Button asChild>
                  <Link to="/dashboard" onClick={() => setOpen(false)}>
                    Open dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline">
                    <Link to="/login" onClick={() => setOpen(false)}>
                      Log in
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link to="/signup" onClick={() => setOpen(false)}>
                      Plan My Trip
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
