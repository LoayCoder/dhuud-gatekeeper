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
          id: string
          recommendation: string | null
          reference_id: string
          response_id: string
          risk_level: string | null
          session_id: string
          status: string | null
          tenant_id: string
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
          id?: string
          recommendation?: string | null
          reference_id: string
          response_id: string
          risk_level?: string | null
          session_id: string
          status?: string | null
          tenant_id: string
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
          id?: string
          recommendation?: string | null
          reference_id?: string
          response_id?: string
          risk_level?: string | null
          session_id?: string
          status?: string | null
          tenant_id?: string
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
      asset_documents: {
        Row: {
          asset_id: string
          created_at: string | null
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["asset_document_type"]
          expiry_date: string | null
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
      asset_maintenance_schedules: {
        Row: {
          asset_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          estimated_duration_hours: number | null
          frequency_type: Database["public"]["Enums"]["maintenance_frequency"]
          frequency_value: number | null
          id: string
          is_active: boolean | null
          last_performed: string | null
          next_due: string | null
          schedule_type: Database["public"]["Enums"]["maintenance_type"]
          tenant_id: string
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_duration_hours?: number | null
          frequency_type: Database["public"]["Enums"]["maintenance_frequency"]
          frequency_value?: number | null
          id?: string
          is_active?: boolean | null
          last_performed?: string | null
          next_due?: string | null
          schedule_type: Database["public"]["Enums"]["maintenance_type"]
          tenant_id: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_duration_hours?: number | null
          frequency_type?: Database["public"]["Enums"]["maintenance_frequency"]
          frequency_value?: number | null
          id?: string
          is_active?: boolean | null
          last_performed?: string | null
          next_due?: string | null
          schedule_type?: Database["public"]["Enums"]["maintenance_type"]
          tenant_id?: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
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
      corrective_actions: {
        Row: {
          action_type: string | null
          assigned_to: string | null
          category: string | null
          completed_date: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          escalation_level: number | null
          finding_id: string | null
          id: string
          incident_id: string | null
          linked_cause_type: string | null
          linked_root_cause_id: string | null
          priority: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_notes: string | null
          responsible_department_id: string | null
          session_id: string | null
          sla_escalation_sent_at: string | null
          sla_warning_sent_at: string | null
          source_finding_id: string | null
          source_type: string | null
          start_date: string | null
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
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          escalation_level?: number | null
          finding_id?: string | null
          id?: string
          incident_id?: string | null
          linked_cause_type?: string | null
          linked_root_cause_id?: string | null
          priority?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_notes?: string | null
          responsible_department_id?: string | null
          session_id?: string | null
          sla_escalation_sent_at?: string | null
          sla_warning_sent_at?: string | null
          source_finding_id?: string | null
          source_type?: string | null
          start_date?: string | null
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
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          escalation_level?: number | null
          finding_id?: string | null
          id?: string
          incident_id?: string | null
          linked_cause_type?: string | null
          linked_root_cause_id?: string | null
          priority?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_notes?: string | null
          responsible_department_id?: string | null
          session_id?: string | null
          sla_escalation_sent_at?: string | null
          sla_warning_sent_at?: string | null
          source_finding_id?: string | null
          source_type?: string | null
          start_date?: string | null
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
      hsse_assets: {
        Row: {
          asset_code: string
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
          custom_fields: Json | null
          deleted_at: string | null
          description: string | null
          expected_lifespan_years: number | null
          floor_zone_id: string | null
          id: string
          inspection_interval_days: number | null
          installation_date: string | null
          last_inspection_date: string | null
          latitude: number | null
          location_details: string | null
          longitude: number | null
          maintenance_contract_id: string | null
          maintenance_vendor: string | null
          manufacturer: string | null
          model: string | null
          name: string
          next_inspection_due: string | null
          ownership: Database["public"]["Enums"]["asset_ownership"] | null
          qr_code_data: string | null
          replacement_due_date: string | null
          risk_score: number | null
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
        }
        Insert: {
          asset_code: string
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
          custom_fields?: Json | null
          deleted_at?: string | null
          description?: string | null
          expected_lifespan_years?: number | null
          floor_zone_id?: string | null
          id?: string
          inspection_interval_days?: number | null
          installation_date?: string | null
          last_inspection_date?: string | null
          latitude?: number | null
          location_details?: string | null
          longitude?: number | null
          maintenance_contract_id?: string | null
          maintenance_vendor?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          next_inspection_due?: string | null
          ownership?: Database["public"]["Enums"]["asset_ownership"] | null
          qr_code_data?: string | null
          replacement_due_date?: string | null
          risk_score?: number | null
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
        }
        Update: {
          asset_code?: string
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
          custom_fields?: Json | null
          deleted_at?: string | null
          description?: string | null
          expected_lifespan_years?: number | null
          floor_zone_id?: string | null
          id?: string
          inspection_interval_days?: number | null
          installation_date?: string | null
          last_inspection_date?: string | null
          latitude?: number | null
          location_details?: string | null
          longitude?: number | null
          maintenance_contract_id?: string | null
          maintenance_vendor?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          next_inspection_due?: string | null
          ownership?: Database["public"]["Enums"]["asset_ownership"] | null
          qr_code_data?: string | null
          replacement_due_date?: string | null
          risk_score?: number | null
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
      incidents: {
        Row: {
          ai_analysis_result: Json | null
          branch_id: string | null
          closure_approved_at: string | null
          closure_approved_by: string | null
          closure_rejection_notes: string | null
          closure_request_notes: string | null
          closure_requested_at: string | null
          closure_requested_by: string | null
          created_at: string | null
          damage_details: Json | null
          deleted_at: string | null
          department: string | null
          department_id: string | null
          description: string
          event_type: string
          has_damage: boolean | null
          has_injury: boolean | null
          id: string
          immediate_actions: string | null
          immediate_actions_data: Json | null
          injury_details: Json | null
          latitude: number | null
          location: string | null
          longitude: number | null
          media_attachments: Json | null
          occurred_at: string | null
          original_severity:
            | Database["public"]["Enums"]["severity_level"]
            | null
          reference_id: string | null
          reporter_id: string | null
          risk_rating: string | null
          severity: Database["public"]["Enums"]["severity_level"] | null
          severity_approved_at: string | null
          severity_approved_by: string | null
          severity_change_justification: string | null
          severity_pending_approval: boolean | null
          site_id: string | null
          special_event_id: string | null
          status: Database["public"]["Enums"]["incident_status"] | null
          subtype: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_analysis_result?: Json | null
          branch_id?: string | null
          closure_approved_at?: string | null
          closure_approved_by?: string | null
          closure_rejection_notes?: string | null
          closure_request_notes?: string | null
          closure_requested_at?: string | null
          closure_requested_by?: string | null
          created_at?: string | null
          damage_details?: Json | null
          deleted_at?: string | null
          department?: string | null
          department_id?: string | null
          description: string
          event_type: string
          has_damage?: boolean | null
          has_injury?: boolean | null
          id?: string
          immediate_actions?: string | null
          immediate_actions_data?: Json | null
          injury_details?: Json | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          media_attachments?: Json | null
          occurred_at?: string | null
          original_severity?:
            | Database["public"]["Enums"]["severity_level"]
            | null
          reference_id?: string | null
          reporter_id?: string | null
          risk_rating?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          severity_approved_at?: string | null
          severity_approved_by?: string | null
          severity_change_justification?: string | null
          severity_pending_approval?: boolean | null
          site_id?: string | null
          special_event_id?: string | null
          status?: Database["public"]["Enums"]["incident_status"] | null
          subtype?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_analysis_result?: Json | null
          branch_id?: string | null
          closure_approved_at?: string | null
          closure_approved_by?: string | null
          closure_rejection_notes?: string | null
          closure_request_notes?: string | null
          closure_requested_at?: string | null
          closure_requested_by?: string | null
          created_at?: string | null
          damage_details?: Json | null
          deleted_at?: string | null
          department?: string | null
          department_id?: string | null
          description?: string
          event_type?: string
          has_damage?: boolean | null
          has_injury?: boolean | null
          id?: string
          immediate_actions?: string | null
          immediate_actions_data?: Json | null
          injury_details?: Json | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          media_attachments?: Json | null
          occurred_at?: string | null
          original_severity?:
            | Database["public"]["Enums"]["severity_level"]
            | null
          reference_id?: string | null
          reporter_id?: string | null
          risk_rating?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          severity_approved_at?: string | null
          severity_approved_by?: string | null
          severity_change_justification?: string | null
          severity_pending_approval?: boolean | null
          site_id?: string | null
          special_event_id?: string | null
          status?: Database["public"]["Enums"]["incident_status"] | null
          subtype?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
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
            foreignKeyName: "incidents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
          last_reminder_sent: string | null
          month_of_year: number | null
          name: string
          name_ar: string | null
          next_due: string | null
          reference_id: string
          reminder_days_before: number
          schedule_type: string
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
          last_reminder_sent?: string | null
          month_of_year?: number | null
          name: string
          name_ar?: string | null
          next_due?: string | null
          reference_id: string
          reminder_days_before?: number
          schedule_type?: string
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
          last_reminder_sent?: string | null
          month_of_year?: number | null
          name?: string
          name_ar?: string | null
          next_due?: string | null
          reference_id?: string
          reminder_days_before?: number
          schedule_type?: string
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
          branch_id: string | null
          category_id: string | null
          code: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string
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
          branch_id?: string | null
          category_id?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
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
          branch_id?: string | null
          category_id?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
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
      investigations: {
        Row: {
          ai_summary: string | null
          ai_summary_generated_at: string | null
          ai_summary_language: string | null
          completed_at: string | null
          contributing_factors: string | null
          contributing_factors_list: Json | null
          created_at: string | null
          deleted_at: string | null
          findings_summary: string | null
          five_whys: Json | null
          id: string
          immediate_cause: string | null
          incident_id: string | null
          investigator_id: string | null
          root_cause: string | null
          root_causes: Json | null
          started_at: string | null
          tenant_id: string
          underlying_cause: string | null
          updated_at: string | null
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          ai_summary_language?: string | null
          completed_at?: string | null
          contributing_factors?: string | null
          contributing_factors_list?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          findings_summary?: string | null
          five_whys?: Json | null
          id?: string
          immediate_cause?: string | null
          incident_id?: string | null
          investigator_id?: string | null
          root_cause?: string | null
          root_causes?: Json | null
          started_at?: string | null
          tenant_id: string
          underlying_cause?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          ai_summary_language?: string | null
          completed_at?: string | null
          contributing_factors?: string | null
          contributing_factors_list?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          findings_summary?: string | null
          five_whys?: Json | null
          id?: string
          immediate_cause?: string | null
          incident_id?: string | null
          investigator_id?: string | null
          root_cause?: string | null
          root_causes?: Json | null
          started_at?: string | null
          tenant_id?: string
          underlying_cause?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investigations_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
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
          digest_opt_in: boolean | null
          digest_preferred_time: string | null
          digest_timezone: string | null
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
          digest_opt_in?: boolean | null
          digest_preferred_time?: string | null
          digest_timezone?: string | null
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
          digest_opt_in?: boolean | null
          digest_preferred_time?: string | null
          digest_timezone?: string | null
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
          mfa_trust_duration_days: number | null
          name: string
          notes: string | null
          plan_id: string | null
          preferred_currency: string
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
          mfa_trust_duration_days?: number | null
          name: string
          notes?: string | null
          plan_id?: string | null
          preferred_currency?: string
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
          mfa_trust_duration_days?: number | null
          name?: string
          notes?: string | null
          plan_id?: string | null
          preferred_currency?: string
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
            foreignKeyName: "witness_statements_tenant_id_fkey"
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
      can_close_area_session: { Args: { p_session_id: string }; Returns: Json }
      can_close_investigation: {
        Args: { p_incident_id: string }
        Returns: Json
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
      check_sla_breaches: { Args: never; Returns: undefined }
      check_user_limit: { Args: { p_tenant_id: string }; Returns: boolean }
      cleanup_expired_trusted_devices: { Args: never; Returns: number }
      generate_mfa_backup_codes: {
        Args: { p_code_hashes: string[]; p_user_id: string }
        Returns: undefined
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
      get_findings_distribution: { Args: never; Returns: Json }
      get_inspection_compliance_trend: { Args: never; Returns: Json }
      get_inspection_session_stats: { Args: never; Returns: Json }
      get_overdue_inspections_count: { Args: never; Returns: number }
      get_overdue_schedules_count: { Args: never; Returns: number }
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
      get_users_with_roles_paginated:
        | {
            Args: {
              p_branch_id?: string
              p_division_id?: string
              p_is_active?: boolean
              p_limit?: number
              p_offset?: number
              p_role_code?: string
              p_tenant_id: string
              p_user_type?: string
            }
            Returns: {
              assigned_branch_id: string
              assigned_department_id: string
              assigned_division_id: string
              assigned_section_id: string
              branch_name: string
              department_name: string
              division_name: string
              employee_id: string
              full_name: string
              has_login: boolean
              id: string
              is_active: boolean
              job_title: string
              phone_number: string
              role_assignments: Json
              section_name: string
              total_count: number
              user_type: string
            }[]
          }
        | {
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
              department_name: string
              division_name: string
              employee_id: string
              full_name: string
              has_login: boolean
              id: string
              is_active: boolean
              job_title: string
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
      has_hsse_incident_access: { Args: { _user_id: string }; Returns: boolean }
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
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_in_team_hierarchy: {
        Args: { p_manager_id: string; p_user_id: string }
        Returns: boolean
      }
      is_incident_editable: {
        Args: { p_incident_id: string }
        Returns: boolean
      }
      lookup_invitation: { Args: { lookup_code: string }; Returns: Json }
      soft_delete_evidence: { Args: { p_evidence_id: string }; Returns: string }
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
      incident_status:
        | "submitted"
        | "pending_review"
        | "investigation_pending"
        | "investigation_in_progress"
        | "closed"
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
      incident_status: [
        "submitted",
        "pending_review",
        "investigation_pending",
        "investigation_in_progress",
        "closed",
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
