import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { buildRecovery, type EngineItem } from "./recovery.server";
import { addMinutes } from "./format";
import { notifyN8n } from "./providers.server";

export const triggerDisruption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        tripId: z.string().uuid(),
        type: z.enum(["flight_delay", "weather", "transport"]).default("flight_delay"),
        minutes: z.number().int().min(15).max(720).default(180),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: trip } = await supabase
      .from("trips")
      .select("id, name, currency, interests, recovery_mode, automation_settings, start_date")
      .eq("id", data.tripId)
      .maybeSingle();
    if (!trip) throw new Error("Trip not found.");

    const { data: items } = await supabase
      .from("itinerary_items")
      .select(
        "id, title, day_date, start_time, end_time, category, estimated_cost, indoor_outdoor, is_locked, status, latitude, longitude",
      )
      .eq("trip_id", data.tripId)
      .neq("status", "replaced")
      .order("day_date")
      .order("start_time");
    if (!items || items.length === 0) throw new Error("This trip has no itinerary yet.");

    const firstDay = items[0]!.day_date as string;
    const dayItems = (items as EngineItem[]).filter((i) => i.day_date === firstDay);

    let fromTime = "17:00";
    if (data.type === "flight_delay") {
      const { data: flight } = await supabase
        .from("flights")
        .select("id, scheduled_arrival, flight_number, airline")
        .eq("trip_id", data.tripId)
        .limit(1)
        .maybeSingle();
      if (flight) {
        const eta = new Date(
          new Date(flight.scheduled_arrival as string).getTime() + data.minutes * 60_000,
        );
        await supabase
          .from("flights")
          .update({
            status: "delayed",
            delay_minutes: data.minutes,
            estimated_arrival: eta.toISOString(),
            last_updated: new Date().toISOString(),
          })
          .eq("id", flight.id);
      }
      fromTime = addMinutes("14:00", data.minutes);
    } else if (data.type === "weather") {
      fromTime = "12:00";
    } else {
      fromTime = "15:30";
    }

    const settings = (trip.automation_settings ?? {}) as { maxExtraSpend?: number };
    const { affected, payload } = buildRecovery(dayItems, {
      type: data.type,
      minutesLost: data.minutes,
      fromTime,
      interests: (trip.interests as string[]) ?? [],
      currency: trip.currency as string,
      maxExtraSpend: settings.maxExtraSpend ?? 3000,
      recoveryMode: (trip.recovery_mode as "manual" | "assisted" | "autonomous") ?? "assisted",
      anchorLat: dayItems.find((i) => i.latitude !== null)?.latitude ?? 35.6762,
      anchorLon: dayItems.find((i) => i.longitude !== null)?.longitude ?? 139.6503,
      rainProbability: 82,
    });

    const titles: Record<string, string> = {
      flight_delay: `Flight delayed by ${Math.floor(data.minutes / 60)}h ${data.minutes % 60}m`,
      weather: "Heavy rain forecast during outdoor activity",
      transport: "Transit line disruption on your route",
    };

    const { data: disruption } = await supabase
      .from("disruption_events")
      .insert({
        trip_id: data.tripId,
        type: data.type,
        severity: data.type === "flight_delay" ? "high" : "medium",
        title: titles[data.type]!,
        description: payload?.reason ?? "RoamPulse detected a change affecting your plans.",
        affected_item_ids: affected.map((i) => i.id),
        metadata: { minutes: data.minutes, fromTime },
      })
      .select("id")
      .single();

    if (affected.length > 0) {
      await supabase
        .from("itinerary_items")
        .update({ status: "at_risk" })
        .in(
          "id",
          affected.map((i) => i.id),
        );
    }

    let recommendationId: string | null = null;
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
      recommendationId = (rec?.id as string) ?? null;
    }

    await supabase.from("trip_history").insert([
      { trip_id: data.tripId, event: titles[data.type]!, detail: payload?.reason ?? "" },
      {
        trip_id: data.tripId,
        event: `${affected.length} item(s) marked at risk`,
        detail: affected.map((i) => i.title).join(", "),
      },
      {
        trip_id: data.tripId,
        event: `${payload?.alternatives.length ?? 0} alternatives found`,
        detail: payload ? `Best match: ${payload.primary.title}` : "No alternatives needed",
      },
    ]);

    await supabase.from("notifications").insert({
      user_id: userId,
      trip_id: data.tripId,
      type: data.type === "weather" ? "weather" : "flight",
      title: titles[data.type]!,
      message: payload
        ? `${payload.affectedItemTitle} is at risk. RoamPulse suggests ${payload.primary.title}.`
        : "No itinerary items were affected.",
    });

    await notifyN8n("disruption-detected", { tripId: data.tripId, type: data.type });

    return {
      recommendationId,
      affectedCount: affected.length,
      requiresApproval: payload?.requiresApproval ?? true,
    };
  });

export const applyRecovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ recommendationId: z.string().uuid(), alternativeId: z.string().max(80).optional() })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: rec } = await supabase
      .from("recovery_recommendations")
      .select("id, trip_id, disruption_id, recommendation_data, status")
      .eq("id", data.recommendationId)
      .maybeSingle();
    if (!rec) throw new Error("Recovery plan not found.");

    const { data: trip } = await supabase
      .from("trips")
      .select("id")
      .eq("id", rec.trip_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!trip) throw new Error("Trip not found or access denied.");

    if (rec.status !== "pending") throw new Error("This recovery has already been resolved.");

    const payload = rec.recommendation_data as unknown as {
      affectedItemId: string;
      affectedItemTitle: string;
      newStartTime: string;
      primary: Record<string, unknown>;
      alternatives: Record<string, unknown>[];
    };
    const chosen =
      (data.alternativeId
        ? payload.alternatives.find((a) => a["id"] === data.alternativeId)
        : payload.primary) ?? payload.primary;

    const { data: original } = await supabase
      .from("itinerary_items")
      .select("*")
      .eq("id", payload.affectedItemId)
      .maybeSingle();
    if (!original) throw new Error("The affected activity no longer exists.");
    if (original.is_locked) throw new Error("That activity is locked and can't be replaced.");

    const replacementTitle = String(chosen["title"] ?? "Recovery activity");
    const replacementStartTime = String(chosen["startTime"] ?? payload.newStartTime);
    const replacementDayDate = String(
      (chosen["dayDate"] as string) ||
        (payload as Record<string, unknown>)["replacementDate"] ||
        original.day_date,
    );

    // Idempotency safeguard: check if this exact replacement item was already inserted
    const { data: existingReplacement } = await supabase
      .from("itinerary_items")
      .select("id")
      .eq("trip_id", rec.trip_id)
      .eq("title", replacementTitle)
      .eq("day_date", replacementDayDate)
      .eq("start_time", replacementStartTime)
      .neq("status", "replaced")
      .maybeSingle();

    if (!existingReplacement) {
      await supabase.from("trip_history").insert({
        trip_id: rec.trip_id,
        event: "Previous itinerary version saved",
        detail: `Snapshot of "${original.title}" before recovery.`,
        snapshot: original as unknown as Json,
      });

      await supabase
        .from("itinerary_items")
        .update({ status: "replaced", is_locked: false })
        .eq("id", payload.affectedItemId);

      const { error: insertError } = await supabase.from("itinerary_items").insert({
        trip_id: rec.trip_id,
        day_date: replacementDayDate,
        start_time: replacementStartTime,
        end_time: String(chosen["endTime"] ?? replacementStartTime),
        title: replacementTitle,
        description: String(chosen["description"] ?? ""),
        category: String(chosen["category"] ?? "activity"),
        location: (chosen["location"] as string) || original.location,
        latitude: (chosen["latitude"] as number | null) ?? original.latitude,
        longitude: (chosen["longitude"] as number | null) ?? original.longitude,
        estimated_cost: Number(chosen["estimatedCost"] ?? 0),
        currency: original.currency,
        travel_minutes: Math.round(Number(chosen["distanceKm"] ?? 1) * 4),
        indoor_outdoor: String(chosen["indoorOutdoor"] ?? "indoor"),
        weather_suitability: String(chosen["weatherSuitability"] ?? "any"),
        booking_url: (chosen["bookingUrl"] as string | null) ?? null,
        status: "confirmed",
        is_sponsored: Boolean(chosen["sponsored"]),
        sort_order: Number(original.sort_order ?? 0) + 1,
      });
      if (insertError) throw new Error("We couldn't apply the recovery. Please try again.");
    } else {
      await supabase
        .from("itinerary_items")
        .update({ status: "replaced", is_locked: false })
        .eq("id", payload.affectedItemId);
    }

    await supabase.from("recovery_recommendations").update({ status: "applied" }).eq("id", rec.id);
    if (rec.disruption_id) {
      await supabase
        .from("disruption_events")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", rec.disruption_id);
    }

    await supabase.from("trip_history").insert([
      {
        trip_id: rec.trip_id,
        event: "Recovery applied",
        detail: `${payload.affectedItemTitle} → ${String(chosen["title"])}`,
      },
      {
        trip_id: rec.trip_id,
        event: "Map route updated",
        detail: "New stop added to today's route.",
      },
    ]);

    await supabase.from("notifications").insert({
      user_id: userId,
      trip_id: rec.trip_id,
      type: "recovery",
      title: "Recovery applied",
      message: `${payload.affectedItemTitle} replaced with ${String(chosen["title"])}. Your timeline and map are updated.`,
    });

    await notifyN8n("recovery-applied", { tripId: rec.trip_id, recommendationId: rec.id });

    return { ok: true, tripId: rec.trip_id as string };
  });

export const resolveRecovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        recommendationId: z.string().uuid(),
        action: z.enum(["keep_original", "dismissed"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rec } = await supabase
      .from("recovery_recommendations")
      .select("id, trip_id, disruption_id, recommendation_data")
      .eq("id", data.recommendationId)
      .maybeSingle();
    if (!rec) throw new Error("Recovery plan not found.");

    const { data: trip } = await supabase
      .from("trips")
      .select("id")
      .eq("id", rec.trip_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!trip) throw new Error("Trip not found or access denied.");

    const payload = rec.recommendation_data as unknown as {
      affectedItemId: string;
      affectedItemTitle: string;
    };

    await supabase
      .from("recovery_recommendations")
      .update({ status: data.action })
      .eq("id", rec.id);
    await supabase
      .from("itinerary_items")
      .update({ status: data.action === "keep_original" ? "confirmed" : "flexible" })
      .eq("id", payload.affectedItemId);
    if (rec.disruption_id) {
      await supabase
        .from("disruption_events")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", rec.disruption_id);
    }
    await supabase.from("trip_history").insert({
      trip_id: rec.trip_id,
      event: data.action === "keep_original" ? "Original plan kept" : "Recovery dismissed",
      detail: payload.affectedItemTitle,
    });
    await supabase.from("notifications").insert({
      user_id: userId,
      trip_id: rec.trip_id,
      type: "recovery",
      title: data.action === "keep_original" ? "Original plan kept" : "Recovery dismissed",
      message: `${payload.affectedItemTitle} was left unchanged.`,
    });
    return { ok: true };
  });
