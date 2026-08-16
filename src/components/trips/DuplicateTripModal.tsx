import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Copy, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { duplicateTrip } from "@/lib/trips.functions";

interface DuplicateTripModalProps {
  sourceTripId: string;
  sourceTripName: string;
  sourceStartDate: string;
  sourceEndDate: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DuplicateTripModal({
  sourceTripId,
  sourceTripName,
  sourceStartDate,
  sourceEndDate,
  isOpen,
  onClose,
}: DuplicateTripModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [newName, setNewName] = useState(`Copy of ${sourceTripName}`);
  const [startDate, setStartDate] = useState(sourceStartDate);
  const [endDate, setEndDate] = useState(sourceEndDate);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewName(`Copy of ${sourceTripName}`);
      setStartDate(sourceStartDate);
      setEndDate(sourceEndDate);
      setError(null);
    }
  }, [isOpen, sourceTripName, sourceStartDate, sourceEndDate]);

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      return await duplicateTrip({
        data: {
          sourceTripId,
          newName: newName.trim(),
          startDate,
          endDate,
        },
      });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
      onClose();
      void navigate({ to: "/trips/$tripId", params: { tripId: data.newTripId } });
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to duplicate trip. Please try again.");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Copy className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">Duplicate Trip</h3>
              <p className="text-xs text-muted-foreground">Create an independent copy with fresh itinerary.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={duplicateMutation.isPending}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Copy Notice */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground space-y-1">
          <p className="font-semibold text-primary flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Destination &amp; Preferences Copied
          </p>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            All trip preferences, travel style, interests, and budget will be copied. A fresh itinerary will be automatically generated for the duplicated trip.
          </p>
        </div>

        {/* Form Controls */}
        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="duplicateName" className="text-xs font-semibold">
              New Trip Name
            </Label>
            <Input
              id="duplicateName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Copy of Tokyo Adventure"
              className="text-xs"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dupStart" className="text-xs font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Start Date
              </Label>
              <Input
                id="dupStart"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dupEnd" className="text-xs font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-primary" /> End Date
              </Label>
              <Input
                id="dupEnd"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs"
                required
              />
            </div>
          </div>
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
            disabled={duplicateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="recover"
            size="sm"
            onClick={() => {
              setError(null);
              duplicateMutation.mutate();
            }}
            disabled={duplicateMutation.isPending || !newName.trim()}
            className="gap-2 font-bold shadow-xs"
          >
            {duplicateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating duplicate...</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Create Duplicate</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
