import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let authSub: { unsubscribe: () => void } | null = null;
    let timer: NodeJS.Timeout | null = null;

    async function handleAuthCallback() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const next = params.get("next") || "/dashboard";

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("OAuth code exchange error:", exchangeError);
            if (mounted) setError(exchangeError.message);
            return;
          }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session retrieval error:", sessionError);
          if (mounted) setError(sessionError.message);
          return;
        }

        if (session) {
          if (mounted) {
            void navigate({ to: next.startsWith("/") ? next : "/dashboard", replace: true });
          }
          return;
        }

        const { data: sub } = supabase.auth.onAuthStateChange((_event, currentSession) => {
          if (currentSession && mounted) {
            void navigate({ to: next.startsWith("/") ? next : "/dashboard", replace: true });
          }
        });
        authSub = sub.subscription;

        timer = setTimeout(() => {
          if (mounted) {
            setError("Authentication session timed out. Please try logging in again.");
          }
        }, 5000);
      } catch (err) {
        console.error("Unexpected OAuth callback error:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Authentication callback failed.");
        }
      }
    }

    void handleAuthCallback();

    return () => {
      mounted = false;
      if (authSub) authSub.unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-app-atmosphere p-4 text-foreground">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <div className="flex justify-center">
          <Logo />
        </div>

        {error ? (
          <div className="space-y-4 py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-foreground">Google Sign-in Failed</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
            </div>
            <Button
              onClick={() => void navigate({ to: "/login", replace: true })}
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Return to Login
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6 animate-spin text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-foreground">Completing Sign-in…</h3>
              <p className="text-xs text-muted-foreground">
                Establishing secure authentication session with Supabase.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
