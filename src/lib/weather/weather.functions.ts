import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { geocodeLocation } from "@/lib/maps/geocoding";
import { buildRecovery, type EngineItem } from "@/lib/recovery.server";
import {
  evaluateActivityWeather,
  fetchOpenMeteoForecast,
  type ForecastSummary,
} from "./weather.server";

export const checkTripWeather = createServerFn({ method: "POST" })
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

    // Load trip with RLS check (user_id = userId)
    const { data: trip } = await supabase
      .from("trips")
      .select(
        "id, name, destination, currency, interests, recovery_mode, automation_settings, user_id, start_date, end_date",
      )
      .eq("id", data.tripId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!trip) throw new Error("Trip not found or unauthorized.");

    // Load active itinerary items (excluding replaced)
    const { data: items } = await supabase
      .from("itinerary_items")
      .select(
        "id, title, day_date, start_time, end_time, category, estimated_cost, indoor_outdoor, is_locked, status, latitude, longitude, location",
      )
      .eq("trip_id", data.tripId)
      .neq("status", "replaced")
      .order("day_date")
      .order("start_time");

    if (!items || items.length === 0) {
      return {
        destination: trip.destination,
        latitude: 0,
        longitude: 0,
        timezone: "auto",
        evaluations: [],
        overallStatus: "ok",
        highRiskCount: 0,
        summaryText: "No itinerary activities to evaluate.",
        checkedAt: new Date().toISOString(),
      } satisfies ForecastSummary;
    }

    // Resolve coordinates from first valid item or trip destination
    let lat: number | null = null;
    let lon: number | null = null;

    for (const item of items) {
      if (
        typeof item.latitude === "number" &&
        typeof item.longitude === "number" &&
        (item.latitude !== 0 || item.longitude !== 0)
      ) {
        lat = item.latitude;
        lon = item.longitude;
        break;
      }
    }

    if (lat === null || lon === null) {
      const coords = await geocodeLocation(trip.destination);
      if (coords) {
        lat = coords.latitude;
        lon = coords.longitude;
      }
    }

    // Fallback coordinates if geocoding fails (e.g. Jaipur)
    const finalLat = lat ?? 26.9124;
    const finalLon = lon ?? 75.7873;

    // Calculate start_date and end_date range from itinerary items
    const days = Array.from(new Set(items.map((i) => i.day_date))).sort();
    const startDate = days[0] || trip.start_date;
    const endDate = days[days.length - 1] || trip.end_date || startDate;

    // Fetch forecast from Open-Meteo
    const forecast = await fetchOpenMeteoForecast({
      latitude: finalLat,
      longitude: finalLon,
      startDate,
      endDate,
    });

    if (!forecast) {
      console.warn(`[Weather] Open-Meteo API unavailable for trip ${data.tripId}`);
      return {
        destination: trip.destination,
        latitude: finalLat,
        longitude: finalLon,
        timezone: "auto",
        evaluations: [],
        overallStatus: "unavailable",
        highRiskCount: 0,
        summaryText: "Weather forecast data temporarily unavailable.",
        checkedAt: new Date().toISOString(),
      } satisfies ForecastSummary;
    }

    // Evaluate each itinerary activity against weather forecast
    const evaluations = items.map((item) => evaluateActivityWeather(item, forecast));
    const highRisks = evaluations.filter((ev) => ev.riskLevel === "high");

    let createdDisruptionsCount = 0;
    const settings = (trip.automation_settings ?? {}) as { maxExtraSpend?: number };

    // Connect new high-risk weather activities to existing Disruption & Recovery Engine
    for (const riskItem of highRisks) {
      // Respect locked and already affected activities
      if (riskItem.is_locked || riskItem.status === "at_risk") {
        continue;
      }

      const affectedDbItem = items.find((i) => i.id === riskItem.itemId);
      if (!affectedDbItem) continue;

      // 1. Mark item status = "at_risk"
      await supabase
        .from("itinerary_items")
        .update({ status: "at_risk" })
        .eq("id", riskItem.itemId);

      // 2. Insert disruption_events record
      const { data: disruption } = await supabase
        .from("disruption_events")
        .insert({
          trip_id: data.tripId,
          type: "weather",
          severity: "medium",
          title: `Weather Risk: ${affectedDbItem.title}`,
          description: riskItem.reason || "Heavy rain expected during outdoor activity",
          affected_item_ids: [riskItem.itemId],
          metadata: {
            rainProbability: riskItem.maxPrecipProbability,
            condition: riskItem.conditionText,
          } as unknown as Json,
        })
        .select("id")
        .single();

      if (disruption) {
        // 3. Generate recovery recommendation via engine
        const engineItem: EngineItem = {
          id: affectedDbItem.id,
          title: affectedDbItem.title,
          day_date: affectedDbItem.day_date,
          start_time: affectedDbItem.start_time,
          end_time: affectedDbItem.end_time,
          category: affectedDbItem.category,
          estimated_cost: Number(affectedDbItem.estimated_cost || 0),
          indoor_outdoor: affectedDbItem.indoor_outdoor || "outdoor",
          is_locked: Boolean(affectedDbItem.is_locked),
          status: "at_risk",
          latitude: affectedDbItem.latitude,
          longitude: affectedDbItem.longitude,
        };

        const { payload } = buildRecovery([engineItem], {
          type: "weather",
          minutesLost: 120,
          fromTime: affectedDbItem.start_time,
          interests: (trip.interests as string[]) || ["culture", "food"],
          currency: (trip.currency as string) || "INR",
          maxExtraSpend: settings.maxExtraSpend ?? 1000,
          recoveryMode: (trip.recovery_mode as "manual" | "assisted" | "autonomous") || "manual",
          anchorLat: affectedDbItem.latitude,
          anchorLon: affectedDbItem.longitude,
          rainProbability: riskItem.maxPrecipProbability,
        });

        if (payload) {
          await supabase.from("recovery_recommendations").insert({
            trip_id: data.tripId,
            disruption_id: disruption.id,
            recommendation_data: payload as unknown as Json,
            status: "pending",
          });

          // 4. Create Notification and History entry
          await supabase.from("notifications").insert({
            user_id: userId,
            trip_id: data.tripId,
            type: "weather",
            title: `Weather Risk: ${affectedDbItem.title}`,
            message: `${riskItem.reason || "Rain expected"}. Recovery recommendation available.`,
          });

          await supabase.from("trip_history").insert({
            trip_id: data.tripId,
            event: "weather_disruption_detected",
            detail: `Heavy rain detected for ${affectedDbItem.title} (${riskItem.maxPrecipProbability}% chance)`,
          });

          createdDisruptionsCount++;
        }
      }
    }

    const overallStatus = highRisks.length > 0 ? "risk_detected" : "ok";
    const summaryText =
      highRisks.length > 0
        ? `⚠️ Weather risk detected for ${highRisks.length} outdoor activity.`
        : `✓ Weather looks good for all planned activities in ${trip.destination}.`;

    console.log(
      `[Weather] check complete for trip ${data.tripId}: ${overallStatus} (${createdDisruptionsCount} new disruptions created)`,
    );

    return {
      destination: trip.destination,
      latitude: finalLat,
      longitude: finalLon,
      timezone: forecast.timezone || "auto",
      evaluations,
      overallStatus,
      highRiskCount: highRisks.length,
      summaryText,
      checkedAt: new Date().toISOString(),
    } satisfies ForecastSummary;
  });
