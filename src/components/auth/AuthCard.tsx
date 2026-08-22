import { Link } from "@tanstack/react-router";
import { Compass, Gauge, PlaneTakeoff, ShieldCheck, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getAuthCallbackUrl } from "@/lib/site-url";
import { pageBackgrounds } from "@/lib/pageBackgrounds";

export function AuthCard({
  title,
  lede,
  children,
  footer,
  variant = "login",
  imageSrc,
  imageAlt,
  imagePosition,
}: {
  title: string;
  lede: string;
  children: ReactNode;
  footer: ReactNode;
  variant?: "login" | "signup";
  imageSrc?: string;
  imageAlt?: string;
  imagePosition?: string;
}) {
  const bgConfig = variant === "signup" ? pageBackgrounds.signup : pageBackgrounds.login;
  const currentImageSrc = imageSrc || bgConfig.imageSrc;
  const currentImageAlt = imageAlt || bgConfig.alt;
  const currentImagePos = imagePosition || bgConfig.position || "center";

  return (
    <div className="min-h-screen bg-travel-atmosphere flex flex-col justify-center">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <div style={{ minHeight: "600px" }} className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-panel lg:grid-cols-12">
          {/* Left Column: Cinematic Travel Image + Scrim */}
          <div className="relative isolate flex flex-col justify-between overflow-hidden p-8 sm:p-10 lg:col-span-5 text-white">
            <img
              src={currentImageSrc}
              alt={currentImageAlt}
              width={1920}
              height={1080}
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 -z-20 h-full w-full object-cover"
              style={{ objectPosition: currentImagePos }}
            />
            <div className="auth-scrim absolute inset-0 -z-10" aria-hidden="true" />

            <div>
              <Link to="/" aria-label="RoamPulse Home">
                <Logo inverted />
              </Link>
              <div className="mt-8">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                  <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                  {variant === "signup" ? "Begin Your Journey" : "Real-Time Trip Resilience"}
                </span>
                <h2 className="mt-4 font-display text-2xl sm:text-3xl font-bold leading-tight">
                  {variant === "signup" ? (
                    <>
                      Plan Once. <br />
                      <span className="text-accent">Travel With Confidence.</span>
                    </>
                  ) : (
                    <>
                      Your Trip Changes. <br />
                      <span className="text-accent">RoamPulse Adapts.</span>
                    </>
                  )}
                </h2>
                <p className="mt-3 text-sm text-white/80 leading-relaxed">
                  {variant === "signup"
                    ? "Join thousands of travellers who never lose hours to delays, cancellations, or bad weather."
                    : "Continuous flight monitoring, weather-aware alternatives, and autonomous recovery in one seamless workspace."}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/15 hidden sm:grid gap-3 text-xs text-white/85">
              <div className="flex items-center gap-2">
                <PlaneTakeoff className="h-4 w-4 text-accent shrink-0" />
                <span>Live delay & gate tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-accent shrink-0" />
                <span>Real-time itinerary recalculation</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
                <span>Zero unauthorised purchases</span>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Form Surface */}
          <div className="flex flex-col justify-between p-6 sm:p-10 lg:col-span-7 bg-card">
            <div>
              <div className="mb-6 flex justify-center lg:hidden">
                <img
                  src="/logo.png"
                  alt="RoamPulse Logo"
                  className="h-12 w-12 rounded-2xl border border-white/10 object-cover shadow-[0_0_20px_rgba(30,193,203,0.35)]"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                    {title}
                  </h1>
                  <p className="mt-1.5 text-sm text-muted-foreground">{lede}</p>
                </div>
                <Link to="/" className="text-xs font-medium text-primary hover:underline lg:hidden">
                  Home
                </Link>
              </div>

              <div className="mt-6 space-y-4">{children}</div>
            </div>

            <div className="mt-8 pt-6 border-t border-border/80 text-center text-xs text-muted-foreground">
              {footer}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GoogleButton() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setBusy(true);
    setError(null);
    try {
      const callbackUrl = getAuthCallbackUrl();
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
        },
      });
      if (oauthErr) {
        setBusy(false);
        setError(oauthErr.message || "Google sign-in failed. Please try again.");
      }
    } catch {
      setBusy(false);
      setError("An unexpected error occurred during Google sign-in.");
    }
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full font-medium"
        onClick={signInWithGoogle}
        disabled={busy}
      >
        Continue with Google
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
