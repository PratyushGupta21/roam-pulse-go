import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/brand/Logo";

export function SiteFooter() {
  return (
    <footer className="surface-ink mt-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo inverted />
          <p className="mt-3 max-w-xs text-sm opacity-80">
            Real-time adaptive travel planning. RoamPulse watches your trip and rebuilds it when the world changes.
          </p>
        </div>
        <nav aria-label="Product">
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">Product</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/how-it-works" className="opacity-80 hover:opacity-100">
                How it works
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="opacity-80 hover:opacity-100">
                Pricing
              </Link>
            </li>
            <li>
              <Link to="/faq" className="opacity-80 hover:opacity-100">
                FAQ
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Company">
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">Company</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/about" className="opacity-80 hover:opacity-100">
                About
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="opacity-80 hover:opacity-100">
                Privacy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="opacity-80 hover:opacity-100">
                Terms
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">Disclosure</h2>
          <p className="mt-3 text-sm opacity-80">
            Booking links may be affiliate links. RoamPulse never charges booking fees and never spends money without
            your explicit authorisation.
          </p>
        </div>
      </div>
      <div className="border-t border-sidebar-border">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs opacity-70">
          © {new Date().getFullYear()} RoamPulse. Prices and availability shown in demo mode are examples, not live
          provider quotes.
        </p>
      </div>
    </footer>
  );
}
