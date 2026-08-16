import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { deleteTrip } from "@/lib/trips.functions";

interface DeleteTripModalProps {
  tripId: string;
  tripName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccessRedirect?: () => void;
}

export function DeleteTripModal({
  tripId,
  tripName,
  isOpen,
  onClose,
  onSuccessRedirect,
}: DeleteTripModalProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await deleteTrip({ data: { tripId } });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
      void queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["itinerary", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      onClose();
      if (onSuccessRedirect) {
        onSuccessRedirect();
      }
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to delete trip. Please try again.");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">Delete Trip?</h3>
              <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warning Details */}
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-foreground space-y-2">
          <p className="font-semibold text-destructive">
            Are you sure you want to delete <span className="underline font-bold">"{tripName}"</span>?
          </p>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            This will permanently remove:
          </p>
          <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-1 font-medium">
            <li>Trip configuration &amp; preferences</li>
            <li>All itinerary items</li>
            <li>Flight tracking details</li>
            <li>Disruption events &amp; recovery history</li>
            <li>Associated notifications</li>
          </ul>
        </div>

        {/* Error message */}
        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              setError(null);
              deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
            className="gap-2 font-bold"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Deleting trip…</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Delete Trip</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
