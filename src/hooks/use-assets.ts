/**
 * Stub: use-assets hook with AssetWithRelations type
 */
export interface AssetWithRelations {
  id: string;
  asset_code: string;
  name: string;
  description?: string | null;
  status: string;
  condition_rating?: string | null;
  serial_number?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  installation_date?: string | null;
  warranty_expiry?: string | null;
  next_inspection_due?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  category?: { id: string; name: string; name_ar?: string | null; code?: string } | null;
  type?: { id: string; name: string; name_ar?: string | null } | null;
  branch?: { id: string; name: string; name_ar?: string | null } | null;
  site?: { id: string; name: string; name_ar?: string | null } | null;
  building?: { id: string; name: string; name_ar?: string | null } | null;
  floor_zone?: { id: string; name: string; name_ar?: string | null } | null;
}
