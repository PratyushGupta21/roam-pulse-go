import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Trip = Tables<"trips">;
export type ItineraryItem = Tables<"itinerary_items">;
export type Flight = Tables<"flights">;
export type Disruption = Tables<"disruption_events">;
export type Recommendation = Tables<"recovery_recommendations">;
export type NotificationRow = Tables<"notifications">;
export type HistoryRow = Tables<"trip_history">;
export type Profile = Tables<"profiles">;

export const tripsQuery = () =>
  queryOptions({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data as Trip[];
    },
  });

export const tripQuery = (tripId: string) =>
  queryOptions({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .maybeSingle();
      if (error) throw error;
      return data as Trip | null;
    },
  });

export const itineraryQuery = (tripId: string) =>
  queryOptions({
    queryKey: ["itinerary", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itinerary_items")
        .select("*")
        .eq("trip_id", tripId)
        .neq("status", "replaced")
        .order("day_date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as ItineraryItem[];
    },
  });

export const flightsQuery = (tripId: string) =>
  queryOptions({
    queryKey: ["flights", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("flights").select("*").eq("trip_id", tripId);
      if (error) throw error;
      return data as Flight[];
    },
  });

export const activeRecoveryQuery = (tripId: string) =>
  queryOptions({
    queryKey: ["recovery", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recovery_recommendations")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Recommendation[];
    },
  });

export const disruptionsQuery = (tripId: string) =>
  queryOptions({
    queryKey: ["disruptions", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disruption_events")
        .select("*")
        .eq("trip_id", tripId)
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return data as Disruption[];
    },
  });

export const historyQuery = (tripId: string) =>
  queryOptions({
    queryKey: ["history", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_history")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data as HistoryRow[];
    },
  });

export const notificationsQuery = () =>
  queryOptions({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data as NotificationRow[];
    },
  });

export const profileQuery = () =>
  queryOptions({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
