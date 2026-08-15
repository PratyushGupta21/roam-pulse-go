import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tripInputSchema } from "./domain";
import { demoFlight, demoItinerary, demoTripPayload } from "./demo.server";
import { generateItinerary } from "./itinerary.server";
import { fetchPriceOffers, fetchWeather, notifyN8n, providerMode } from "./providers.server";

export const createTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => tripInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: trip, error } = await supabase
      .from("trips")
      .insert({
        user_id: userId,
        name: data.name,
        origin: data.origin,
        destination: data.destination,
        extra_destinations: data.extraDestinations,
        start_date: data.startDate,
        end_date: data.endDate,
        adults: data.adults,
        children: data.children,
        budget: data.budget,
        currency: data.currency,
        travel_style: data.travelStyle,
        interests: data.interests,
        preferences: data.preferences,
        recovery_mode: data.recoveryMode,
        automation_settings: data.automationSettings,
        status: "planning",
      })
      .select("id")
      .single();
    if (error || !trip) throw new Error("We couldn't save your trip. Please try again.");

    const generated = await generateItinerary(data);
    const rows = generated.items.map((item, index) => ({
      trip_id: trip.id,
      day_date: item.day_date,
      start_time: item.start_time,
      end_time: item.end_time,
      title: item.title,
      description: item.description,
      category: item.category,
      location: item.location || data.destination,
      latitude: item.latitude,
      longitude: item.longitude,
      estimated_cost: item.estimated_cost,
      currency: data.currency,
      travel_minutes: item.travel_minutes,
      indoor_outdoor: item.indoor_outdoor,
      weather_suitability: item.weather_suitability,
      booking_url: item.booking_url,
      status: item.indoor_outdoor === "outdoor" ? "flexible" : "confirmed",
      is_locked: item.is_locked,
      sort_order: index,
    }));
    await supabase.from("itinerary_items").insert(rows);

    await supabase.from("trip_history").insert({
      trip_id: trip.id,
      event: "Itinerary generated",
      detail: `${rows.length} items created (${generated.source === "ai" ? "AI planner" : "starter template"}).`,
    });
    await supabase.from("notifications").insert({
      user_id: userId,
      trip_id: trip.id,
      type: "booking",
      title: `${data.name} is ready`,
      message: `Your ${data.destination} itinerary has ${rows.length} planned items. Monitoring is now active.`,
    });
    await notifyN8n("trip-created", { tripId: trip.id, destination: data.destination });

    return { tripId: trip.id as string, itemCount: rows.length, source: generated.source, warning: generated.error };
  });

export const createDemoTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const payload = demoTripPayload(userId);

    const { data: trip, error } = await supabase.from("trips").insert(payload).select("id, start_date").single();
    if (error || !trip) throw new Error("We couldn't create the demo trip. Please try again.");

    const items = demoItinerary(trip.start_date as string).map((item, index) => ({
      trip_id: trip.id,
      day_date: item.day_date,
      start_time: item.start_time,
      end_time: item.end_time,
      title: item.title,
      description: item.description,
      category: item.category,
      location: item.location,
      latitude: item.latitude,
      longitude: item.longitude,
      estimated_cost: item.estimated_cost,
      currency: "INR",
      travel_minutes: item.travel_minutes,
      indoor_outdoor: item.indoor_outdoor,
      weather_suitability: item.weather_suitability,
      booking_url: item.booking_url,
      status: item.is_locked ? "confirmed" : item.indoor_outdoor === "outdoor" ? "flexible" : "confirmed",
      is_locked: item.is_locked,
      sort_order: index,
    }));
    await supabase.from("itinerary_items").insert(items);
    await supabase.from("flights").insert(demoFlight(trip.id as string, trip.start_date as string));
    await supabase.from("trip_history").insert({
      trip_id: trip.id,
      event: "Demo trip created",
      detail: "Tokyo Adventure scenario loaded with demo flight AI-247.",
    });
    await supabase.from("notifications").insert({
      user_id: userId,
      trip_id: trip.id,
      type: "booking",
      title: "Tokyo Adventure is live",
      message: "Demo trip created. Trigger a flight delay from the trip page to see autonomous recovery.",
    });

    return { tripId: trip.id as string };
  });

export const updateItineraryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        itemId: z.string().uuid(),
        patch: z.object({
          title: z.string().min(1).max(120).optional(),
          description: z.string().max(600).optional(),
          start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
          end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
          day_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          location: z.string().max(160).optional(),
          estimated_cost: z.number().min(0).max(10_000_000).optional(),
          is_locked: z.boolean().optional(),
          status: z.string().max(24).optional(),
        }),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("itinerary_items")
      .update(data.patch)
      .eq("id", data.itemId);
    if (error) throw new Error("We couldn't update that activity.");
    return { ok: true };
  });

export const deleteItineraryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ itemId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("itinerary_items").delete().eq("id", data.itemId);
    if (error) throw new Error("We couldn't remove that activity.");
    return { ok: true };
  });

export const getTripInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ tripId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: trip } = await supabase
      .from("trips")
      .select("id, destination, currency, start_date, end_date")
      .eq("id", data.tripId)
      .maybeSingle();
    if (!trip) throw new Error("Trip not found.");

    const { data: anchor } = await supabase
      .from("itinerary_items")
      .select("latitude, longitude")
      .eq("trip_id", data.tripId)
      .not("latitude", "is", null)
      .limit(1)
      .maybeSingle();

    const lat = anchor?.latitude ?? 35.6762;
    const lon = anchor?.longitude ?? 139.6503;
    const weather = await fetchWeather(lat, lon, 7);
    const prices = await fetchPriceOffers(trip.destination as string, trip.currency as string);

    return { weather, prices, modes: providerMode() };
  });

export const trackAffiliateClick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        tripId: z.string().uuid().nullable(),
        itemId: z.string().uuid().nullable(),
        provider: z.string().max(60),
        targetUrl: z.string().url(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await context.supabase.from("affiliate_clicks").insert({
      user_id: context.userId,
      trip_id: data.tripId,
      item_id: data.itemId,
      provider: data.provider,
      target_url: data.targetUrl,
    });
    return { ok: true, redirectTo: data.targetUrl };
  });

export const saveAutomationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        tripId: z.string().uuid().nullable(),
        recoveryMode: z.enum(["manual", "assisted", "autonomous"]),
        settings: z.object({
          maxExtraSpend: z.number().min(0).max(10_000_000),
          autoReplace: z.array(z.string().max(40)).max(10),
          alwaysAsk: z.array(z.string().max(40)).max(10),
        }),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.tripId) {
      await supabase
        .from("trips")
        .update({ recovery_mode: data.recoveryMode, automation_settings: data.settings })
        .eq("id", data.tripId);
    } else {
      await supabase
        .from("trips")
        .update({ recovery_mode: data.recoveryMode, automation_settings: data.settings })
        .eq("user_id", userId);
    }
    await supabase
      .from("profiles")
      .update({ preferences: { recoveryMode: data.recoveryMode, automation: data.settings } })
      .eq("user_id", userId);
    return { ok: true };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().max(80).optional(),
        homeCurrency: z.string().max(6).optional(),
        notificationPrefs: z.record(z.string(), z.boolean()).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch["name"] = data.name;
    if (data.homeCurrency !== undefined) patch["home_currency"] = data.homeCurrency;
    if (data.notificationPrefs !== undefined) patch["notification_prefs"] = data.notificationPrefs;
    const { error } = await context.supabase.from("profiles").update(patch).eq("user_id", context.userId);
    if (error) throw new Error("We couldn't save your settings.");
    return { ok: true };
  });
