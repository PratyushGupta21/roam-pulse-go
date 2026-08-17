import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { removeTripFlight } from "@/lib/flights/flight.functions";
import type { Flight } from "@/lib/queries";

interface DeleteFlightModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  flight: Flight | null;
  onSuccess: () => void;
}

export function DeleteFlightModal({
  open,
  onOpenChange,
  tripId,
  flight,
  onSuccess,
}: DeleteFlightModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !flight) return null;

  const handleRemove = async () => {
    setError(null);
    try {
      setLoading(true);
      await removeTripFlight({
        data: {
          tripId,
          flightId: flight.id,
        },
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove flight.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 text-destructive">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Remove Flight?</h3>
            <p className="text-xs text-muted-foreground">Flight Sentinel tracking will stop</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Are you sure you want to remove flight{" "}
          <strong className="text-foreground">{flight.flight_number}</strong> from this trip? This
          will unbind flight status monitoring. Your trip itinerary will remain intact.
        </p>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive font-medium">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRemove}
            disabled={loading}
            className="gap-2 font-bold"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Removing…</span>
              </>
            ) : (
              <span>Remove Flight</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
