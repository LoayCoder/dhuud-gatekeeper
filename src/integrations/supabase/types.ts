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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      branches: {
        Row: {
          created_at: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          division_id: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          division_id: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          division_id?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "divisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          tenant_id: string
          used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          tenant_id: string
          used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          tenant_id?: string
          used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assigned_branch_id: string | null
          assigned_department_id: string | null
          assigned_division_id: string | null
          assigned_section_id: string | null
          assigned_site_id: string | null
          avatar_url: string | null
          created_at: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          id: string
          phone_number: string | null
          preferred_language: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_branch_id?: string | null
          assigned_department_id?: string | null
          assigned_division_id?: string | null
          assigned_section_id?: string | null
          assigned_site_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          id: string
          phone_number?: string | null
          preferred_language?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_branch_id?: string | null
          assigned_department_id?: string | null
          assigned_division_id?: string | null
          assigned_section_id?: string | null
          assigned_site_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          preferred_language?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_assigned_branch_id_fkey"
            columns: ["assigned_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_assigned_department_id_fkey"
            columns: ["assigned_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_assigned_division_id_fkey"
            columns: ["assigned_division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_assigned_section_id_fkey"
            columns: ["assigned_section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_assigned_site_id_fkey"
            columns: ["assigned_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          created_at: string | null
          department_id: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          department_id: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_blacklist: {
        Row: {
          full_name: string | null
          id: string
          listed_at: string | null
          listed_by: string | null
          national_id: string | null
          reason: string | null
          tenant_id: string
        }
        Insert: {
          full_name?: string | null
          id?: string
          listed_at?: string | null
          listed_by?: string | null
          national_id?: string | null
          reason?: string | null
          tenant_id: string
        }
        Update: {
          full_name?: string | null
          id?: string
          listed_at?: string | null
          listed_by?: string | null
          national_id?: string | null
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_blacklist_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          branch_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          tenant_id: string
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          tenant_id: string
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          app_icon_dark_url: string | null
          app_icon_light_url: string | null
          background_color: string | null
          background_image_url: string | null
          background_theme: string | null
          brand_color: string
          brand_color_dark: string | null
          created_at: string | null
          favicon_url: string | null
          id: string
          logo_dark_url: string | null
          logo_light_url: string | null
          name: string
          secondary_color: string | null
          secondary_color_dark: string | null
          sidebar_icon_dark_url: string | null
          sidebar_icon_light_url: string | null
          slug: string
        }
        Insert: {
          app_icon_dark_url?: string | null
          app_icon_light_url?: string | null
          background_color?: string | null
          background_image_url?: string | null
          background_theme?: string | null
          brand_color?: string
          brand_color_dark?: string | null
          created_at?: string | null
          favicon_url?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_light_url?: string | null
          name: string
          secondary_color?: string | null
          secondary_color_dark?: string | null
          sidebar_icon_dark_url?: string | null
          sidebar_icon_light_url?: string | null
          slug: string
        }
        Update: {
          app_icon_dark_url?: string | null
          app_icon_light_url?: string | null
          background_color?: string | null
          background_image_url?: string | null
          background_theme?: string | null
          brand_color?: string
          brand_color_dark?: string | null
          created_at?: string | null
          favicon_url?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_light_url?: string | null
          name?: string
          secondary_color?: string | null
          secondary_color_dark?: string | null
          sidebar_icon_dark_url?: string | null
          sidebar_icon_light_url?: string | null
          slug?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id: string
          metadata: Json | null
          session_duration_seconds: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          metadata?: Json | null
          session_duration_seconds?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          metadata?: Json | null
          session_duration_seconds?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visit_requests: {
        Row: {
          approved_by: string | null
          created_at: string | null
          host_id: string
          id: string
          security_notes: string | null
          site_id: string
          status: Database["public"]["Enums"]["visit_status"] | null
          tenant_id: string
          valid_from: string
          valid_until: string
          visitor_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          host_id: string
          id?: string
          security_notes?: string | null
          site_id: string
          status?: Database["public"]["Enums"]["visit_status"] | null
          tenant_id: string
          valid_from: string
          valid_until: string
          visitor_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          host_id?: string
          id?: string
          security_notes?: string | null
          site_id?: string
          status?: Database["public"]["Enums"]["visit_status"] | null
          tenant_id?: string
          valid_from?: string
          valid_until?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_requests_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          last_visit_at: string | null
          national_id: string | null
          qr_code_token: string
          tenant_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          last_visit_at?: string | null
          national_id?: string | null
          qr_code_token?: string
          tenant_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_visit_at?: string | null
          national_id?: string | null
          qr_code_token?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_tenant_id: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_invitation: { Args: { lookup_code: string }; Returns: Json }
    }
    Enums: {
      activity_event_type:
        | "login"
        | "logout"
        | "session_timeout"
        | "session_extended"
        | "mfa_enabled"
        | "mfa_disabled"
        | "mfa_verification_failed"
      app_role: "admin" | "user"
      visit_status:
        | "pending_security"
        | "approved"
        | "rejected"
        | "checked_in"
        | "checked_out"
        | "expired"
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
      activity_event_type: [
        "login",
        "logout",
        "session_timeout",
        "session_extended",
        "mfa_enabled",
        "mfa_disabled",
        "mfa_verification_failed",
      ],
      app_role: ["admin", "user"],
      visit_status: [
        "pending_security",
        "approved",
        "rejected",
        "checked_in",
        "checked_out",
        "expired",
      ],
    },
  },
} as const
