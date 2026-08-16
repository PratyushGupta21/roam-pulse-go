import { Loader2, Plane } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { configureTripFlight } from "@/lib/flights/flight.functions";
import type { Flight } from "@/lib/queries";

interface ConfigureFlightModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  defaultDate?: string;
  existingFlight?: Flight | null;
  onSuccess: () => void;
}

export function ConfigureFlightModal({
  open,
  onOpenChange,
  tripId,
  defaultDate = "",
  existingFlight,
  onSuccess,
}: ConfigureFlightModalProps) {
  const [flightNumber, setFlightNumber] = useState("");
  const [flightDate, setFlightDate] = useState("");
  const [departureAirport, setDepartureAirport] = useState("");
  const [arrivalAirport, setArrivalAirport] = useState("");
  const [airline, setAirline] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingFlight) {
        setFlightNumber(existingFlight.flight_number || "");
        const dateStr = existingFlight.scheduled_departure
          ? existingFlight.scheduled_departure.slice(0, 10)
          : defaultDate;
        setFlightDate(dateStr);
        setDepartureAirport(existingFlight.departure_airport || "");
        setArrivalAirport(existingFlight.arrival_airport || "");
        setAirline(existingFlight.airline || "");
      } else {
        setFlightNumber("");
        setFlightDate(defaultDate || new Date().toISOString().slice(0, 10));
        setDepartureAirport("");
        setArrivalAirport("");
        setAirline("");
      }
      setError(null);
    }
  }, [open, existingFlight, defaultDate]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fnClean = flightNumber.trim().toUpperCase();
    const depClean = departureAirport.trim().toUpperCase();
    const arrClean = arrivalAirport.trim().toUpperCase();

    if (!fnClean) {
      setError("Flight number is required (e.g. AI302).");
      return;
    }

    if (!flightDate) {
      setError("Flight date is required.");
      return;
    }

    if (depClean.length !== 3) {
      setError("Departure airport must be a valid 3-letter IATA code (e.g. DEL).");
      return;
    }

    if (arrClean.length !== 3) {
      setError("Arrival airport must be a valid 3-letter IATA code (e.g. JAI).");
      return;
    }

    if (depClean === arrClean) {
      setError("Departure and arrival airports cannot be identical.");
      return;
    }

    try {
      setLoading(true);
      await configureTripFlight({
        data: {
          tripId,
          flightNumber: fnClean,
          flightDate,
          departureAirport: depClean,
          arrivalAirport: arrClean,
          airline: airline.trim() || undefined,
        },
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to configure flight.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Plane className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">
              {existingFlight ? "Edit Flight Configuration" : "Configure Flight"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Connect Aviationstack flight tracking to Sentinel
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium">
              {error}
            </div>
          ) : null}

          {/* Flight Number */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">
              Flight Number <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. AI302, 6E123, UK955"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono uppercase text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Flight Date */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">
              Flight Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={flightDate}
              onChange={(e) => setFlightDate(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Departure & Arrival Airports */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Departure (IATA) <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                maxLength={3}
                placeholder="e.g. DEL"
                value={departureAirport}
                onChange={(e) => setDepartureAirport(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono uppercase text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Arrival (IATA) <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                maxLength={3}
                placeholder="e.g. JAI"
                value={arrivalAirport}
                onChange={(e) => setArrivalAirport(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono uppercase text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* Airline (Optional) */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">
              Airline <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Air India, IndiGo"
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Actions */}
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
            <Button type="submit" size="sm" disabled={loading} className="gap-2 font-bold">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save Flight</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
