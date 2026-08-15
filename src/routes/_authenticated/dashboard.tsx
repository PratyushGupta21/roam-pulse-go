import { createFileRoute, Link } from "@tanstack/react-router";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — RoamPulse" },
      { name: "description", content: "Your monitored trips, disruptions and recovery activity." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/">
            <Logo />
          </Link>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-display text-3xl font-semibold">Your trips</h1>
        <p className="mt-2 text-muted-foreground">
          Signed in as {user?.email}. Trip creation and live monitoring views are coming next.
        </p>
      </main>
    </div>
  );
}
