import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import {
  isWithinDestinationRegion,
  isValidCoordinates,
  resolveDestinationCoordinates,
} from "@/lib/maps/geocoding";
import { buildRecovery, type EngineItem } from "@/lib/recovery.server";
import {
  evaluateActivityWeather,
  fetchOpenMeteoForecast,
  formatWmoWeatherCode,
  type CurrentWeather,
  type DailyForecastDay,
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

    // Resolve destination coordinates dynamically (never use hardcoded fallback coordinates)
    const canonicalDest = await resolveDestinationCoordinates(trip.destination);

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

    let lat: number | null = canonicalDest?.latitude ?? null;
    let lon: number | null = canonicalDest?.longitude ?? null;

    // If trip items have valid coordinates near destination, prefer them
    if (items && items.length > 0) {
      for (const item of items) {
        if (
          isValidCoordinates(item.latitude, item.longitude) &&
          (!canonicalDest ||
            isWithinDestinationRegion(
              canonicalDest.latitude,
              canonicalDest.longitude,
              item.latitude,
              item.longitude,
              150,
            ))
        ) {
          lat = item.latitude;
          lon = item.longitude;
          break;
        }
      }
    }

    if (!isValidCoordinates(lat, lon)) {
      console.warn(
        `[RoamPulse] WEATHER REQUEST WARNING: Unable to resolve valid coordinates for ${trip.destination}`,
      );
      return {
        destination: trip.destination,
        latitude: 0,
        longitude: 0,
        timezone: "auto",
        evaluations: [],
        overallStatus: "unavailable",
        highRiskCount: 0,
        summaryText: `Weather unavailable for ${trip.destination}`,
        checkedAt: new Date().toISOString(),
      } satisfies ForecastSummary;
    }

    const finalLat = lat!;
    const finalLon = lon!;

    console.log(`[RoamPulse] WEATHER REQUEST`);
    console.log(`[RoamPulse] destination: ${trip.destination}`);
    console.log(`[RoamPulse] weather coordinates: ${finalLat.toFixed(4)}, ${finalLon.toFixed(4)}`);

    // Calculate start_date and end_date range from itinerary items or trip
    const activeItems = items || [];
    const days = Array.from(new Set(activeItems.map((i) => i.day_date))).sort();
    const startDate = days[0] || trip.start_date;
    const endDate = days[days.length - 1] || trip.end_date || startDate;

    // Fetch forecast from Open-Meteo
    const forecast = await fetchOpenMeteoForecast({
      latitude: finalLat,
      longitude: finalLon,
      startDate,
      endDate,
    });

    console.log(
      `[RoamPulse] weather response status: ${forecast ? "success (HTTP 200)" : "unavailable"}`,
    );

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
        summaryText: `Weather unavailable for ${trip.destination}`,
        checkedAt: new Date().toISOString(),
      } satisfies ForecastSummary;
    }

    // Extract current weather summary metrics
    let currentWeather: CurrentWeather | undefined;
    if (forecast.current) {
      const code = forecast.current.weather_code ?? 0;
      const { label: conditionText, icon: conditionIcon } = formatWmoWeatherCode(code);
      currentWeather = {
        tempC: Math.round(forecast.current.temperature_2m ?? 20),
        apparentTempC: Math.round(
          forecast.current.apparent_temperature ?? forecast.current.temperature_2m ?? 20,
        ),
        conditionText,
        conditionIcon,
        precipMm: forecast.current.precipitation ?? 0,
        precipProbability: forecast.hourly?.precipitation_probability?.[0] ?? 0,
        windSpeedKmH: Math.round(forecast.current.wind_speed_10m ?? 0),
        humidityPct: forecast.current.relative_humidity_2m ?? 50,
      };
    }

    // Extract daily forecast overview
    let dailyForecast: DailyForecastDay[] | undefined;
    if (forecast.daily && forecast.daily.time) {
      dailyForecast = forecast.daily.time.slice(0, 7).map((date, i) => {
        const code = forecast.daily?.weather_code?.[i] ?? 0;
        const { label: conditionText, icon: conditionIcon } = formatWmoWeatherCode(code);
        return {
          date,
          tempMaxC: Math.round(forecast.daily?.temperature_2m_max?.[i] ?? 25),
          tempMinC: Math.round(forecast.daily?.temperature_2m_min?.[i] ?? 15),
          precipProbabilityMax: forecast.daily?.precipitation_probability_max?.[i] ?? 0,
          conditionText,
          conditionIcon,
        };
      });
    }

    // Evaluate each itinerary activity against weather forecast
    const evaluations = activeItems.map((item) => evaluateActivityWeather(item, forecast));
    const highRisks = evaluations.filter((ev) => ev.riskLevel === "high");

    let createdDisruptionsCount = 0;
    const settings = (trip.automation_settings ?? {}) as { maxExtraSpend?: number };

    // Connect new high-risk weather activities to existing Disruption & Recovery Engine
    for (const riskItem of highRisks) {
      if (riskItem.is_locked || riskItem.status === "at_risk") {
        continue;
      }

      const affectedDbItem = activeItems.find((i) => i.id === riskItem.itemId);
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
      currentWeather,
      dailyForecast,
      evaluations,
      overallStatus,
      highRiskCount: highRisks.length,
      summaryText,
      checkedAt: new Date().toISOString(),
    } satisfies ForecastSummary;
  });
