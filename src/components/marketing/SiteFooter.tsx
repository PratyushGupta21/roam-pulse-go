import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/brand/Logo";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/10 bg-roam-navy text-slate-300">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-roam-cyan/40 to-transparent" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-xs text-sm text-slate-400 leading-relaxed">
            Real-time adaptive travel planning. RoamPulse watches your trip and rebuilds it when the
            world changes.
          </p>
        </div>
        <nav aria-label="Product">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-roam-cyan">Product</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link to="/how-it-works" className="text-slate-300 hover:text-roam-cyan transition-colors">
                How it works
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="text-slate-300 hover:text-roam-cyan transition-colors">
                Pricing
              </Link>
            </li>
            <li>
              <Link to="/faq" className="text-slate-300 hover:text-roam-cyan transition-colors">
                FAQ
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Company">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-roam-cyan">Company</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link to="/about" className="text-slate-300 hover:text-roam-cyan transition-colors">
                About
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="text-slate-300 hover:text-roam-cyan transition-colors">
                Privacy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="text-slate-300 hover:text-roam-cyan transition-colors">
                Terms
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-roam-cyan">Disclosure</h2>
          <p className="mt-4 text-sm text-slate-400 leading-relaxed">
            Booking links may be affiliate links. RoamPulse never charges booking fees and never
            spends money without your explicit authorisation.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 bg-black/30">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-400">
          © {new Date().getFullYear()} RoamPulse. Prices and availability shown in demo mode are
          examples, not live provider quotes.
        </p>
      </div>
    </footer>
  );
}
