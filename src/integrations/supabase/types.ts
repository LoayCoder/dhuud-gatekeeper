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
      modules: {
        Row: {
          base_price_monthly: number | null
          base_price_yearly: number | null
          code: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          base_price_monthly?: number | null
          base_price_yearly?: number | null
          code: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          base_price_monthly?: number | null
          base_price_yearly?: number | null
          code?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      plan_modules: {
        Row: {
          created_at: string | null
          custom_price: number | null
          id: string
          included_in_base: boolean | null
          module: Database["public"]["Enums"]["module_code"]
          module_id: string | null
          plan_id: string
        }
        Insert: {
          created_at?: string | null
          custom_price?: number | null
          id?: string
          included_in_base?: boolean | null
          module: Database["public"]["Enums"]["module_code"]
          module_id?: string | null
          plan_id: string
        }
        Update: {
          created_at?: string | null
          custom_price?: number | null
          id?: string
          included_in_base?: boolean | null
          module?: Database["public"]["Enums"]["module_code"]
          module_id?: string | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_modules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          base_price_monthly: number | null
          created_at: string | null
          description: string | null
          display_name: string
          extra_profile_price_sar: number | null
          features: Json | null
          id: string
          included_users: number | null
          is_active: boolean | null
          is_custom: boolean | null
          max_users: number
          name: string
          price_monthly: number
          price_per_user: number | null
          price_per_user_yearly: number | null
          price_yearly: number | null
          profile_quota_monthly: number | null
          sort_order: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
        }
        Insert: {
          base_price_monthly?: number | null
          created_at?: string | null
          description?: string | null
          display_name: string
          extra_profile_price_sar?: number | null
          features?: Json | null
          id?: string
          included_users?: number | null
          is_active?: boolean | null
          is_custom?: boolean | null
          max_users?: number
          name: string
          price_monthly?: number
          price_per_user?: number | null
          price_per_user_yearly?: number | null
          price_yearly?: number | null
          profile_quota_monthly?: number | null
          sort_order?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
        }
        Update: {
          base_price_monthly?: number | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          extra_profile_price_sar?: number | null
          features?: Json | null
          id?: string
          included_users?: number | null
          is_active?: boolean | null
          is_custom?: boolean | null
          max_users?: number
          name?: string
          price_monthly?: number
          price_per_user?: number | null
          price_per_user_yearly?: number | null
          price_yearly?: number | null
          profile_quota_monthly?: number | null
          sort_order?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assigned_branch_id: string | null
          assigned_department_id: string | null
          assigned_division_id: string | null
          assigned_section_id: string | null
          assigned_site_id: string | null
          avatar_url: string | null
          contract_end: string | null
          contract_start: string | null
          contractor_company_name: string | null
          contractor_type: Database["public"]["Enums"]["contractor_type"] | null
          created_at: string | null
          deleted_at: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_id: string | null
          full_name: string | null
          has_login: boolean | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          job_title: string | null
          membership_end: string | null
          membership_id: string | null
          membership_start: string | null
          phone_number: string | null
          preferred_language: string | null
          tenant_id: string
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
        }
        Insert: {
          assigned_branch_id?: string | null
          assigned_department_id?: string | null
          assigned_division_id?: string | null
          assigned_section_id?: string | null
          assigned_site_id?: string | null
          avatar_url?: string | null
          contract_end?: string | null
          contract_start?: string | null
          contractor_company_name?: string | null
          contractor_type?:
            | Database["public"]["Enums"]["contractor_type"]
            | null
          created_at?: string | null
          deleted_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          full_name?: string | null
          has_login?: boolean | null
          id: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          job_title?: string | null
          membership_end?: string | null
          membership_id?: string | null
          membership_start?: string | null
          phone_number?: string | null
          preferred_language?: string | null
          tenant_id: string
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Update: {
          assigned_branch_id?: string | null
          assigned_department_id?: string | null
          assigned_division_id?: string | null
          assigned_section_id?: string | null
          assigned_site_id?: string | null
          avatar_url?: string | null
          contract_end?: string | null
          contract_start?: string | null
          contractor_company_name?: string | null
          contractor_type?:
            | Database["public"]["Enums"]["contractor_type"]
            | null
          created_at?: string | null
          deleted_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          full_name?: string | null
          has_login?: boolean | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          job_title?: string | null
          membership_end?: string | null
          membership_id?: string | null
          membership_start?: string | null
          phone_number?: string | null
          preferred_language?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
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
      subscription_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: Database["public"]["Enums"]["subscription_event_type"]
          id: string
          new_value: Json | null
          performed_by: string | null
          previous_value: Json | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: Database["public"]["Enums"]["subscription_event_type"]
          id?: string
          new_value?: Json | null
          performed_by?: string | null
          previous_value?: Json | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: Database["public"]["Enums"]["subscription_event_type"]
          id?: string
          new_value?: Json | null
          performed_by?: string | null
          previous_value?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_requests: {
        Row: {
          admin_notes: string | null
          approved_modules: string[] | null
          approved_plan_id: string | null
          approved_total_monthly: number | null
          approved_user_limit: number | null
          billing_period: string | null
          calculated_base_price: number | null
          calculated_module_price: number | null
          calculated_total_monthly: number | null
          calculated_user_price: number | null
          created_at: string | null
          id: string
          request_type: Database["public"]["Enums"]["subscription_request_type"]
          requested_modules: string[] | null
          requested_plan_id: string | null
          requested_user_limit: number
          reviewed_at: string | null
          reviewed_by: string | null
          status:
            | Database["public"]["Enums"]["subscription_request_status"]
            | null
          tenant_id: string
          tenant_notes: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_modules?: string[] | null
          approved_plan_id?: string | null
          approved_total_monthly?: number | null
          approved_user_limit?: number | null
          billing_period?: string | null
          calculated_base_price?: number | null
          calculated_module_price?: number | null
          calculated_total_monthly?: number | null
          calculated_user_price?: number | null
          created_at?: string | null
          id?: string
          request_type?: Database["public"]["Enums"]["subscription_request_type"]
          requested_modules?: string[] | null
          requested_plan_id?: string | null
          requested_user_limit?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?:
            | Database["public"]["Enums"]["subscription_request_status"]
            | null
          tenant_id: string
          tenant_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_modules?: string[] | null
          approved_plan_id?: string | null
          approved_total_monthly?: number | null
          approved_user_limit?: number | null
          billing_period?: string | null
          calculated_base_price?: number | null
          calculated_module_price?: number | null
          calculated_total_monthly?: number | null
          calculated_user_price?: number | null
          created_at?: string | null
          id?: string
          request_type?: Database["public"]["Enums"]["subscription_request_type"]
          requested_modules?: string[] | null
          requested_plan_id?: string | null
          requested_user_limit?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?:
            | Database["public"]["Enums"]["subscription_request_status"]
            | null
          tenant_id?: string
          tenant_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_requests_approved_plan_id_fkey"
            columns: ["approved_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_requests_requested_plan_id_fkey"
            columns: ["requested_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"] | null
          closed_at: string | null
          created_at: string | null
          created_by: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          tenant_id: string
          ticket_number: number
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"] | null
          closed_at?: string | null
          created_at?: string | null
          created_by: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          tenant_id: string
          ticket_number?: number
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"] | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject?: string
          tenant_id?: string
          ticket_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_billing_records: {
        Row: {
          billable_profiles: number | null
          billing_month: string
          contractor_count: number | null
          created_at: string | null
          free_quota: number | null
          id: string
          licensed_user_charges: number | null
          licensed_users: number | null
          member_count: number | null
          plan_id: string | null
          profile_charges: number | null
          rate_per_profile: number | null
          status: string | null
          tenant_id: string
          total_charge: number | null
          total_profiles: number | null
          visitor_count: number | null
        }
        Insert: {
          billable_profiles?: number | null
          billing_month: string
          contractor_count?: number | null
          created_at?: string | null
          free_quota?: number | null
          id?: string
          licensed_user_charges?: number | null
          licensed_users?: number | null
          member_count?: number | null
          plan_id?: string | null
          profile_charges?: number | null
          rate_per_profile?: number | null
          status?: string | null
          tenant_id: string
          total_charge?: number | null
          total_profiles?: number | null
          visitor_count?: number | null
        }
        Update: {
          billable_profiles?: number | null
          billing_month?: string
          contractor_count?: number | null
          created_at?: string | null
          free_quota?: number | null
          id?: string
          licensed_user_charges?: number | null
          licensed_users?: number | null
          member_count?: number | null
          plan_id?: string | null
          profile_charges?: number | null
          rate_per_profile?: number | null
          status?: string | null
          tenant_id?: string
          total_charge?: number | null
          total_profiles?: number | null
          visitor_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_billing_records_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_billing_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modules: {
        Row: {
          created_at: string
          disabled_at: string | null
          disabled_by: string | null
          enabled: boolean
          enabled_at: string | null
          enabled_by: string | null
          id: string
          module_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disabled_at?: string | null
          disabled_by?: string | null
          enabled?: boolean
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          module_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disabled_at?: string | null
          disabled_by?: string | null
          enabled?: boolean
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          module_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_profile_usage: {
        Row: {
          billing_month: string
          contractor_count: number | null
          created_at: string | null
          id: string
          member_count: number | null
          tenant_id: string
          total_profiles: number | null
          updated_at: string | null
          visitor_count: number | null
        }
        Insert: {
          billing_month: string
          contractor_count?: number | null
          created_at?: string | null
          id?: string
          member_count?: number | null
          tenant_id: string
          total_profiles?: number | null
          updated_at?: string | null
          visitor_count?: number | null
        }
        Update: {
          billing_month?: string
          contractor_count?: number | null
          created_at?: string | null
          id?: string
          member_count?: number | null
          tenant_id?: string
          total_profiles?: number | null
          updated_at?: string | null
          visitor_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_profile_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_profiles: {
        Row: {
          company_name: string | null
          contract_end: string | null
          contract_start: string | null
          contractor_type: Database["public"]["Enums"]["contractor_type"] | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          has_login: boolean | null
          host_id: string | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          membership_end: string | null
          membership_id: string | null
          membership_start: string | null
          national_id: string | null
          phone: string | null
          profile_type: Database["public"]["Enums"]["profile_type"]
          tenant_id: string
          updated_at: string | null
          visit_date: string | null
          visit_duration_hours: number | null
          visit_reason: string | null
        }
        Insert: {
          company_name?: string | null
          contract_end?: string | null
          contract_start?: string | null
          contractor_type?:
            | Database["public"]["Enums"]["contractor_type"]
            | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          has_login?: boolean | null
          host_id?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          membership_end?: string | null
          membership_id?: string | null
          membership_start?: string | null
          national_id?: string | null
          phone?: string | null
          profile_type: Database["public"]["Enums"]["profile_type"]
          tenant_id: string
          updated_at?: string | null
          visit_date?: string | null
          visit_duration_hours?: number | null
          visit_reason?: string | null
        }
        Update: {
          company_name?: string | null
          contract_end?: string | null
          contract_start?: string | null
          contractor_type?:
            | Database["public"]["Enums"]["contractor_type"]
            | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          has_login?: boolean | null
          host_id?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          membership_end?: string | null
          membership_id?: string | null
          membership_start?: string | null
          national_id?: string | null
          phone?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"]
          tenant_id?: string
          updated_at?: string | null
          visit_date?: string | null
          visit_duration_hours?: number | null
          visit_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_profiles_tenant_id_fkey"
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
          billing_email: string | null
          brand_color: string
          brand_color_dark: string | null
          city: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          country: string | null
          cr_number: string | null
          created_at: string | null
          employee_count: number | null
          favicon_url: string | null
          id: string
          industry: string | null
          logo_dark_url: string | null
          logo_light_url: string | null
          max_users_override: number | null
          name: string
          notes: string | null
          plan_id: string | null
          secondary_color: string | null
          secondary_color_dark: string | null
          sidebar_icon_dark_url: string | null
          sidebar_icon_light_url: string | null
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          app_icon_dark_url?: string | null
          app_icon_light_url?: string | null
          background_color?: string | null
          background_image_url?: string | null
          background_theme?: string | null
          billing_email?: string | null
          brand_color?: string
          brand_color_dark?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          cr_number?: string | null
          created_at?: string | null
          employee_count?: number | null
          favicon_url?: string | null
          id?: string
          industry?: string | null
          logo_dark_url?: string | null
          logo_light_url?: string | null
          max_users_override?: number | null
          name: string
          notes?: string | null
          plan_id?: string | null
          secondary_color?: string | null
          secondary_color_dark?: string | null
          sidebar_icon_dark_url?: string | null
          sidebar_icon_light_url?: string | null
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          app_icon_dark_url?: string | null
          app_icon_light_url?: string | null
          background_color?: string | null
          background_image_url?: string | null
          background_theme?: string | null
          billing_email?: string | null
          brand_color?: string
          brand_color_dark?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          cr_number?: string | null
          created_at?: string | null
          employee_count?: number | null
          favicon_url?: string | null
          id?: string
          industry?: string | null
          logo_dark_url?: string | null
          logo_light_url?: string | null
          max_users_override?: number | null
          name?: string
          notes?: string | null
          plan_id?: string | null
          secondary_color?: string | null
          secondary_color_dark?: string | null
          sidebar_icon_dark_url?: string | null
          sidebar_icon_light_url?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          is_internal: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
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
      calculate_profile_billing: {
        Args: { p_billing_month: string; p_tenant_id: string }
        Returns: Json
      }
      calculate_subscription_price:
        | {
            Args: {
              p_module_ids: string[]
              p_plan_id: string
              p_user_count: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_billing_period?: string
              p_module_ids: string[]
              p_plan_id: string
              p_user_count: number
            }
            Returns: Json
          }
      can_view_sensitive_profile_data: {
        Args: { profile_user_id: string }
        Returns: boolean
      }
      can_view_visitor_pii: { Args: never; Returns: boolean }
      check_licensed_user_quota: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      check_user_limit: { Args: { p_tenant_id: string }; Returns: boolean }
      get_auth_tenant_id: { Args: never; Returns: string }
      get_current_month_usage: { Args: { p_tenant_id: string }; Returns: Json }
      get_tenant_modules: {
        Args: { p_tenant_id: string }
        Returns: Database["public"]["Enums"]["module_code"][]
      }
      get_tenant_modules_with_overrides: {
        Args: { p_tenant_id: string }
        Returns: {
          is_enabled: boolean
          module_code: string
          module_id: string
          module_name: string
          source: string
        }[]
      }
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
        | "user_created"
        | "user_updated"
        | "user_deactivated"
        | "user_activated"
        | "user_deleted"
      app_role: "admin" | "user"
      contractor_type: "long_term" | "short_term"
      module_code:
        | "hsse_core"
        | "visitor_management"
        | "incidents"
        | "audits"
        | "reports_analytics"
        | "api_access"
        | "priority_support"
      profile_type: "visitor" | "member" | "contractor"
      subscription_event_type:
        | "plan_changed"
        | "trial_started"
        | "trial_ended"
        | "subscription_activated"
        | "subscription_canceled"
        | "subscription_renewed"
        | "user_limit_changed"
        | "payment_succeeded"
        | "payment_failed"
        | "request_submitted"
        | "request_approved"
        | "request_declined"
        | "request_modified"
      subscription_request_status:
        | "pending"
        | "under_review"
        | "approved"
        | "declined"
        | "modified"
        | "canceled"
      subscription_request_type:
        | "new"
        | "upgrade"
        | "downgrade"
        | "modify"
        | "cancel"
      tenant_status: "active" | "suspended" | "disabled"
      ticket_category: "billing" | "technical" | "feature_request" | "general"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_customer"
        | "resolved"
        | "closed"
      user_type:
        | "employee"
        | "contractor_longterm"
        | "contractor_shortterm"
        | "member"
        | "visitor"
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
        "user_created",
        "user_updated",
        "user_deactivated",
        "user_activated",
        "user_deleted",
      ],
      app_role: ["admin", "user"],
      contractor_type: ["long_term", "short_term"],
      module_code: [
        "hsse_core",
        "visitor_management",
        "incidents",
        "audits",
        "reports_analytics",
        "api_access",
        "priority_support",
      ],
      profile_type: ["visitor", "member", "contractor"],
      subscription_event_type: [
        "plan_changed",
        "trial_started",
        "trial_ended",
        "subscription_activated",
        "subscription_canceled",
        "subscription_renewed",
        "user_limit_changed",
        "payment_succeeded",
        "payment_failed",
        "request_submitted",
        "request_approved",
        "request_declined",
        "request_modified",
      ],
      subscription_request_status: [
        "pending",
        "under_review",
        "approved",
        "declined",
        "modified",
        "canceled",
      ],
      subscription_request_type: [
        "new",
        "upgrade",
        "downgrade",
        "modify",
        "cancel",
      ],
      tenant_status: ["active", "suspended", "disabled"],
      ticket_category: ["billing", "technical", "feature_request", "general"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_customer",
        "resolved",
        "closed",
      ],
      user_type: [
        "employee",
        "contractor_longterm",
        "contractor_shortterm",
        "member",
        "visitor",
      ],
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
