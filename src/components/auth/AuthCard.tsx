import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";

export function AuthCard({
  title,
  lede,
  children,
  footer,
}: {
  title: string;
  lede: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid-paper flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link to="/" className="mb-8">
        <Logo />
      </Link>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-card-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{lede}</p>
        <div className="mt-6 space-y-4">{children}</div>
      </div>
      <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
    </div>
  );
}

export function GoogleButton() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setBusy(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      setError("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    window.location.href = "/dashboard";
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle} disabled={busy}>
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
