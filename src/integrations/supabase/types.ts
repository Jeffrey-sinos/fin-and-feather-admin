export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          content: string
          created_at: string
          featured_image: string | null
          id: string
          published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          featured_image?: string | null
          id?: string
          published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          featured_image?: string | null
          id?: string
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          completed_at: string | null
          created_at: string
          email_html_body: string | null
          email_subject: string | null
          error_message: string | null
          failed_count: number | null
          id: string
          name: string
          sent_count: number | null
          sms_text: string | null
          started_at: string | null
          status: string
          total_recipients: number | null
          type: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          email_html_body?: string | null
          email_subject?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          name: string
          sent_count?: number | null
          sms_text?: string | null
          started_at?: string | null
          status?: string
          total_recipients?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          email_html_body?: string | null
          email_subject?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          name?: string
          sent_count?: number | null
          sms_text?: string | null
          started_at?: string | null
          status?: string
          total_recipients?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_numbers: {
        Row: {
          created_at: string
          id: string
          opt_in_reason: string
          phone_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          opt_in_reason: string
          phone_number: string
        }
        Update: {
          created_at?: string
          id?: string
          opt_in_reason?: string
          phone_number?: string
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          base_fee: number
          created_at: string
          estimated_time_mins: number
          id: string
          is_active: boolean
          max_distance_km: number
          min_distance_km: number
          name: string
          per_km_rate: number
          updated_at: string
        }
        Insert: {
          base_fee?: number
          created_at?: string
          estimated_time_mins?: number
          id?: string
          is_active?: boolean
          max_distance_km: number
          min_distance_km?: number
          name: string
          per_km_rate?: number
          updated_at?: string
        }
        Update: {
          base_fee?: number
          created_at?: string
          estimated_time_mins?: number
          id?: string
          is_active?: boolean
          max_distance_km?: number
          min_distance_km?: number
          name?: string
          per_km_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          attempted_at: string | null
          email: string
          id: string
          ip_address: unknown | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string | null
          email: string
          id?: string
          ip_address?: unknown | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string | null
          email?: string
          id?: string
          ip_address?: unknown | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      message_delivery_logs: {
        Row: {
          brevo_message_id: string | null
          campaign_id: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          recipient_address: string
          recipient_type: string
          sent_at: string | null
          status: string
          webhook_data: Json | null
        }
        Insert: {
          brevo_message_id?: string | null
          campaign_id: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          recipient_address: string
          recipient_type: string
          sent_at?: string | null
          status?: string
          webhook_data?: Json | null
        }
        Update: {
          brevo_message_id?: string | null
          campaign_id?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          recipient_address?: string
          recipient_type?: string
          sent_at?: string | null
          status?: string
          webhook_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "message_delivery_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscriptions: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          id: string
          profile_change_alerts: boolean | null
          suspicious_activity_alerts: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_change_alerts?: boolean | null
          suspicious_activity_alerts?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_change_alerts?: boolean | null
          suspicious_activity_alerts?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          delivery_address: string | null
          delivery_distance_km: number | null
          delivery_fee: number | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          delivery_zone_id: string | null
          estimated_delivery_time: number | null
          id: string
          pesapal_transaction_id: string | null
          status: string
          total_amount: number
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_address?: string | null
          delivery_distance_km?: number | null
          delivery_fee?: number | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_zone_id?: string | null
          estimated_delivery_time?: number | null
          id?: string
          pesapal_transaction_id?: string | null
          status?: string
          total_amount?: number
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_address?: string | null
          delivery_distance_km?: number | null
          delivery_fee?: number | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_zone_id?: string | null
          estimated_delivery_time?: number | null
          id?: string
          pesapal_transaction_id?: string | null
          status?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pesapal_transaction_id_fkey"
            columns: ["pesapal_transaction_id"]
            isOneToOne: false
            referencedRelation: "pesapal_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      page_content: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          meta_description: string | null
          published: boolean
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          meta_description?: string | null
          published?: boolean
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          meta_description?: string | null
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_content_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_content_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pesapal_callbacks: {
        Row: {
          callback_type: string
          created_at: string
          id: string
          pesapal_tracking_id: string
          processed: boolean
          raw_payload: Json
        }
        Insert: {
          callback_type: string
          created_at?: string
          id?: string
          pesapal_tracking_id: string
          processed?: boolean
          raw_payload: Json
        }
        Update: {
          callback_type?: string
          created_at?: string
          id?: string
          pesapal_tracking_id?: string
          processed?: boolean
          raw_payload?: Json
        }
        Relationships: []
      }
      pesapal_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_phone: string | null
          customer_phone_display: string | null
          id: string
          iframe_url: string | null
          merchant_reference: string
          order_id: string
          pesapal_tracking_id: string
          status: Database["public"]["Enums"]["pesapal_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_phone?: string | null
          customer_phone_display?: string | null
          id?: string
          iframe_url?: string | null
          merchant_reference: string
          order_id: string
          pesapal_tracking_id: string
          status?: Database["public"]["Enums"]["pesapal_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_phone?: string | null
          customer_phone_display?: string | null
          id?: string
          iframe_url?: string | null
          merchant_reference?: string
          order_id?: string
          pesapal_tracking_id?: string
          status?: Database["public"]["Enums"]["pesapal_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesapal_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          stock: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          stock?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: string
          new_stock: number
          order_id: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: string
          new_stock: number
          order_id?: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: string
          new_stock?: number
          order_id?: string | null
          previous_stock?: number
          product_id?: string
          quantity?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_delivery_fee: {
        Args: { distance_km: number }
        Returns: Json
      }
      check_failed_login_threshold: {
        Args: { ip_addr: unknown; user_email: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit_access: {
        Args: {
          action_param: string
          record_id_param?: string
          table_name_param: string
        }
        Returns: undefined
      }
      mask_customer_phone: {
        Args: { phone_number: string }
        Returns: string
      }
      mask_customer_phone_enhanced: {
        Args: { phone_number: string }
        Returns: string
      }
      reduce_product_stock: {
        Args: { order_id_param: string }
        Returns: boolean
      }
      user_owns_transaction: {
        Args: { transaction_order_id: string }
        Returns: boolean
      }
      user_owns_transaction_with_audit: {
        Args: { transaction_order_id: string }
        Returns: boolean
      }
      validate_phone_number: {
        Args: { phone: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      pesapal_status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      pesapal_status: ["PENDING", "COMPLETED", "FAILED", "CANCELLED"],
    },
  },
} as const
