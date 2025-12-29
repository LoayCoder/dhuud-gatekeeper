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
      action_evidence: {
        Row: {
          action_id: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          storage_path: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          action_id: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          action_id?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_evidence_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_evidence_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      action_extension_requests: {
        Row: {
          action_id: string
          created_at: string | null
          current_due_date: string
          deleted_at: string | null
          extension_reason: string
          hsse_manager_decision_at: string | null
          hsse_manager_id: string | null
          hsse_manager_notes: string | null
          hsse_manager_status: string | null
          id: string
          manager_decision_at: string | null
          manager_id: string | null
          manager_notes: string | null
          manager_status: string | null
          requested_at: string | null
          requested_by: string
          requested_due_date: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          action_id: string
          created_at?: string | null
          current_due_date: string
          deleted_at?: string | null
          extension_reason: string
          hsse_manager_decision_at?: string | null
          hsse_manager_id?: string | null
          hsse_manager_notes?: string | null
          hsse_manager_status?: string | null
          id?: string
          manager_decision_at?: string | null
          manager_id?: string | null
          manager_notes?: string | null
          manager_status?: string | null
          requested_at?: string | null
          requested_by: string
          requested_due_date: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          action_id?: string
          created_at?: string | null
          current_due_date?: string
          deleted_at?: string | null
          extension_reason?: string
          hsse_manager_decision_at?: string | null
          hsse_manager_id?: string | null
          hsse_manager_notes?: string | null
          hsse_manager_status?: string | null
          id?: string
          manager_decision_at?: string | null
          manager_id?: string | null
          manager_notes?: string | null
          manager_status?: string | null
          requested_at?: string | null
          requested_by?: string
          requested_due_date?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_extension_requests_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_extension_requests_hsse_manager_id_fkey"
            columns: ["hsse_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_extension_requests_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_extension_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_extension_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      action_sla_configs: {
        Row: {
          created_at: string | null
          escalation_days_after: number
          id: string
          priority: string
          second_escalation_days_after: number | null
          updated_at: string | null
          warning_days_before: number
        }
        Insert: {
          created_at?: string | null
          escalation_days_after?: number
          id?: string
          priority: string
          second_escalation_days_after?: number | null
          updated_at?: string | null
          warning_days_before?: number
        }
        Update: {
          created_at?: string | null
          escalation_days_after?: number
          id?: string
          priority?: string
          second_escalation_days_after?: number | null
          updated_at?: string | null
          warning_days_before?: number
        }
        Relationships: []
      }
      agent_stats: {
        Row: {
          agent_id: string
          avg_first_response_minutes: number | null
          avg_resolution_minutes: number | null
          created_at: string | null
          id: string
          sla_breaches: number | null
          stats_date: string
          tickets_assigned: number | null
          tickets_closed: number | null
          tickets_resolved: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          avg_first_response_minutes?: number | null
          avg_resolution_minutes?: number | null
          created_at?: string | null
          id?: string
          sla_breaches?: number | null
          stats_date?: string
          tickets_assigned?: number | null
          tickets_closed?: number | null
          tickets_resolved?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          avg_first_response_minutes?: number | null
          avg_resolution_minutes?: number | null
          created_at?: string | null
          id?: string
          sla_breaches?: number | null
          stats_date?: string
          tickets_assigned?: number | null
          tickets_closed?: number | null
          tickets_resolved?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      approval_delegations: {
        Row: {
          approval_types: string[]
          created_at: string
          created_by: string | null
          delegate_id: string
          delegator_id: string
          end_date: string
          id: string
          is_active: boolean
          reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          start_date: string
          tenant_id: string
        }
        Insert: {
          approval_types?: string[]
          created_at?: string
          created_by?: string | null
          delegate_id: string
          delegator_id: string
          end_date: string
          id?: string
          is_active?: boolean
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          start_date: string
          tenant_id: string
        }
        Update: {
          approval_types?: string[]
          created_at?: string
          created_by?: string | null
          delegate_id?: string
          delegator_id?: string
          end_date?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          start_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_delegations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_escalation_config: {
        Row: {
          approval_type: string
          created_at: string
          escalate_after_hours: number
          escalate_to_role: string | null
          escalate_to_user_id: string | null
          escalation_level: number
          id: string
          is_active: boolean
          send_reminder_hours: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approval_type: string
          created_at?: string
          escalate_after_hours?: number
          escalate_to_role?: string | null
          escalate_to_user_id?: string | null
          escalation_level?: number
          id?: string
          is_active?: boolean
          send_reminder_hours?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approval_type?: string
          created_at?: string
          escalate_after_hours?: number
          escalate_to_role?: string | null
          escalate_to_user_id?: string | null
          escalation_level?: number
          id?: string
          is_active?: boolean
          send_reminder_hours?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_escalation_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      area_inspection_findings: {
        Row: {
          classification: string
          closed_at: string | null
          closed_by: string | null
          corrective_action_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          escalation_level: number | null
          escalation_notes: string | null
          id: string
          last_escalated_at: string | null
          recommendation: string | null
          reference_id: string
          response_id: string
          risk_level: string | null
          session_id: string
          status: string | null
          tenant_id: string
          warning_sent_at: string | null
        }
        Insert: {
          classification?: string
          closed_at?: string | null
          closed_by?: string | null
          corrective_action_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          escalation_level?: number | null
          escalation_notes?: string | null
          id?: string
          last_escalated_at?: string | null
          recommendation?: string | null
          reference_id: string
          response_id: string
          risk_level?: string | null
          session_id: string
          status?: string | null
          tenant_id: string
          warning_sent_at?: string | null
        }
        Update: {
          classification?: string
          closed_at?: string | null
          closed_by?: string | null
          corrective_action_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          escalation_level?: number | null
          escalation_notes?: string | null
          id?: string
          last_escalated_at?: string | null
          recommendation?: string | null
          reference_id?: string
          response_id?: string
          risk_level?: string | null
          session_id?: string
          status?: string | null
          tenant_id?: string
          warning_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "area_inspection_findings_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_inspection_findings_corrective_action_id_fkey"
            columns: ["corrective_action_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_inspection_findings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_inspection_findings_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "area_inspection_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_inspection_findings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "inspection_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_inspection_findings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      area_inspection_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          deleted_at: string | null
          file_name: string
          file_size: number | null
          gps_accuracy: number | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          mime_type: string | null
          response_id: string
          storage_path: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          deleted_at?: string | null
          file_name: string
          file_size?: number | null
          gps_accuracy?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          mime_type?: string | null
          response_id: string
          storage_path: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string
          file_size?: number | null
          gps_accuracy?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          mime_type?: string | null
          response_id?: string
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "area_inspection_photos_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "area_inspection_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_inspection_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_inspection_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      area_inspection_responses: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          gps_accuracy: number | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          notes: string | null
          photo_paths: Json | null
          responded_at: string | null
          responded_by: string | null
          response_value: string | null
          result: string | null
          session_id: string
          template_item_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          gps_accuracy?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          notes?: string | null
          photo_paths?: Json | null
          responded_at?: string | null
          responded_by?: string | null
          response_value?: string | null
          result?: string | null
          session_id: string
          template_item_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          gps_accuracy?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          notes?: string | null
          photo_paths?: Json | null
          responded_at?: string | null
          responded_by?: string | null
          response_value?: string | null
          result?: string | null
          session_id?: string
          template_item_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "area_inspection_responses_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_inspection_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "inspection_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_inspection_responses_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "inspection_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_inspection_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_approval_configs: {
        Row: {
          auto_approve_below_amount: number | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          escalation_enabled: boolean
          escalation_hours: number
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
          workflow_type: string
        }
        Insert: {
          auto_approve_below_amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          escalation_enabled?: boolean
          escalation_hours?: number
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
          workflow_type: string
        }
        Update: {
          auto_approve_below_amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          escalation_enabled?: boolean
          escalation_hours?: number
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_approval_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_approval_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_approval_levels: {
        Row: {
          config_id: string
          created_at: string
          deleted_at: string | null
          id: string
          level_order: number
          max_amount: number | null
          min_amount: number | null
          name: string
          required_role: string | null
          specific_user_id: string | null
          tenant_id: string
          timeout_hours: number
        }
        Insert: {
          config_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          level_order?: number
          max_amount?: number | null
          min_amount?: number | null
          name: string
          required_role?: string | null
          specific_user_id?: string | null
          tenant_id: string
          timeout_hours?: number
        }
        Update: {
          config_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          level_order?: number
          max_amount?: number | null
          min_amount?: number | null
          name?: string
          required_role?: string | null
          specific_user_id?: string | null
          tenant_id?: string
          timeout_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_approval_levels_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "asset_approval_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_approval_levels_specific_user_id_fkey"
            columns: ["specific_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_approval_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          asset_id: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          asset_id: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          asset_id?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_audit_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_audit_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_categories: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          deleted_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          name_ar: string | null
          sort_order: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          name_ar?: string | null
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          name_ar?: string | null
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_cost_transactions: {
        Row: {
          amount: number
          asset_id: string
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          fiscal_quarter: number | null
          fiscal_year: number | null
          id: string
          invoice_number: string | null
          maintenance_schedule_id: string | null
          tenant_id: string
          transaction_date: string
          transaction_type: string
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          asset_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          fiscal_quarter?: number | null
          fiscal_year?: number | null
          id?: string
          invoice_number?: string | null
          maintenance_schedule_id?: string | null
          tenant_id: string
          transaction_date: string
          transaction_type: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          asset_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          fiscal_quarter?: number | null
          fiscal_year?: number | null
          id?: string
          invoice_number?: string | null
          maintenance_schedule_id?: string | null
          tenant_id?: string
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_cost_transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_cost_transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_cost_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_cost_transactions_maintenance_schedule_id_fkey"
            columns: ["maintenance_schedule_id"]
            isOneToOne: false
            referencedRelation: "asset_maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_cost_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_depreciation_schedules: {
        Row: {
          accumulated_depreciation: number
          asset_id: string
          closing_value: number
          created_at: string
          deleted_at: string | null
          depreciation_amount: number
          depreciation_method: string
          id: string
          opening_value: number
          period_end: string
          period_start: string
          period_type: string
          tenant_id: string
        }
        Insert: {
          accumulated_depreciation: number
          asset_id: string
          closing_value: number
          created_at?: string
          deleted_at?: string | null
          depreciation_amount: number
          depreciation_method?: string
          id?: string
          opening_value: number
          period_end: string
          period_start: string
          period_type: string
          tenant_id: string
        }
        Update: {
          accumulated_depreciation?: number
          asset_id?: string
          closing_value?: number
          created_at?: string
          deleted_at?: string | null
          depreciation_amount?: number
          depreciation_method?: string
          id?: string
          opening_value?: number
          period_end?: string
          period_start?: string
          period_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_depreciation_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_depreciation_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_documents: {
        Row: {
          asset_id: string
          created_at: string | null
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["asset_document_type"]
          expiry_date: string | null
          expiry_warning_sent_at: string | null
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          storage_path: string
          tenant_id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          deleted_at?: string | null
          document_type: Database["public"]["Enums"]["asset_document_type"]
          expiry_date?: string | null
          expiry_warning_sent_at?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
          tenant_id: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["asset_document_type"]
          expiry_date?: string | null
          expiry_warning_sent_at?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          tenant_id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_failure_predictions: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          actual_failure_date: string | null
          addressed_at: string | null
          asset_id: string
          confidence_pct: number
          cost_if_ignored: number | null
          created_at: string
          deleted_at: string | null
          estimated_repair_cost: number | null
          id: string
          model_inputs: Json | null
          predicted_date: string
          predicted_failure_type: string
          prediction_model_version: string | null
          priority: number | null
          recommended_action: string | null
          severity: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_failure_date?: string | null
          addressed_at?: string | null
          asset_id: string
          confidence_pct: number
          cost_if_ignored?: number | null
          created_at?: string
          deleted_at?: string | null
          estimated_repair_cost?: number | null
          id?: string
          model_inputs?: Json | null
          predicted_date: string
          predicted_failure_type: string
          prediction_model_version?: string | null
          priority?: number | null
          recommended_action?: string | null
          severity: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_failure_date?: string | null
          addressed_at?: string | null
          asset_id?: string
          confidence_pct?: number
          cost_if_ignored?: number | null
          created_at?: string
          deleted_at?: string | null
          estimated_repair_cost?: number | null
          id?: string
          model_inputs?: Json | null
          predicted_date?: string
          predicted_failure_type?: string
          prediction_model_version?: string | null
          priority?: number | null
          recommended_action?: string | null
          severity?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_failure_predictions_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_failure_predictions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_failure_predictions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_failure_predictions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_health_scores: {
        Row: {
          age_factor: number | null
          asset_id: string
          calculation_model_version: string | null
          condition_factor: number | null
          contributing_factors: Json | null
          created_at: string
          days_until_predicted_failure: number | null
          deleted_at: string | null
          environment_factor: number | null
          failure_probability: number | null
          id: string
          last_calculated_at: string
          maintenance_compliance_pct: number | null
          risk_level: string
          score: number
          tenant_id: string
          trend: string | null
          updated_at: string
          usage_factor: number | null
        }
        Insert: {
          age_factor?: number | null
          asset_id: string
          calculation_model_version?: string | null
          condition_factor?: number | null
          contributing_factors?: Json | null
          created_at?: string
          days_until_predicted_failure?: number | null
          deleted_at?: string | null
          environment_factor?: number | null
          failure_probability?: number | null
          id?: string
          last_calculated_at?: string
          maintenance_compliance_pct?: number | null
          risk_level: string
          score: number
          tenant_id: string
          trend?: string | null
          updated_at?: string
          usage_factor?: number | null
        }
        Update: {
          age_factor?: number | null
          asset_id?: string
          calculation_model_version?: string | null
          condition_factor?: number | null
          contributing_factors?: Json | null
          created_at?: string
          days_until_predicted_failure?: number | null
          deleted_at?: string | null
          environment_factor?: number | null
          failure_probability?: number | null
          id?: string
          last_calculated_at?: string
          maintenance_compliance_pct?: number | null
          risk_level?: string
          score?: number
          tenant_id?: string
          trend?: string | null
          updated_at?: string
          usage_factor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_health_scores_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_health_scores_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_health_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_inspections: {
        Row: {
          asset_id: string
          completed_at: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          inspection_date: string
          inspector_id: string
          linked_incident_id: string | null
          overall_result: string | null
          reference_id: string | null
          status: string
          summary_notes: string | null
          template_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          inspection_date?: string
          inspector_id: string
          linked_incident_id?: string | null
          overall_result?: string | null
          reference_id?: string | null
          status?: string
          summary_notes?: string | null
          template_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          inspection_date?: string
          inspector_id?: string
          linked_incident_id?: string | null
          overall_result?: string | null
          reference_id?: string | null
          status?: string
          summary_notes?: string | null
          template_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_inspections_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_inspections_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_inspections_linked_incident_id_fkey"
            columns: ["linked_incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_inspections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance_history: {
        Row: {
          actual_duration_hours: number | null
          asset_id: string
          condition_after: string | null
          condition_before: string | null
          cost: number | null
          created_at: string
          currency: string | null
          deleted_at: string | null
          downtime_hours: number | null
          failure_mode: string | null
          findings: Json | null
          id: string
          maintenance_type: string
          next_recommended_action: string | null
          notes: string | null
          parts_used: Json | null
          performed_by: string | null
          performed_date: string
          planned_duration_hours: number | null
          root_cause: string | null
          schedule_id: string | null
          tenant_id: string
          updated_at: string
          was_unplanned: boolean | null
        }
        Insert: {
          actual_duration_hours?: number | null
          asset_id: string
          condition_after?: string | null
          condition_before?: string | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          downtime_hours?: number | null
          failure_mode?: string | null
          findings?: Json | null
          id?: string
          maintenance_type: string
          next_recommended_action?: string | null
          notes?: string | null
          parts_used?: Json | null
          performed_by?: string | null
          performed_date: string
          planned_duration_hours?: number | null
          root_cause?: string | null
          schedule_id?: string | null
          tenant_id: string
          updated_at?: string
          was_unplanned?: boolean | null
        }
        Update: {
          actual_duration_hours?: number | null
          asset_id?: string
          condition_after?: string | null
          condition_before?: string | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          downtime_hours?: number | null
          failure_mode?: string | null
          findings?: Json | null
          id?: string
          maintenance_type?: string
          next_recommended_action?: string | null
          notes?: string | null
          parts_used?: Json | null
          performed_by?: string | null
          performed_date?: string
          planned_duration_hours?: number | null
          root_cause?: string | null
          schedule_id?: string | null
          tenant_id?: string
          updated_at?: string
          was_unplanned?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_maintenance_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_history_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "asset_maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance_schedules: {
        Row: {
          asset_id: string
          created_at: string | null
          created_by: string | null
          criticality: string | null
          deleted_at: string | null
          description: string | null
          escalation_level: number | null
          estimated_duration_hours: number | null
          frequency_type: Database["public"]["Enums"]["maintenance_frequency"]
          frequency_value: number | null
          id: string
          is_active: boolean | null
          last_notification_at: string | null
          last_performed: string | null
          next_due: string | null
          schedule_type: Database["public"]["Enums"]["maintenance_type"]
          tenant_id: string
          updated_at: string | null
          vendor_name: string | null
          warning_sent_at: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          created_by?: string | null
          criticality?: string | null
          deleted_at?: string | null
          description?: string | null
          escalation_level?: number | null
          estimated_duration_hours?: number | null
          frequency_type: Database["public"]["Enums"]["maintenance_frequency"]
          frequency_value?: number | null
          id?: string
          is_active?: boolean | null
          last_notification_at?: string | null
          last_performed?: string | null
          next_due?: string | null
          schedule_type: Database["public"]["Enums"]["maintenance_type"]
          tenant_id: string
          updated_at?: string | null
          vendor_name?: string | null
          warning_sent_at?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          created_by?: string | null
          criticality?: string | null
          deleted_at?: string | null
          description?: string | null
          escalation_level?: number | null
          estimated_duration_hours?: number | null
          frequency_type?: Database["public"]["Enums"]["maintenance_frequency"]
          frequency_value?: number | null
          id?: string
          is_active?: boolean | null
          last_notification_at?: string | null
          last_performed?: string | null
          next_due?: string | null
          schedule_type?: Database["public"]["Enums"]["maintenance_type"]
          tenant_id?: string
          updated_at?: string | null
          vendor_name?: string | null
          warning_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance_sla_configs: {
        Row: {
          created_at: string
          deleted_at: string | null
          escalation_days_after: number
          id: string
          priority: string
          second_escalation_days_after: number | null
          tenant_id: string
          updated_at: string
          warning_days_before: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          escalation_days_after?: number
          id?: string
          priority: string
          second_escalation_days_after?: number | null
          tenant_id: string
          updated_at?: string
          warning_days_before?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          escalation_days_after?: number
          id?: string
          priority?: string
          second_escalation_days_after?: number | null
          tenant_id?: string
          updated_at?: string
          warning_days_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_sla_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_offline_actions: {
        Row: {
          action_data: Json
          action_type: string
          asset_code: string | null
          asset_id: string | null
          captured_at: string
          conflict_data: Json | null
          created_at: string
          created_by: string | null
          device_id: string
          gps_accuracy: number | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          resolution_strategy: string | null
          resolved_at: string | null
          resolved_by: string | null
          sync_error: string | null
          sync_status: string
          synced_at: string | null
          tenant_id: string
        }
        Insert: {
          action_data?: Json
          action_type: string
          asset_code?: string | null
          asset_id?: string | null
          captured_at: string
          conflict_data?: Json | null
          created_at?: string
          created_by?: string | null
          device_id: string
          gps_accuracy?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          resolution_strategy?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sync_error?: string | null
          sync_status?: string
          synced_at?: string | null
          tenant_id: string
        }
        Update: {
          action_data?: Json
          action_type?: string
          asset_code?: string | null
          asset_id?: string | null
          captured_at?: string
          conflict_data?: Json | null
          created_at?: string
          created_by?: string | null
          device_id?: string
          gps_accuracy?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          resolution_strategy?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sync_error?: string | null
          sync_status?: string
          synced_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_offline_actions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_offline_actions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_offline_actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_offline_actions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_offline_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_photos: {
        Row: {
          asset_id: string
          caption: string | null
          created_at: string | null
          deleted_at: string | null
          file_name: string
          file_size: number | null
          id: string
          is_primary: boolean | null
          mime_type: string | null
          storage_path: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          asset_id: string
          caption?: string | null
          created_at?: string | null
          deleted_at?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          is_primary?: boolean | null
          mime_type?: string | null
          storage_path: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          asset_id?: string
          caption?: string | null
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          is_primary?: boolean | null
          mime_type?: string | null
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_photos_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_photos_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_purchase_approvals: {
        Row: {
          approval_level: number
          approver_id: string
          created_at: string
          decided_at: string
          decision: string
          id: string
          notes: string | null
          request_id: string
          tenant_id: string
        }
        Insert: {
          approval_level: number
          approver_id: string
          created_at?: string
          decided_at?: string
          decision: string
          id?: string
          notes?: string | null
          request_id: string
          tenant_id: string
        }
        Update: {
          approval_level?: number
          approver_id?: string
          created_at?: string
          decided_at?: string
          decision?: string
          id?: string
          notes?: string | null
          request_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_purchase_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_purchase_approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "asset_purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_purchase_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_purchase_requests: {
        Row: {
          approval_config_id: string | null
          asset_category_id: string | null
          asset_type_id: string | null
          budget_code: string | null
          created_at: string
          currency: string
          current_approval_level: number
          deleted_at: string | null
          description: string | null
          estimated_cost: number
          final_decision_at: string | null
          final_decision_by: string | null
          id: string
          justification: string | null
          quantity: number
          rejection_reason: string | null
          request_number: string
          requested_at: string
          requested_by: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
          vendor_name: string | null
          vendor_quote_path: string | null
        }
        Insert: {
          approval_config_id?: string | null
          asset_category_id?: string | null
          asset_type_id?: string | null
          budget_code?: string | null
          created_at?: string
          currency?: string
          current_approval_level?: number
          deleted_at?: string | null
          description?: string | null
          estimated_cost: number
          final_decision_at?: string | null
          final_decision_by?: string | null
          id?: string
          justification?: string | null
          quantity?: number
          rejection_reason?: string | null
          request_number: string
          requested_at?: string
          requested_by: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          vendor_name?: string | null
          vendor_quote_path?: string | null
        }
        Update: {
          approval_config_id?: string | null
          asset_category_id?: string | null
          asset_type_id?: string | null
          budget_code?: string | null
          created_at?: string
          currency?: string
          current_approval_level?: number
          deleted_at?: string | null
          description?: string | null
          estimated_cost?: number
          final_decision_at?: string | null
          final_decision_by?: string | null
          id?: string
          justification?: string | null
          quantity?: number
          rejection_reason?: string | null
          request_number?: string
          requested_at?: string
          requested_by?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          vendor_name?: string | null
          vendor_quote_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_purchase_requests_approval_config_id_fkey"
            columns: ["approval_config_id"]
            isOneToOne: false
            referencedRelation: "asset_approval_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_purchase_requests_asset_category_id_fkey"
            columns: ["asset_category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_purchase_requests_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_purchase_requests_final_decision_by_fkey"
            columns: ["final_decision_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_purchase_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_purchase_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_scan_logs: {
        Row: {
          asset_code: string
          asset_id: string | null
          created_at: string | null
          deleted_at: string | null
          device_info: Json | null
          id: string
          is_offline_scan: boolean | null
          location_data: Json | null
          scan_action: string
          scan_method: string
          scan_result: string
          scanned_by: string
          synced_at: string | null
          tenant_id: string
        }
        Insert: {
          asset_code: string
          asset_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          device_info?: Json | null
          id?: string
          is_offline_scan?: boolean | null
          location_data?: Json | null
          scan_action: string
          scan_method: string
          scan_result: string
          scanned_by: string
          synced_at?: string | null
          tenant_id: string
        }
        Update: {
          asset_code?: string
          asset_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          device_info?: Json | null
          id?: string
          is_offline_scan?: boolean | null
          location_data?: Json | null
          scan_action?: string
          scan_method?: string
          scan_result?: string
          scanned_by?: string
          synced_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_scan_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_scan_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_scan_logs_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_scan_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_subtypes: {
        Row: {
          code: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          tenant_id: string | null
          type_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          tenant_id?: string | null
          type_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          tenant_id?: string | null
          type_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_subtypes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_subtypes_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_transfers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          asset_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          deleted_at: string | null
          disposal_certificate_path: string | null
          disposal_method: string | null
          disposal_notes: string | null
          disposal_value: number | null
          from_branch_id: string | null
          from_building_id: string | null
          from_floor_zone_id: string | null
          from_site_id: string | null
          id: string
          notes: string | null
          reason: string
          rejection_reason: string | null
          requested_at: string | null
          requested_by: string
          status: string
          tenant_id: string
          to_branch_id: string | null
          to_building_id: string | null
          to_floor_zone_id: string | null
          to_site_id: string | null
          transfer_type: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          asset_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          deleted_at?: string | null
          disposal_certificate_path?: string | null
          disposal_method?: string | null
          disposal_notes?: string | null
          disposal_value?: number | null
          from_branch_id?: string | null
          from_building_id?: string | null
          from_floor_zone_id?: string | null
          from_site_id?: string | null
          id?: string
          notes?: string | null
          reason: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by: string
          status?: string
          tenant_id: string
          to_branch_id?: string | null
          to_building_id?: string | null
          to_floor_zone_id?: string | null
          to_site_id?: string | null
          transfer_type: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          deleted_at?: string | null
          disposal_certificate_path?: string | null
          disposal_method?: string | null
          disposal_notes?: string | null
          disposal_value?: number | null
          from_branch_id?: string | null
          from_building_id?: string | null
          from_floor_zone_id?: string | null
          from_site_id?: string | null
          id?: string
          notes?: string | null
          reason?: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string
          status?: string
          tenant_id?: string
          to_branch_id?: string | null
          to_building_id?: string | null
          to_floor_zone_id?: string | null
          to_site_id?: string | null
          transfer_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_transfers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_transfers_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_from_building_id_fkey"
            columns: ["from_building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_from_floor_zone_id_fkey"
            columns: ["from_floor_zone_id"]
            isOneToOne: false
            referencedRelation: "floors_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_from_site_id_fkey"
            columns: ["from_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_to_building_id_fkey"
            columns: ["to_building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_to_floor_zone_id_fkey"
            columns: ["to_floor_zone_id"]
            isOneToOne: false
            referencedRelation: "floors_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_to_site_id_fkey"
            columns: ["to_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_types: {
        Row: {
          category_id: string
          code: string
          created_at: string | null
          deleted_at: string | null
          id: string
          inspection_interval_days: number | null
          is_active: boolean | null
          is_system: boolean | null
          name: string
          name_ar: string | null
          requires_certification: boolean | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          code: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          inspection_interval_days?: number | null
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          name_ar?: string | null
          requires_certification?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          code?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          inspection_interval_days?: number | null
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          name_ar?: string | null
          requires_certification?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_warranty_claims: {
        Row: {
          asset_id: string
          claim_date: string
          claim_number: string
          claim_status: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          issue_description: string
          repair_cost: number | null
          resolution_notes: string | null
          resolved_at: string | null
          tenant_id: string
          updated_at: string
          vendor_contact: string | null
          vendor_name: string | null
        }
        Insert: {
          asset_id: string
          claim_date?: string
          claim_number: string
          claim_status?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          issue_description: string
          repair_cost?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          tenant_id: string
          updated_at?: string
          vendor_contact?: string | null
          vendor_name?: string | null
        }
        Update: {
          asset_id?: string
          claim_date?: string
          claim_number?: string
          claim_status?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          issue_description?: string
          repair_cost?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          tenant_id?: string
          updated_at?: string
          vendor_contact?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_warranty_claims_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_warranty_claims_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_warranty_claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_warranty_claims_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_notification_logs: {
        Row: {
          attempt_count: number | null
          channel: string
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          matrix_rule_id: string | null
          message_content: string | null
          provider_message_id: string | null
          recipient_id: string | null
          recipient_phone: string | null
          retry_at: string | null
          sent_at: string | null
          severity_level: string | null
          stakeholder_role: string | null
          status: string
          tenant_id: string
          was_erp_override: boolean | null
        }
        Insert: {
          attempt_count?: number | null
          channel: string
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          matrix_rule_id?: string | null
          message_content?: string | null
          provider_message_id?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          retry_at?: string | null
          sent_at?: string | null
          severity_level?: string | null
          stakeholder_role?: string | null
          status?: string
          tenant_id: string
          was_erp_override?: boolean | null
        }
        Update: {
          attempt_count?: number | null
          channel?: string
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          matrix_rule_id?: string | null
          message_content?: string | null
          provider_message_id?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          retry_at?: string | null
          sent_at?: string | null
          severity_level?: string | null
          stakeholder_role?: string | null
          status?: string
          tenant_id?: string
          was_erp_override?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_notification_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_notification_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
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
      buildings: {
        Row: {
          code: string | null
          created_at: string | null
          deleted_at: string | null
          floor_count: number | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          name_ar: string | null
          site_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          deleted_at?: string | null
          floor_count?: number | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          name_ar?: string | null
          site_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          deleted_at?: string | null
          floor_count?: number | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          name_ar?: string | null
          site_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cctv_cameras: {
        Row: {
          assigned_to: string | null
          audio_enabled: boolean | null
          building: string | null
          camera_code: string
          created_at: string
          deleted_at: string | null
          description: string | null
          floor_number: number | null
          health_check_interval_minutes: number | null
          id: string
          installation_date: string | null
          ip_address: string | null
          is_active: boolean | null
          is_motion_detection_enabled: boolean | null
          is_recording: boolean | null
          last_health_check: string | null
          last_seen_at: string | null
          latitude: number | null
          location_description: string | null
          longitude: number | null
          mac_address: string | null
          model: string | null
          name: string
          name_ar: string | null
          night_vision: boolean | null
          provider: string | null
          ptz_enabled: boolean | null
          resolution: string | null
          rtsp_url: string | null
          snapshot_url: string | null
          status: string | null
          stream_url: string | null
          tenant_id: string
          updated_at: string
          warranty_expiry: string | null
          zone_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          audio_enabled?: boolean | null
          building?: string | null
          camera_code: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          floor_number?: number | null
          health_check_interval_minutes?: number | null
          id?: string
          installation_date?: string | null
          ip_address?: string | null
          is_active?: boolean | null
          is_motion_detection_enabled?: boolean | null
          is_recording?: boolean | null
          last_health_check?: string | null
          last_seen_at?: string | null
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          mac_address?: string | null
          model?: string | null
          name: string
          name_ar?: string | null
          night_vision?: boolean | null
          provider?: string | null
          ptz_enabled?: boolean | null
          resolution?: string | null
          rtsp_url?: string | null
          snapshot_url?: string | null
          status?: string | null
          stream_url?: string | null
          tenant_id: string
          updated_at?: string
          warranty_expiry?: string | null
          zone_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          audio_enabled?: boolean | null
          building?: string | null
          camera_code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          floor_number?: number | null
          health_check_interval_minutes?: number | null
          id?: string
          installation_date?: string | null
          ip_address?: string | null
          is_active?: boolean | null
          is_motion_detection_enabled?: boolean | null
          is_recording?: boolean | null
          last_health_check?: string | null
          last_seen_at?: string | null
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          mac_address?: string | null
          model?: string | null
          name?: string
          name_ar?: string | null
          night_vision?: boolean | null
          provider?: string | null
          ptz_enabled?: boolean | null
          resolution?: string | null
          rtsp_url?: string | null
          snapshot_url?: string | null
          status?: string | null
          stream_url?: string | null
          tenant_id?: string
          updated_at?: string
          warranty_expiry?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cctv_cameras_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cctv_cameras_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cctv_cameras_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "security_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      cctv_events: {
        Row: {
          camera_id: string
          clip_duration_seconds: number | null
          clip_url: string | null
          created_at: string
          deleted_at: string | null
          detection_confidence: number | null
          detection_metadata: Json | null
          event_type: string
          id: string
          is_false_positive: boolean | null
          linked_alert_id: string | null
          linked_incident_id: string | null
          linked_patrol_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string | null
          tenant_id: string
          thumbnail_url: string | null
          triggered_at: string
        }
        Insert: {
          camera_id: string
          clip_duration_seconds?: number | null
          clip_url?: string | null
          created_at?: string
          deleted_at?: string | null
          detection_confidence?: number | null
          detection_metadata?: Json | null
          event_type: string
          id?: string
          is_false_positive?: boolean | null
          linked_alert_id?: string | null
          linked_incident_id?: string | null
          linked_patrol_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string | null
          tenant_id: string
          thumbnail_url?: string | null
          triggered_at?: string
        }
        Update: {
          camera_id?: string
          clip_duration_seconds?: number | null
          clip_url?: string | null
          created_at?: string
          deleted_at?: string | null
          detection_confidence?: number | null
          detection_metadata?: Json | null
          event_type?: string
          id?: string
          is_false_positive?: boolean | null
          linked_alert_id?: string | null
          linked_incident_id?: string | null
          linked_patrol_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string | null
          tenant_id?: string
          thumbnail_url?: string | null
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cctv_events_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cctv_cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cctv_events_linked_alert_id_fkey"
            columns: ["linked_alert_id"]
            isOneToOne: false
            referencedRelation: "emergency_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cctv_events_linked_incident_id_fkey"
            columns: ["linked_incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cctv_events_linked_patrol_id_fkey"
            columns: ["linked_patrol_id"]
            isOneToOne: false
            referencedRelation: "security_patrols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cctv_events_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cctv_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_access_logs: {
        Row: {
          access_type: string
          alert_language: string | null
          alert_sent: boolean | null
          contractor_id: string
          created_at: string | null
          deleted_at: string | null
          entry_time: string
          exit_time: string | null
          guard_id: string | null
          id: string
          notes: string | null
          site_id: string | null
          tenant_id: string
          validation_errors: Json | null
          validation_status: string
          zone_id: string | null
        }
        Insert: {
          access_type?: string
          alert_language?: string | null
          alert_sent?: boolean | null
          contractor_id: string
          created_at?: string | null
          deleted_at?: string | null
          entry_time?: string
          exit_time?: string | null
          guard_id?: string | null
          id?: string
          notes?: string | null
          site_id?: string | null
          tenant_id: string
          validation_errors?: Json | null
          validation_status: string
          zone_id?: string | null
        }
        Update: {
          access_type?: string
          alert_language?: string | null
          alert_sent?: boolean | null
          contractor_id?: string
          created_at?: string | null
          deleted_at?: string | null
          entry_time?: string
          exit_time?: string | null
          guard_id?: string | null
          id?: string
          notes?: string | null
          site_id?: string | null
          tenant_id?: string
          validation_errors?: Json | null
          validation_status?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_access_logs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_access_logs_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_access_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_access_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_companies: {
        Row: {
          address: string | null
          assigned_client_pm_id: string | null
          city: string | null
          commercial_registration_number: string | null
          company_name: string
          company_name_ar: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          id: string
          phone: string | null
          status: string
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          tenant_id: string
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          assigned_client_pm_id?: string | null
          city?: string | null
          commercial_registration_number?: string | null
          company_name: string
          company_name_ar?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tenant_id: string
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          assigned_client_pm_id?: string | null
          city?: string | null
          commercial_registration_number?: string | null
          company_name?: string
          company_name_ar?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tenant_id?: string
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_companies_assigned_client_pm_id_fkey"
            columns: ["assigned_client_pm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_companies_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_documents: {
        Row: {
          company_id: string | null
          created_at: string
          deleted_at: string | null
          document_type: string
          expiry_date: string | null
          expiry_warning_sent_at: string | null
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          notes: string | null
          storage_path: string
          tenant_id: string
          title: string
          title_ar: string | null
          updated_at: string
          uploaded_by: string | null
          worker_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          document_type: string
          expiry_date?: string | null
          expiry_warning_sent_at?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          storage_path: string
          tenant_id: string
          title: string
          title_ar?: string | null
          updated_at?: string
          uploaded_by?: string | null
          worker_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          document_type?: string
          expiry_date?: string | null
          expiry_warning_sent_at?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          storage_path?: string
          tenant_id?: string
          title?: string
          title_ar?: string | null
          updated_at?: string
          uploaded_by?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "contractor_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_documents_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "contractor_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_module_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_module_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_module_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_projects: {
        Row: {
          assigned_workers_count: number
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          end_date: string
          id: string
          location_description: string | null
          notes: string | null
          project_code: string
          project_manager_id: string | null
          project_name: string
          project_name_ar: string | null
          required_safety_officers: number
          site_id: string | null
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_workers_count?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_date: string
          id?: string
          location_description?: string | null
          notes?: string | null
          project_code: string
          project_manager_id?: string | null
          project_name: string
          project_name_ar?: string | null
          required_safety_officers?: number
          site_id?: string | null
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_workers_count?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_date?: string
          id?: string
          location_description?: string | null
          notes?: string | null
          project_code?: string
          project_manager_id?: string | null
          project_name?: string
          project_name_ar?: string | null
          required_safety_officers?: number
          site_id?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "contractor_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_projects_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_representatives: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          full_name_ar: string | null
          id: string
          is_primary: boolean
          is_safety_officer_eligible: boolean
          mobile_number: string
          national_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          full_name_ar?: string | null
          id?: string
          is_primary?: boolean
          is_safety_officer_eligible?: boolean
          mobile_number: string
          national_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          full_name_ar?: string | null
          id?: string
          is_primary?: boolean
          is_safety_officer_eligible?: boolean
          mobile_number?: string
          national_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_representatives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "contractor_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_representatives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_representatives_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_representatives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_workers: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          full_name: string
          full_name_ar: string | null
          id: string
          mobile_number: string
          national_id: string
          nationality: string | null
          photo_path: string | null
          preferred_language: string
          rejection_reason: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          full_name: string
          full_name_ar?: string | null
          id?: string
          mobile_number: string
          national_id: string
          nationality?: string | null
          photo_path?: string | null
          preferred_language?: string
          rejection_reason?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          full_name?: string
          full_name_ar?: string | null
          id?: string
          mobile_number?: string
          national_id?: string
          nationality?: string | null
          photo_path?: string | null
          preferred_language?: string
          rejection_reason?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_workers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_workers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "contractor_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_workers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_workers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          allowed_sites: string[] | null
          allowed_zones: string[] | null
          ban_expires_at: string | null
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          company_name: string | null
          contractor_code: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          is_banned: boolean | null
          medical_exam_date: string | null
          medical_exam_expiry: string | null
          mobile_number: string | null
          national_id: string | null
          nationality: string | null
          permit_expiry_date: string | null
          permit_number: string | null
          photo_path: string | null
          preferred_language: string | null
          qr_code_data: string | null
          safety_induction_date: string | null
          safety_induction_expiry: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allowed_sites?: string[] | null
          allowed_zones?: string[] | null
          ban_expires_at?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          company_name?: string | null
          contractor_code: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_banned?: boolean | null
          medical_exam_date?: string | null
          medical_exam_expiry?: string | null
          mobile_number?: string | null
          national_id?: string | null
          nationality?: string | null
          permit_expiry_date?: string | null
          permit_number?: string | null
          photo_path?: string | null
          preferred_language?: string | null
          qr_code_data?: string | null
          safety_induction_date?: string | null
          safety_induction_expiry?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allowed_sites?: string[] | null
          allowed_zones?: string[] | null
          ban_expires_at?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          company_name?: string | null
          contractor_code?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_banned?: boolean | null
          medical_exam_date?: string | null
          medical_exam_expiry?: string | null
          mobile_number?: string | null
          national_id?: string | null
          nationality?: string | null
          permit_expiry_date?: string | null
          permit_number?: string | null
          photo_path?: string | null
          preferred_language?: string | null
          qr_code_data?: string | null
          safety_induction_date?: string | null
          safety_induction_expiry?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractors_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      corrective_actions: {
        Row: {
          action_type: string | null
          assigned_to: string | null
          category: string | null
          completed_date: string | null
          completion_notes: string | null
          created_at: string | null
          delegated_at: string | null
          delegated_by: string | null
          delegated_verifier_id: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          escalation_level: number | null
          finding_id: string | null
          id: string
          incident_id: string | null
          initial_risk_level: string | null
          last_return_reason: string | null
          last_returned_at: string | null
          linked_cause_type: string | null
          linked_root_cause_id: string | null
          overdue_justification: string | null
          priority: string | null
          progress_notes: string | null
          reference_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_notes: string | null
          released_at: string | null
          residual_risk_level: string | null
          responsible_department_id: string | null
          return_count: number | null
          risk_reduction_score: number | null
          session_id: string | null
          sla_escalation_sent_at: string | null
          sla_warning_sent_at: string | null
          source_finding_id: string | null
          source_type: string | null
          start_date: string | null
          started_at: string | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          action_type?: string | null
          assigned_to?: string | null
          category?: string | null
          completed_date?: string | null
          completion_notes?: string | null
          created_at?: string | null
          delegated_at?: string | null
          delegated_by?: string | null
          delegated_verifier_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          escalation_level?: number | null
          finding_id?: string | null
          id?: string
          incident_id?: string | null
          initial_risk_level?: string | null
          last_return_reason?: string | null
          last_returned_at?: string | null
          linked_cause_type?: string | null
          linked_root_cause_id?: string | null
          overdue_justification?: string | null
          priority?: string | null
          progress_notes?: string | null
          reference_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_notes?: string | null
          released_at?: string | null
          residual_risk_level?: string | null
          responsible_department_id?: string | null
          return_count?: number | null
          risk_reduction_score?: number | null
          session_id?: string | null
          sla_escalation_sent_at?: string | null
          sla_warning_sent_at?: string | null
          source_finding_id?: string | null
          source_type?: string | null
          start_date?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          action_type?: string | null
          assigned_to?: string | null
          category?: string | null
          completed_date?: string | null
          completion_notes?: string | null
          created_at?: string | null
          delegated_at?: string | null
          delegated_by?: string | null
          delegated_verifier_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          escalation_level?: number | null
          finding_id?: string | null
          id?: string
          incident_id?: string | null
          initial_risk_level?: string | null
          last_return_reason?: string | null
          last_returned_at?: string | null
          linked_cause_type?: string | null
          linked_root_cause_id?: string | null
          overdue_justification?: string | null
          priority?: string | null
          progress_notes?: string | null
          reference_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_notes?: string | null
          released_at?: string | null
          residual_risk_level?: string | null
          responsible_department_id?: string | null
          return_count?: number | null
          risk_reduction_score?: number | null
          session_id?: string | null
          sla_escalation_sent_at?: string | null
          sla_warning_sent_at?: string | null
          source_finding_id?: string | null
          source_type?: string | null
          start_date?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corrective_actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_delegated_by_fkey"
            columns: ["delegated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_delegated_verifier_id_fkey"
            columns: ["delegated_verifier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "inspection_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_responsible_department_id_fkey"
            columns: ["responsible_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "inspection_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_source_finding_id_fkey"
            columns: ["source_finding_id"]
            isOneToOne: false
            referencedRelation: "area_inspection_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          division_id: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          division_id: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
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
          deleted_at: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
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
      duty_roster: {
        Row: {
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          duty_date: string
          duty_type: string
          id: string
          is_active: boolean | null
          notes: string | null
          shift_end: string
          shift_start: string
          site_id: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          duty_date: string
          duty_type: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          shift_end: string
          shift_start: string
          site_id?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          duty_date?: string
          duty_type?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          shift_end?: string
          shift_start?: string
          site_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duty_roster_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_roster_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_roster_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_roster_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_roster_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_delivery_logs: {
        Row: {
          created_at: string
          delivered_at: string | null
          email_type: string
          function_name: string
          id: string
          last_error: string | null
          max_retries: number
          next_retry_at: string | null
          payload: Json
          provider_message_id: string | null
          recipient_email: string
          recipient_name: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          retry_count: number
          status: string
          subject: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          email_type: string
          function_name: string
          id?: string
          last_error?: string | null
          max_retries?: number
          next_retry_at?: string | null
          payload?: Json
          provider_message_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          retry_count?: number
          status?: string
          subject: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          email_type?: string
          function_name?: string
          id?: string
          last_error?: string | null
          max_retries?: number
          next_retry_at?: string | null
          payload?: Json
          provider_message_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          retry_count?: number
          status?: string
          subject?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_delivery_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notification_preferences: {
        Row: {
          approvals_decision: boolean
          approvals_requested: boolean
          contractor_alerts: boolean
          created_at: string
          daily_digest: boolean
          gate_pass_approval: boolean
          id: string
          incidents_assigned: boolean
          incidents_new: boolean
          incidents_status_change: boolean
          sla_overdue: boolean
          sla_warnings: boolean
          system_announcements: boolean
          tenant_id: string
          updated_at: string
          user_id: string
          visitor_checkin: boolean
          weekly_summary: boolean
        }
        Insert: {
          approvals_decision?: boolean
          approvals_requested?: boolean
          contractor_alerts?: boolean
          created_at?: string
          daily_digest?: boolean
          gate_pass_approval?: boolean
          id?: string
          incidents_assigned?: boolean
          incidents_new?: boolean
          incidents_status_change?: boolean
          sla_overdue?: boolean
          sla_warnings?: boolean
          system_announcements?: boolean
          tenant_id: string
          updated_at?: string
          user_id: string
          visitor_checkin?: boolean
          weekly_summary?: boolean
        }
        Update: {
          approvals_decision?: boolean
          approvals_requested?: boolean
          contractor_alerts?: boolean
          created_at?: string
          daily_digest?: boolean
          gate_pass_approval?: boolean
          id?: string
          incidents_assigned?: boolean
          incidents_new?: boolean
          incidents_status_change?: boolean
          sla_overdue?: boolean
          sla_warnings?: boolean
          system_announcements?: boolean
          tenant_id?: string
          updated_at?: string
          user_id?: string
          visitor_checkin?: boolean
          weekly_summary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "email_notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_alerts: {
        Row: {
          accuracy: number | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          deleted_at: string | null
          escalated_to: Json | null
          escalation_level: number | null
          guard_id: string | null
          id: string
          is_false_alarm: boolean | null
          latitude: number | null
          location_description: string | null
          longitude: number | null
          notes: string | null
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          response_time_seconds: number | null
          sla_breach_notified_at: string | null
          tenant_id: string
          triggered_at: string
        }
        Insert: {
          accuracy?: number | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          deleted_at?: string | null
          escalated_to?: Json | null
          escalation_level?: number | null
          guard_id?: string | null
          id?: string
          is_false_alarm?: boolean | null
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          notes?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_time_seconds?: number | null
          sla_breach_notified_at?: string | null
          tenant_id: string
          triggered_at?: string
        }
        Update: {
          accuracy?: number | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          deleted_at?: string | null
          escalated_to?: Json | null
          escalation_level?: number | null
          guard_id?: string | null
          id?: string
          is_false_alarm?: boolean | null
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          notes?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_time_seconds?: number | null
          sla_breach_notified_at?: string | null
          tenant_id?: string
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_alerts_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_response_sla_configs: {
        Row: {
          alert_type: string
          created_at: string
          deleted_at: string | null
          escalation_after_seconds: number | null
          escalation_recipients: Json | null
          id: string
          is_active: boolean | null
          max_response_seconds: number
          notification_channels: string[] | null
          priority: string
          second_escalation_seconds: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          deleted_at?: string | null
          escalation_after_seconds?: number | null
          escalation_recipients?: Json | null
          id?: string
          is_active?: boolean | null
          max_response_seconds?: number
          notification_channels?: string[] | null
          priority?: string
          second_escalation_seconds?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          deleted_at?: string | null
          escalation_after_seconds?: number | null
          escalation_recipients?: Json | null
          id?: string
          is_active?: boolean | null
          max_response_seconds?: number
          notification_channels?: string[] | null
          priority?: string
          second_escalation_seconds?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_response_sla_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      environmental_incident_details: {
        Row: {
          actual_cleanup_cost_sar: number | null
          affected_area_sqm: number | null
          affected_medium: string[] | null
          cas_number: string | null
          cleanup_completed: boolean | null
          cleanup_completed_at: string | null
          cleanup_contractor: string | null
          cleanup_required: boolean | null
          containment_method: string | null
          containment_successful: boolean | null
          created_at: string | null
          deleted_at: string | null
          emission_duration_hours: number | null
          emission_type: string | null
          estimated_cleanup_cost_sar: number | null
          estimated_emission_kg: number | null
          id: string
          incident_id: string
          reached_waterway: boolean | null
          regulatory_agency: string | null
          regulatory_notification_required: boolean | null
          regulatory_notification_sent_at: string | null
          regulatory_reference_number: string | null
          reportable_quantity_exceeded: boolean | null
          spill_unit: string | null
          spill_volume_liters: number | null
          substance_name: string | null
          substance_type: string | null
          tenant_id: string
          updated_at: string | null
          waterway_name: string | null
        }
        Insert: {
          actual_cleanup_cost_sar?: number | null
          affected_area_sqm?: number | null
          affected_medium?: string[] | null
          cas_number?: string | null
          cleanup_completed?: boolean | null
          cleanup_completed_at?: string | null
          cleanup_contractor?: string | null
          cleanup_required?: boolean | null
          containment_method?: string | null
          containment_successful?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          emission_duration_hours?: number | null
          emission_type?: string | null
          estimated_cleanup_cost_sar?: number | null
          estimated_emission_kg?: number | null
          id?: string
          incident_id: string
          reached_waterway?: boolean | null
          regulatory_agency?: string | null
          regulatory_notification_required?: boolean | null
          regulatory_notification_sent_at?: string | null
          regulatory_reference_number?: string | null
          reportable_quantity_exceeded?: boolean | null
          spill_unit?: string | null
          spill_volume_liters?: number | null
          substance_name?: string | null
          substance_type?: string | null
          tenant_id: string
          updated_at?: string | null
          waterway_name?: string | null
        }
        Update: {
          actual_cleanup_cost_sar?: number | null
          affected_area_sqm?: number | null
          affected_medium?: string[] | null
          cas_number?: string | null
          cleanup_completed?: boolean | null
          cleanup_completed_at?: string | null
          cleanup_contractor?: string | null
          cleanup_required?: boolean | null
          containment_method?: string | null
          containment_successful?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          emission_duration_hours?: number | null
          emission_type?: string | null
          estimated_cleanup_cost_sar?: number | null
          estimated_emission_kg?: number | null
          id?: string
          incident_id?: string
          reached_waterway?: boolean | null
          regulatory_agency?: string | null
          regulatory_notification_required?: boolean | null
          regulatory_notification_sent_at?: string | null
          regulatory_reference_number?: string | null
          reportable_quantity_exceeded?: boolean | null
          spill_unit?: string | null
          spill_volume_liters?: number | null
          substance_name?: string | null
          substance_type?: string | null
          tenant_id?: string
          updated_at?: string | null
          waterway_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "environmental_incident_details_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environmental_incident_details_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_items: {
        Row: {
          cctv_data: Json | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          evidence_type: string
          file_name: string | null
          file_size: number | null
          id: string
          incident_id: string
          mime_type: string | null
          reference_id: string | null
          reference_type: string | null
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          storage_path: string | null
          tenant_id: string
          updated_at: string | null
          upload_session_id: string | null
          uploaded_by: string
        }
        Insert: {
          cctv_data?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          evidence_type: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          incident_id: string
          mime_type?: string | null
          reference_id?: string | null
          reference_type?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          storage_path?: string | null
          tenant_id: string
          updated_at?: string | null
          upload_session_id?: string | null
          uploaded_by: string
        }
        Update: {
          cctv_data?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          evidence_type?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          incident_id?: string
          mime_type?: string | null
          reference_id?: string | null
          reference_type?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          storage_path?: string | null
          tenant_id?: string
          updated_at?: string | null
          upload_session_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_items_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_upload_session_id_fkey"
            columns: ["upload_session_id"]
            isOneToOne: false
            referencedRelation: "user_activity_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finding_sla_configs: {
        Row: {
          classification: string
          created_at: string
          deleted_at: string | null
          escalation_days_after: number
          id: string
          second_escalation_days_after: number | null
          target_days: number
          tenant_id: string
          updated_at: string
          warning_days_before: number
        }
        Insert: {
          classification: string
          created_at?: string
          deleted_at?: string | null
          escalation_days_after?: number
          id?: string
          second_escalation_days_after?: number | null
          target_days?: number
          tenant_id: string
          updated_at?: string
          warning_days_before?: number
        }
        Update: {
          classification?: string
          created_at?: string
          deleted_at?: string | null
          escalation_days_after?: number
          id?: string
          second_escalation_days_after?: number | null
          target_days?: number
          tenant_id?: string
          updated_at?: string
          warning_days_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "finding_sla_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      floors_zones: {
        Row: {
          building_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          level_number: number | null
          name: string
          name_ar: string | null
          tenant_id: string
          updated_at: string | null
          zone_type: string | null
        }
        Insert: {
          building_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          level_number?: number | null
          name: string
          name_ar?: string | null
          tenant_id: string
          updated_at?: string | null
          zone_type?: string | null
        }
        Update: {
          building_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          level_number?: number | null
          name?: string
          name_ar?: string | null
          tenant_id?: string
          updated_at?: string | null
          zone_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floors_zones_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floors_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_entry_logs: {
        Row: {
          anpr_confidence: number | null
          anpr_image_path: string | null
          car_plate: string | null
          created_at: string | null
          deleted_at: string | null
          destination_id: string | null
          destination_name: string | null
          entry_time: string
          entry_type: string
          exit_time: string | null
          gate_id: string | null
          guard_id: string | null
          host_mobile: string | null
          host_notified_at: string | null
          id: string
          mobile_number: string | null
          nationality: string | null
          notes: string | null
          notification_status: string | null
          notify_host: boolean | null
          passenger_count: number | null
          person_name: string
          photo_captured_at: string | null
          preferred_language: string | null
          purpose: string | null
          qr_code_token: string | null
          site_id: string | null
          tenant_id: string
          visit_duration_hours: number | null
          visitor_id: string | null
          visitor_photo_url: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          anpr_confidence?: number | null
          anpr_image_path?: string | null
          car_plate?: string | null
          created_at?: string | null
          deleted_at?: string | null
          destination_id?: string | null
          destination_name?: string | null
          entry_time?: string
          entry_type?: string
          exit_time?: string | null
          gate_id?: string | null
          guard_id?: string | null
          host_mobile?: string | null
          host_notified_at?: string | null
          id?: string
          mobile_number?: string | null
          nationality?: string | null
          notes?: string | null
          notification_status?: string | null
          notify_host?: boolean | null
          passenger_count?: number | null
          person_name: string
          photo_captured_at?: string | null
          preferred_language?: string | null
          purpose?: string | null
          qr_code_token?: string | null
          site_id?: string | null
          tenant_id: string
          visit_duration_hours?: number | null
          visitor_id?: string | null
          visitor_photo_url?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          anpr_confidence?: number | null
          anpr_image_path?: string | null
          car_plate?: string | null
          created_at?: string | null
          deleted_at?: string | null
          destination_id?: string | null
          destination_name?: string | null
          entry_time?: string
          entry_type?: string
          exit_time?: string | null
          gate_id?: string | null
          guard_id?: string | null
          host_mobile?: string | null
          host_notified_at?: string | null
          id?: string
          mobile_number?: string | null
          nationality?: string | null
          notes?: string | null
          notification_status?: string | null
          notify_host?: boolean | null
          passenger_count?: number | null
          person_name?: string
          photo_captured_at?: string | null
          preferred_language?: string | null
          purpose?: string | null
          qr_code_token?: string | null
          site_id?: string | null
          tenant_id?: string
          visit_duration_hours?: number | null
          visitor_id?: string | null
          visitor_photo_url?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_entry_logs_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_entry_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_entry_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_entry_logs_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_pass_approvers: {
        Row: {
          code: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          sort_order: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          sort_order?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_pass_approvers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_pass_items: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          gate_pass_id: string
          id: string
          item_name: string
          quantity: string | null
          tenant_id: string
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          gate_pass_id: string
          id?: string
          item_name: string
          quantity?: string | null
          tenant_id: string
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          gate_pass_id?: string
          id?: string
          item_name?: string
          quantity?: string | null
          tenant_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_pass_items_gate_pass_id_fkey"
            columns: ["gate_pass_id"]
            isOneToOne: false
            referencedRelation: "material_gate_passes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_pass_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_pass_photos: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          file_name: string
          file_size: number | null
          gate_pass_id: string
          id: string
          mime_type: string | null
          storage_path: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          file_name: string
          file_size?: number | null
          gate_pass_id: string
          id?: string
          mime_type?: string | null
          storage_path: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string
          file_size?: number | null
          gate_pass_id?: string
          id?: string
          mime_type?: string | null
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_pass_photos_gate_pass_id_fkey"
            columns: ["gate_pass_id"]
            isOneToOne: false
            referencedRelation: "material_gate_passes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_pass_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_pass_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geofence_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_message: string | null
          alert_type: string
          auto_escalated: boolean | null
          created_at: string | null
          deleted_at: string | null
          distance_from_zone: number | null
          escalated_at: string | null
          escalated_by: string | null
          escalation_level: number | null
          escalation_notes: string | null
          guard_id: string
          guard_lat: number | null
          guard_lng: number | null
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          roster_id: string | null
          severity: string | null
          tenant_id: string
          zone_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_message?: string | null
          alert_type: string
          auto_escalated?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          distance_from_zone?: number | null
          escalated_at?: string | null
          escalated_by?: string | null
          escalation_level?: number | null
          escalation_notes?: string | null
          guard_id: string
          guard_lat?: number | null
          guard_lng?: number | null
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          roster_id?: string | null
          severity?: string | null
          tenant_id: string
          zone_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_message?: string | null
          alert_type?: string
          auto_escalated?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          distance_from_zone?: number | null
          escalated_at?: string | null
          escalated_by?: string | null
          escalation_level?: number | null
          escalation_notes?: string | null
          guard_id?: string
          guard_lat?: number | null
          guard_lng?: number | null
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          roster_id?: string | null
          severity?: string | null
          tenant_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geofence_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_alerts_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_alerts_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "shift_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_alerts_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "security_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      geofence_escalation_rules: {
        Row: {
          auto_escalate: boolean | null
          breach_count_threshold: number
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          escalation_delay_minutes: number | null
          escalation_level: number
          id: string
          is_active: boolean | null
          notify_roles: string[] | null
          notify_user_ids: string[] | null
          rule_name: string
          tenant_id: string
          time_window_minutes: number
          updated_at: string | null
          zone_id: string | null
          zone_type: string | null
        }
        Insert: {
          auto_escalate?: boolean | null
          breach_count_threshold?: number
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          escalation_delay_minutes?: number | null
          escalation_level?: number
          id?: string
          is_active?: boolean | null
          notify_roles?: string[] | null
          notify_user_ids?: string[] | null
          rule_name: string
          tenant_id: string
          time_window_minutes?: number
          updated_at?: string | null
          zone_id?: string | null
          zone_type?: string | null
        }
        Update: {
          auto_escalate?: boolean | null
          breach_count_threshold?: number
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          escalation_delay_minutes?: number | null
          escalation_level?: number
          id?: string
          is_active?: boolean | null
          notify_roles?: string[] | null
          notify_user_ids?: string[] | null
          rule_name?: string
          tenant_id?: string
          time_window_minutes?: number
          updated_at?: string | null
          zone_id?: string | null
          zone_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geofence_escalation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_escalation_rules_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "security_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      glass_break_events: {
        Row: {
          activated_by: string
          created_at: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          deleted_at: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          reason: string
          tenant_id: string
        }
        Insert: {
          activated_by: string
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deleted_at?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          reason: string
          tenant_id: string
        }
        Update: {
          activated_by?: string
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deleted_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          reason?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "glass_break_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guard_attendance_logs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          check_in_accuracy: number | null
          check_in_at: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_in_method: string | null
          check_in_photo_path: string | null
          check_out_accuracy: number | null
          check_out_at: string | null
          check_out_lat: number | null
          check_out_lng: number | null
          check_out_method: string | null
          check_out_photo_path: string | null
          created_at: string
          deleted_at: string | null
          early_departure_minutes: number | null
          expected_end_time: string | null
          expected_start_time: string | null
          gps_validated: boolean | null
          guard_id: string
          id: string
          late_minutes: number | null
          notes: string | null
          overtime_minutes: number | null
          rejection_reason: string | null
          roster_id: string | null
          status: string | null
          tenant_id: string
          total_hours_worked: number | null
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          check_in_accuracy?: number | null
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_method?: string | null
          check_in_photo_path?: string | null
          check_out_accuracy?: number | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_method?: string | null
          check_out_photo_path?: string | null
          created_at?: string
          deleted_at?: string | null
          early_departure_minutes?: number | null
          expected_end_time?: string | null
          expected_start_time?: string | null
          gps_validated?: boolean | null
          guard_id: string
          id?: string
          late_minutes?: number | null
          notes?: string | null
          overtime_minutes?: number | null
          rejection_reason?: string | null
          roster_id?: string | null
          status?: string | null
          tenant_id: string
          total_hours_worked?: number | null
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          check_in_accuracy?: number | null
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_method?: string | null
          check_in_photo_path?: string | null
          check_out_accuracy?: number | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_method?: string | null
          check_out_photo_path?: string | null
          created_at?: string
          deleted_at?: string | null
          early_departure_minutes?: number | null
          expected_end_time?: string | null
          expected_start_time?: string | null
          gps_validated?: boolean | null
          guard_id?: string
          id?: string
          late_minutes?: number | null
          notes?: string | null
          overtime_minutes?: number | null
          rejection_reason?: string | null
          roster_id?: string | null
          status?: string | null
          tenant_id?: string
          total_hours_worked?: number | null
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guard_attendance_logs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_attendance_logs_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_attendance_logs_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "shift_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_attendance_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_attendance_logs_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "security_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      guard_performance_metrics: {
        Row: {
          avg_checkpoint_time_seconds: number | null
          checkpoints_missed: number | null
          checkpoints_verified: number | null
          created_at: string
          deleted_at: string | null
          emergency_response_time_seconds: number | null
          geofence_violations: number | null
          guard_id: string
          handovers_completed: number | null
          id: string
          incidents_reported: number | null
          incidents_resolved: number | null
          metric_date: string
          overall_score: number | null
          patrols_assigned: number | null
          patrols_completed: number | null
          shift_punctuality_minutes: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avg_checkpoint_time_seconds?: number | null
          checkpoints_missed?: number | null
          checkpoints_verified?: number | null
          created_at?: string
          deleted_at?: string | null
          emergency_response_time_seconds?: number | null
          geofence_violations?: number | null
          guard_id: string
          handovers_completed?: number | null
          id?: string
          incidents_reported?: number | null
          incidents_resolved?: number | null
          metric_date?: string
          overall_score?: number | null
          patrols_assigned?: number | null
          patrols_completed?: number | null
          shift_punctuality_minutes?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avg_checkpoint_time_seconds?: number | null
          checkpoints_missed?: number | null
          checkpoints_verified?: number | null
          created_at?: string
          deleted_at?: string | null
          emergency_response_time_seconds?: number | null
          geofence_violations?: number | null
          guard_id?: string
          handovers_completed?: number | null
          id?: string
          incidents_reported?: number | null
          incidents_resolved?: number | null
          metric_date?: string
          overall_score?: number | null
          patrols_assigned?: number | null
          patrols_completed?: number | null
          shift_punctuality_minutes?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guard_performance_metrics_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_performance_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guard_tracking_history: {
        Row: {
          accuracy: number | null
          altitude: number | null
          assigned_zone_id: string | null
          battery_level: number | null
          created_at: string | null
          distance_from_zone: number | null
          guard_id: string
          heading: number | null
          id: string
          is_within_zone: boolean | null
          latitude: number
          longitude: number
          recorded_at: string
          roster_id: string | null
          speed: number | null
          tenant_id: string
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          assigned_zone_id?: string | null
          battery_level?: number | null
          created_at?: string | null
          distance_from_zone?: number | null
          guard_id: string
          heading?: number | null
          id?: string
          is_within_zone?: boolean | null
          latitude: number
          longitude: number
          recorded_at?: string
          roster_id?: string | null
          speed?: number | null
          tenant_id: string
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          assigned_zone_id?: string | null
          battery_level?: number | null
          created_at?: string | null
          distance_from_zone?: number | null
          guard_id?: string
          heading?: number | null
          id?: string
          is_within_zone?: boolean | null
          latitude?: number
          longitude?: number
          recorded_at?: string
          roster_id?: string | null
          speed?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guard_tracking_history_assigned_zone_id_fkey"
            columns: ["assigned_zone_id"]
            isOneToOne: false
            referencedRelation: "security_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_tracking_history_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_tracking_history_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "shift_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_tracking_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hsse_assets: {
        Row: {
          asset_code: string
          barcode_value: string | null
          branch_id: string | null
          building_id: string | null
          category_id: string
          commissioning_date: string | null
          condition_rating:
            | Database["public"]["Enums"]["asset_condition"]
            | null
          created_at: string | null
          created_by: string | null
          criticality_level:
            | Database["public"]["Enums"]["asset_criticality"]
            | null
          currency: string | null
          current_book_value: number | null
          custom_fields: Json | null
          deleted_at: string | null
          depreciation_method: string | null
          depreciation_rate_pct: number | null
          description: string | null
          expected_lifespan_years: number | null
          floor_zone_id: string | null
          gps_accuracy: number | null
          gps_lat: number | null
          gps_lng: number | null
          gps_validated_at: string | null
          id: string
          inspection_interval_days: number | null
          installation_date: string | null
          insurance_expiry_date: string | null
          insurance_policy_number: string | null
          insurance_value: number | null
          last_inspection_date: string | null
          last_valuation_date: string | null
          latitude: number | null
          location_details: string | null
          location_verified: boolean | null
          longitude: number | null
          maintenance_contract_id: string | null
          maintenance_vendor: string | null
          manufacturer: string | null
          model: string | null
          name: string
          next_inspection_due: string | null
          ownership: Database["public"]["Enums"]["asset_ownership"] | null
          purchase_price: number | null
          qr_code_data: string | null
          replacement_due_date: string | null
          risk_score: number | null
          salvage_value: number | null
          serial_number: string | null
          site_id: string | null
          status: Database["public"]["Enums"]["asset_status"] | null
          subtype_id: string | null
          tags: string[] | null
          tenant_id: string
          type_id: string
          updated_at: string | null
          updated_by: string | null
          warranty_expiry_date: string | null
          warranty_provider: string | null
          warranty_terms: string | null
          warranty_warning_sent_at: string | null
        }
        Insert: {
          asset_code: string
          barcode_value?: string | null
          branch_id?: string | null
          building_id?: string | null
          category_id: string
          commissioning_date?: string | null
          condition_rating?:
            | Database["public"]["Enums"]["asset_condition"]
            | null
          created_at?: string | null
          created_by?: string | null
          criticality_level?:
            | Database["public"]["Enums"]["asset_criticality"]
            | null
          currency?: string | null
          current_book_value?: number | null
          custom_fields?: Json | null
          deleted_at?: string | null
          depreciation_method?: string | null
          depreciation_rate_pct?: number | null
          description?: string | null
          expected_lifespan_years?: number | null
          floor_zone_id?: string | null
          gps_accuracy?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          gps_validated_at?: string | null
          id?: string
          inspection_interval_days?: number | null
          installation_date?: string | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_value?: number | null
          last_inspection_date?: string | null
          last_valuation_date?: string | null
          latitude?: number | null
          location_details?: string | null
          location_verified?: boolean | null
          longitude?: number | null
          maintenance_contract_id?: string | null
          maintenance_vendor?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          next_inspection_due?: string | null
          ownership?: Database["public"]["Enums"]["asset_ownership"] | null
          purchase_price?: number | null
          qr_code_data?: string | null
          replacement_due_date?: string | null
          risk_score?: number | null
          salvage_value?: number | null
          serial_number?: string | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["asset_status"] | null
          subtype_id?: string | null
          tags?: string[] | null
          tenant_id: string
          type_id: string
          updated_at?: string | null
          updated_by?: string | null
          warranty_expiry_date?: string | null
          warranty_provider?: string | null
          warranty_terms?: string | null
          warranty_warning_sent_at?: string | null
        }
        Update: {
          asset_code?: string
          barcode_value?: string | null
          branch_id?: string | null
          building_id?: string | null
          category_id?: string
          commissioning_date?: string | null
          condition_rating?:
            | Database["public"]["Enums"]["asset_condition"]
            | null
          created_at?: string | null
          created_by?: string | null
          criticality_level?:
            | Database["public"]["Enums"]["asset_criticality"]
            | null
          currency?: string | null
          current_book_value?: number | null
          custom_fields?: Json | null
          deleted_at?: string | null
          depreciation_method?: string | null
          depreciation_rate_pct?: number | null
          description?: string | null
          expected_lifespan_years?: number | null
          floor_zone_id?: string | null
          gps_accuracy?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          gps_validated_at?: string | null
          id?: string
          inspection_interval_days?: number | null
          installation_date?: string | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_value?: number | null
          last_inspection_date?: string | null
          last_valuation_date?: string | null
          latitude?: number | null
          location_details?: string | null
          location_verified?: boolean | null
          longitude?: number | null
          maintenance_contract_id?: string | null
          maintenance_vendor?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          next_inspection_due?: string | null
          ownership?: Database["public"]["Enums"]["asset_ownership"] | null
          purchase_price?: number | null
          qr_code_data?: string | null
          replacement_due_date?: string | null
          risk_score?: number | null
          salvage_value?: number | null
          serial_number?: string | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["asset_status"] | null
          subtype_id?: string | null
          tags?: string[] | null
          tenant_id?: string
          type_id?: string
          updated_at?: string | null
          updated_by?: string | null
          warranty_expiry_date?: string | null
          warranty_provider?: string | null
          warranty_terms?: string | null
          warranty_warning_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hsse_assets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_assets_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_assets_floor_zone_id_fkey"
            columns: ["floor_zone_id"]
            isOneToOne: false
            referencedRelation: "floors_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_assets_subtype_id_fkey"
            columns: ["subtype_id"]
            isOneToOne: false
            referencedRelation: "asset_subtypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_assets_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_assets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hsse_event_categories: {
        Row: {
          code: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      hsse_event_subtypes: {
        Row: {
          category_id: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name_key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hsse_event_subtypes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "hsse_event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      hsse_notification_acknowledgments: {
        Row: {
          acknowledged_at: string
          created_at: string
          device_info: Json | null
          id: string
          ip_address: string | null
          notification_id: string
          tenant_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          created_at?: string
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          notification_id: string
          tenant_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          created_at?: string
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          notification_id?: string
          tenant_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hsse_notification_acknowledgments_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "hsse_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_notification_acknowledgments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_notification_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hsse_notification_reads: {
        Row: {
          created_at: string
          id: string
          notification_id: string
          read_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_id: string
          read_at?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_id?: string
          read_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hsse_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "hsse_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_notification_reads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_notification_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hsse_notifications: {
        Row: {
          body_ar: string | null
          body_en: string
          category: Database["public"]["Enums"]["hsse_notification_category"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email_delivery_status: string | null
          email_sent_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          notification_type: Database["public"]["Enums"]["hsse_notification_type"]
          priority: Database["public"]["Enums"]["hsse_notification_priority"]
          published_at: string | null
          related_incident_id: string | null
          send_email_notification: boolean | null
          send_push_notification: boolean
          target_audience: Database["public"]["Enums"]["hsse_notification_target"]
          target_branch_ids: string[] | null
          target_role_ids: string[] | null
          target_site_ids: string[] | null
          tenant_id: string
          title_ar: string | null
          title_en: string
          updated_at: string
        }
        Insert: {
          body_ar?: string | null
          body_en: string
          category?: Database["public"]["Enums"]["hsse_notification_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email_delivery_status?: string | null
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notification_type?: Database["public"]["Enums"]["hsse_notification_type"]
          priority?: Database["public"]["Enums"]["hsse_notification_priority"]
          published_at?: string | null
          related_incident_id?: string | null
          send_email_notification?: boolean | null
          send_push_notification?: boolean
          target_audience?: Database["public"]["Enums"]["hsse_notification_target"]
          target_branch_ids?: string[] | null
          target_role_ids?: string[] | null
          target_site_ids?: string[] | null
          tenant_id: string
          title_ar?: string | null
          title_en: string
          updated_at?: string
        }
        Update: {
          body_ar?: string | null
          body_en?: string
          category?: Database["public"]["Enums"]["hsse_notification_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email_delivery_status?: string | null
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notification_type?: Database["public"]["Enums"]["hsse_notification_type"]
          priority?: Database["public"]["Enums"]["hsse_notification_priority"]
          published_at?: string | null
          related_incident_id?: string | null
          send_email_notification?: boolean | null
          send_push_notification?: boolean
          target_audience?: Database["public"]["Enums"]["hsse_notification_target"]
          target_branch_ids?: string[] | null
          target_role_ids?: string[] | null
          target_site_ids?: string[] | null
          tenant_id?: string
          title_ar?: string | null
          title_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hsse_notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_notifications_related_incident_id_fkey"
            columns: ["related_incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hsse_scheduled_notifications: {
        Row: {
          body_ar: string | null
          body_en: string
          category: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          next_scheduled_at: string | null
          notification_type: string
          priority: string
          schedule_day_of_month: number | null
          schedule_days_of_week: number[] | null
          schedule_time: string
          schedule_timezone: string | null
          schedule_type: string
          send_email_notification: boolean | null
          send_push_notification: boolean | null
          start_date: string
          target_audience: string
          target_branch_ids: string[] | null
          target_role_ids: string[] | null
          target_site_ids: string[] | null
          tenant_id: string
          title_ar: string | null
          title_en: string
          total_sent_count: number | null
          updated_at: string | null
        }
        Insert: {
          body_ar?: string | null
          body_en: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          next_scheduled_at?: string | null
          notification_type?: string
          priority?: string
          schedule_day_of_month?: number | null
          schedule_days_of_week?: number[] | null
          schedule_time?: string
          schedule_timezone?: string | null
          schedule_type: string
          send_email_notification?: boolean | null
          send_push_notification?: boolean | null
          start_date?: string
          target_audience?: string
          target_branch_ids?: string[] | null
          target_role_ids?: string[] | null
          target_site_ids?: string[] | null
          tenant_id: string
          title_ar?: string | null
          title_en: string
          total_sent_count?: number | null
          updated_at?: string | null
        }
        Update: {
          body_ar?: string | null
          body_en?: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          next_scheduled_at?: string | null
          notification_type?: string
          priority?: string
          schedule_day_of_month?: number | null
          schedule_days_of_week?: number[] | null
          schedule_time?: string
          schedule_timezone?: string | null
          schedule_type?: string
          send_email_notification?: boolean | null
          send_push_notification?: boolean | null
          start_date?: string
          target_audience?: string
          target_branch_ids?: string[] | null
          target_role_ids?: string[] | null
          target_site_ids?: string[] | null
          tenant_id?: string
          title_ar?: string | null
          title_en?: string
          total_sent_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hsse_scheduled_notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsse_scheduled_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_access_list: {
        Row: {
          deleted_at: string | null
          granted_at: string | null
          granted_by: string
          id: string
          incident_id: string
          reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          deleted_at?: string | null
          granted_at?: string | null
          granted_by: string
          id?: string
          incident_id: string
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          deleted_at?: string | null
          granted_at?: string | null
          granted_by?: string
          id?: string
          incident_id?: string
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_access_list_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_access_list_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_access_list_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_access_list_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_access_list_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_asset_links: {
        Row: {
          asset_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          incident_id: string
          link_type: string
          notes: string | null
          tenant_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          incident_id: string
          link_type?: string
          notes?: string | null
          tenant_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          incident_id?: string
          link_type?: string
          notes?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_asset_links_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "incident_asset_links_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_asset_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_asset_links_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_asset_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          incident_id: string | null
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          incident_id?: string | null
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          incident_id?: string | null
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_audit_logs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_confidentiality_audit: {
        Row: {
          action: string
          actor_id: string
          affected_user_id: string | null
          created_at: string | null
          expiry_settings: Json | null
          id: string
          incident_id: string
          new_level: string | null
          old_level: string | null
          reason: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id: string
          affected_user_id?: string | null
          created_at?: string | null
          expiry_settings?: Json | null
          id?: string
          incident_id: string
          new_level?: string | null
          old_level?: string | null
          reason?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          affected_user_id?: string | null
          created_at?: string | null
          expiry_settings?: Json | null
          id?: string
          incident_id?: string
          new_level?: string | null
          old_level?: string | null
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_confidentiality_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_confidentiality_audit_affected_user_id_fkey"
            columns: ["affected_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_confidentiality_audit_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_confidentiality_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_notification_matrix: {
        Row: {
          channels: string[]
          condition_type: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          severity_level: string
          stakeholder_role: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
          whatsapp_template_id: string | null
        }
        Insert: {
          channels?: string[]
          condition_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          severity_level: string
          stakeholder_role: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_template_id?: string | null
        }
        Update: {
          channels?: string[]
          condition_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          severity_level?: string
          stakeholder_role?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_notification_matrix_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_notification_matrix_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_notification_matrix_whatsapp_template_id_fkey"
            columns: ["whatsapp_template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          ai_analysis_result: Json | null
          approval_manager_id: string | null
          auto_declassify_to: string | null
          branch_id: string | null
          closure_approved_at: string | null
          closure_approved_by: string | null
          closure_rejection_notes: string | null
          closure_request_notes: string | null
          closure_requested_at: string | null
          closure_requested_by: string | null
          closure_requires_manager: boolean | null
          closure_signature_path: string | null
          closure_signed_at: string | null
          closure_signed_by: string | null
          confidentiality_expiry: string | null
          confidentiality_expiry_reason: string | null
          confidentiality_level: string | null
          confidentiality_set_at: string | null
          confidentiality_set_by: string | null
          created_at: string | null
          damage_details: Json | null
          deleted_at: string | null
          department: string | null
          department_id: string | null
          dept_rep_approved_at: string | null
          dept_rep_approved_by: string | null
          dept_rep_notes: string | null
          description: string
          erp_activated: boolean | null
          escalated_to_hsse_manager_at: string | null
          event_type: string
          expert_recommendation: string | null
          expert_rejected_at: string | null
          expert_rejected_by: string | null
          expert_rejection_reason: string | null
          expert_screened_at: string | null
          expert_screened_by: string | null
          expert_screening_notes: string | null
          has_damage: boolean | null
          has_injury: boolean | null
          hsse_manager_decision: string | null
          hsse_manager_decision_by: string | null
          hsse_manager_justification: string | null
          hsse_validated_at: string | null
          hsse_validated_by: string | null
          hsse_validation_notes: string | null
          hsse_validation_status: string | null
          id: string
          immediate_actions: string | null
          immediate_actions_data: Json | null
          incident_type: string | null
          injury_classification: string | null
          injury_details: Json | null
          is_recordable: boolean | null
          latitude: number | null
          location: string | null
          location_city: string | null
          location_country: string | null
          location_district: string | null
          location_formatted: string | null
          location_street: string | null
          longitude: number | null
          lost_workdays: number | null
          manager_decision: string | null
          manager_decision_at: string | null
          manager_rejection_reason: string | null
          media_attachments: Json | null
          no_investigation_justification: string | null
          occurred_at: string | null
          original_potential_severity_v2:
            | Database["public"]["Enums"]["severity_level_v2"]
            | null
          original_severity:
            | Database["public"]["Enums"]["severity_level"]
            | null
          original_severity_v2:
            | Database["public"]["Enums"]["severity_level_v2"]
            | null
          patrol_checkpoint_id: string | null
          patrol_id: string | null
          potential_severity_approved_at: string | null
          potential_severity_approved_by: string | null
          potential_severity_justification: string | null
          potential_severity_pending_approval: boolean | null
          potential_severity_v2:
            | Database["public"]["Enums"]["severity_level_v2"]
            | null
          recognition_type: string | null
          recognized_contractor_worker_id: string | null
          recognized_user_id: string | null
          reference_id: string | null
          reporter_dispute_notes: string | null
          reporter_disputes_rejection: boolean | null
          reporter_id: string | null
          reporter_rejection_confirmed_at: string | null
          restricted_workdays: number | null
          resubmission_count: number | null
          return_instructions: string | null
          return_reason: string | null
          returned_at: string | null
          returned_by: string | null
          risk_rating: string | null
          severity: Database["public"]["Enums"]["severity_level"] | null
          severity_approved_at: string | null
          severity_approved_by: string | null
          severity_auto_calculated:
            | Database["public"]["Enums"]["severity_level_v2"]
            | null
          severity_change_justification: string | null
          severity_override_reason: string | null
          severity_pending_approval: boolean | null
          severity_v2: Database["public"]["Enums"]["severity_level_v2"] | null
          site_id: string | null
          special_event_id: string | null
          status: Database["public"]["Enums"]["incident_status"] | null
          subtype: string | null
          tenant_id: string
          title: string
          updated_at: string | null
          worker_type: string | null
        }
        Insert: {
          ai_analysis_result?: Json | null
          approval_manager_id?: string | null
          auto_declassify_to?: string | null
          branch_id?: string | null
          closure_approved_at?: string | null
          closure_approved_by?: string | null
          closure_rejection_notes?: string | null
          closure_request_notes?: string | null
          closure_requested_at?: string | null
          closure_requested_by?: string | null
          closure_requires_manager?: boolean | null
          closure_signature_path?: string | null
          closure_signed_at?: string | null
          closure_signed_by?: string | null
          confidentiality_expiry?: string | null
          confidentiality_expiry_reason?: string | null
          confidentiality_level?: string | null
          confidentiality_set_at?: string | null
          confidentiality_set_by?: string | null
          created_at?: string | null
          damage_details?: Json | null
          deleted_at?: string | null
          department?: string | null
          department_id?: string | null
          dept_rep_approved_at?: string | null
          dept_rep_approved_by?: string | null
          dept_rep_notes?: string | null
          description: string
          erp_activated?: boolean | null
          escalated_to_hsse_manager_at?: string | null
          event_type: string
          expert_recommendation?: string | null
          expert_rejected_at?: string | null
          expert_rejected_by?: string | null
          expert_rejection_reason?: string | null
          expert_screened_at?: string | null
          expert_screened_by?: string | null
          expert_screening_notes?: string | null
          has_damage?: boolean | null
          has_injury?: boolean | null
          hsse_manager_decision?: string | null
          hsse_manager_decision_by?: string | null
          hsse_manager_justification?: string | null
          hsse_validated_at?: string | null
          hsse_validated_by?: string | null
          hsse_validation_notes?: string | null
          hsse_validation_status?: string | null
          id?: string
          immediate_actions?: string | null
          immediate_actions_data?: Json | null
          incident_type?: string | null
          injury_classification?: string | null
          injury_details?: Json | null
          is_recordable?: boolean | null
          latitude?: number | null
          location?: string | null
          location_city?: string | null
          location_country?: string | null
          location_district?: string | null
          location_formatted?: string | null
          location_street?: string | null
          longitude?: number | null
          lost_workdays?: number | null
          manager_decision?: string | null
          manager_decision_at?: string | null
          manager_rejection_reason?: string | null
          media_attachments?: Json | null
          no_investigation_justification?: string | null
          occurred_at?: string | null
          original_potential_severity_v2?:
            | Database["public"]["Enums"]["severity_level_v2"]
            | null
          original_severity?:
            | Database["public"]["Enums"]["severity_level"]
            | null
          original_severity_v2?:
            | Database["public"]["Enums"]["severity_level_v2"]
            | null
          patrol_checkpoint_id?: string | null
          patrol_id?: string | null
          potential_severity_approved_at?: string | null
          potential_severity_approved_by?: string | null
          potential_severity_justification?: string | null
          potential_severity_pending_approval?: boolean | null
          potential_severity_v2?:
            | Database["public"]["Enums"]["severity_level_v2"]
            | null
          recognition_type?: string | null
          recognized_contractor_worker_id?: string | null
          recognized_user_id?: string | null
          reference_id?: string | null
          reporter_dispute_notes?: string | null
          reporter_disputes_rejection?: boolean | null
          reporter_id?: string | null
          reporter_rejection_confirmed_at?: string | null
          restricted_workdays?: number | null
          resubmission_count?: number | null
          return_instructions?: string | null
          return_reason?: string | null
          returned_at?: string | null
          returned_by?: string | null
          risk_rating?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          severity_approved_at?: string | null
          severity_approved_by?: string | null
          severity_auto_calculated?:
            | Database["public"]["Enums"]["severity_level_v2"]
            | null
          severity_change_justification?: string | null
          severity_override_reason?: string | null
          severity_pending_approval?: boolean | null
          severity_v2?: Database["public"]["Enums"]["severity_level_v2"] | null
          site_id?: string | null
          special_event_id?: string | null
          status?: Database["public"]["Enums"]["incident_status"] | null
          subtype?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
          worker_type?: string | null
        }
        Update: {
          ai_analysis_result?: Json | null
          approval_manager_id?: string | null
          auto_declassify_to?: string | null
          branch_id?: string | null
          closure_approved_at?: string | null
          closure_approved_by?: string | null
          closure_rejection_notes?: string | null
          closure_request_notes?: string | null
          closure_requested_at?: string | null
          closure_requested_by?: string | null
          closure_requires_manager?: boolean | null
          closure_signature_path?: string | null
          closure_signed_at?: string | null
          closure_signed_by?: string | null
          confidentiality_expiry?: string | null
          confidentiality_expiry_reason?: string | null
          confidentiality_level?: string | null
          confidentiality_set_at?: string | null
          confidentiality_set_by?: string | null
          created_at?: string | null
          damage_details?: Json | null
          deleted_at?: string | null
          department?: string | null
          department_id?: string | null
          dept_rep_approved_at?: string | null
          dept_rep_approved_by?: string | null
          dept_rep_notes?: string | null
          description?: string
          erp_activated?: boolean | null
          escalated_to_hsse_manager_at?: string | null
          event_type?: string
          expert_recommendation?: string | null
          expert_rejected_at?: string | null
          expert_rejected_by?: string | null
          expert_rejection_reason?: string | null
          expert_screened_at?: string | null
          expert_screened_by?: string | null
          expert_screening_notes?: string | null
          has_damage?: boolean | null
          has_injury?: boolean | null
          hsse_manager_decision?: string | null
          hsse_manager_decision_by?: string | null
          hsse_manager_justification?: string | null
          hsse_validated_at?: string | null
          hsse_validated_by?: string | null
          hsse_validation_notes?: string | null
          hsse_validation_status?: string | null
          id?: string
          immediate_actions?: string | null
          immediate_actions_data?: Json | null
          incident_type?: string | null
          injury_classification?: string | null
          injury_details?: Json | null
          is_recordable?: boolean | null
          latitude?: number | null
          location?: string | null
          location_city?: string | null
          location_country?: string | null
          location_district?: string | null
          location_formatted?: string | null
          location_street?: string | null
          longitude?: number | null
          lost_workdays?: number | null
          manager_decision?: string | null
          manager_decision_at?: string | null
          manager_rejection_reason?: string | null
          media_attachments?: Json | null
          no_investigation_justification?: string | null
          occurred_at?: string | null
          original_potential_severity_v2?:
            | Database["public"]["Enums"]["severity_level_v2"]
            | null
          original_severity?:
            | Database["public"]["Enums"]["severity_level"]
            | null
          original_severity_v2?:
            | Database["public"]["Enums"]["severity_level_v2"]
            | null
          patrol_checkpoint_id?: string | null
          patrol_id?: string | null
          potential_severity_approved_at?: string | null
          potential_severity_approved_by?: string | null
          potential_severity_justification?: string | null
          potential_severity_pending_approval?: boolean | null
          potential_severity_v2?:
            | Database["public"]["Enums"]["severity_level_v2"]
            | null
          recognition_type?: string | null
          recognized_contractor_worker_id?: string | null
          recognized_user_id?: string | null
          reference_id?: string | null
          reporter_dispute_notes?: string | null
          reporter_disputes_rejection?: boolean | null
          reporter_id?: string | null
          reporter_rejection_confirmed_at?: string | null
          restricted_workdays?: number | null
          resubmission_count?: number | null
          return_instructions?: string | null
          return_reason?: string | null
          returned_at?: string | null
          returned_by?: string | null
          risk_rating?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          severity_approved_at?: string | null
          severity_approved_by?: string | null
          severity_auto_calculated?:
            | Database["public"]["Enums"]["severity_level_v2"]
            | null
          severity_change_justification?: string | null
          severity_override_reason?: string | null
          severity_pending_approval?: boolean | null
          severity_v2?: Database["public"]["Enums"]["severity_level_v2"] | null
          site_id?: string | null
          special_event_id?: string | null
          status?: Database["public"]["Enums"]["incident_status"] | null
          subtype?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          worker_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_approval_manager_id_fkey"
            columns: ["approval_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_closure_approved_by_fkey"
            columns: ["closure_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_closure_requested_by_fkey"
            columns: ["closure_requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_closure_signed_by_fkey"
            columns: ["closure_signed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_confidentiality_set_by_fkey"
            columns: ["confidentiality_set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_dept_rep_approved_by_fkey"
            columns: ["dept_rep_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_expert_rejected_by_fkey"
            columns: ["expert_rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_expert_screened_by_fkey"
            columns: ["expert_screened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_hsse_manager_decision_by_fkey"
            columns: ["hsse_manager_decision_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_hsse_validated_by_fkey"
            columns: ["hsse_validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_patrol_checkpoint_id_fkey"
            columns: ["patrol_checkpoint_id"]
            isOneToOne: false
            referencedRelation: "patrol_checkpoint_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_patrol_id_fkey"
            columns: ["patrol_id"]
            isOneToOne: false
            referencedRelation: "security_patrols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_recognized_contractor_worker_id_fkey"
            columns: ["recognized_contractor_worker_id"]
            isOneToOne: false
            referencedRelation: "contractor_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_recognized_user_id_fkey"
            columns: ["recognized_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_special_event_id_fkey"
            columns: ["special_event_id"]
            isOneToOne: false
            referencedRelation: "special_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      induction_videos: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_active: boolean
          language: string
          site_id: string | null
          tenant_id: string
          thumbnail_url: string | null
          title: string
          title_ar: string | null
          updated_at: string
          valid_for_days: number
          video_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          language: string
          site_id?: string | null
          tenant_id: string
          thumbnail_url?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string
          valid_for_days?: number
          video_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          language?: string
          site_id?: string | null
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string
          valid_for_days?: number
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "induction_videos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "induction_videos_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "induction_videos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          change_summary: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          reference_id: string | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          change_summary?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          reference_id?: string | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          change_summary?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          reference_id?: string | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_findings: {
        Row: {
          action_id: string | null
          ai_generated_description: string | null
          asset_id: string | null
          classification: string
          created_at: string | null
          deleted_at: string | null
          description: string
          id: string
          risk_level: string | null
          session_asset_id: string | null
          session_id: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          action_id?: string | null
          ai_generated_description?: string | null
          asset_id?: string | null
          classification?: string
          created_at?: string | null
          deleted_at?: string | null
          description: string
          id?: string
          risk_level?: string | null
          session_asset_id?: string | null
          session_id: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          action_id?: string | null
          ai_generated_description?: string | null
          asset_id?: string | null
          classification?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          risk_level?: string | null
          session_asset_id?: string | null
          session_id?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_findings_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_findings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "inspection_findings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_findings_session_asset_id_fkey"
            columns: ["session_asset_id"]
            isOneToOne: false
            referencedRelation: "inspection_session_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_findings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "inspection_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_findings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_responses: {
        Row: {
          id: string
          inspection_id: string
          notes: string | null
          photo_path: string | null
          responded_at: string | null
          response_value: string | null
          result: string | null
          template_item_id: string
          tenant_id: string
        }
        Insert: {
          id?: string
          inspection_id: string
          notes?: string | null
          photo_path?: string | null
          responded_at?: string | null
          response_value?: string | null
          result?: string | null
          template_item_id: string
          tenant_id: string
        }
        Update: {
          id?: string
          inspection_id?: string
          notes?: string | null
          photo_path?: string | null
          responded_at?: string | null
          response_value?: string | null
          result?: string | null
          template_item_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_responses_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "asset_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_responses_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "inspection_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_schedules: {
        Row: {
          assigned_inspector_id: string | null
          assigned_team: Json | null
          auto_generate_session: boolean | null
          building_id: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          day_of_month: number | null
          day_of_week: number | null
          deleted_at: string | null
          end_date: string | null
          floor_zone_id: string | null
          frequency_type: string
          frequency_value: number
          id: string
          is_active: boolean
          last_generated: string | null
          last_generated_at: string | null
          last_reminder_sent: string | null
          month_of_year: number | null
          name: string
          name_ar: string | null
          next_due: string | null
          reference_id: string
          reminder_days_before: number
          schedule_type: string
          sessions_generated_count: number | null
          site_id: string | null
          start_date: string
          template_id: string
          tenant_id: string
          type_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_inspector_id?: string | null
          assigned_team?: Json | null
          auto_generate_session?: boolean | null
          building_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          deleted_at?: string | null
          end_date?: string | null
          floor_zone_id?: string | null
          frequency_type?: string
          frequency_value?: number
          id?: string
          is_active?: boolean
          last_generated?: string | null
          last_generated_at?: string | null
          last_reminder_sent?: string | null
          month_of_year?: number | null
          name: string
          name_ar?: string | null
          next_due?: string | null
          reference_id: string
          reminder_days_before?: number
          schedule_type?: string
          sessions_generated_count?: number | null
          site_id?: string | null
          start_date?: string
          template_id: string
          tenant_id: string
          type_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_inspector_id?: string | null
          assigned_team?: Json | null
          auto_generate_session?: boolean | null
          building_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          deleted_at?: string | null
          end_date?: string | null
          floor_zone_id?: string | null
          frequency_type?: string
          frequency_value?: number
          id?: string
          is_active?: boolean
          last_generated?: string | null
          last_generated_at?: string | null
          last_reminder_sent?: string | null
          month_of_year?: number | null
          name?: string
          name_ar?: string | null
          next_due?: string | null
          reference_id?: string
          reminder_days_before?: number
          schedule_type?: string
          sessions_generated_count?: number | null
          site_id?: string | null
          start_date?: string
          template_id?: string
          tenant_id?: string
          type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_schedules_assigned_inspector_id_fkey"
            columns: ["assigned_inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_schedules_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_schedules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_schedules_floor_zone_id_fkey"
            columns: ["floor_zone_id"]
            isOneToOne: false
            referencedRelation: "floors_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_schedules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_schedules_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_session_assets: {
        Row: {
          asset_id: string
          created_at: string | null
          failure_reason: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          inspected_at: string | null
          inspected_by: string | null
          notes: string | null
          photo_paths: Json | null
          quick_result: string | null
          session_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          failure_reason?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          notes?: string | null
          photo_paths?: Json | null
          quick_result?: string | null
          session_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          failure_reason?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          notes?: string | null
          photo_paths?: Json | null
          quick_result?: string | null
          session_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_session_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "inspection_session_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_session_assets_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_session_assets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "inspection_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_session_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_sessions: {
        Row: {
          ai_summary: string | null
          ai_summary_generated_at: string | null
          attendees: Json | null
          building_id: string | null
          category_id: string | null
          closed_at: string | null
          completed_at: string | null
          compliance_percentage: number | null
          created_at: string | null
          deleted_at: string | null
          failed_count: number | null
          floor_zone_id: string | null
          gps_boundary: Json | null
          id: string
          inspected_count: number | null
          inspector_id: string
          not_accessible_count: number | null
          passed_count: number | null
          period: string
          reference_id: string | null
          report_generated_at: string | null
          report_url: string | null
          scope_notes: string | null
          session_type: string
          site_id: string | null
          started_at: string | null
          status: string
          template_id: string
          tenant_id: string
          total_assets: number | null
          type_id: string | null
          updated_at: string | null
          weather_conditions: string | null
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          attendees?: Json | null
          building_id?: string | null
          category_id?: string | null
          closed_at?: string | null
          completed_at?: string | null
          compliance_percentage?: number | null
          created_at?: string | null
          deleted_at?: string | null
          failed_count?: number | null
          floor_zone_id?: string | null
          gps_boundary?: Json | null
          id?: string
          inspected_count?: number | null
          inspector_id: string
          not_accessible_count?: number | null
          passed_count?: number | null
          period: string
          reference_id?: string | null
          report_generated_at?: string | null
          report_url?: string | null
          scope_notes?: string | null
          session_type?: string
          site_id?: string | null
          started_at?: string | null
          status?: string
          template_id: string
          tenant_id: string
          total_assets?: number | null
          type_id?: string | null
          updated_at?: string | null
          weather_conditions?: string | null
        }
        Update: {
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          attendees?: Json | null
          building_id?: string | null
          category_id?: string | null
          closed_at?: string | null
          completed_at?: string | null
          compliance_percentage?: number | null
          created_at?: string | null
          deleted_at?: string | null
          failed_count?: number | null
          floor_zone_id?: string | null
          gps_boundary?: Json | null
          id?: string
          inspected_count?: number | null
          inspector_id?: string
          not_accessible_count?: number | null
          passed_count?: number | null
          period?: string
          reference_id?: string | null
          report_generated_at?: string | null
          report_url?: string | null
          scope_notes?: string | null
          session_type?: string
          site_id?: string | null
          started_at?: string | null
          status?: string
          template_id?: string
          tenant_id?: string
          total_assets?: number | null
          type_id?: string | null
          updated_at?: string | null
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_sessions_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_sessions_floor_zone_id_fkey"
            columns: ["floor_zone_id"]
            isOneToOne: false
            referencedRelation: "floors_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_sessions_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_sessions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_sessions_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_template_categories: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          description_ar: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          name_ar: string | null
          sort_order: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          description_ar?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          name_ar?: string | null
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          description_ar?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          name_ar?: string | null
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_template_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_template_items: {
        Row: {
          clause_reference: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          instructions: string | null
          instructions_ar: string | null
          is_critical: boolean | null
          is_required: boolean | null
          max_value: number | null
          min_value: number | null
          nc_category: string | null
          question: string
          question_ar: string | null
          rating_scale: number | null
          response_type: string
          scoring_weight: number | null
          sort_order: number
          template_id: string
          tenant_id: string
        }
        Insert: {
          clause_reference?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          instructions?: string | null
          instructions_ar?: string | null
          is_critical?: boolean | null
          is_required?: boolean | null
          max_value?: number | null
          min_value?: number | null
          nc_category?: string | null
          question: string
          question_ar?: string | null
          rating_scale?: number | null
          response_type: string
          scoring_weight?: number | null
          sort_order?: number
          template_id: string
          tenant_id: string
        }
        Update: {
          clause_reference?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          instructions?: string | null
          instructions_ar?: string | null
          is_critical?: boolean | null
          is_required?: boolean | null
          max_value?: number | null
          min_value?: number | null
          nc_category?: string | null
          question?: string
          question_ar?: string | null
          rating_scale?: number | null
          response_type?: string
          scoring_weight?: number | null
          sort_order?: number
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_template_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_templates: {
        Row: {
          area_type: string | null
          branch_id: string | null
          category_id: string | null
          code: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          inspection_category_id: string | null
          is_active: boolean | null
          name: string
          name_ar: string | null
          passing_score_percentage: number | null
          requires_gps: boolean | null
          requires_photos: boolean | null
          scope_description: string | null
          site_id: string | null
          standard_reference: string | null
          template_type: string
          tenant_id: string
          type_id: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          area_type?: string | null
          branch_id?: string | null
          category_id?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          inspection_category_id?: string | null
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          passing_score_percentage?: number | null
          requires_gps?: boolean | null
          requires_photos?: boolean | null
          scope_description?: string | null
          site_id?: string | null
          standard_reference?: string | null
          template_type?: string
          tenant_id: string
          type_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          area_type?: string | null
          branch_id?: string | null
          category_id?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          inspection_category_id?: string | null
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          passing_score_percentage?: number | null
          requires_gps?: boolean | null
          requires_photos?: boolean | null
          scope_description?: string | null
          site_id?: string | null
          standard_reference?: string | null
          template_type?: string
          tenant_id?: string
          type_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_templates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_templates_inspection_category_id_fkey"
            columns: ["inspection_category_id"]
            isOneToOne: false
            referencedRelation: "inspection_template_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_templates_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_templates_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
        ]
      }
      investigation_sla_configs: {
        Row: {
          created_at: string | null
          escalation_days_after: number
          id: string
          second_escalation_days_after: number | null
          severity_level: string
          target_days: number
          updated_at: string | null
          warning_days_before: number
        }
        Insert: {
          created_at?: string | null
          escalation_days_after?: number
          id?: string
          second_escalation_days_after?: number | null
          severity_level: string
          target_days?: number
          updated_at?: string | null
          warning_days_before?: number
        }
        Update: {
          created_at?: string | null
          escalation_days_after?: number
          id?: string
          second_escalation_days_after?: number | null
          severity_level?: string
          target_days?: number
          updated_at?: string | null
          warning_days_before?: number
        }
        Relationships: []
      }
      investigations: {
        Row: {
          ai_summary: string | null
          ai_summary_generated_at: string | null
          ai_summary_language: string | null
          assigned_at: string | null
          assigned_by: string | null
          assignment_notes: string | null
          completed_at: string | null
          contributing_factors: string | null
          contributing_factors_list: Json | null
          created_at: string | null
          deleted_at: string | null
          escalation_level: number | null
          findings_summary: string | null
          five_whys: Json | null
          id: string
          immediate_cause: string | null
          incident_id: string | null
          investigator_id: string | null
          review_deadline: string | null
          root_cause: string | null
          root_causes: Json | null
          sla_escalation_sent_at: string | null
          sla_warning_sent_at: string | null
          started_at: string | null
          target_completion_date: string | null
          tenant_id: string
          underlying_cause: string | null
          updated_at: string | null
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          ai_summary_language?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_notes?: string | null
          completed_at?: string | null
          contributing_factors?: string | null
          contributing_factors_list?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          escalation_level?: number | null
          findings_summary?: string | null
          five_whys?: Json | null
          id?: string
          immediate_cause?: string | null
          incident_id?: string | null
          investigator_id?: string | null
          review_deadline?: string | null
          root_cause?: string | null
          root_causes?: Json | null
          sla_escalation_sent_at?: string | null
          sla_warning_sent_at?: string | null
          started_at?: string | null
          target_completion_date?: string | null
          tenant_id: string
          underlying_cause?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          ai_summary_language?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_notes?: string | null
          completed_at?: string | null
          contributing_factors?: string | null
          contributing_factors_list?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          escalation_level?: number | null
          findings_summary?: string | null
          five_whys?: Json | null
          id?: string
          immediate_cause?: string | null
          incident_id?: string | null
          investigator_id?: string | null
          review_deadline?: string | null
          root_cause?: string | null
          root_causes?: Json | null
          sla_escalation_sent_at?: string | null
          sla_warning_sent_at?: string | null
          started_at?: string | null
          target_completion_date?: string | null
          tenant_id?: string
          underlying_cause?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investigations_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: true
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investigations_investigator_id_fkey"
            columns: ["investigator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investigations_tenant_id_fkey"
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
          deleted_at: string | null
          email: string
          expires_at: string
          id: string
          metadata: Json | null
          tenant_id: string
          used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          deleted_at?: string | null
          email: string
          expires_at: string
          id?: string
          metadata?: Json | null
          tenant_id: string
          used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          metadata?: Json | null
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
      kpi_audit_logs: {
        Row: {
          action_type: string
          changed_at: string
          changed_by: string | null
          deleted_at: string | null
          id: string
          ip_address: string | null
          kpi_code: string
          kpi_target_id: string | null
          new_value: Json | null
          notes: string | null
          old_value: Json | null
          tenant_id: string
        }
        Insert: {
          action_type: string
          changed_at?: string
          changed_by?: string | null
          deleted_at?: string | null
          id?: string
          ip_address?: string | null
          kpi_code: string
          kpi_target_id?: string | null
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          tenant_id: string
        }
        Update: {
          action_type?: string
          changed_at?: string
          changed_by?: string | null
          deleted_at?: string | null
          id?: string
          ip_address?: string | null
          kpi_code?: string
          kpi_target_id?: string | null
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_audit_logs_kpi_target_id_fkey"
            columns: ["kpi_target_id"]
            isOneToOne: false
            referencedRelation: "kpi_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_targets: {
        Row: {
          comparison_type: string | null
          created_at: string | null
          created_by: string | null
          critical_threshold: number | null
          deleted_at: string | null
          description: string | null
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean | null
          kpi_code: string
          period_type: string | null
          target_value: number
          tenant_id: string
          updated_at: string | null
          warning_threshold: number | null
        }
        Insert: {
          comparison_type?: string | null
          created_at?: string | null
          created_by?: string | null
          critical_threshold?: number | null
          deleted_at?: string | null
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          kpi_code: string
          period_type?: string | null
          target_value: number
          tenant_id: string
          updated_at?: string | null
          warning_threshold?: number | null
        }
        Update: {
          comparison_type?: string | null
          created_at?: string | null
          created_by?: string | null
          critical_threshold?: number | null
          deleted_at?: string | null
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          kpi_code?: string
          period_type?: string | null
          target_value?: number
          tenant_id?: string
          updated_at?: string | null
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_targets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          browser: string | null
          city: string | null
          country_code: string | null
          country_name: string | null
          created_at: string | null
          deleted_at: string | null
          device_fingerprint: string | null
          email: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          is_new_device: boolean | null
          is_new_location: boolean | null
          is_proxy: boolean | null
          is_suspicious: boolean | null
          is_vpn: boolean | null
          isp: string | null
          login_success: boolean | null
          platform: string | null
          region: string | null
          risk_factors: Json | null
          risk_score: number | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          device_fingerprint?: string | null
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          is_new_device?: boolean | null
          is_new_location?: boolean | null
          is_proxy?: boolean | null
          is_suspicious?: boolean | null
          is_vpn?: boolean | null
          isp?: string | null
          login_success?: boolean | null
          platform?: string | null
          region?: string | null
          risk_factors?: Json | null
          risk_score?: number | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          device_fingerprint?: string | null
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          is_new_device?: boolean | null
          is_new_location?: boolean | null
          is_proxy?: boolean | null
          is_suspicious?: boolean | null
          is_vpn?: boolean | null
          isp?: string | null
          login_success?: boolean | null
          platform?: string | null
          region?: string | null
          risk_factors?: Json | null
          risk_score?: number | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_part_usage: {
        Row: {
          asset_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          part_id: string
          quantity_used: number
          schedule_id: string | null
          tenant_id: string
          usage_date: string
          used_by: string | null
          work_order_reference: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          part_id: string
          quantity_used: number
          schedule_id?: string | null
          tenant_id: string
          usage_date?: string
          used_by?: string | null
          work_order_reference?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          part_id?: string
          quantity_used?: number
          schedule_id?: string | null
          tenant_id?: string
          usage_date?: string
          used_by?: string | null
          work_order_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_part_usage_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "maintenance_part_usage_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_part_usage_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "maintenance_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_part_usage_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "asset_maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_part_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_part_usage_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_parts: {
        Row: {
          bin_number: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_critical: boolean | null
          last_purchase_date: string | null
          last_purchase_price: number | null
          manufacturer: string | null
          max_stock_level: number | null
          min_stock_level: number | null
          model_number: string | null
          name: string
          name_ar: string | null
          part_number: string
          quantity_in_stock: number | null
          reorder_point: number | null
          storage_location: string | null
          tenant_id: string
          unit_cost: number | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          bin_number?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          last_purchase_date?: string | null
          last_purchase_price?: number | null
          manufacturer?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          model_number?: string | null
          name: string
          name_ar?: string | null
          part_number: string
          quantity_in_stock?: number | null
          reorder_point?: number | null
          storage_location?: string | null
          tenant_id: string
          unit_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          bin_number?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          last_purchase_date?: string | null
          last_purchase_price?: number | null
          manufacturer?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          model_number?: string | null
          name?: string
          name_ar?: string | null
          part_number?: string
          quantity_in_stock?: number | null
          reorder_point?: number | null
          storage_location?: string | null
          tenant_id?: string
          unit_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_parts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedule_parts: {
        Row: {
          created_at: string | null
          id: string
          is_optional: boolean | null
          notes: string | null
          part_id: string
          quantity_required: number | null
          schedule_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_optional?: boolean | null
          notes?: string | null
          part_id: string
          quantity_required?: number | null
          schedule_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_optional?: boolean | null
          notes?: string | null
          part_id?: string
          quantity_required?: number | null
          schedule_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedule_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "maintenance_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedule_parts_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "asset_maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedule_parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_team: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          deleted_at: string | null
          id: string
          manager_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          deleted_at?: string | null
          id?: string
          manager_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          deleted_at?: string | null
          id?: string
          manager_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_team_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_team_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_team_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manhours: {
        Row: {
          branch_id: string | null
          calculation_mode: string | null
          contractor_count: number | null
          contractor_hours: number
          created_at: string | null
          deleted_at: string | null
          department_id: string | null
          employee_count: number | null
          employee_hours: number
          hours_per_day: number | null
          id: string
          notes: string | null
          period_date: string
          period_type: string
          recorded_by: string | null
          site_id: string | null
          tenant_id: string
          updated_at: string | null
          working_days: number | null
        }
        Insert: {
          branch_id?: string | null
          calculation_mode?: string | null
          contractor_count?: number | null
          contractor_hours?: number
          created_at?: string | null
          deleted_at?: string | null
          department_id?: string | null
          employee_count?: number | null
          employee_hours?: number
          hours_per_day?: number | null
          id?: string
          notes?: string | null
          period_date: string
          period_type?: string
          recorded_by?: string | null
          site_id?: string | null
          tenant_id: string
          updated_at?: string | null
          working_days?: number | null
        }
        Update: {
          branch_id?: string | null
          calculation_mode?: string | null
          contractor_count?: number | null
          contractor_hours?: number
          created_at?: string | null
          deleted_at?: string | null
          department_id?: string | null
          employee_count?: number | null
          employee_hours?: number
          hours_per_day?: number | null
          id?: string
          notes?: string | null
          period_date?: string
          period_type?: string
          recorded_by?: string | null
          site_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          working_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manhours_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manhours_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manhours_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manhours_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manhours_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      material_gate_passes: {
        Row: {
          approval_from_id: string | null
          company_id: string
          created_at: string
          deleted_at: string | null
          driver_id: string | null
          driver_mobile: string | null
          driver_name: string | null
          entry_confirmed_at: string | null
          entry_confirmed_by: string | null
          entry_gate_id: string | null
          entry_time: string | null
          exit_confirmed_at: string | null
          exit_confirmed_by: string | null
          exit_gate_id: string | null
          exit_time: string | null
          guard_verified_at: string | null
          guard_verified_by: string | null
          id: string
          material_description: string
          pass_date: string
          pass_type: string
          pm_approved_at: string | null
          pm_approved_by: string | null
          pm_notes: string | null
          project_id: string
          qr_code_token: string | null
          qr_generated_at: string | null
          quantity: string | null
          reference_number: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_by: string
          safety_approved_at: string | null
          safety_approved_by: string | null
          safety_notes: string | null
          status: string
          tenant_id: string
          time_window_end: string | null
          time_window_start: string | null
          updated_at: string
          vehicle_plate: string | null
        }
        Insert: {
          approval_from_id?: string | null
          company_id: string
          created_at?: string
          deleted_at?: string | null
          driver_id?: string | null
          driver_mobile?: string | null
          driver_name?: string | null
          entry_confirmed_at?: string | null
          entry_confirmed_by?: string | null
          entry_gate_id?: string | null
          entry_time?: string | null
          exit_confirmed_at?: string | null
          exit_confirmed_by?: string | null
          exit_gate_id?: string | null
          exit_time?: string | null
          guard_verified_at?: string | null
          guard_verified_by?: string | null
          id?: string
          material_description: string
          pass_date: string
          pass_type?: string
          pm_approved_at?: string | null
          pm_approved_by?: string | null
          pm_notes?: string | null
          project_id: string
          qr_code_token?: string | null
          qr_generated_at?: string | null
          quantity?: string | null
          reference_number: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_by: string
          safety_approved_at?: string | null
          safety_approved_by?: string | null
          safety_notes?: string | null
          status?: string
          tenant_id: string
          time_window_end?: string | null
          time_window_start?: string | null
          updated_at?: string
          vehicle_plate?: string | null
        }
        Update: {
          approval_from_id?: string | null
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          driver_id?: string | null
          driver_mobile?: string | null
          driver_name?: string | null
          entry_confirmed_at?: string | null
          entry_confirmed_by?: string | null
          entry_gate_id?: string | null
          entry_time?: string | null
          exit_confirmed_at?: string | null
          exit_confirmed_by?: string | null
          exit_gate_id?: string | null
          exit_time?: string | null
          guard_verified_at?: string | null
          guard_verified_by?: string | null
          id?: string
          material_description?: string
          pass_date?: string
          pass_type?: string
          pm_approved_at?: string | null
          pm_approved_by?: string | null
          pm_notes?: string | null
          project_id?: string
          qr_code_token?: string | null
          qr_generated_at?: string | null
          quantity?: string | null
          reference_number?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_by?: string
          safety_approved_at?: string | null
          safety_approved_by?: string | null
          safety_notes?: string | null
          status?: string
          tenant_id?: string
          time_window_end?: string | null
          time_window_start?: string | null
          updated_at?: string
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_gate_passes_approval_from_id_fkey"
            columns: ["approval_from_id"]
            isOneToOne: false
            referencedRelation: "gate_pass_approvers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_gate_passes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "contractor_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_gate_passes_entry_confirmed_by_fkey"
            columns: ["entry_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_gate_passes_exit_confirmed_by_fkey"
            columns: ["exit_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_gate_passes_guard_verified_by_fkey"
            columns: ["guard_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_gate_passes_pm_approved_by_fkey"
            columns: ["pm_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_gate_passes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "contractor_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_gate_passes_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_gate_passes_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "contractor_representatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_gate_passes_safety_approved_by_fkey"
            columns: ["safety_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_gate_passes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_access_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          menu_item_id: string
          role_id: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          menu_item_id: string
          role_id: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          menu_item_id?: string
          role_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_access_audit_logs_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_access_audit_logs_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_access_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          code: string
          created_at: string | null
          icon: string | null
          id: string
          is_system: boolean | null
          name: string
          name_ar: string | null
          parent_code: string | null
          sort_order: number | null
          url: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          name_ar?: string | null
          parent_code?: string | null
          sort_order?: number | null
          url?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          name_ar?: string | null
          parent_code?: string | null
          sort_order?: number | null
          url?: string | null
        }
        Relationships: []
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          tenant_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          base_price_monthly: number | null
          base_price_yearly: number | null
          code: string
          created_at: string | null
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      notification_logs: {
        Row: {
          channel: string
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          error_code: string | null
          error_message: string | null
          failed_at: string | null
          from_address: string | null
          id: string
          is_final: boolean | null
          metadata: Json | null
          provider: string
          provider_message_id: string | null
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template_name: string | null
          tenant_id: string
          to_address: string
          updated_at: string
          user_id: string | null
          webhook_events: Json | null
        }
        Insert: {
          channel: string
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          from_address?: string | null
          id?: string
          is_final?: boolean | null
          metadata?: Json | null
          provider: string
          provider_message_id?: string | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_name?: string | null
          tenant_id: string
          to_address: string
          updated_at?: string
          user_id?: string | null
          webhook_events?: Json | null
        }
        Update: {
          channel?: string
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          from_address?: string | null
          id?: string
          is_final?: boolean | null
          metadata?: Json | null
          provider?: string
          provider_message_id?: string | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_name?: string | null
          tenant_id?: string
          to_address?: string
          updated_at?: string
          user_id?: string | null
          webhook_events?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          branch_id: string | null
          channel: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          event_type: string
          id: string
          is_active: boolean
          role_code: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_type: string
          id?: string
          is_active?: boolean
          role_code?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          role_code?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          category: string | null
          channel_type: string
          content_pattern: string
          created_at: string | null
          default_gateway: string
          deleted_at: string | null
          email_subject: string | null
          id: string
          is_active: boolean | null
          language: string | null
          meta_template_name: string | null
          slug: string
          tenant_id: string
          updated_at: string | null
          variable_keys: string[]
        }
        Insert: {
          category?: string | null
          channel_type?: string
          content_pattern: string
          created_at?: string | null
          default_gateway?: string
          deleted_at?: string | null
          email_subject?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          meta_template_name?: string | null
          slug: string
          tenant_id: string
          updated_at?: string | null
          variable_keys?: string[]
        }
        Update: {
          category?: string | null
          channel_type?: string
          content_pattern?: string
          created_at?: string | null
          default_gateway?: string
          deleted_at?: string | null
          email_subject?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          meta_template_name?: string | null
          slug?: string
          tenant_id?: string
          updated_at?: string | null
          variable_keys?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          body_ar: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          tenant_id: string
          title: string
          title_ar: string | null
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          body_ar?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          tenant_id: string
          title: string
          title_ar?: string | null
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          body_ar?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          tenant_id?: string
          title?: string
          title_ar?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_patrol_checkpoints: {
        Row: {
          captured_at: string
          checkpoint_id: string
          created_at: string
          device_id: string
          gps_accuracy: number | null
          gps_lat: number | null
          gps_lng: number | null
          guard_id: string
          id: string
          notes: string | null
          patrol_id: string
          photo_paths: Json | null
          sync_error: string | null
          sync_status: string | null
          synced_at: string | null
          tenant_id: string
        }
        Insert: {
          captured_at: string
          checkpoint_id: string
          created_at?: string
          device_id: string
          gps_accuracy?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          guard_id: string
          id?: string
          notes?: string | null
          patrol_id: string
          photo_paths?: Json | null
          sync_error?: string | null
          sync_status?: string | null
          synced_at?: string | null
          tenant_id: string
        }
        Update: {
          captured_at?: string
          checkpoint_id?: string
          created_at?: string
          device_id?: string
          gps_accuracy?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          guard_id?: string
          id?: string
          notes?: string | null
          patrol_id?: string
          photo_paths?: Json | null
          sync_error?: string | null
          sync_status?: string | null
          synced_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_patrol_checkpoints_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_patrol_checkpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_scan_queue: {
        Row: {
          created_at: string
          device_id: string
          gps_accuracy: number | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          scan_data: Json
          scan_type: string
          scanned_at: string
          scanned_by: string
          sync_error: string | null
          sync_status: string
          synced_at: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          gps_accuracy?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          scan_data: Json
          scan_type: string
          scanned_at: string
          scanned_by: string
          sync_error?: string | null
          sync_status?: string
          synced_at?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          gps_accuracy?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          scan_data?: Json
          scan_type?: string
          scanned_at?: string
          scanned_by?: string
          sync_error?: string | null
          sync_status?: string
          synced_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_scan_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      part_purchase_order_lines: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          part_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number | null
          tenant_id: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          part_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number | null
          tenant_id: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          part_id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          tenant_id?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "part_purchase_order_lines_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "maintenance_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "part_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_purchase_order_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      part_purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string | null
          po_number: string
          received_at: string | null
          received_by: string | null
          status: string
          supplier_contact: string | null
          supplier_name: string | null
          tenant_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          po_number: string
          received_at?: string | null
          received_by?: string | null
          status?: string
          supplier_contact?: string | null
          supplier_name?: string | null
          tenant_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          po_number?: string
          received_at?: string | null
          received_by?: string | null
          status?: string
          supplier_contact?: string | null
          supplier_name?: string | null
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_purchase_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      part_stock_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          new_quantity: number | null
          notes: string | null
          part_id: string
          previous_quantity: number | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          transaction_type: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          new_quantity?: number | null
          notes?: string | null
          part_id: string
          previous_quantity?: number | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          transaction_type: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          new_quantity?: number | null
          notes?: string | null
          part_id?: string
          previous_quantity?: number | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          transaction_type?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "part_stock_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_stock_transactions_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "maintenance_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_stock_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patrol_checkpoint_logs: {
        Row: {
          checkpoint_id: string
          created_at: string | null
          gps_accuracy: number | null
          gps_latitude: number | null
          gps_longitude: number | null
          gps_validated: boolean | null
          id: string
          linked_incident_id: string | null
          notes: string | null
          patrol_id: string
          photo_path: string | null
          photo_paths: Json | null
          scan_method: string | null
          scanned_at: string | null
          status: string | null
          tenant_id: string
          time_spent_seconds: number | null
          validation_distance: number | null
          validation_threshold: number | null
        }
        Insert: {
          checkpoint_id: string
          created_at?: string | null
          gps_accuracy?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_validated?: boolean | null
          id?: string
          linked_incident_id?: string | null
          notes?: string | null
          patrol_id: string
          photo_path?: string | null
          photo_paths?: Json | null
          scan_method?: string | null
          scanned_at?: string | null
          status?: string | null
          tenant_id: string
          time_spent_seconds?: number | null
          validation_distance?: number | null
          validation_threshold?: number | null
        }
        Update: {
          checkpoint_id?: string
          created_at?: string | null
          gps_accuracy?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_validated?: boolean | null
          id?: string
          linked_incident_id?: string | null
          notes?: string | null
          patrol_id?: string
          photo_path?: string | null
          photo_paths?: Json | null
          scan_method?: string | null
          scanned_at?: string | null
          status?: string | null
          tenant_id?: string
          time_spent_seconds?: number | null
          validation_distance?: number | null
          validation_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patrol_checkpoint_logs_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "patrol_checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_checkpoint_logs_linked_incident_id_fkey"
            columns: ["linked_incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_checkpoint_logs_patrol_id_fkey"
            columns: ["patrol_id"]
            isOneToOne: false
            referencedRelation: "security_patrols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_checkpoint_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patrol_checkpoints: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          floor_zone_id: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          location_details: string | null
          longitude: number | null
          min_time_at_checkpoint_seconds: number | null
          name: string
          name_ar: string | null
          nfc_enabled: boolean | null
          nfc_tag_id: string | null
          notes_required: boolean | null
          photo_required: boolean | null
          qr_code_data: string | null
          radius_meters: number | null
          route_id: string
          scan_tolerance_meters: number | null
          sequence_order: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          floor_zone_id?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location_details?: string | null
          longitude?: number | null
          min_time_at_checkpoint_seconds?: number | null
          name: string
          name_ar?: string | null
          nfc_enabled?: boolean | null
          nfc_tag_id?: string | null
          notes_required?: boolean | null
          photo_required?: boolean | null
          qr_code_data?: string | null
          radius_meters?: number | null
          route_id: string
          scan_tolerance_meters?: number | null
          sequence_order: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          floor_zone_id?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location_details?: string | null
          longitude?: number | null
          min_time_at_checkpoint_seconds?: number | null
          name?: string
          name_ar?: string | null
          nfc_enabled?: boolean | null
          nfc_tag_id?: string | null
          notes_required?: boolean | null
          photo_required?: boolean | null
          qr_code_data?: string | null
          radius_meters?: number | null
          route_id?: string
          scan_tolerance_meters?: number | null
          sequence_order?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patrol_checkpoints_floor_zone_id_fkey"
            columns: ["floor_zone_id"]
            isOneToOne: false
            referencedRelation: "floors_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_checkpoints_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "security_patrol_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_checkpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_approvals: {
        Row: {
          approval_type: string
          assigned_to: string | null
          created_at: string
          current_escalation_level: number
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          due_at: string | null
          escalated_to: string | null
          escalation_reason: string | null
          id: string
          priority: string | null
          reference_id: string
          reference_number: string | null
          reminder_sent_at: string | null
          requested_by: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          approval_type: string
          assigned_to?: string | null
          created_at?: string
          current_escalation_level?: number
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          due_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          id?: string
          priority?: string | null
          reference_id: string
          reference_number?: string | null
          reminder_sent_at?: string | null
          requested_by?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          approval_type?: string
          assigned_to?: string | null
          created_at?: string
          current_escalation_level?: number
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          due_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          id?: string
          priority?: string | null
          reference_id?: string
          reference_number?: string | null
          reminder_sent_at?: string | null
          requested_by?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          updated_at?: string
          value?: Json
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
          deletion_password_hash: string | null
          digest_opt_in: boolean | null
          digest_preferred_time: string | null
          digest_timezone: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_id: string | null
          full_name: string | null
          has_full_branch_access: boolean | null
          has_login: boolean | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          is_super_admin: boolean | null
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
          deletion_password_hash?: string | null
          digest_opt_in?: boolean | null
          digest_preferred_time?: string | null
          digest_timezone?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          full_name?: string | null
          has_full_branch_access?: boolean | null
          has_login?: boolean | null
          id: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_super_admin?: boolean | null
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
          deletion_password_hash?: string | null
          digest_opt_in?: boolean | null
          digest_preferred_time?: string | null
          digest_timezone?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          full_name?: string | null
          has_full_branch_access?: boolean | null
          has_login?: boolean | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_super_admin?: boolean | null
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
      project_safety_officers: {
        Row: {
          assigned_at: string
          certification_expiry: string | null
          certification_number: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          full_name: string
          id: string
          mobile_number: string | null
          project_id: string
          representative_id: string | null
          safety_officer_type: string
          tenant_id: string
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          assigned_at?: string
          certification_expiry?: string | null
          certification_number?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          full_name: string
          id?: string
          mobile_number?: string | null
          project_id: string
          representative_id?: string | null
          safety_officer_type: string
          tenant_id: string
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          assigned_at?: string
          certification_expiry?: string | null
          certification_number?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          full_name?: string
          id?: string
          mobile_number?: string | null
          project_id?: string
          representative_id?: string | null
          safety_officer_type?: string
          tenant_id?: string
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_safety_officers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_safety_officers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "contractor_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_safety_officers_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "contractor_representatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_safety_officers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_safety_officers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "contractor_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      project_worker_assignments: {
        Row: {
          assigned_at: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          project_id: string
          removal_reason: string | null
          removed_at: string | null
          tenant_id: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          project_id: string
          removal_reason?: string | null
          removed_at?: string | null
          tenant_id: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          project_id?: string
          removal_reason?: string | null
          removed_at?: string | null
          tenant_id?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_worker_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_worker_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "contractor_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_worker_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_worker_assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "contractor_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          permit_id: string | null
          project_id: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          permit_id?: string | null
          project_id?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          permit_id?: string | null
          project_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ptw_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_audit_logs_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "ptw_permits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_audit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ptw_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_clearance_checks: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string | null
          comments: string | null
          created_at: string | null
          deleted_at: string | null
          document_url: string | null
          id: string
          is_mandatory: boolean | null
          project_id: string
          rejection_reason: string | null
          requirement_name: string
          requirement_name_ar: string | null
          sort_order: number | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          comments?: string | null
          created_at?: string | null
          deleted_at?: string | null
          document_url?: string | null
          id?: string
          is_mandatory?: boolean | null
          project_id: string
          rejection_reason?: string | null
          requirement_name: string
          requirement_name_ar?: string | null
          sort_order?: number | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          comments?: string | null
          created_at?: string | null
          deleted_at?: string | null
          document_url?: string | null
          id?: string
          is_mandatory?: boolean | null
          project_id?: string
          rejection_reason?: string | null
          requirement_name?: string
          requirement_name_ar?: string | null
          sort_order?: number | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ptw_clearance_checks_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_clearance_checks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ptw_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_clearance_checks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_confined_space_details: {
        Row: {
          atmospheric_hazards: string | null
          attendant_name: string
          attendant_trained: boolean | null
          communication_method: string | null
          created_at: string | null
          emergency_extraction_plan: string | null
          entry_method: string | null
          entry_supervisor_name: string
          max_occupants: number | null
          permit_id: string
          physical_hazards: string | null
          rescue_equipment_available: boolean | null
          rescue_plan_url: string | null
          rescue_team_standby: boolean | null
          space_description: string
          space_type: string | null
          updated_at: string | null
          ventilation_cfm: number | null
          ventilation_type: string | null
        }
        Insert: {
          atmospheric_hazards?: string | null
          attendant_name: string
          attendant_trained?: boolean | null
          communication_method?: string | null
          created_at?: string | null
          emergency_extraction_plan?: string | null
          entry_method?: string | null
          entry_supervisor_name: string
          max_occupants?: number | null
          permit_id: string
          physical_hazards?: string | null
          rescue_equipment_available?: boolean | null
          rescue_plan_url?: string | null
          rescue_team_standby?: boolean | null
          space_description: string
          space_type?: string | null
          updated_at?: string | null
          ventilation_cfm?: number | null
          ventilation_type?: string | null
        }
        Update: {
          atmospheric_hazards?: string | null
          attendant_name?: string
          attendant_trained?: boolean | null
          communication_method?: string | null
          created_at?: string | null
          emergency_extraction_plan?: string | null
          entry_method?: string | null
          entry_supervisor_name?: string
          max_occupants?: number | null
          permit_id?: string
          physical_hazards?: string | null
          rescue_equipment_available?: boolean | null
          rescue_plan_url?: string | null
          rescue_team_standby?: boolean | null
          space_description?: string
          space_type?: string | null
          updated_at?: string | null
          ventilation_cfm?: number | null
          ventilation_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ptw_confined_space_details_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: true
            referencedRelation: "ptw_permits"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_electrical_details: {
        Row: {
          arc_flash_boundary_meters: number | null
          arc_flash_ppe_required: boolean | null
          created_at: string | null
          electrical_competent_person: string
          equipment_isolated: string
          grounding_applied: boolean | null
          isolation_points: string
          loto_applied: boolean | null
          loto_tag_numbers: string | null
          permit_id: string
          test_equipment_used: string | null
          updated_at: string | null
          voltage_level: string | null
          voltage_value: number | null
          zero_energy_verified: boolean | null
        }
        Insert: {
          arc_flash_boundary_meters?: number | null
          arc_flash_ppe_required?: boolean | null
          created_at?: string | null
          electrical_competent_person: string
          equipment_isolated: string
          grounding_applied?: boolean | null
          isolation_points: string
          loto_applied?: boolean | null
          loto_tag_numbers?: string | null
          permit_id: string
          test_equipment_used?: string | null
          updated_at?: string | null
          voltage_level?: string | null
          voltage_value?: number | null
          zero_energy_verified?: boolean | null
        }
        Update: {
          arc_flash_boundary_meters?: number | null
          arc_flash_ppe_required?: boolean | null
          created_at?: string | null
          electrical_competent_person?: string
          equipment_isolated?: string
          grounding_applied?: boolean | null
          isolation_points?: string
          loto_applied?: boolean | null
          loto_tag_numbers?: string | null
          permit_id?: string
          test_equipment_used?: string | null
          updated_at?: string | null
          voltage_level?: string | null
          voltage_value?: number | null
          zero_energy_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ptw_electrical_details_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: true
            referencedRelation: "ptw_permits"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_excavation_details: {
        Row: {
          access_egress_method: string | null
          competent_person_name: string
          created_at: string | null
          daily_inspection_required: boolean | null
          depth_meters: number
          excavation_type: string | null
          gas_detection_required: boolean | null
          length_meters: number | null
          permit_id: string
          shoring_method: string | null
          soil_type: string | null
          spoil_placement_distance_meters: number | null
          underground_utilities_checked: boolean | null
          updated_at: string | null
          utility_clearance_ref: string | null
          water_accumulation_controls: string | null
          width_meters: number | null
        }
        Insert: {
          access_egress_method?: string | null
          competent_person_name: string
          created_at?: string | null
          daily_inspection_required?: boolean | null
          depth_meters: number
          excavation_type?: string | null
          gas_detection_required?: boolean | null
          length_meters?: number | null
          permit_id: string
          shoring_method?: string | null
          soil_type?: string | null
          spoil_placement_distance_meters?: number | null
          underground_utilities_checked?: boolean | null
          updated_at?: string | null
          utility_clearance_ref?: string | null
          water_accumulation_controls?: string | null
          width_meters?: number | null
        }
        Update: {
          access_egress_method?: string | null
          competent_person_name?: string
          created_at?: string | null
          daily_inspection_required?: boolean | null
          depth_meters?: number
          excavation_type?: string | null
          gas_detection_required?: boolean | null
          length_meters?: number | null
          permit_id?: string
          shoring_method?: string | null
          soil_type?: string | null
          spoil_placement_distance_meters?: number | null
          underground_utilities_checked?: boolean | null
          updated_at?: string | null
          utility_clearance_ref?: string | null
          water_accumulation_controls?: string | null
          width_meters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ptw_excavation_details_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: true
            referencedRelation: "ptw_permits"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_gas_tests: {
        Row: {
          action_taken: string | null
          co_ppm: number | null
          created_at: string | null
          equipment_calibration_date: string | null
          equipment_id: string | null
          h2s_ppm: number | null
          id: string
          lel_percentage: number | null
          other_gas_name: string | null
          other_gas_reading: number | null
          oxygen_percentage: number | null
          permit_id: string
          result: string | null
          tenant_id: string
          test_location: string | null
          test_time: string
          tested_by: string
        }
        Insert: {
          action_taken?: string | null
          co_ppm?: number | null
          created_at?: string | null
          equipment_calibration_date?: string | null
          equipment_id?: string | null
          h2s_ppm?: number | null
          id?: string
          lel_percentage?: number | null
          other_gas_name?: string | null
          other_gas_reading?: number | null
          oxygen_percentage?: number | null
          permit_id: string
          result?: string | null
          tenant_id: string
          test_location?: string | null
          test_time?: string
          tested_by: string
        }
        Update: {
          action_taken?: string | null
          co_ppm?: number | null
          created_at?: string | null
          equipment_calibration_date?: string | null
          equipment_id?: string | null
          h2s_ppm?: number | null
          id?: string
          lel_percentage?: number | null
          other_gas_name?: string | null
          other_gas_reading?: number | null
          oxygen_percentage?: number | null
          permit_id?: string
          result?: string | null
          tenant_id?: string
          test_location?: string | null
          test_time?: string
          tested_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ptw_gas_tests_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "ptw_permits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_gas_tests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_gas_tests_tested_by_fkey"
            columns: ["tested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_hot_work_details: {
        Row: {
          combustibles_covered: boolean | null
          combustibles_removed: boolean | null
          created_at: string | null
          equipment_type: string | null
          fire_alarm_notified: boolean | null
          fire_extinguisher_location: string | null
          fire_extinguisher_type: string | null
          fire_watch_duration_hours: number | null
          fire_watch_name: string
          flash_back_arrestors: boolean | null
          floor_swept: boolean | null
          gas_test_required: boolean | null
          permit_id: string
          sprinklers_impaired: boolean | null
          updated_at: string | null
          ventilation_adequate: boolean | null
          work_type: string | null
        }
        Insert: {
          combustibles_covered?: boolean | null
          combustibles_removed?: boolean | null
          created_at?: string | null
          equipment_type?: string | null
          fire_alarm_notified?: boolean | null
          fire_extinguisher_location?: string | null
          fire_extinguisher_type?: string | null
          fire_watch_duration_hours?: number | null
          fire_watch_name: string
          flash_back_arrestors?: boolean | null
          floor_swept?: boolean | null
          gas_test_required?: boolean | null
          permit_id: string
          sprinklers_impaired?: boolean | null
          updated_at?: string | null
          ventilation_adequate?: boolean | null
          work_type?: string | null
        }
        Update: {
          combustibles_covered?: boolean | null
          combustibles_removed?: boolean | null
          created_at?: string | null
          equipment_type?: string | null
          fire_alarm_notified?: boolean | null
          fire_extinguisher_location?: string | null
          fire_extinguisher_type?: string | null
          fire_watch_duration_hours?: number | null
          fire_watch_name?: string
          flash_back_arrestors?: boolean | null
          floor_swept?: boolean | null
          gas_test_required?: boolean | null
          permit_id?: string
          sprinklers_impaired?: boolean | null
          updated_at?: string | null
          ventilation_adequate?: boolean | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ptw_hot_work_details_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: true
            referencedRelation: "ptw_permits"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_lifting_details: {
        Row: {
          crane_capacity_kg: number
          crane_description: string | null
          crane_id: string | null
          created_at: string | null
          current_wind_speed_knots: number | null
          exclusion_zone_meters: number | null
          ground_conditions: string | null
          lift_height_meters: number | null
          lift_plan_url: string | null
          lift_radius_meters: number | null
          lift_type: string | null
          load_description: string
          load_weight_kg: number
          max_wind_speed_knots: number | null
          outriggers_extended: boolean | null
          permit_id: string
          rigger_certification_ref: string | null
          rigger_name: string
          signal_person_name: string | null
          updated_at: string | null
        }
        Insert: {
          crane_capacity_kg: number
          crane_description?: string | null
          crane_id?: string | null
          created_at?: string | null
          current_wind_speed_knots?: number | null
          exclusion_zone_meters?: number | null
          ground_conditions?: string | null
          lift_height_meters?: number | null
          lift_plan_url?: string | null
          lift_radius_meters?: number | null
          lift_type?: string | null
          load_description: string
          load_weight_kg: number
          max_wind_speed_knots?: number | null
          outriggers_extended?: boolean | null
          permit_id: string
          rigger_certification_ref?: string | null
          rigger_name: string
          signal_person_name?: string | null
          updated_at?: string | null
        }
        Update: {
          crane_capacity_kg?: number
          crane_description?: string | null
          crane_id?: string | null
          created_at?: string | null
          current_wind_speed_knots?: number | null
          exclusion_zone_meters?: number | null
          ground_conditions?: string | null
          lift_height_meters?: number | null
          lift_plan_url?: string | null
          lift_radius_meters?: number | null
          lift_type?: string | null
          load_description?: string
          load_weight_kg?: number
          max_wind_speed_knots?: number | null
          outriggers_extended?: boolean | null
          permit_id?: string
          rigger_certification_ref?: string | null
          rigger_name?: string
          signal_person_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ptw_lifting_details_crane_id_fkey"
            columns: ["crane_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "ptw_lifting_details_crane_id_fkey"
            columns: ["crane_id"]
            isOneToOne: false
            referencedRelation: "hsse_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_lifting_details_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: true
            referencedRelation: "ptw_permits"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_permits: {
        Row: {
          activated_at: string | null
          actual_end_time: string | null
          actual_start_time: string | null
          applicant_id: string
          building_id: string | null
          closed_at: string | null
          closed_by: string | null
          closure_notes: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          endorsed_at: string | null
          endorser_id: string | null
          evacuation_point: string | null
          extended_until: string | null
          extension_count: number | null
          floor_zone_id: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          issued_at: string | null
          issuer_id: string | null
          job_description: string | null
          location_details: string | null
          planned_end_time: string
          planned_start_time: string
          project_id: string
          qr_code_token: string | null
          reference_id: string
          requested_at: string | null
          risk_assessment_ref: string | null
          simops_notes: string | null
          simops_status: string | null
          site_id: string | null
          status: string | null
          suspended_at: string | null
          tenant_id: string
          type_id: string
          updated_at: string | null
          work_scope: string | null
        }
        Insert: {
          activated_at?: string | null
          actual_end_time?: string | null
          actual_start_time?: string | null
          applicant_id: string
          building_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          endorsed_at?: string | null
          endorser_id?: string | null
          evacuation_point?: string | null
          extended_until?: string | null
          extension_count?: number | null
          floor_zone_id?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          issued_at?: string | null
          issuer_id?: string | null
          job_description?: string | null
          location_details?: string | null
          planned_end_time: string
          planned_start_time: string
          project_id: string
          qr_code_token?: string | null
          reference_id: string
          requested_at?: string | null
          risk_assessment_ref?: string | null
          simops_notes?: string | null
          simops_status?: string | null
          site_id?: string | null
          status?: string | null
          suspended_at?: string | null
          tenant_id: string
          type_id: string
          updated_at?: string | null
          work_scope?: string | null
        }
        Update: {
          activated_at?: string | null
          actual_end_time?: string | null
          actual_start_time?: string | null
          applicant_id?: string
          building_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          endorsed_at?: string | null
          endorser_id?: string | null
          evacuation_point?: string | null
          extended_until?: string | null
          extension_count?: number | null
          floor_zone_id?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          issued_at?: string | null
          issuer_id?: string | null
          job_description?: string | null
          location_details?: string | null
          planned_end_time?: string
          planned_start_time?: string
          project_id?: string
          qr_code_token?: string | null
          reference_id?: string
          requested_at?: string | null
          risk_assessment_ref?: string | null
          simops_notes?: string | null
          simops_status?: string | null
          site_id?: string | null
          status?: string | null
          suspended_at?: string | null
          tenant_id?: string
          type_id?: string
          updated_at?: string | null
          work_scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ptw_permits_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_permits_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_permits_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_permits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_permits_endorser_id_fkey"
            columns: ["endorser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_permits_floor_zone_id_fkey"
            columns: ["floor_zone_id"]
            isOneToOne: false
            referencedRelation: "floors_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_permits_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_permits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ptw_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_permits_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_permits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_permits_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "ptw_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_projects: {
        Row: {
          building_id: string | null
          contractor_company_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_date: string
          hsse_coordinator_id: string | null
          id: string
          is_internal_work: boolean
          linked_contractor_project_id: string | null
          mobilization_percentage: number | null
          name: string
          name_ar: string | null
          project_manager_id: string | null
          reference_id: string
          site_id: string | null
          start_date: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          building_id?: string | null
          contractor_company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date: string
          hsse_coordinator_id?: string | null
          id?: string
          is_internal_work?: boolean
          linked_contractor_project_id?: string | null
          mobilization_percentage?: number | null
          name: string
          name_ar?: string | null
          project_manager_id?: string | null
          reference_id: string
          site_id?: string | null
          start_date: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          building_id?: string | null
          contractor_company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string
          hsse_coordinator_id?: string | null
          id?: string
          is_internal_work?: boolean
          linked_contractor_project_id?: string | null
          mobilization_percentage?: number | null
          name?: string
          name_ar?: string | null
          project_manager_id?: string | null
          reference_id?: string
          site_id?: string | null
          start_date?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ptw_projects_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_projects_contractor_company_id_fkey"
            columns: ["contractor_company_id"]
            isOneToOne: false
            referencedRelation: "contractor_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_projects_hsse_coordinator_id_fkey"
            columns: ["hsse_coordinator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_projects_linked_contractor_project_id_fkey"
            columns: ["linked_contractor_project_id"]
            isOneToOne: false
            referencedRelation: "contractor_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_projects_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_radiography_details: {
        Row: {
          barrier_distance_meters: number
          collimator_used: boolean | null
          created_at: string | null
          dosimeter_readings_after: number | null
          dosimeter_readings_before: number | null
          emergency_procedures_reviewed: boolean | null
          exposure_time_minutes: number | null
          isotope_type: string
          permit_id: string
          radiation_area_marked: boolean | null
          rpo_license_number: string | null
          rpo_name: string
          source_serial_number: string | null
          source_strength_curies: number | null
          survey_meter_id: string | null
          updated_at: string | null
        }
        Insert: {
          barrier_distance_meters: number
          collimator_used?: boolean | null
          created_at?: string | null
          dosimeter_readings_after?: number | null
          dosimeter_readings_before?: number | null
          emergency_procedures_reviewed?: boolean | null
          exposure_time_minutes?: number | null
          isotope_type: string
          permit_id: string
          radiation_area_marked?: boolean | null
          rpo_license_number?: string | null
          rpo_name: string
          source_serial_number?: string | null
          source_strength_curies?: number | null
          survey_meter_id?: string | null
          updated_at?: string | null
        }
        Update: {
          barrier_distance_meters?: number
          collimator_used?: boolean | null
          created_at?: string | null
          dosimeter_readings_after?: number | null
          dosimeter_readings_before?: number | null
          emergency_procedures_reviewed?: boolean | null
          exposure_time_minutes?: number | null
          isotope_type?: string
          permit_id?: string
          radiation_area_marked?: boolean | null
          rpo_license_number?: string | null
          rpo_name?: string
          source_serial_number?: string | null
          source_strength_curies?: number | null
          survey_meter_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ptw_radiography_details_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: true
            referencedRelation: "ptw_permits"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_safety_requirements: {
        Row: {
          category: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          is_critical: boolean | null
          is_mandatory: boolean | null
          ptw_type_id: string | null
          requirement_text: string
          requirement_text_ar: string | null
          sort_order: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          is_mandatory?: boolean | null
          ptw_type_id?: string | null
          requirement_text: string
          requirement_text_ar?: string | null
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          is_mandatory?: boolean | null
          ptw_type_id?: string | null
          requirement_text?: string
          requirement_text_ar?: string | null
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ptw_safety_requirements_ptw_type_id_fkey"
            columns: ["ptw_type_id"]
            isOneToOne: false
            referencedRelation: "ptw_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_safety_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_safety_responses: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          is_checked: boolean | null
          is_not_applicable: boolean | null
          permit_id: string
          requirement_id: string
          tenant_id: string
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          is_checked?: boolean | null
          is_not_applicable?: boolean | null
          permit_id: string
          requirement_id: string
          tenant_id: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          is_checked?: boolean | null
          is_not_applicable?: boolean | null
          permit_id?: string
          requirement_id?: string
          tenant_id?: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ptw_safety_responses_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "ptw_permits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_safety_responses_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "ptw_safety_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_safety_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_safety_responses_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_signatures: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          permit_id: string
          signature_data: string | null
          signature_type: string
          signed_at: string
          signer_id: string
          signer_name: string
          signer_role: string | null
          tenant_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          permit_id: string
          signature_data?: string | null
          signature_type: string
          signed_at?: string
          signer_id: string
          signer_name: string
          signer_role?: string | null
          tenant_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          permit_id?: string
          signature_data?: string | null
          signature_type?: string
          signed_at?: string
          signer_id?: string
          signer_name?: string
          signer_role?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ptw_signatures_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "ptw_permits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_signatures_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_signatures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_simops_rules: {
        Row: {
          auto_reject: boolean | null
          conflict_type: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          minimum_distance_meters: number
          permit_type_a_id: string
          permit_type_b_id: string
          rule_description: string | null
          rule_description_ar: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          auto_reject?: boolean | null
          conflict_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          minimum_distance_meters?: number
          permit_type_a_id: string
          permit_type_b_id: string
          rule_description?: string | null
          rule_description_ar?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_reject?: boolean | null
          conflict_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          minimum_distance_meters?: number
          permit_type_a_id?: string
          permit_type_b_id?: string
          rule_description?: string | null
          rule_description_ar?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ptw_simops_rules_permit_type_a_id_fkey"
            columns: ["permit_type_a_id"]
            isOneToOne: false
            referencedRelation: "ptw_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_simops_rules_permit_type_b_id_fkey"
            columns: ["permit_type_b_id"]
            isOneToOne: false
            referencedRelation: "ptw_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptw_simops_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ptw_types: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          deleted_at: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          requires_gas_test: boolean | null
          requires_loto: boolean | null
          risk_level: string | null
          sort_order: number | null
          tenant_id: string | null
          updated_at: string | null
          validity_hours: number | null
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          requires_gas_test?: boolean | null
          requires_loto?: boolean | null
          risk_level?: string | null
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          validity_hours?: number | null
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          requires_gas_test?: boolean | null
          requires_loto?: boolean | null
          risk_level?: string | null
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          validity_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ptw_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_preferences: {
        Row: {
          approvals_decision: boolean | null
          approvals_requested: boolean | null
          created_at: string | null
          id: string
          incidents_assigned: boolean | null
          incidents_new: boolean | null
          incidents_status_change: boolean | null
          sla_escalations: boolean | null
          sla_overdue: boolean | null
          sla_warnings: boolean | null
          system_announcements: boolean | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approvals_decision?: boolean | null
          approvals_requested?: boolean | null
          created_at?: string | null
          id?: string
          incidents_assigned?: boolean | null
          incidents_new?: boolean | null
          incidents_status_change?: boolean | null
          sla_escalations?: boolean | null
          sla_overdue?: boolean | null
          sla_warnings?: boolean | null
          system_announcements?: boolean | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approvals_decision?: boolean | null
          approvals_requested?: boolean | null
          created_at?: string | null
          id?: string
          incidents_assigned?: boolean | null
          incidents_new?: boolean | null
          incidents_status_change?: boolean | null
          sla_escalations?: boolean | null
          sla_overdue?: boolean | null
          sla_warnings?: boolean | null
          system_announcements?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          deleted_at: string | null
          device_name: string | null
          endpoint: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          p256dh_key: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          deleted_at?: string | null
          device_name?: string | null
          endpoint: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          p256dh_key: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          deleted_at?: string | null
          device_name?: string | null
          endpoint?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          p256dh_key?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_menu_access: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          menu_item_id: string
          role_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          menu_item_id: string
          role_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          menu_item_id?: string
          role_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_menu_access_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_menu_access_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_menu_access_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_menu_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          category: Database["public"]["Enums"]["role_category"]
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          module_access: string[] | null
          name: string
          sort_order: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["role_category"]
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          module_access?: string[] | null
          name: string
          sort_order?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["role_category"]
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          module_access?: string[] | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      saved_report_templates: {
        Row: {
          columns: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          entity_type: string
          filters: Json | null
          grouping: Json | null
          id: string
          is_shared: boolean | null
          name: string
          sorting: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          entity_type?: string
          filters?: Json | null
          grouping?: Json | null
          id?: string
          is_shared?: boolean | null
          name: string
          sorting?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          columns?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          entity_type?: string
          filters?: Json | null
          grouping?: Json | null
          id?: string
          is_shared?: boolean | null
          name?: string
          sorting?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_report_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_error_logs: {
        Row: {
          context_data: Json | null
          created_at: string
          device_info: Json | null
          error_code: string
          error_message: string | null
          id: string
          scan_type: string
          stack_trace: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          context_data?: Json | null
          created_at?: string
          device_info?: Json | null
          error_code: string
          error_message?: string | null
          id?: string
          scan_type: string
          stack_trace?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          context_data?: Json | null
          created_at?: string
          device_info?: Json | null
          error_code?: string
          error_message?: string | null
          id?: string
          scan_type?: string
          stack_trace?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_error_logs_tenant_id_fkey"
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
          deleted_at: string | null
          department_id: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          department_id: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
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
      security_audit_logs: {
        Row: {
          action: string
          action_category: string
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          building_id: string | null
          created_at: string
          entity_id: string | null
          entity_identifier: string | null
          entity_type: string | null
          gate_name: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          result: string
          result_reason: string | null
          site_id: string | null
          table_name: string | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          action_category: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          building_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_identifier?: string | null
          entity_type?: string | null
          gate_name?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          result: string
          result_reason?: string | null
          site_id?: string | null
          table_name?: string | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          action_category?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          building_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_identifier?: string | null
          entity_type?: string | null
          gate_name?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          result?: string
          result_reason?: string | null
          site_id?: string | null
          table_name?: string | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_logs_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_audit_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_blacklist: {
        Row: {
          expiry_date: string | null
          full_name: string | null
          id: string
          incident_reference: string | null
          listed_at: string | null
          listed_by: string | null
          national_id: string | null
          notes: string | null
          photo_evidence_paths: string[] | null
          reason: string | null
          severity: string | null
          supporting_documents: Json | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          expiry_date?: string | null
          full_name?: string | null
          id?: string
          incident_reference?: string | null
          listed_at?: string | null
          listed_by?: string | null
          national_id?: string | null
          notes?: string | null
          photo_evidence_paths?: string[] | null
          reason?: string | null
          severity?: string | null
          supporting_documents?: Json | null
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          expiry_date?: string | null
          full_name?: string | null
          id?: string
          incident_reference?: string | null
          listed_at?: string | null
          listed_by?: string | null
          national_id?: string | null
          notes?: string | null
          photo_evidence_paths?: string[] | null
          reason?: string | null
          severity?: string | null
          supporting_documents?: Json | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
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
      security_patrol_routes: {
        Row: {
          branch_id: string | null
          building_id: string | null
          checkpoint_radius_meters: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          estimated_duration_minutes: number | null
          frequency: string | null
          frequency_interval_hours: number | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          require_gps_validation: boolean | null
          require_photo: boolean | null
          route_map_path: string | null
          site_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          building_id?: string | null
          checkpoint_radius_meters?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          frequency?: string | null
          frequency_interval_hours?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          require_gps_validation?: boolean | null
          require_photo?: boolean | null
          route_map_path?: string | null
          site_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          building_id?: string | null
          checkpoint_radius_meters?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          frequency?: string | null
          frequency_interval_hours?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          require_gps_validation?: boolean | null
          require_photo?: boolean | null
          route_map_path?: string | null
          site_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_patrol_routes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_patrol_routes_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_patrol_routes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_patrol_routes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_patrol_routes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_patrols: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          checkpoints_total: number | null
          checkpoints_visited: number | null
          compliance_percentage: number | null
          created_at: string | null
          deleted_at: string | null
          id: string
          incidents_reported: number | null
          issues_found: string | null
          notes: string | null
          patrol_officer_id: string | null
          reference_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          route_id: string
          scheduled_start: string | null
          status: string | null
          supervisor_review_notes: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          checkpoints_total?: number | null
          checkpoints_visited?: number | null
          compliance_percentage?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          incidents_reported?: number | null
          issues_found?: string | null
          notes?: string | null
          patrol_officer_id?: string | null
          reference_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route_id: string
          scheduled_start?: string | null
          status?: string | null
          supervisor_review_notes?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          checkpoints_total?: number | null
          checkpoints_visited?: number | null
          compliance_percentage?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          incidents_reported?: number | null
          issues_found?: string | null
          notes?: string | null
          patrol_officer_id?: string | null
          reference_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route_id?: string
          scheduled_start?: string | null
          status?: string | null
          supervisor_review_notes?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_patrols_patrol_officer_id_fkey"
            columns: ["patrol_officer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_patrols_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_patrols_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "security_patrol_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_patrols_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_report_configs: {
        Row: {
          created_at: string
          created_by: string | null
          filters: Json | null
          id: string
          include_charts: boolean | null
          is_active: boolean
          last_generated_at: string | null
          recipient_roles: string[] | null
          recipients: string[] | null
          report_name: string
          report_name_ar: string | null
          report_type: string
          schedule_cron: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          filters?: Json | null
          id?: string
          include_charts?: boolean | null
          is_active?: boolean
          last_generated_at?: string | null
          recipient_roles?: string[] | null
          recipients?: string[] | null
          report_name: string
          report_name_ar?: string | null
          report_type: string
          schedule_cron?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          filters?: Json | null
          id?: string
          include_charts?: boolean | null
          is_active?: boolean
          last_generated_at?: string | null
          recipient_roles?: string[] | null
          recipients?: string[] | null
          report_name?: string
          report_name_ar?: string | null
          report_type?: string
          schedule_cron?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_report_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_reports: {
        Row: {
          config_id: string | null
          emailed_at: string | null
          emailed_to: string[] | null
          file_path: string | null
          generated_at: string
          generated_by: string | null
          id: string
          period_end: string
          period_start: string
          report_title: string
          report_type: string
          summary_data: Json
          tenant_id: string
        }
        Insert: {
          config_id?: string | null
          emailed_at?: string | null
          emailed_to?: string[] | null
          file_path?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          period_end: string
          period_start: string
          report_title: string
          report_type: string
          summary_data?: Json
          tenant_id: string
        }
        Update: {
          config_id?: string | null
          emailed_at?: string | null
          emailed_to?: string[] | null
          file_path?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          period_end?: string
          period_start?: string
          report_title?: string
          report_type?: string
          summary_data?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_reports_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "security_report_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_scan_results: {
        Row: {
          affected_resource: string | null
          category: string
          description: string | null
          detected_at: string
          id: string
          last_seen_at: string
          metadata: Json | null
          recommendation: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          scan_run_id: string | null
          scan_type: string
          severity: string
          status: string
          tenant_id: string
          title: string
        }
        Insert: {
          affected_resource?: string | null
          category: string
          description?: string | null
          detected_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json | null
          recommendation?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scan_run_id?: string | null
          scan_type: string
          severity: string
          status?: string
          tenant_id: string
          title: string
        }
        Update: {
          affected_resource?: string | null
          category?: string
          description?: string | null
          detected_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json | null
          recommendation?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scan_run_id?: string | null
          scan_type?: string
          severity?: string
          status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_scan_results_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_scan_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_shifts: {
        Row: {
          break_duration_minutes: number | null
          created_at: string | null
          deleted_at: string | null
          end_time: string
          id: string
          is_active: boolean | null
          is_overnight: boolean | null
          shift_code: string
          shift_name: string
          shift_name_ar: string | null
          start_time: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          break_duration_minutes?: number | null
          created_at?: string | null
          deleted_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          is_overnight?: boolean | null
          shift_code: string
          shift_name: string
          shift_name_ar?: string | null
          start_time: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          break_duration_minutes?: number | null
          created_at?: string | null
          deleted_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          is_overnight?: boolean | null
          shift_code?: string
          shift_name?: string
          shift_name_ar?: string | null
          start_time?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_zones: {
        Row: {
          center_lat: number | null
          center_lng: number | null
          color: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          geofence_radius_meters: number | null
          id: string
          is_active: boolean | null
          max_occupancy: number | null
          polygon_coords: Json | null
          polygon_geojson: Json
          requires_escort: boolean | null
          risk_level: string | null
          site_id: string | null
          tenant_id: string
          updated_at: string | null
          zone_code: string
          zone_name: string
          zone_name_ar: string | null
          zone_type: string | null
        }
        Insert: {
          center_lat?: number | null
          center_lng?: number | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          geofence_radius_meters?: number | null
          id?: string
          is_active?: boolean | null
          max_occupancy?: number | null
          polygon_coords?: Json | null
          polygon_geojson: Json
          requires_escort?: boolean | null
          risk_level?: string | null
          site_id?: string | null
          tenant_id: string
          updated_at?: string | null
          zone_code: string
          zone_name: string
          zone_name_ar?: string | null
          zone_type?: string | null
        }
        Update: {
          center_lat?: number | null
          center_lng?: number | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          geofence_radius_meters?: number | null
          id?: string
          is_active?: boolean | null
          max_occupancy?: number | null
          polygon_coords?: Json | null
          polygon_geojson?: Json
          requires_escort?: boolean | null
          risk_level?: string | null
          site_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          zone_code?: string
          zone_name?: string
          zone_name_ar?: string | null
          zone_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_zones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_zones_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_handovers: {
        Row: {
          acknowledged_at: string | null
          attachments: Json | null
          created_at: string
          deleted_at: string | null
          equipment_checklist: Json | null
          handover_time: string
          id: string
          incoming_guard_id: string | null
          key_observations: string | null
          next_shift_priorities: string | null
          notes: string | null
          outgoing_guard_id: string
          outstanding_issues: Json | null
          shift_date: string
          status: string
          tenant_id: string
          updated_at: string
          visitor_info: string | null
          zone_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          attachments?: Json | null
          created_at?: string
          deleted_at?: string | null
          equipment_checklist?: Json | null
          handover_time?: string
          id?: string
          incoming_guard_id?: string | null
          key_observations?: string | null
          next_shift_priorities?: string | null
          notes?: string | null
          outgoing_guard_id: string
          outstanding_issues?: Json | null
          shift_date?: string
          status?: string
          tenant_id: string
          updated_at?: string
          visitor_info?: string | null
          zone_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          attachments?: Json | null
          created_at?: string
          deleted_at?: string | null
          equipment_checklist?: Json | null
          handover_time?: string
          id?: string
          incoming_guard_id?: string | null
          key_observations?: string | null
          next_shift_priorities?: string | null
          notes?: string | null
          outgoing_guard_id?: string
          outstanding_issues?: Json | null
          shift_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          visitor_info?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_handovers_incoming_guard_id_fkey"
            columns: ["incoming_guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_handovers_outgoing_guard_id_fkey"
            columns: ["outgoing_guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_handovers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_handovers_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "security_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_roster: {
        Row: {
          check_in_lat: number | null
          check_in_lng: number | null
          check_in_time: string | null
          check_out_lat: number | null
          check_out_lng: number | null
          check_out_time: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          guard_id: string
          id: string
          notes: string | null
          relief_guard_id: string | null
          reminder_acknowledged_at: string | null
          reminder_minutes_before: number | null
          reminder_sent_at: string | null
          roster_date: string
          shift_id: string
          status: string | null
          tenant_id: string
          updated_at: string | null
          zone_id: string
        }
        Insert: {
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_time?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_time?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          guard_id: string
          id?: string
          notes?: string | null
          relief_guard_id?: string | null
          reminder_acknowledged_at?: string | null
          reminder_minutes_before?: number | null
          reminder_sent_at?: string | null
          roster_date: string
          shift_id: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          zone_id: string
        }
        Update: {
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_time?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_time?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          guard_id?: string
          id?: string
          notes?: string | null
          relief_guard_id?: string | null
          reminder_acknowledged_at?: string | null
          reminder_minutes_before?: number | null
          reminder_sent_at?: string | null
          roster_date?: string
          shift_id?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_roster_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_roster_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_roster_relief_guard_id_fkey"
            columns: ["relief_guard_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_roster_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "security_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_roster_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_roster_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "security_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      site_departments: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          department_id: string
          id: string
          is_primary: boolean | null
          site_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          department_id: string
          id?: string
          is_primary?: boolean | null
          site_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          department_id?: string
          id?: string
          is_primary?: boolean | null
          site_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_departments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_departments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_stakeholders: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          site_id: string
          stakeholder_type: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          site_id: string
          stakeholder_type: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          site_id?: string
          stakeholder_type?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_stakeholders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_stakeholders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_stakeholders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          boundary_polygon: Json | null
          branch_id: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          tenant_id: string
        }
        Insert: {
          address?: string | null
          boundary_polygon?: Json | null
          branch_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          tenant_id: string
        }
        Update: {
          address?: string | null
          boundary_polygon?: Json | null
          branch_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
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
      sla_configs: {
        Row: {
          created_at: string | null
          escalation_hours: number
          first_response_hours: number
          id: string
          priority: string
          resolution_hours: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          escalation_hours?: number
          first_response_hours?: number
          id?: string
          priority: string
          resolution_hours?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          escalation_hours?: number
          first_response_hours?: number
          id?: string
          priority?: string
          resolution_hours?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      special_events: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_at: string
          id: string
          is_active: boolean
          name: string
          start_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_at: string
          id?: string
          is_active?: boolean
          name: string
          start_at: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_at?: string
          id?: string
          is_active?: boolean
          name?: string
          start_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_events_tenant_id_fkey"
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
          escalated_at: string | null
          escalation_level: number | null
          first_response_at: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at: string | null
          sla_first_response_breached: boolean | null
          sla_first_response_due: string | null
          sla_resolution_breached: boolean | null
          sla_resolution_due: string | null
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
          escalated_at?: string | null
          escalation_level?: number | null
          first_response_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at?: string | null
          sla_first_response_breached?: boolean | null
          sla_first_response_due?: string | null
          sla_resolution_breached?: boolean | null
          sla_resolution_due?: string | null
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
          escalated_at?: string | null
          escalation_level?: number | null
          first_response_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at?: string | null
          sla_first_response_breached?: boolean | null
          sla_first_response_due?: string | null
          sla_resolution_breached?: boolean | null
          sla_resolution_due?: string | null
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
      supported_currencies: {
        Row: {
          code: string
          created_at: string | null
          decimal_places: number
          is_active: boolean
          name: string
          name_ar: string
          sort_order: number
          symbol: string
          symbol_ar: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          decimal_places?: number
          is_active?: boolean
          name: string
          name_ar: string
          sort_order?: number
          symbol: string
          symbol_ar?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          decimal_places?: number
          is_active?: boolean
          name?: string
          name_ar?: string
          sort_order?: number
          symbol?: string
          symbol_ar?: string | null
        }
        Relationships: []
      }
      system_emergency_actions: {
        Row: {
          action_type: string
          affected_users_count: number | null
          created_at: string | null
          deleted_at: string | null
          id: string
          metadata: Json | null
          performed_by: string
          reason: string
          tenant_id: string
        }
        Insert: {
          action_type: string
          affected_users_count?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          performed_by: string
          reason: string
          tenant_id: string
        }
        Update: {
          action_type?: string
          affected_users_count?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string
          reason?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_emergency_actions_tenant_id_fkey"
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
      tenant_document_settings: {
        Row: {
          created_at: string | null
          footer_bg_color: string | null
          footer_text: string | null
          footer_text_color: string | null
          header_bg_color: string | null
          header_logo_position: string | null
          header_text_color: string | null
          header_text_primary: string | null
          header_text_secondary: string | null
          id: string
          show_date_printed: boolean | null
          show_logo: boolean | null
          show_page_numbers: boolean | null
          tenant_id: string
          updated_at: string | null
          watermark_enabled: boolean | null
          watermark_opacity: number | null
          watermark_text: string | null
        }
        Insert: {
          created_at?: string | null
          footer_bg_color?: string | null
          footer_text?: string | null
          footer_text_color?: string | null
          header_bg_color?: string | null
          header_logo_position?: string | null
          header_text_color?: string | null
          header_text_primary?: string | null
          header_text_secondary?: string | null
          id?: string
          show_date_printed?: boolean | null
          show_logo?: boolean | null
          show_page_numbers?: boolean | null
          tenant_id: string
          updated_at?: string | null
          watermark_enabled?: boolean | null
          watermark_opacity?: number | null
          watermark_text?: string | null
        }
        Update: {
          created_at?: string | null
          footer_bg_color?: string | null
          footer_text?: string | null
          footer_text_color?: string | null
          header_bg_color?: string | null
          header_logo_position?: string | null
          header_text_color?: string | null
          header_text_primary?: string | null
          header_text_secondary?: string | null
          id?: string
          show_date_printed?: boolean | null
          show_logo?: boolean | null
          show_page_numbers?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          watermark_enabled?: boolean | null
          watermark_opacity?: number | null
          watermark_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_document_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_event_category_overrides: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_event_category_overrides_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "hsse_event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_event_category_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_event_subtype_overrides: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          subtype_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          subtype_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          subtype_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_event_subtype_overrides_subtype_id_fkey"
            columns: ["subtype_id"]
            isOneToOne: false
            referencedRelation: "hsse_event_subtypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_event_subtype_overrides_tenant_id_fkey"
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
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          employee_count: number | null
          enforce_ip_country_check: boolean | null
          favicon_url: string | null
          glass_break_active: boolean | null
          glass_break_expires_at: string | null
          id: string
          industry: string | null
          last_security_scan_at: string | null
          logo_dark_url: string | null
          logo_light_url: string | null
          max_concurrent_sessions: number | null
          max_users_override: number | null
          mfa_trust_duration_days: number | null
          name: string
          notes: string | null
          plan_id: string | null
          preferred_currency: string
          secondary_color: string | null
          secondary_color_dark: string | null
          security_scan_enabled: boolean | null
          session_timeout_minutes: number | null
          sidebar_icon_dark_url: string | null
          sidebar_icon_light_url: string | null
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          system_shutdown_at: string | null
          system_shutdown_by: string | null
          system_shutdown_reason: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
          vat_number: string | null
          visitor_hsse_instructions_ar: string | null
          visitor_hsse_instructions_en: string | null
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
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          employee_count?: number | null
          enforce_ip_country_check?: boolean | null
          favicon_url?: string | null
          glass_break_active?: boolean | null
          glass_break_expires_at?: string | null
          id?: string
          industry?: string | null
          last_security_scan_at?: string | null
          logo_dark_url?: string | null
          logo_light_url?: string | null
          max_concurrent_sessions?: number | null
          max_users_override?: number | null
          mfa_trust_duration_days?: number | null
          name: string
          notes?: string | null
          plan_id?: string | null
          preferred_currency?: string
          secondary_color?: string | null
          secondary_color_dark?: string | null
          security_scan_enabled?: boolean | null
          session_timeout_minutes?: number | null
          sidebar_icon_dark_url?: string | null
          sidebar_icon_light_url?: string | null
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          system_shutdown_at?: string | null
          system_shutdown_by?: string | null
          system_shutdown_reason?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          vat_number?: string | null
          visitor_hsse_instructions_ar?: string | null
          visitor_hsse_instructions_en?: string | null
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
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          employee_count?: number | null
          enforce_ip_country_check?: boolean | null
          favicon_url?: string | null
          glass_break_active?: boolean | null
          glass_break_expires_at?: string | null
          id?: string
          industry?: string | null
          last_security_scan_at?: string | null
          logo_dark_url?: string | null
          logo_light_url?: string | null
          max_concurrent_sessions?: number | null
          max_users_override?: number | null
          mfa_trust_duration_days?: number | null
          name?: string
          notes?: string | null
          plan_id?: string | null
          preferred_currency?: string
          secondary_color?: string | null
          secondary_color_dark?: string | null
          security_scan_enabled?: boolean | null
          session_timeout_minutes?: number | null
          sidebar_icon_dark_url?: string | null
          sidebar_icon_light_url?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          system_shutdown_at?: string | null
          system_shutdown_by?: string | null
          system_shutdown_reason?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          vat_number?: string | null
          visitor_hsse_instructions_ar?: string | null
          visitor_hsse_instructions_en?: string | null
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
          tenant_id: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message: string
          sender_id: string
          tenant_id?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string
          sender_id?: string
          tenant_id?: string | null
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
      trusted_devices: {
        Row: {
          created_at: string | null
          device_name: string | null
          device_token: string
          id: string
          ip_address: string | null
          last_used_at: string | null
          tenant_id: string | null
          trusted_until: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_name?: string | null
          device_token: string
          id?: string
          ip_address?: string | null
          last_used_at?: string | null
          tenant_id?: string | null
          trusted_until: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_name?: string | null
          device_token?: string
          id?: string
          ip_address?: string | null
          last_used_at?: string | null
          tenant_id?: string | null
          trusted_until?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      unified_notification_log: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          email_delivery_status: string | null
          email_error: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          notification_subtype: string | null
          notification_type: string
          push_delivery_status: string | null
          push_error: string | null
          push_sent: boolean | null
          push_sent_at: string | null
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          title: string
          user_id: string | null
          whatsapp_delivery_status: string | null
          whatsapp_error: string | null
          whatsapp_sent: boolean | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          email_delivery_status?: string | null
          email_error?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          notification_subtype?: string | null
          notification_type: string
          push_delivery_status?: string | null
          push_error?: string | null
          push_sent?: boolean | null
          push_sent_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          title: string
          user_id?: string | null
          whatsapp_delivery_status?: string | null
          whatsapp_error?: string | null
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          email_delivery_status?: string | null
          email_error?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          notification_subtype?: string | null
          notification_type?: string
          push_delivery_status?: string | null
          push_error?: string | null
          push_sent?: boolean | null
          push_sent_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          title?: string
          user_id?: string | null
          whatsapp_delivery_status?: string | null
          whatsapp_error?: string | null
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_notification_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id: string
          ip_address: string | null
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          session_duration_seconds: number | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          session_duration_seconds?: number | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          session_duration_seconds?: number | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_role_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      user_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          expires_at: string | null
          id: string
          invalidated_at: string | null
          invalidated_by: string | null
          invalidation_reason: string | null
          ip_address: string | null
          ip_city: string | null
          ip_country: string | null
          is_active: boolean
          last_activity_at: string
          session_token: string
          tenant_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string | null
          id?: string
          invalidated_at?: string | null
          invalidated_by?: string | null
          invalidation_reason?: string | null
          ip_address?: string | null
          ip_city?: string | null
          ip_country?: string | null
          is_active?: boolean
          last_activity_at?: string
          session_token: string
          tenant_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string | null
          id?: string
          invalidated_at?: string | null
          invalidated_by?: string | null
          invalidation_reason?: string | null
          ip_address?: string | null
          ip_city?: string | null
          ip_country?: string | null
          is_active?: boolean
          last_activity_at?: string
          session_token?: string
          tenant_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_invalidated_by_fkey"
            columns: ["invalidated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          car_plate: string | null
          company_name: string | null
          created_at: string | null
          destination_id: string | null
          email: string | null
          full_name: string
          gate_entry_method: string | null
          id: string
          is_active: boolean | null
          last_visit_at: string | null
          national_id: string | null
          nationality: string | null
          passenger_count: number | null
          phone: string | null
          preferred_language: string | null
          qr_code_token: string
          tenant_id: string
          whatsapp_sent_at: string | null
        }
        Insert: {
          car_plate?: string | null
          company_name?: string | null
          created_at?: string | null
          destination_id?: string | null
          email?: string | null
          full_name: string
          gate_entry_method?: string | null
          id?: string
          is_active?: boolean | null
          last_visit_at?: string | null
          national_id?: string | null
          nationality?: string | null
          passenger_count?: number | null
          phone?: string | null
          preferred_language?: string | null
          qr_code_token?: string
          tenant_id: string
          whatsapp_sent_at?: string | null
        }
        Update: {
          car_plate?: string | null
          company_name?: string | null
          created_at?: string | null
          destination_id?: string | null
          email?: string | null
          full_name?: string
          gate_entry_method?: string | null
          id?: string
          is_active?: boolean | null
          last_visit_at?: string | null
          national_id?: string | null
          nationality?: string | null
          passenger_count?: number | null
          phone?: string | null
          preferred_language?: string | null
          qr_code_token?: string
          tenant_id?: string
          whatsapp_sent_at?: string | null
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
      webhook_request_logs: {
        Row: {
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          ip_address: string | null
          processing_result: string | null
          provider: string
          request_body: Json | null
          request_headers: Json | null
          response_status: number | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          processing_result?: string | null
          provider: string
          request_body?: Json | null
          request_headers?: Json | null
          response_status?: number | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          processing_result?: string | null
          provider?: string
          request_body?: Json | null
          request_headers?: Json | null
          response_status?: number | null
        }
        Relationships: []
      }
      witness_attachments: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          statement_id: string
          storage_path: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          statement_id: string
          storage_path: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          statement_id?: string
          storage_path?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "witness_attachments_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "witness_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "witness_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      witness_statements: {
        Row: {
          ai_analysis: Json | null
          assigned_witness_id: string | null
          assignment_status: string | null
          attachment_url: string | null
          audio_url: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          incident_id: string | null
          original_transcription: string | null
          relationship: string | null
          return_count: number | null
          return_reason: string | null
          returned_at: string | null
          returned_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          statement_date: string | null
          statement_text: string
          statement_type: string
          tenant_id: string
          transcription_approved: boolean | null
          transcription_edited: boolean | null
          updated_at: string | null
          witness_contact: string | null
          witness_name: string
        }
        Insert: {
          ai_analysis?: Json | null
          assigned_witness_id?: string | null
          assignment_status?: string | null
          attachment_url?: string | null
          audio_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          incident_id?: string | null
          original_transcription?: string | null
          relationship?: string | null
          return_count?: number | null
          return_reason?: string | null
          returned_at?: string | null
          returned_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          statement_date?: string | null
          statement_text: string
          statement_type?: string
          tenant_id: string
          transcription_approved?: boolean | null
          transcription_edited?: boolean | null
          updated_at?: string | null
          witness_contact?: string | null
          witness_name: string
        }
        Update: {
          ai_analysis?: Json | null
          assigned_witness_id?: string | null
          assignment_status?: string | null
          attachment_url?: string | null
          audio_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          incident_id?: string | null
          original_transcription?: string | null
          relationship?: string | null
          return_count?: number | null
          return_reason?: string | null
          returned_at?: string | null
          returned_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          statement_date?: string | null
          statement_text?: string
          statement_type?: string
          tenant_id?: string
          transcription_approved?: boolean | null
          transcription_edited?: boolean | null
          updated_at?: string | null
          witness_contact?: string | null
          witness_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "witness_statements_assigned_witness_id_fkey"
            columns: ["assigned_witness_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "witness_statements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "witness_statements_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "witness_statements_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "witness_statements_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "witness_statements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_inductions: {
        Row: {
          acknowledged_at: string | null
          acknowledgment_method: string | null
          created_at: string
          deleted_at: string | null
          expires_at: string
          id: string
          project_id: string
          sent_at: string | null
          sent_via: string | null
          status: string
          tenant_id: string
          updated_at: string
          video_id: string
          viewed_at: string | null
          whatsapp_message_id: string | null
          worker_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledgment_method?: string | null
          created_at?: string
          deleted_at?: string | null
          expires_at: string
          id?: string
          project_id: string
          sent_at?: string | null
          sent_via?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          video_id: string
          viewed_at?: string | null
          whatsapp_message_id?: string | null
          worker_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledgment_method?: string | null
          created_at?: string
          deleted_at?: string | null
          expires_at?: string
          id?: string
          project_id?: string
          sent_at?: string | null
          sent_via?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          video_id?: string
          viewed_at?: string | null
          whatsapp_message_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_inductions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "contractor_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_inductions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_inductions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "induction_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_inductions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "contractor_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_qr_codes: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_revoked: boolean
          project_id: string
          qr_image_path: string | null
          qr_token: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          tenant_id: string
          updated_at: string
          valid_from: string
          valid_until: string
          whatsapp_sent_at: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_revoked?: boolean
          project_id: string
          qr_image_path?: string | null
          qr_token: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          tenant_id: string
          updated_at?: string
          valid_from?: string
          valid_until: string
          whatsapp_sent_at?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_revoked?: boolean
          project_id?: string
          qr_image_path?: string | null
          qr_token?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          tenant_id?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string
          whatsapp_sent_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_qr_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "contractor_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_qr_codes_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_qr_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_qr_codes_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "contractor_workers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      asset_tco_summary: {
        Row: {
          acquisition_cost: number | null
          asset_code: string | null
          asset_id: string | null
          cost_per_month: number | null
          energy_cost: number | null
          insurance_cost: number | null
          maintenance_cost: number | null
          months_in_service: number | null
          name: string | null
          other_cost: number | null
          repair_cost: number | null
          tenant_id: string | null
          total_cost_of_ownership: number | null
          upgrade_cost: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hsse_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      append_notification_webhook_event: {
        Args: { p_event: Json; p_provider_message_id: string }
        Returns: string
      }
      calculate_asset_depreciation: {
        Args: { p_asset_id: string }
        Returns: number
      }
      calculate_next_inspection_due: {
        Args: {
          p_day_of_month?: number
          p_day_of_week?: number
          p_frequency_type: string
          p_frequency_value: number
          p_last_due: string
        }
        Returns: string
      }
      calculate_next_schedule_time:
        | {
            Args: { p_current_next_at: string; p_frequency: string }
            Returns: string
          }
        | {
            Args: {
              p_last_sent_at?: string
              p_schedule_day_of_month: number
              p_schedule_days_of_week: number[]
              p_schedule_time: string
              p_schedule_timezone: string
              p_schedule_type: string
            }
            Returns: string
          }
      calculate_profile_billing: {
        Args: { p_billing_month: string; p_tenant_id: string }
        Returns: Json
      }
      calculate_required_safety_officers: {
        Args: { p_worker_count: number }
        Returns: number
      }
      calculate_scheduled_notification_next: {
        Args: { p_current_next: string; p_frequency: string }
        Returns: string
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
      can_add_contractor_project: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      can_admin_delete_incident: {
        Args: { _incident_id: string }
        Returns: boolean
      }
      can_approve_dept_rep_observation: {
        Args: { _incident_id: string; _user_id: string }
        Returns: boolean
      }
      can_approve_investigation: {
        Args: { _incident_id: string; _user_id: string }
        Returns: boolean
      }
      can_close_area_session: { Args: { p_session_id: string }; Returns: Json }
      can_close_investigation: {
        Args: { p_incident_id: string }
        Returns: Json
      }
      can_manage_access_list: { Args: { _user_id: string }; Returns: boolean }
      can_perform_expert_screening: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_set_confidentiality: {
        Args: { _incident_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_incident: {
        Args: { _incident_reporter_id: string; _user_id: string }
        Returns: boolean
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
      check_simops_conflicts: {
        Args: {
          p_end_time: string
          p_exclude_permit_id?: string
          p_gps_lat: number
          p_gps_lng: number
          p_site_id: string
          p_start_time: string
          p_type_id: string
        }
        Returns: {
          auto_reject: boolean
          conflict_type: string
          conflicting_permit_id: string
          conflicting_permit_type: string
          conflicting_reference_id: string
          distance_meters: number
          rule_description: string
          time_overlap_minutes: number
        }[]
      }
      check_sla_breaches: { Args: never; Returns: undefined }
      check_user_limit: { Args: { p_tenant_id: string }; Returns: boolean }
      cleanup_expired_trusted_devices: { Args: never; Returns: number }
      find_site_by_location: {
        Args: { p_lat: number; p_lng: number; p_tenant_id: string }
        Returns: {
          distance_meters: number
          primary_department_id: string
          primary_department_name: string
          site_id: string
          site_name: string
        }[]
      }
      generate_mfa_backup_codes: {
        Args: { p_code_hashes: string[]; p_user_id: string }
        Returns: undefined
      }
      get_accessible_menu_items: {
        Args: { _user_id: string }
        Returns: {
          menu_code: string
          menu_url: string
          parent_code: string
          sort_order: number
        }[]
      }
      get_active_event_categories: {
        Args: { p_tenant_id: string }
        Returns: {
          code: string
          icon: string
          id: string
          name_key: string
          sort_order: number
        }[]
      }
      get_active_event_subtypes: {
        Args: { p_category_code: string; p_tenant_id: string }
        Returns: {
          code: string
          id: string
          name_key: string
          sort_order: number
        }[]
      }
      get_agent_workload: {
        Args: never
        Returns: {
          agent_id: string
          agent_name: string
          avg_resolution_hours: number
          in_progress_tickets: number
          open_tickets: number
          total_active: number
        }[]
      }
      get_auth_tenant_id: { Args: never; Returns: string }
      get_current_month_usage: { Args: { p_tenant_id: string }; Returns: Json }
      get_dashboard_module_stats: { Args: never; Returns: Json }
      get_dashboard_quick_action_counts: { Args: never; Returns: Json }
      get_days_since_last_recordable: {
        Args: { p_branch_id?: string; p_site_id?: string }
        Returns: number
      }
      get_emergency_notification_recipients: {
        Args: { p_alert_type?: string; p_site_id?: string; p_tenant_id: string }
        Returns: {
          email: string
          full_name: string
          phone_number: string
          preferred_language: string
          role_code: string
          user_id: string
        }[]
      }
      get_events_by_location: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      get_findings_distribution: { Args: never; Returns: Json }
      get_hsse_acknowledgment_rates: {
        Args: { p_date_from?: string; p_date_to?: string; p_tenant_id: string }
        Returns: {
          acknowledgment_rate: number
          avg_response_hours: number
          branch_id: string
          branch_name: string
          total_actual_acks: number
          total_expected_acks: number
          total_notifications: number
        }[]
      }
      get_hsse_category_distribution: {
        Args: { p_tenant_id: string }
        Returns: {
          category: string
          count: number
          percentage: number
        }[]
      }
      get_hsse_compliance_metrics: {
        Args: { p_tenant_id: string }
        Returns: {
          avg_response_time_hours: number
          critical_pending: number
          high_pending: number
          overall_ack_rate: number
          overdue_count: number
          total_informational_notifications: number
          total_mandatory_notifications: number
          weekly_trend: Json
        }[]
      }
      get_hsse_contact_for_location: {
        Args: { p_branch_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          phone_number: string
          role_code: string
          role_name: string
        }[]
      }
      get_hsse_event_dashboard_stats:
        | {
            Args: { p_end_date?: string; p_start_date?: string }
            Returns: Json
          }
        | {
            Args: { p_end_date?: string; p_start_date?: string }
            Returns: Json
          }
      get_hsse_response_time_distribution: {
        Args: { p_tenant_id: string }
        Returns: {
          avg_hours: number
          count: number
          max_hours: number
          min_hours: number
          priority: string
        }[]
      }
      get_hsse_validation_dashboard: {
        Args: { p_severity_filter?: string; p_site_id?: string }
        Returns: Json
      }
      get_incident_department_manager: {
        Args: { p_incident_id: string }
        Returns: string
      }
      get_incident_notification_recipients: {
        Args: {
          p_erp_activated?: boolean
          p_has_injury?: boolean
          p_incident_id: string
          p_severity_level: string
          p_tenant_id: string
        }
        Returns: {
          channels: string[]
          email: string
          email_template_id: string
          full_name: string
          matrix_rule_id: string
          phone_number: string
          preferred_language: string
          stakeholder_role: string
          user_id: string
          was_condition_match: boolean
          whatsapp_template_id: string
        }[]
      }
      get_inspection_analytics: {
        Args: {
          p_end_date: string
          p_site_id?: string
          p_start_date: string
          p_tenant_id: string
        }
        Returns: Json
      }
      get_inspection_audit_trail: {
        Args: { p_entity_id?: string; p_entity_type?: string; p_limit?: number }
        Returns: {
          action: string
          actor_name: string
          change_summary: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_value: Json
          old_value: Json
          reference_id: string
        }[]
      }
      get_inspection_compliance_trend: { Args: never; Returns: Json }
      get_inspection_session_stats: { Args: never; Returns: Json }
      get_invitation_by_code: {
        Args: { p_code: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          metadata: Json
          tenant_id: string
        }[]
      }
      get_kpi_historical_trend: {
        Args: {
          p_branch_id?: string
          p_end_date?: string
          p_site_id?: string
          p_start_date?: string
        }
        Returns: {
          dart: number
          ltifr: number
          month: string
          severity_rate: number
          total_incidents: number
          total_manhours: number
          trir: number
        }[]
      }
      get_kpi_period_comparison: {
        Args: {
          p_branch_id?: string
          p_current_end: string
          p_current_start: string
          p_previous_end: string
          p_previous_start: string
          p_site_id?: string
        }
        Returns: {
          current_value: number
          metric_name: string
          percent_change: number
          previous_value: number
          trend_direction: string
        }[]
      }
      get_lagging_indicators: {
        Args: {
          p_branch_id?: string
          p_end_date: string
          p_site_id?: string
          p_start_date: string
        }
        Returns: Json
      }
      get_leading_indicators: {
        Args: {
          p_branch_id?: string
          p_end_date: string
          p_site_id?: string
          p_start_date: string
        }
        Returns: Json
      }
      get_managers_for_team_assignment: {
        Args: { p_exclude_user_id: string; p_tenant_id: string }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      get_manhours_summary: {
        Args: {
          p_branch_id?: string
          p_department_id?: string
          p_end_date: string
          p_site_id?: string
          p_start_date: string
        }
        Returns: {
          record_count: number
          total_contractor_hours: number
          total_employee_hours: number
          total_hours: number
        }[]
      }
      get_mfa_stats: {
        Args: { p_tenant_id?: string }
        Returns: {
          mfa_enabled_count: number
          total_users: number
        }[]
      }
      get_monthly_hsse_summary: {
        Args: { p_month?: string; p_tenant_id: string }
        Returns: Json
      }
      get_notification_acknowledgment_stats: {
        Args: { p_notification_id: string }
        Returns: Json
      }
      get_observation_trend_analytics: {
        Args: {
          p_branch_id?: string
          p_end_date?: string
          p_site_id?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_on_duty_personnel: {
        Args: {
          p_at_time?: string
          p_duty_type: string
          p_site_id: string
          p_tenant_id: string
        }
        Returns: {
          duty_type: string
          email: string
          full_name: string
          phone_number: string
          user_id: string
        }[]
      }
      get_overdue_inspections_count: { Args: never; Returns: number }
      get_overdue_schedules_count: { Args: never; Returns: number }
      get_pending_mandatory_notifications: {
        Args: never
        Returns: {
          body_ar: string
          body_en: string
          category: Database["public"]["Enums"]["hsse_notification_category"]
          id: string
          priority: Database["public"]["Enums"]["hsse_notification_priority"]
          published_at: string
          title_ar: string
          title_en: string
        }[]
      }
      get_people_metrics: {
        Args: {
          p_branch_id?: string
          p_end_date: string
          p_site_id?: string
          p_start_date: string
        }
        Returns: Json
      }
      get_profile_department_id_bypass: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_profile_tenant_id_bypass: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_recent_hsse_events: { Args: { p_limit?: number }; Returns: Json }
      get_residual_risk_metrics: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      get_response_metrics: {
        Args: {
          p_branch_id?: string
          p_end_date: string
          p_site_id?: string
          p_start_date: string
        }
        Returns: Json
      }
      get_security_dashboard_stats: { Args: never; Returns: Json }
      get_team_hierarchy: {
        Args: { p_manager_id: string }
        Returns: {
          depth: number
          user_id: string
        }[]
      }
      get_team_hierarchy_with_profiles: {
        Args: { p_manager_id: string }
        Returns: {
          depth: number
          full_name: string
          is_active: boolean
          is_manager: boolean
          job_title: string
          user_id: string
          user_type: string
        }[]
      }
      get_team_performance_metrics: {
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_tenant_id: string
        }
        Returns: Json
      }
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
      get_tenant_user_counts: {
        Args: { p_tenant_ids: string[] }
        Returns: {
          tenant_id: string
          user_count: number
        }[]
      }
      get_top_reporters: {
        Args: { p_end_date?: string; p_limit?: number; p_start_date?: string }
        Returns: Json
      }
      get_upcoming_inspection_schedules: {
        Args: { p_days_ahead?: number }
        Returns: {
          assigned_inspector_id: string
          days_until: number
          id: string
          name: string
          next_due: string
          reference_id: string
          schedule_type: string
          template_id: string
        }[]
      }
      get_user_active_session_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_roles: {
        Args: { p_user_id: string }
        Returns: {
          category: Database["public"]["Enums"]["role_category"]
          role_code: string
          role_id: string
          role_name: string
        }[]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      get_user_tenant_id_secure: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_users_with_roles_paginated: {
        Args: {
          p_branch_id?: string
          p_division_id?: string
          p_is_active?: boolean
          p_limit?: number
          p_offset?: number
          p_role_code?: string
          p_search_term?: string
          p_tenant_id: string
          p_user_type?: string
        }
        Returns: {
          assigned_branch_id: string
          assigned_department_id: string
          assigned_division_id: string
          assigned_section_id: string
          branch_name: string
          contract_end: string
          contract_start: string
          contractor_company_name: string
          department_name: string
          division_name: string
          email: string
          employee_id: string
          full_name: string
          has_full_branch_access: boolean
          has_login: boolean
          id: string
          is_active: boolean
          job_title: string
          membership_end: string
          membership_id: string
          membership_start: string
          phone_number: string
          role_assignments: Json
          section_name: string
          total_count: number
          user_type: string
        }[]
      }
      has_asset_management_access: {
        Args: { _user_id: string }
        Returns: boolean
      }
      has_confidentiality_access: {
        Args: { _incident_id: string; _user_id: string }
        Returns: boolean
      }
      has_dept_rep_role: { Args: { _user_id: string }; Returns: boolean }
      has_hsse_incident_access: { Args: { _user_id: string }; Returns: boolean }
      has_ptw_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_by_code: {
        Args: { p_role_code: string; p_user_id: string }
        Returns: boolean
      }
      has_security_access: { Args: { _user_id: string }; Returns: boolean }
      haversine_distance: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      incident_is_reporter_editable: {
        Args: { _incident_id: string }
        Returns: boolean
      }
      invalidate_other_user_sessions: {
        Args: {
          p_current_session_token: string
          p_reason?: string
          p_user_id: string
        }
        Returns: number
      }
      is_action_assignee_only: {
        Args: { _incident_id: string; _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_contractor_rep_for_company: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      is_in_team_hierarchy: {
        Args: { p_manager_id: string; p_user_id: string }
        Returns: boolean
      }
      is_incident_editable: {
        Args: { p_incident_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_admin: { Args: { _user_id: string }; Returns: boolean }
      lookup_invitation: { Args: { lookup_code: string }; Returns: Json }
      point_in_polygon: {
        Args: { p_lat: number; p_lng: number; p_polygon: Json }
        Returns: boolean
      }
      populate_default_menu_access: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      process_confidentiality_expiry: {
        Args: never
        Returns: {
          action_taken: string
          incident_id: string
          new_level: string
          old_level: string
        }[]
      }
      process_due_inspection_schedules: {
        Args: { p_tenant_id?: string }
        Returns: Json
      }
      reopen_closed_incident: {
        Args: { p_incident_id: string; p_reason: string }
        Returns: undefined
      }
      reset_notification_matrix_to_defaults: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      seed_default_kpi_targets: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      soft_delete_closed_incident: {
        Args: { p_incident_id: string; p_password_hash: string }
        Returns: string
      }
      soft_delete_corrective_action: {
        Args: { p_action_id: string }
        Returns: string
      }
      soft_delete_evidence: { Args: { p_evidence_id: string }; Returns: string }
      soft_delete_incident: { Args: { p_incident_id: string }; Returns: string }
      toggle_event_category: {
        Args: {
          p_category_id: string
          p_is_active: boolean
          p_tenant_id: string
        }
        Returns: undefined
      }
      toggle_event_subtype: {
        Args: {
          p_is_active: boolean
          p_subtype_id: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      upsert_notification_matrix_rule:
        | {
            Args: {
              p_channels: string[]
              p_condition_type?: string
              p_severity_level: string
              p_stakeholder_role: string
              p_tenant_id: string
              p_user_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_channels: string[]
              p_condition_type?: string
              p_severity_level: string
              p_stakeholder_role: string
              p_tenant_id: string
              p_user_id?: string
              p_whatsapp_template_id?: string
            }
            Returns: string
          }
      validate_invitation_code: {
        Args: { p_code: string }
        Returns: {
          expires_at: string
          is_valid: boolean
          tenant_id: string
          tenant_name: string
        }[]
      }
      validate_user_session: {
        Args: {
          p_current_country?: string
          p_current_ip: string
          p_session_token: string
        }
        Returns: Json
      }
      validate_worker_qr_access: {
        Args: { p_qr_token: string; p_site_id?: string }
        Returns: Json
      }
      verify_mfa_backup_code: {
        Args: { p_code_hash: string; p_user_id: string }
        Returns: boolean
      }
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
        | "backup_code_used"
      app_role: "admin" | "user"
      asset_condition: "excellent" | "good" | "fair" | "poor" | "critical"
      asset_criticality: "low" | "medium" | "high" | "critical"
      asset_document_type:
        | "manual"
        | "certificate"
        | "purchase_order"
        | "warranty"
        | "compliance"
        | "inspection_report"
        | "maintenance_record"
        | "other"
      asset_ownership: "company" | "contractor" | "leased" | "rented"
      asset_status:
        | "active"
        | "out_of_service"
        | "under_maintenance"
        | "retired"
        | "missing"
        | "pending_inspection"
      contractor_type: "long_term" | "short_term"
      hsse_category_code:
        | "safety"
        | "health"
        | "process_safety"
        | "environment"
        | "security"
        | "property_asset_damage"
        | "road_traffic_vehicle"
        | "quality_service"
        | "community_third_party"
        | "compliance_regulatory"
        | "emergency_crisis"
      hsse_notification_category:
        | "weather_risk"
        | "regulation"
        | "safety_alert"
        | "policy_update"
        | "training"
        | "general"
      hsse_notification_priority: "critical" | "high" | "medium" | "low"
      hsse_notification_target:
        | "all_users"
        | "specific_roles"
        | "specific_branches"
        | "specific_sites"
      hsse_notification_type: "mandatory" | "informational"
      incident_status:
        | "submitted"
        | "pending_review"
        | "investigation_pending"
        | "investigation_in_progress"
        | "closed"
        | "expert_screening"
        | "returned_to_reporter"
        | "expert_rejected"
        | "no_investigation_required"
        | "pending_manager_approval"
        | "manager_rejected"
        | "hsse_manager_escalation"
        | "pending_dept_rep_approval"
        | "observation_actions_pending"
        | "pending_closure"
        | "investigation_closed"
        | "pending_final_closure"
        | "pending_hsse_validation"
      maintenance_frequency:
        | "daily"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "semi_annually"
        | "annually"
        | "custom"
      maintenance_type:
        | "preventive"
        | "predictive"
        | "condition_based"
        | "corrective"
      module_code:
        | "hsse_core"
        | "visitor_management"
        | "incidents"
        | "audits"
        | "reports_analytics"
        | "api_access"
        | "priority_support"
        | "asset_management"
      profile_type: "visitor" | "member" | "contractor"
      role_category:
        | "general"
        | "hsse"
        | "environmental"
        | "ptw"
        | "security"
        | "audit"
        | "food_safety"
      severity_level: "low" | "medium" | "high" | "critical"
      severity_level_v2:
        | "level_1"
        | "level_2"
        | "level_3"
        | "level_4"
        | "level_5"
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
        "backup_code_used",
      ],
      app_role: ["admin", "user"],
      asset_condition: ["excellent", "good", "fair", "poor", "critical"],
      asset_criticality: ["low", "medium", "high", "critical"],
      asset_document_type: [
        "manual",
        "certificate",
        "purchase_order",
        "warranty",
        "compliance",
        "inspection_report",
        "maintenance_record",
        "other",
      ],
      asset_ownership: ["company", "contractor", "leased", "rented"],
      asset_status: [
        "active",
        "out_of_service",
        "under_maintenance",
        "retired",
        "missing",
        "pending_inspection",
      ],
      contractor_type: ["long_term", "short_term"],
      hsse_category_code: [
        "safety",
        "health",
        "process_safety",
        "environment",
        "security",
        "property_asset_damage",
        "road_traffic_vehicle",
        "quality_service",
        "community_third_party",
        "compliance_regulatory",
        "emergency_crisis",
      ],
      hsse_notification_category: [
        "weather_risk",
        "regulation",
        "safety_alert",
        "policy_update",
        "training",
        "general",
      ],
      hsse_notification_priority: ["critical", "high", "medium", "low"],
      hsse_notification_target: [
        "all_users",
        "specific_roles",
        "specific_branches",
        "specific_sites",
      ],
      hsse_notification_type: ["mandatory", "informational"],
      incident_status: [
        "submitted",
        "pending_review",
        "investigation_pending",
        "investigation_in_progress",
        "closed",
        "expert_screening",
        "returned_to_reporter",
        "expert_rejected",
        "no_investigation_required",
        "pending_manager_approval",
        "manager_rejected",
        "hsse_manager_escalation",
        "pending_dept_rep_approval",
        "observation_actions_pending",
        "pending_closure",
        "investigation_closed",
        "pending_final_closure",
        "pending_hsse_validation",
      ],
      maintenance_frequency: [
        "daily",
        "weekly",
        "monthly",
        "quarterly",
        "semi_annually",
        "annually",
        "custom",
      ],
      maintenance_type: [
        "preventive",
        "predictive",
        "condition_based",
        "corrective",
      ],
      module_code: [
        "hsse_core",
        "visitor_management",
        "incidents",
        "audits",
        "reports_analytics",
        "api_access",
        "priority_support",
        "asset_management",
      ],
      profile_type: ["visitor", "member", "contractor"],
      role_category: [
        "general",
        "hsse",
        "environmental",
        "ptw",
        "security",
        "audit",
        "food_safety",
      ],
      severity_level: ["low", "medium", "high", "critical"],
      severity_level_v2: [
        "level_1",
        "level_2",
        "level_3",
        "level_4",
        "level_5",
      ],
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
