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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcement_dismissals: {
        Row: {
          announcement_id: string
          dismissed_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          severity: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          severity?: string
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          severity?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      credit_balances: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          assigned_at: string | null
          assigned_order_id: string | null
          assigned_user: string | null
          assigned_user_id: string | null
          assignment_expires_at: string | null
          auth_type: string | null
          blacklisted: boolean
          city: string | null
          country: string
          created_at: string
          host: string | null
          id: string
          ip: string
          is_online: boolean
          isp: string | null
          last_checked_at: string | null
          last_view_at: string | null
          password: string | null
          port: number
          proxy_kind: string | null
          region: string | null
          speed: string | null
          status: Database["public"]["Enums"]["inventory_status"]
          updated_at: string
          username: string | null
          zipcode: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_order_id?: string | null
          assigned_user?: string | null
          assigned_user_id?: string | null
          assignment_expires_at?: string | null
          auth_type?: string | null
          blacklisted?: boolean
          city?: string | null
          country: string
          created_at?: string
          host?: string | null
          id?: string
          ip: string
          is_online?: boolean
          isp?: string | null
          last_checked_at?: string | null
          last_view_at?: string | null
          password?: string | null
          port: number
          proxy_kind?: string | null
          region?: string | null
          speed?: string | null
          status?: Database["public"]["Enums"]["inventory_status"]
          updated_at?: string
          username?: string | null
          zipcode?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_order_id?: string | null
          assigned_user?: string | null
          assigned_user_id?: string | null
          assignment_expires_at?: string | null
          auth_type?: string | null
          blacklisted?: boolean
          city?: string | null
          country?: string
          created_at?: string
          host?: string | null
          id?: string
          ip?: string
          is_online?: boolean
          isp?: string | null
          last_checked_at?: string | null
          last_view_at?: string | null
          password?: string | null
          port?: number
          proxy_kind?: string | null
          region?: string | null
          speed?: string | null
          status?: Database["public"]["Enums"]["inventory_status"]
          updated_at?: string
          username?: string | null
          zipcode?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          is_read: boolean
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          admin_notes: string | null
          amount_crypto: number | null
          amount_usd: number
          assigned_count: number
          created_at: string
          currency: Database["public"]["Enums"]["crypto_currency"]
          expires_at: string | null
          filters: Json
          id: string
          order_number: string
          plan_id: string
          screenshot_url: string | null
          status: Database["public"]["Enums"]["order_status"]
          submitted_at: string | null
          tx_hash: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
          wallet_address: string
        }
        Insert: {
          admin_notes?: string | null
          amount_crypto?: number | null
          amount_usd: number
          assigned_count?: number
          created_at?: string
          currency: Database["public"]["Enums"]["crypto_currency"]
          expires_at?: string | null
          filters?: Json
          id?: string
          order_number?: string
          plan_id: string
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          tx_hash?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
          wallet_address: string
        }
        Update: {
          admin_notes?: string | null
          amount_crypto?: number | null
          amount_usd?: number
          assigned_count?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["crypto_currency"]
          expires_at?: string | null
          filters?: Json
          id?: string
          order_number?: string
          plan_id?: string
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          credits: number | null
          description: string | null
          duration_days: number | null
          fair_use_limit: number | null
          id: string
          is_active: boolean
          max_reveals: number | null
          name: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_usd: number
          sort_order: number
          unlimited: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number | null
          description?: string | null
          duration_days?: number | null
          fair_use_limit?: number | null
          id?: string
          is_active?: boolean
          max_reveals?: number | null
          name: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_usd: number
          sort_order?: number
          unlimited?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number | null
          description?: string | null
          duration_days?: number | null
          fair_use_limit?: number | null
          id?: string
          is_active?: boolean
          max_reveals?: number | null
          name?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price_usd?: number
          sort_order?: number
          unlimited?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_reveals: number | null
          plan_id: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          reveals_used: number
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_reveals?: number | null
          plan_id: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          reveals_used?: number
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_reveals?: number | null
          plan_id?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          reveals_used?: number
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachment_url: string | null
          author_id: string
          body: string
          created_at: string
          id: string
          is_admin: boolean
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_admin?: boolean
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
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
      viewed_proxies: {
        Row: {
          city: string | null
          country: string | null
          expires_at: string
          id: string
          inventory_id: string
          ip: string
          isp: string | null
          password: string | null
          port: number
          revealed_at: string
          source: Database["public"]["Enums"]["reveal_source"]
          user_id: string
          username: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          expires_at?: string
          id?: string
          inventory_id: string
          ip: string
          isp?: string | null
          password?: string | null
          port: number
          revealed_at?: string
          source: Database["public"]["Enums"]["reveal_source"]
          user_id: string
          username?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          expires_at?: string
          id?: string
          inventory_id?: string
          ip?: string
          isp?: string | null
          password?: string | null
          port?: number
          revealed_at?: string
          source?: Database["public"]["Enums"]["reveal_source"]
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viewed_proxies_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewed_proxies_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_listing"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      inventory_listing: {
        Row: {
          auth_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          host: string | null
          id: string | null
          isp: string | null
          proxy_kind: string | null
          region: string | null
          speed: string | null
          status: Database["public"]["Enums"]["inventory_status"] | null
          zipcode: string | null
        }
        Insert: {
          auth_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          host?: string | null
          id?: string | null
          isp?: string | null
          proxy_kind?: string | null
          region?: string | null
          speed?: string | null
          status?: Database["public"]["Enums"]["inventory_status"] | null
          zipcode?: string | null
        }
        Update: {
          auth_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          host?: string | null
          id?: string | null
          isp?: string | null
          proxy_kind?: string | null
          region?: string | null
          speed?: string | null
          status?: Database["public"]["Enums"]["inventory_status"] | null
          zipcode?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_order: { Args: { _order_id: string }; Returns: string }
      assign_proxies_for_order: { Args: { _order_id: string }; Returns: number }
      claim_first_admin: { Args: never; Returns: boolean }
      grant_admin: { Args: { _email: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reject_order: {
        Args: { _order_id: string; _reason: string }
        Returns: undefined
      }
      release_expired_assignments: { Args: never; Returns: number }
      reveal_proxy: {
        Args: {
          _inventory_id: string
          _source: Database["public"]["Enums"]["reveal_source"]
        }
        Returns: {
          ip: string
          password: string
          port: number
          username: string
          view_id: string
        }[]
      }
      revoke_admin: { Args: { _email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      crypto_currency: "BTC" | "LTC" | "USDT_TRC20" | "USDT_ERC20" | "USDC"
      inventory_status: "available" | "assigned" | "archived"
      order_status:
        | "pending_payment"
        | "submitted"
        | "verified"
        | "rejected"
        | "expired"
      plan_type: "time" | "credit" | "lifetime"
      reveal_source: "time_plan" | "credit"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status: "open" | "pending" | "closed"
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
      app_role: ["admin", "user"],
      crypto_currency: ["BTC", "LTC", "USDT_TRC20", "USDT_ERC20", "USDC"],
      inventory_status: ["available", "assigned", "archived"],
      order_status: [
        "pending_payment",
        "submitted",
        "verified",
        "rejected",
        "expired",
      ],
      plan_type: ["time", "credit", "lifetime"],
      reveal_source: ["time_plan", "credit"],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: ["open", "pending", "closed"],
    },
  },
} as const
