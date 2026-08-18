import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { demoFlight, demoItinerary, demoTripPayload } from "./demo.server";
import {
  duplicateTripSchema,
  tripInputSchema,
  updateTripSchema,
  type GeneratedItem,
  type RecoveryMode,
  type TravelStyle,
  type TripInput,
} from "./domain";
import { generateItinerary, generateUniquenessKey, normalizeTitle } from "./itinerary.server";
import {
  geocodeItineraryItems,
  isValidCoordinates,
  resolveDestinationCoordinates,
} from "@/lib/maps/geocoding";
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
    if (error || !trip)
      throw new Error(error?.message || "We couldn't save your trip. Please try again.");

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
      metadata: {
        cost_min: item.cost_min,
        cost_max: item.cost_max,
        cost_type: item.cost_type,
        opening_hours: item.opening_hours,
        rating: item.rating,
        verification_status: item.verification_status,
        why_fits: item.why_fits,
        place_id: item.place_id ?? null,
        is_structural: item.is_structural ?? false,
      },
    }));

    const geocodedRows = await geocodeItineraryItems(rows, data.destination);
    await supabase.from("itinerary_items").insert(geocodedRows);

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

    return {
      tripId: trip.id as string,
      itemCount: rows.length,
      source: generated.source,
      warning: generated.error,
    };
  });

export const createDemoTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const payload = demoTripPayload(userId);

    const { data: trip, error } = await supabase
      .from("trips")
      .insert(payload)
      .select("id, start_date")
      .single();
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
      status:
        (item as unknown as { status?: string }).status ??
        (item.indoor_outdoor === "outdoor" ? "flexible" : "confirmed"),
      is_locked: item.is_locked,
      sort_order: index,
    }));

    await supabase.from("itinerary_items").insert(items);
    await supabase.from("flights").insert(demoFlight(trip.id, trip.start_date as string));
    await supabase.from("notifications").insert({
      user_id: userId,
      trip_id: trip.id,
      type: "recovery",
      title: "Demo trip active",
      message: "Tokyo Demo Trip is created and connected to live recovery simulation.",
    });

    return { tripId: trip.id as string, itemCount: items.length };
  });

export const generateTripItinerary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ tripId: z.string().uuid(), replaceExisting: z.boolean().default(true) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Verify trip exists and belongs to currently authenticated user via RLS
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("*")
      .eq("id", data.tripId)
      .single();

    if (tripErr || !trip) {
      throw new Error("Trip not found or access denied.");
    }

    // 2. Map database trip to TripInput
    const tripInput: TripInput = {
      name: trip.name,
      origin: trip.origin || "",
      destination: trip.destination,
      extraDestinations: trip.extra_destinations || [],
      startDate: trip.start_date,
      endDate: trip.end_date,
      arrivalTime: (trip as { arrival_time?: string }).arrival_time || "14:00",
      departureTime: (trip as { departure_time?: string }).departure_time || "16:00",
      adults: trip.adults || 1,
      children: trip.children || 0,
      budget: Number(trip.budget || 0),
      currency: trip.currency || "INR",
      travelStyle: (trip.travel_style as TravelStyle) || "balanced",
      interests: trip.interests || [],
      preferences: (trip.preferences as TripInput["preferences"]) || {
        indoorOutdoor: "balanced",
        pace: "moderate",
        transport: "public_transit",
        accommodation: "budget_hotel",
      },
      recoveryMode: (trip.recovery_mode as RecoveryMode) || "assisted",
      automationSettings: (trip.automation_settings as TripInput["automationSettings"]) || {
        maxExtraSpend: 2000,
        autoReplace: ["flexible", "weather_sensitive"],
        alwaysAsk: ["flights", "hotels", "above_limit"],
      },
    };

    const mode = data.replaceExisting ? "regenerate" : "initial";
    const generationId = crypto.randomUUID();

    console.log(
      `[REGENERATE] serverFn generateTripItinerary started | tripId: ${data.tripId} | generationId: ${generationId} | replaceExisting: ${data.replaceExisting}`,
    );

    // 3. Fetch all existing itinerary items to preserve locked items and avoid duplicate insertions
    const { data: existingDbItems = [] } = await supabase
      .from("itinerary_items")
      .select("*")
      .eq("trip_id", trip.id);

    const previousTitles = (existingDbItems || [])
      .filter((i) => i.status !== "replaced")
      .map((i) => i.title);

    const lockedItems = (existingDbItems || []).filter(
      (item) => item.is_locked && item.status !== "replaced",
    );

    console.log(
      `[REGENERATE] existing active items in DB: ${(existingDbItems || []).length} | locked: ${lockedItems.length} | previousTitles: ${previousTitles.length}`,
    );

    // 4. Call server-side generateItinerary
    const generated = await generateItinerary(tripInput, {
      mode,
      generationId,
      previousTitles: data.replaceExisting ? [] : previousTitles,
      lockedItems: lockedItems as unknown as GeneratedItem[],
      isRegeneration: mode === "regenerate",
    });

    console.log(`[RoamPulse] Items generated: ${generated.items.length}`);

    if (data.replaceExisting) {
      console.log(`[RoamPulse] REGENERATION START | tripId: ${data.tripId}`);
      const { count: deletedCount } = await supabase
        .from("itinerary_items")
        .delete({ count: "exact" })
        .eq("trip_id", trip.id)
        .eq("is_locked", false)
        .neq("status", "replaced");
      console.log(
        `[RoamPulse] previous itinerary deleted: ${deletedCount ?? 0} unlocked items from DB`,
      );
    }

    // 6. Fetch preserved locked active items
    const preservedActiveItems = (existingDbItems || []).filter(
      (item) => item.is_locked && item.status !== "replaced",
    );

    // 7. Track locked items reserved in DB separately from new candidate items
    const lockedTrackingList = [...preservedActiveItems];
    const newlyAddedList: {
      title: string;
      day_date: string;
      start_time: string;
      location?: string | null;
      category?: string | null;
    }[] = [];

    const rowsToInsert = [];

    for (const item of generated.items) {
      const candNormTitle = normalizeTitle(item.title);
      const candKey = generateUniquenessKey(item);

      // Check slot or title collision WITH PRESERVED LOCKED ITEMS in DB
      const collidesWithLocked = lockedTrackingList.some((locked) => {
        // Time slot collision with a preserved locked activity on the same day
        if (item.day_date === locked.day_date && item.start_time === locked.start_time) {
          return true;
        }
        // Exact title collision with a preserved locked activity on the same day
        const lockedNormTitle = normalizeTitle(locked.title);
        if (
          item.day_date === locked.day_date &&
          candNormTitle === lockedNormTitle &&
          candNormTitle.length > 2
        ) {
          return true;
        }
        return false;
      });

      if (collidesWithLocked) {
        // Skip candidate item because this time slot or title is reserved by a user-locked item
        continue;
      }

      // Check collision with NEWLY ADDED candidate items inside the current generation run on the SAME day
      const collidesWithNewRun = newlyAddedList.some((added) => {
        if (item.day_date === added.day_date && item.start_time === added.start_time) {
          return true;
        }
        const addedNormTitle = normalizeTitle(added.title);
        if (
          item.day_date === added.day_date &&
          candNormTitle === addedNormTitle &&
          candNormTitle.length > 2
        ) {
          return true;
        }
        const addedKey = generateUniquenessKey(
          added as {
            title: string;
            category?: string | null;
            location?: string | null;
            day_date: string;
            start_time: string;
          },
        );
        if (item.day_date === added.day_date && candKey === addedKey) {
          return true;
        }
        return false;
      });

      if (!collidesWithNewRun) {
        newlyAddedList.push(item);
        rowsToInsert.push({
          trip_id: trip.id,
          day_date: item.day_date,
          start_time: item.start_time,
          end_time: item.end_time,
          title: item.title,
          description: item.description,
          category: item.category,
          location: item.location || trip.destination,
          latitude: item.latitude,
          longitude: item.longitude,
          estimated_cost: item.estimated_cost,
          currency: trip.currency || "INR",
          travel_minutes: item.travel_minutes,
          indoor_outdoor: item.indoor_outdoor,
          weather_suitability: item.weather_suitability,
          booking_url: item.booking_url,
          status: item.indoor_outdoor === "outdoor" ? "flexible" : "confirmed",
          is_locked: Boolean(item.is_locked),
          sort_order: preservedActiveItems.length + rowsToInsert.length,
          metadata: {
            cost_min: item.cost_min,
            cost_max: item.cost_max,
            cost_type: item.cost_type,
            opening_hours: item.opening_hours,
            rating: item.rating,
            verification_status: item.verification_status,
            why_fits: item.why_fits,
            place_id: item.place_id,
            is_structural: item.is_structural,
            generation_state: generated.state,
            generation_notice: generated.notice,
          },
        });
      }
    }

    console.log(`[RoamPulse] Items prepared for database: ${rowsToInsert.length}`);

    if (rowsToInsert.length > 0) {
      const geocodedRows = await geocodeItineraryItems(rowsToInsert, trip.destination as string);
      const { error: insertErr } = await supabase.from("itinerary_items").insert(geocodedRows);
      if (insertErr) {
        throw new Error("Failed to save itinerary items to database.");
      }
      console.log(
        `[RoamPulse] Database insertion count: ${rowsToInsert.length} | generationId: ${generationId}`,
      );
    }

    // 6. Log event in trip_history & notification
    await supabase.from("trip_history").insert({
      trip_id: trip.id,
      event: "Itinerary generated",
      detail: `${rowsToInsert.length} items created (${generated.source === "ai" ? "Gemini AI planner" : "starter template (Gemini unavailable)"}).`,
    });

    return {
      success: true,
      tripId: trip.id,
      count: rowsToInsert.length,
      source: generated.source,
      warning: generated.error,
    };
  });

export const loadTripProvidersData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ tripId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: trip } = await supabase
      .from("trips")
      .select("destination, currency")
      .eq("id", data.tripId)
      .single();
    if (!trip) throw new Error("Trip not found");

    const { data: anchor } = await supabase
      .from("itinerary_items")
      .select("latitude, longitude")
      .eq("trip_id", data.tripId)
      .not("latitude", "is", null)
      .limit(1)
      .maybeSingle();

    const canonicalDest = await resolveDestinationCoordinates(trip.destination as string);
    const lat =
      anchor?.latitude && isValidCoordinates(anchor.latitude, anchor.longitude)
        ? anchor.latitude
        : (canonicalDest?.latitude ?? 0);
    const lon =
      anchor?.longitude && isValidCoordinates(anchor.latitude, anchor.longitude)
        ? anchor.longitude
        : (canonicalDest?.longitude ?? 0);

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

export const updateTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateTripSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tripId, regenerateItinerary, tripData } = data;

    // 1. Verify trip exists and belongs to authenticated user
    const { data: existingTrip, error: fetchErr } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !existingTrip) {
      throw new Error("Trip not found or access denied.");
    }

    // 2. Update trip record
    const { error: updateErr } = await supabase
      .from("trips")
      .update({
        name: tripData.name,
        origin: tripData.origin,
        destination: tripData.destination,
        extra_destinations: tripData.extraDestinations,
        start_date: tripData.startDate,
        end_date: tripData.endDate,
        adults: tripData.adults,
        children: tripData.children,
        budget: tripData.budget,
        currency: tripData.currency,
        travel_style: tripData.travelStyle,
        interests: tripData.interests,
        preferences: tripData.preferences,
        recovery_mode: tripData.recoveryMode,
        automation_settings: tripData.automationSettings,
      })
      .eq("id", tripId)
      .eq("user_id", userId);

    if (updateErr) {
      throw new Error("Failed to update trip. " + updateErr.message);
    }

    let regeneratedCount = 0;
    let source: "ai" | "fallback" = "fallback";

    // 3. Handle Save & Regenerate Itinerary
    if (regenerateItinerary) {
      const genRes = await generateTripItinerary({
        data: { tripId, replaceExisting: true },
      });
      regeneratedCount = genRes.count;
      source = genRes.source;
    }

    // 4. Log in trip_history
    await supabase.from("trip_history").insert({
      trip_id: tripId,
      event: "Trip updated",
      detail: regenerateItinerary
        ? `Trip details updated and itinerary regenerated (${regeneratedCount} items).`
        : `Trip details updated. Existing itinerary preserved.`,
    });

    return {
      success: true,
      tripId,
      regenerated: regenerateItinerary,
      count: regeneratedCount,
      source,
    };
  });

export const deleteTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ tripId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify trip exists & belongs to user
    const { data: trip, error: fetchErr } = await supabase
      .from("trips")
      .select("id, name")
      .eq("id", data.tripId)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !trip) {
      throw new Error("Trip not found or access denied.");
    }

    // Delete trip — ON DELETE CASCADE handles itinerary, history, disruptions, etc.
    const { error: deleteErr } = await supabase
      .from("trips")
      .delete()
      .eq("id", data.tripId)
      .eq("user_id", userId);

    if (deleteErr) {
      throw new Error("Failed to delete trip. " + deleteErr.message);
    }

    return { success: true, tripId: data.tripId, name: trip.name };
  });

export const duplicateTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => duplicateTripSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Fetch source trip & verify ownership
    const { data: sourceTrip, error: fetchErr } = await supabase
      .from("trips")
      .select("*")
      .eq("id", data.sourceTripId)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !sourceTrip) {
      throw new Error("Source trip not found or access denied.");
    }

    // Calculate dates
    let startDate = data.startDate || sourceTrip.start_date;
    let endDate = data.endDate || sourceTrip.end_date;

    // If no custom dates provided, calculate matching duration starting in 7 days
    if (!data.startDate && !data.endDate) {
      const origStart = new Date(sourceTrip.start_date);
      const origEnd = new Date(sourceTrip.end_date);
      const durationDays = Math.max(
        1,
        Math.round((origEnd.getTime() - origStart.getTime()) / (1000 * 60 * 60 * 24)),
      );

      const today = new Date();
      const newStart = new Date(today);
      newStart.setDate(today.getDate() + 7);
      const newEnd = new Date(newStart);
      newEnd.setDate(newStart.getDate() + durationDays);

      startDate = newStart.toISOString().slice(0, 10);
      endDate = newEnd.toISOString().slice(0, 10);
    }

    const newTripName = data.newName?.trim() || `Copy of ${sourceTrip.name}`;
    const sourceRec = sourceTrip as Record<string, unknown>;

    // 2. Insert new trip record for authenticated user
    const { data: newTrip, error: insertErr } = await supabase
      .from("trips")
      .insert({
        user_id: userId,
        name: newTripName,
        origin: sourceTrip.origin,
        destination: sourceTrip.destination,
        extra_destinations: sourceTrip.extra_destinations,
        start_date: startDate,
        end_date: endDate,
        adults: sourceTrip.adults,
        children: sourceTrip.children,
        budget: sourceTrip.budget,
        currency: sourceTrip.currency,
        travel_style: sourceTrip.travel_style,
        interests: sourceTrip.interests,
        preferences: sourceTrip.preferences,
        recovery_mode: sourceTrip.recovery_mode,
        automation_settings: sourceTrip.automation_settings,
        status: "planning",
      })
      .select("id")
      .single();

    if (insertErr || !newTrip) {
      throw new Error("Failed to create duplicate trip. " + insertErr?.message);
    }

    // 3. Map to TripInput & generate fresh itinerary
    const tripInput: TripInput = {
      name: newTripName,
      origin: sourceTrip.origin || "",
      destination: sourceTrip.destination,
      extraDestinations: sourceTrip.extra_destinations || [],
      startDate,
      endDate,
      arrivalTime: (sourceRec["arrival_time"] as string) || "14:00",
      departureTime: (sourceRec["departure_time"] as string) || "16:00",
      adults: sourceTrip.adults || 1,
      children: sourceTrip.children || 0,
      budget: Number(sourceTrip.budget || 0),
      currency: sourceTrip.currency || "INR",
      travelStyle: (sourceTrip.travel_style as TravelStyle) || "balanced",
      interests: sourceTrip.interests || [],
      preferences: (sourceTrip.preferences as TripInput["preferences"]) || {
        indoorOutdoor: "balanced",
        pace: "moderate",
        transport: "public_transit",
        accommodation: "budget_hotel",
      },
      recoveryMode: (sourceTrip.recovery_mode as RecoveryMode) || "assisted",
      automationSettings: (sourceTrip.automation_settings as TripInput["automationSettings"]) || {
        maxExtraSpend: 2000,
        autoReplace: ["flexible", "weather_sensitive"],
        alwaysAsk: ["flights", "hotels", "above_limit"],
      },
    };

    const generated = await generateItinerary(tripInput, { mode: "initial" });
    const rows = generated.items.map((item, index) => ({
      trip_id: newTrip.id,
      day_date: item.day_date,
      start_time: item.start_time,
      end_time: item.end_time,
      title: item.title,
      description: item.description,
      category: item.category,
      location: item.location || sourceTrip.destination,
      latitude: item.latitude,
      longitude: item.longitude,
      estimated_cost: item.estimated_cost,
      currency: sourceTrip.currency || "INR",
      travel_minutes: item.travel_minutes,
      indoor_outdoor: item.indoor_outdoor,
      weather_suitability: item.weather_suitability,
      booking_url: item.booking_url,
      status: item.indoor_outdoor === "outdoor" ? "flexible" : "confirmed",
      is_locked: Boolean(item.is_locked),
      sort_order: index,
      metadata: {
        cost_min: item.cost_min,
        cost_max: item.cost_max,
        cost_type: item.cost_type,
        opening_hours: item.opening_hours,
        rating: item.rating,
        verification_status: item.verification_status,
        why_fits: item.why_fits,
      },
    }));

    if (rows.length > 0) {
      const geocodedRows = await geocodeItineraryItems(rows, sourceTrip.destination as string);
      await supabase.from("itinerary_items").insert(geocodedRows);
    }

    await supabase.from("trip_history").insert({
      trip_id: newTrip.id,
      event: "Trip duplicated",
      detail: `Duplicated from "${sourceTrip.name}". Generated ${rows.length} itinerary items.`,
    });

    await supabase.from("notifications").insert({
      user_id: userId,
      trip_id: newTrip.id,
      type: "booking",
      title: `${newTripName} is ready`,
      message: `Duplicated trip to ${sourceTrip.destination} created with fresh itinerary.`,
    });

    return {
      success: true,
      newTripId: newTrip.id as string,
      count: rows.length,
      source: generated.source,
    };
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
    const { error } = await context.supabase
      .from("profiles")
      .update(patch as never)
      .eq("user_id", context.userId);
    if (error) throw new Error("We couldn't save your settings.");
    return { ok: true };
  });
