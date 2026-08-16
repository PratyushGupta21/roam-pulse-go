import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { buildRecovery, type EngineItem } from "@/lib/recovery.server";
import { fetchAviationstackFlightStatus } from "./aviationstack.server";

export type FlightStatusClassification = "normal" | "minor_delay" | "disruption" | "major_disruption" | "cancelled" | "unavailable";

function getDelayBucket(delayMinutes: number): FlightStatusClassification {
  if (delayMinutes >= 120) return "major_disruption";
  if (delayMinutes >= 60) return "disruption";
  if (delayMinutes >= 30) return "minor_delay";
  return "normal";
}

function isMeaningfulChange(previousStatus: string | null, previousDelay: number, nextStatus: string | null, delayMinutes: number) {
  const prevDelay = Number(previousDelay ?? 0);
  const nextDelay = Number(delayMinutes ?? 0);

  if (nextStatus === "cancelled" && previousStatus !== "cancelled") return true;
  if (previousStatus === "cancelled" && nextStatus !== "cancelled") return true;

  if (nextDelay >= 60 && prevDelay < 60) return true;
  if (nextDelay >= 60 && nextDelay !== prevDelay) return true;

  if (nextStatus !== previousStatus && nextStatus !== "scheduled") return true;
  return false;
}

function toIsoTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(11, 16);
}

export const checkTripFlightStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        tripId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, name, destination, currency, interests, recovery_mode, automation_settings, user_id")
      .eq("id", data.tripId)
      .eq("user_id", userId)
      .maybeSingle();

    if (tripError || !trip) {
      throw new Error("Trip not found or access denied.");
    }

    const { data: flights, error: flightsError } = await supabase
      .from("flights")
      .select("*")
      .eq("trip_id", data.tripId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (flightsError) {
      throw new Error("We couldn't load your flight details.");
    }

    if (!flights || flights.length === 0) {
      return {
        tripId: data.tripId,
        flight: null,
        status: "unavailable",
        message: "No flight configured for this trip.",
        disruptionCreated: false,
        recommendationId: null,
        affectedCount: 0,
        checkedAt: new Date().toISOString(),
      };
    }

    const flight = flights[0]!;
    const rawFlightNumber = String(flight.flight_number ?? "").trim();
    const flightDate = flight.scheduled_departure
      ? new Date(flight.scheduled_departure).toISOString().slice(0, 10)
      : flight.scheduled_arrival
      ? new Date(flight.scheduled_arrival).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const flightStatusResult = await fetchAviationstackFlightStatus({
      flightNumber: rawFlightNumber,
      flightDate,
      departureAirport: flight.departure_airport || null,
      arrivalAirport: flight.arrival_airport || null,
    });

    if (!flightStatusResult.success || !flightStatusResult.data) {
      return {
        tripId: data.tripId,
        flight,
        status: "unavailable",
        message: flightStatusResult.error || "Flight status temporarily unavailable.",
        disruptionCreated: false,
        recommendationId: null,
        affectedCount: 0,
        checkedAt: new Date().toISOString(),
      };
    }

    const snapshot = flightStatusResult.data;
    const previousStatus = String(flight.status ?? "scheduled");
    const previousDelay = Number(flight.delay_minutes ?? 0);
    const estimatedDelay = Math.max(snapshot.departureDelayMinutes, snapshot.arrivalDelayMinutes, 0);
    const nextStatus = snapshot.status === "cancelled" ? "cancelled" : estimatedDelay >= 60 ? "delayed" : snapshot.status || "scheduled";
    const nextDelay = nextStatus === "cancelled" ? Math.max(estimatedDelay, 120) : estimatedDelay;
    const delayBucket = getDelayBucket(nextDelay);

    const meaningfulChange = isMeaningfulChange(previousStatus, previousDelay, nextStatus, nextDelay);

    const flightUpdate = {
      provider: "aviationstack",
      airline: snapshot.airlineName || flight.airline || "",
      flight_number: snapshot.flightNumber || flight.flight_number || "",
      departure_airport: snapshot.departureIata || flight.departure_airport || "",
      arrival_airport: snapshot.arrivalIata || flight.arrival_airport || "",
      scheduled_departure: snapshot.scheduledDeparture || flight.scheduled_departure,
      scheduled_arrival: snapshot.scheduledArrival || flight.scheduled_arrival,
      estimated_departure: snapshot.estimatedDeparture || flight.estimated_departure,
      estimated_arrival: snapshot.estimatedArrival || flight.estimated_arrival,
      actual_arrival: snapshot.actualArrival || flight.actual_arrival,
      status: nextStatus,
      delay_minutes: nextDelay,
      last_updated: snapshot.lastUpdated || new Date().toISOString(),
    };

    await supabase.from("flights").update(flightUpdate).eq("id", flight.id);

    if (!meaningfulChange) {
      const message =
        nextStatus === "cancelled"
          ? `Flight ${snapshot.flightNumber} has been cancelled.`
          : nextDelay >= 30
          ? `Flight ${snapshot.flightNumber} is delayed by ${nextDelay} minutes.`
          : `Flight ${snapshot.flightNumber} is currently on schedule.`;

      return {
        tripId: data.tripId,
        flight: { ...flight, ...flightUpdate },
        status: nextStatus === "cancelled" ? "cancelled" : nextDelay >= 60 ? "delayed" : "normal",
        message,
        disruptionCreated: false,
        recommendationId: null,
        affectedCount: 0,
        checkedAt: new Date().toISOString(),
      };
    }

    let recommendationId: string | null = null;
    let affectedCount = 0;

    const { data: items } = await supabase
      .from("itinerary_items")
      .select(
        "id, title, day_date, start_time, end_time, category, estimated_cost, indoor_outdoor, is_locked, status, latitude, longitude, location",
      )
      .eq("trip_id", data.tripId)
      .neq("status", "replaced")
      .order("day_date")
      .order("start_time");

    const itemsForEngine: EngineItem[] = (items ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      day_date: item.day_date,
      start_time: item.start_time,
      end_time: item.end_time,
      category: item.category,
      estimated_cost: Number(item.estimated_cost ?? 0),
      indoor_outdoor: item.indoor_outdoor || "outdoor",
      is_locked: Boolean(item.is_locked),
      status: item.status || "confirmed",
      latitude: item.latitude,
      longitude: item.longitude,
    }));

    const scheduleAnchor = snapshot.scheduledArrival || snapshot.estimatedArrival || flight.scheduled_arrival || flight.estimated_arrival;
    const fromTime = toIsoTime(scheduleAnchor) || "14:00";
    const settings = (trip.automation_settings ?? {}) as { maxExtraSpend?: number };
    const tripInterests = Array.isArray(trip.interests) ? (trip.interests as string[]) : [];
    const { affected, payload } = buildRecovery(itemsForEngine, {
      type: "flight_delay",
      minutesLost: nextDelay,
      fromTime,
      interests: tripInterests,
      currency: (trip.currency as string) || "INR",
      maxExtraSpend: Number(settings.maxExtraSpend ?? 2000),
      recoveryMode: ((trip.recovery_mode as "manual" | "assisted" | "autonomous") || "assisted") as "manual" | "assisted" | "autonomous",
      anchorLat: itemsForEngine.find((item) => item.latitude !== null)?.latitude ?? null,
      anchorLon: itemsForEngine.find((item) => item.longitude !== null)?.longitude ?? null,
    });

    if (affected.length > 0) {
      await supabase.from("itinerary_items").update({ status: "at_risk" }).in(
        "id",
        affected.map((item) => item.id),
      );
      affectedCount = affected.length;
    }

    const eventTitle =
      nextStatus === "cancelled"
        ? `Flight ${snapshot.flightNumber} cancelled` 
        : `Flight ${snapshot.flightNumber} delayed by ${nextDelay} minutes`;
    const eventDescription =
      nextStatus === "cancelled"
        ? `Aviationstack reported a cancellation for ${snapshot.airlineName} ${snapshot.flightNumber}.`
        : `Aviationstack detected a ${nextDelay}-minute delay for ${snapshot.airlineName} ${snapshot.flightNumber}.`;

    const { data: disruption } = await supabase
      .from("disruption_events")
      .insert({
        trip_id: data.tripId,
        type: nextStatus === "cancelled" ? "flight_cancelled" : "flight_delay",
        severity: nextStatus === "cancelled" ? "critical" : delayBucket === "major_disruption" ? "high" : "medium",
        title: eventTitle,
        description: eventDescription,
        affected_item_ids: affected.map((item) => item.id),
        metadata: {
          flightNumber: snapshot.flightNumber,
          airline: snapshot.airlineName,
          delayMinutes: nextDelay,
          previousDelayMinutes: previousDelay,
          status: nextStatus,
          estimatedArrival: snapshot.estimatedArrival,
          scheduledArrival: snapshot.scheduledArrival,
        } as unknown as Json,
      })
      .select("id")
      .single();

    if (payload && disruption) {
      const { data: rec } = await supabase
        .from("recovery_recommendations")
        .insert({
          trip_id: data.tripId,
          disruption_id: disruption.id,
          recommendation_data: payload as unknown as Json,
          status: "pending",
        })
        .select("id")
        .single();
      recommendationId = rec?.id ?? null;
    }

    await supabase.from("trip_history").insert([
      {
        trip_id: data.tripId,
        event: "flight_delay_detected",
        detail: `Flight ${snapshot.flightNumber} delay detected: +${nextDelay} minutes`,
      },
      ...(recommendationId && payload
        ? [
            {
              trip_id: data.tripId,
              event: "recovery_recommendation_generated",
              detail: `Recovery recommendation generated for ${payload.affectedItemTitle}`,
            },
          ]
        : []),
    ]);

    await supabase.from("notifications").insert({
      user_id: userId,
      trip_id: data.tripId,
      type: nextStatus === "cancelled" ? "flight" : "recovery",
      title: nextStatus === "cancelled" ? `Flight ${snapshot.flightNumber} has been cancelled` : `Flight ${snapshot.flightNumber} is delayed by ${nextDelay} minutes`,
      message:
        nextStatus === "cancelled"
          ? "Your itinerary has been flagged for recovery."
          : payload
            ? `Your flight is delayed by ${nextDelay} minutes, affecting ${payload.affectedItemTitle}.`
            : `Flight ${snapshot.flightNumber} is delayed by ${nextDelay} minutes.`,
    });

    return {
      tripId: data.tripId,
      flight: { ...flight, ...flightUpdate },
      status: nextStatus,
      message:
        nextStatus === "cancelled"
          ? `Flight ${snapshot.flightNumber} has been cancelled.`
          : payload
          ? `Flight ${snapshot.flightNumber} is delayed by ${nextDelay} minutes. ${payload.affectedItemTitle} may be affected.`
          : `Flight ${snapshot.flightNumber} is delayed by ${nextDelay} minutes.`,
      disruptionCreated: true,
      recommendationId,
      affectedCount,
      checkedAt: new Date().toISOString(),
    };
  });

export const configureTripFlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        tripId: z.string().uuid(),
        flightNumber: z
          .string()
          .min(1, "Flight number is required")
          .transform((s) => s.trim().toUpperCase()),
        flightDate: z.string().min(1, "Flight date is required"),
        departureAirport: z
          .string()
          .length(3, "Departure airport must be a valid 3-letter IATA code")
          .transform((s) => s.trim().toUpperCase()),
        arrivalAirport: z
          .string()
          .length(3, "Arrival airport must be a valid 3-letter IATA code")
          .transform((s) => s.trim().toUpperCase()),
        airline: z.string().optional().transform((s) => (s ? s.trim() : "")),
      })
      .refine((d) => d.departureAirport !== d.arrivalAirport, {
        message: "Departure and arrival airports cannot be identical.",
        path: ["arrivalAirport"],
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify trip ownership
    const { data: trip } = await supabase
      .from("trips")
      .select("id, name, user_id")
      .eq("id", data.tripId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!trip) {
      throw new Error("Trip not found or access denied.");
    }

    // Check for existing flight
    const { data: existingFlights } = await supabase
      .from("flights")
      .select("*")
      .eq("trip_id", data.tripId)
      .order("created_at", { ascending: false })
      .limit(1);

    const scheduledDepIso = `${data.flightDate}T09:00:00Z`;

    if (existingFlights && existingFlights.length > 0) {
      const existing = existingFlights[0]!;
      const { data: updated, error } = await supabase
        .from("flights")
        .update({
          flight_number: data.flightNumber,
          departure_airport: data.departureAirport,
          arrival_airport: data.arrivalAirport,
          airline: data.airline || existing.airline || "",
          scheduled_departure: scheduledDepIso,
          provider: "aviationstack",
          last_updated: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error || !updated) {
        throw new Error(error?.message || "Failed to update flight.");
      }

      await supabase.from("trip_history").insert({
        trip_id: data.tripId,
        event: "flight_updated",
        detail: `Updated flight ${data.flightNumber} (${data.departureAirport} → ${data.arrivalAirport})`,
      });

      return updated;
    } else {
      const { data: inserted, error } = await supabase
        .from("flights")
        .insert({
          trip_id: data.tripId,
          flight_number: data.flightNumber,
          departure_airport: data.departureAirport,
          arrival_airport: data.arrivalAirport,
          airline: data.airline || "",
          scheduled_departure: scheduledDepIso,
          status: "scheduled",
          provider: "aviationstack",
        })
        .select()
        .single();

      if (error || !inserted) {
        throw new Error(error?.message || "Failed to add flight.");
      }

      await supabase.from("trip_history").insert({
        trip_id: data.tripId,
        event: "flight_added",
        detail: `Added flight ${data.flightNumber} (${data.departureAirport} → ${data.arrivalAirport})`,
      });

      return inserted;
    }
  });

export const removeTripFlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        tripId: z.string().uuid(),
        flightId: z.string().uuid(),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify trip ownership
    const { data: trip } = await supabase
      .from("trips")
      .select("id, user_id")
      .eq("id", data.tripId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!trip) {
      throw new Error("Trip not found or access denied.");
    }

    const { error } = await supabase
      .from("flights")
      .delete()
      .eq("id", data.flightId)
      .eq("trip_id", data.tripId);

    if (error) {
      throw new Error(error.message || "Failed to remove flight.");
    }

    await supabase.from("trip_history").insert({
      trip_id: data.tripId,
      event: "flight_removed",
      detail: "Flight configuration removed from trip.",
    });

    return { success: true };
  });
