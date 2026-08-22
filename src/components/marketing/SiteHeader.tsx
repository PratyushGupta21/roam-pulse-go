import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV: Array<{ to: string; label: string }> = [
  { to: "/explorer", label: "Explorer" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
  { to: "/about", label: "About" },
];

export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!transparent) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent]);

  const overHero = transparent && !scrolled;
  const isAuthenticated = !loading && !!user;

  return (
    <header className="sticky top-3 z-50 mx-auto max-w-6xl px-4 transition-all duration-300">
      <div
        className={cn(
          "flex h-14 items-center justify-between rounded-full border px-4 transition-all duration-300",
          overHero
            ? "border-white/10 bg-roam-navy/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:border-roam-cyan/30"
            : "border-white/15 bg-roam-navy/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] hover:border-roam-cyan/40",
        )}
      >
        <Link to="/" aria-label="RoamPulse home" className="flex items-center">
          <Logo inverted={true} />
        </Link>

        <nav className="hidden items-center gap-1.5 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-roam-cyan/10 hover:text-roam-cyan",
              )}
              activeProps={{
                className:
                  "bg-roam-cyan/20 text-roam-cyan border border-roam-cyan/40 shadow-[0_0_12px_rgba(30,193,203,0.3)] font-semibold",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          {isAuthenticated ? (
            <>
              <Button
                asChild
                variant="ghost"
                className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button
                asChild
                className="rounded-full bg-roam-cyan px-5 text-roam-navy font-bold shadow-[0_0_15px_rgba(30,193,203,0.4)] hover:bg-roam-cyan/90 hover:shadow-[0_0_25px_rgba(30,193,203,0.7)] transition-all duration-300"
              >
                <Link to="/trips/new">Plan My Trip</Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <Link to="/login">Log in</Link>
              </Button>
              <Button
                asChild
                className="rounded-full bg-roam-cyan px-5 text-roam-navy font-bold shadow-[0_0_15px_rgba(30,193,203,0.4)] hover:bg-roam-cyan/90 hover:shadow-[0_0_25px_rgba(30,193,203,0.7)] transition-all duration-300"
              >
                <Link to="/signup">Plan My Trip</Link>
              </Button>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-white hover:bg-white/10 md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      {open ? (
        <div className="mt-2 rounded-2xl border border-white/10 bg-roam-navy/95 p-4 backdrop-blur-xl shadow-2xl md:hidden animate-in fade-in slide-in-from-top-2">
          <div className="mb-3 flex items-center gap-2.5 border-b border-white/10 pb-3">
            <img
              src="/logo.png"
              alt="RoamPulse Logo"
              className="h-8 w-8 rounded-lg border border-white/10 object-cover shadow-[0_0_12px_rgba(30,193,203,0.25)]"
            />
            <span className="font-display text-sm font-bold text-white">RoamPulse</span>
          </div>
          <nav className="flex flex-col gap-1.5" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2.5 text-base font-medium text-slate-200 transition-colors hover:bg-roam-cyan/10 hover:text-roam-cyan"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 pt-2 border-t border-white/10">
              {isAuthenticated ? (
                <>
                  <Button asChild variant="outline" className="rounded-xl border-white/15 text-white">
                    <Link to="/dashboard" onClick={() => setOpen(false)}>
                      Dashboard
                    </Link>
                  </Button>
                  <Button asChild className="rounded-xl bg-roam-cyan font-bold text-roam-navy">
                    <Link to="/trips/new" onClick={() => setOpen(false)}>
                      Plan My Trip
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" className="rounded-xl border-white/15 text-white">
                    <Link to="/login" onClick={() => setOpen(false)}>
                      Log in
                    </Link>
                  </Button>
                  <Button asChild className="rounded-xl bg-roam-cyan font-bold text-roam-navy">
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
