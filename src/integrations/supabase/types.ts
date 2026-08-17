export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      affiliate_clicks: {
        Row: {
          created_at: string;
          id: string;
          item_id: string | null;
          provider: string;
          target_url: string;
          trip_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_id?: string | null;
          provider?: string;
          target_url: string;
          trip_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string | null;
          provider?: string;
          target_url?: string;
          trip_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      automation_runs: {
        Row: {
          completed_at: string | null;
          error: string | null;
          id: string;
          started_at: string;
          status: string;
          trip_id: string | null;
          workflow: string;
        };
        Insert: {
          completed_at?: string | null;
          error?: string | null;
          id?: string;
          started_at?: string;
          status?: string;
          trip_id?: string | null;
          workflow: string;
        };
        Update: {
          completed_at?: string | null;
          error?: string | null;
          id?: string;
          started_at?: string;
          status?: string;
          trip_id?: string | null;
          workflow?: string;
        };
        Relationships: [
          {
            foreignKeyName: "automation_runs_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      disruption_events: {
        Row: {
          affected_item_ids: string[];
          description: string;
          detected_at: string;
          id: string;
          metadata: Json;
          resolved_at: string | null;
          severity: string;
          status: string;
          title: string;
          trip_id: string;
          type: string;
        };
        Insert: {
          affected_item_ids?: string[];
          description?: string;
          detected_at?: string;
          id?: string;
          metadata?: Json;
          resolved_at?: string | null;
          severity?: string;
          status?: string;
          title: string;
          trip_id: string;
          type: string;
        };
        Update: {
          affected_item_ids?: string[];
          description?: string;
          detected_at?: string;
          id?: string;
          metadata?: Json;
          resolved_at?: string | null;
          severity?: string;
          status?: string;
          title?: string;
          trip_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "disruption_events_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      flights: {
        Row: {
          actual_arrival: string | null;
          airline: string;
          arrival_airport: string;
          created_at: string;
          delay_minutes: number;
          departure_airport: string;
          estimated_arrival: string | null;
          estimated_departure: string | null;
          flight_number: string;
          id: string;
          last_updated: string;
          provider: string;
          scheduled_arrival: string | null;
          scheduled_departure: string | null;
          status: string;
          trip_id: string;
        };
        Insert: {
          actual_arrival?: string | null;
          airline?: string;
          arrival_airport?: string;
          created_at?: string;
          delay_minutes?: number;
          departure_airport?: string;
          estimated_arrival?: string | null;
          estimated_departure?: string | null;
          flight_number: string;
          id?: string;
          last_updated?: string;
          provider?: string;
          scheduled_arrival?: string | null;
          scheduled_departure?: string | null;
          status?: string;
          trip_id: string;
        };
        Update: {
          actual_arrival?: string | null;
          airline?: string;
          arrival_airport?: string;
          created_at?: string;
          delay_minutes?: number;
          departure_airport?: string;
          estimated_arrival?: string | null;
          estimated_departure?: string | null;
          flight_number?: string;
          id?: string;
          last_updated?: string;
          provider?: string;
          scheduled_arrival?: string | null;
          scheduled_departure?: string | null;
          status?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flights_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      itinerary_items: {
        Row: {
          booking_url: string | null;
          category: string;
          created_at: string;
          currency: string;
          day_date: string;
          description: string;
          end_time: string;
          estimated_cost: number;
          id: string;
          indoor_outdoor: string;
          is_locked: boolean;
          is_sponsored: boolean;
          latitude: number | null;
          location: string;
          longitude: number | null;
          sort_order: number;
          start_time: string;
          status: string;
          title: string;
          travel_minutes: number;
          trip_id: string;
          updated_at: string;
          weather_suitability: string;
          metadata: Json;
        };
        Insert: {
          booking_url?: string | null;
          category?: string;
          created_at?: string;
          currency?: string;
          day_date: string;
          description?: string;
          end_time?: string;
          estimated_cost?: number;
          id?: string;
          indoor_outdoor?: string;
          is_locked?: boolean;
          is_sponsored?: boolean;
          latitude?: number | null;
          location?: string;
          longitude?: number | null;
          metadata?: Json;
          sort_order?: number;
          start_time?: string;
          status?: string;
          title: string;
          travel_minutes?: number;
          trip_id: string;
          updated_at?: string;
          weather_suitability?: string;
        };
        Update: {
          booking_url?: string | null;
          category?: string;
          created_at?: string;
          currency?: string;
          day_date?: string;
          description?: string;
          end_time?: string;
          estimated_cost?: number;
          id?: string;
          indoor_outdoor?: string;
          is_locked?: boolean;
          is_sponsored?: boolean;
          latitude?: number | null;
          location?: string;
          longitude?: number | null;
          metadata?: Json;
          sort_order?: number;
          start_time?: string;
          status?: string;
          title?: string;
          travel_minutes?: number;
          trip_id?: string;
          updated_at?: string;
          weather_suitability?: string;
        };
        Relationships: [
          {
            foreignKeyName: "itinerary_items_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          read: boolean;
          title: string;
          trip_id: string | null;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message?: string;
          read?: boolean;
          title: string;
          trip_id?: string | null;
          type?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          read?: boolean;
          title?: string;
          trip_id?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      price_snapshots: {
        Row: {
          booking_url: string | null;
          captured_at: string;
          currency: string;
          id: string;
          is_demo: boolean;
          price: number;
          product_id: string;
          product_type: string;
          provider: string;
          title: string;
          trip_id: string;
        };
        Insert: {
          booking_url?: string | null;
          captured_at?: string;
          currency?: string;
          id?: string;
          is_demo?: boolean;
          price: number;
          product_id?: string;
          product_type: string;
          provider: string;
          title?: string;
          trip_id: string;
        };
        Update: {
          booking_url?: string | null;
          captured_at?: string;
          currency?: string;
          id?: string;
          is_demo?: boolean;
          price?: number;
          product_id?: string;
          product_type?: string;
          provider?: string;
          title?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "price_snapshots_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          home_currency: string;
          id: string;
          name: string | null;
          notification_prefs: Json;
          plan: string;
          preferences: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          home_currency?: string;
          id?: string;
          name?: string | null;
          notification_prefs?: Json;
          plan?: string;
          preferences?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          home_currency?: string;
          id?: string;
          name?: string | null;
          notification_prefs?: Json;
          plan?: string;
          preferences?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      recovery_recommendations: {
        Row: {
          created_at: string;
          disruption_id: string | null;
          id: string;
          recommendation_data: Json;
          status: string;
          trip_id: string;
        };
        Insert: {
          created_at?: string;
          disruption_id?: string | null;
          id?: string;
          recommendation_data?: Json;
          status?: string;
          trip_id: string;
        };
        Update: {
          created_at?: string;
          disruption_id?: string | null;
          id?: string;
          recommendation_data?: Json;
          status?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recovery_recommendations_disruption_id_fkey";
            columns: ["disruption_id"];
            isOneToOne: false;
            referencedRelation: "disruption_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recovery_recommendations_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          created_at: string;
          current_period_end: string | null;
          id: string;
          plan: string;
          provider: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan?: string;
          provider?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan?: string;
          provider?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      trip_history: {
        Row: {
          created_at: string;
          detail: string;
          event: string;
          id: string;
          snapshot: Json | null;
          trip_id: string;
        };
        Insert: {
          created_at?: string;
          detail?: string;
          event: string;
          id?: string;
          snapshot?: Json | null;
          trip_id: string;
        };
        Update: {
          created_at?: string;
          detail?: string;
          event?: string;
          id?: string;
          snapshot?: Json | null;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_history_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      trips: {
        Row: {
          adults: number;
          automation_settings: Json;
          budget: number;
          children: number;
          created_at: string;
          currency: string;
          destination: string;
          end_date: string;
          extra_destinations: string[];
          id: string;
          interests: string[];
          is_demo: boolean;
          name: string;
          origin: string;
          preferences: Json;
          recovery_mode: string;
          start_date: string;
          status: string;
          travel_style: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          adults?: number;
          automation_settings?: Json;
          budget?: number;
          children?: number;
          created_at?: string;
          currency?: string;
          destination?: string;
          end_date: string;
          extra_destinations?: string[];
          id?: string;
          interests?: string[];
          is_demo?: boolean;
          name: string;
          origin?: string;
          preferences?: Json;
          recovery_mode?: string;
          start_date: string;
          status?: string;
          travel_style?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          adults?: number;
          automation_settings?: Json;
          budget?: number;
          children?: number;
          created_at?: string;
          currency?: string;
          destination?: string;
          end_date?: string;
          extra_destinations?: string[];
          id?: string;
          interests?: string[];
          is_demo?: boolean;
          name?: string;
          origin?: string;
          preferences?: Json;
          recovery_mode?: string;
          start_date?: string;
          status?: string;
          travel_style?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      owns_trip: { Args: { _trip_id: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
