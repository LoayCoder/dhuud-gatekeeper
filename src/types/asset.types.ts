/**
 * Asset Management Types
 * Types for HSSE assets, maintenance, inspections, and health monitoring
 */

// Asset status values
export type AssetStatus = 
  | 'active'
  | 'inactive'
  | 'under_maintenance'
  | 'disposed'
  | 'pending_disposal'
  | 'out_of_service';

// Asset condition ratings
export type AssetCondition = 
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'
  | 'critical';

// Maintenance types
export type MaintenanceType = 
  | 'preventive'
  | 'corrective'
  | 'predictive'
  | 'condition_based'
  | 'calibration'
  | 'inspection';

// Maintenance frequency
export type MaintenanceFrequency = 
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'semi_annually'
  | 'annually'
  | 'custom';

// Asset document types
export type AssetDocumentType = 
  | 'manual'
  | 'warranty'
  | 'certificate'
  | 'inspection_report'
  | 'maintenance_log'
  | 'calibration_certificate'
  | 'safety_data_sheet'
  | 'other';

// Core asset interface
export interface Asset {
  id: string;
  tenant_id: string;
  asset_code: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  category_id?: string | null;
  type_id?: string | null;
  status: AssetStatus;
  condition?: AssetCondition | null;
  
  // Location
  site_id?: string | null;
  branch_id?: string | null;
  location_description?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  
  // Purchase info
  purchase_date?: string | null;
  purchase_price?: number | null;
  currency?: string | null;
  vendor_name?: string | null;
  warranty_expiry?: string | null;
  
  // Lifecycle
  commissioning_date?: string | null;
  expected_life_years?: number | null;
  disposal_date?: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Maintenance schedule
export interface MaintenanceSchedule {
  id: string;
  tenant_id: string;
  asset_id: string;
  schedule_type: MaintenanceType;
  frequency_type: MaintenanceFrequency;
  frequency_value?: number | null;
  description?: string | null;
  next_due?: string | null;
  last_performed?: string | null;
  is_active: boolean;
  criticality?: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
}

// Asset health score
export interface AssetHealthScore {
  id: string;
  asset_id: string;
  tenant_id: string;
  score: number; // 0-100
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  trend?: 'improving' | 'stable' | 'declining';
  last_calculated_at: string;
  contributing_factors?: Record<string, unknown>;
  failure_probability?: number | null;
  days_until_predicted_failure?: number | null;
}

// Asset inspection result
export interface AssetInspectionResult {
  id: string;
  asset_id: string;
  inspection_date: string;
  inspector_id: string;
  overall_result: 'pass' | 'fail' | 'partial';
  findings?: string | null;
  recommendations?: string | null;
  next_inspection_due?: string | null;
}

// Asset cost transaction
export interface AssetCostTransaction {
  id: string;
  asset_id: string;
  tenant_id: string;
  transaction_type: 'purchase' | 'maintenance' | 'repair' | 'upgrade' | 'disposal';
  amount: number;
  currency: string;
  transaction_date: string;
  description?: string | null;
  vendor_name?: string | null;
}

// Asset category
export interface AssetCategory {
  id: string;
  tenant_id?: string | null;
  code: string;
  name: string;
  name_ar?: string | null;
  color?: string | null;
  icon?: string | null;
  is_active: boolean;
  is_system: boolean;
  sort_order?: number | null;
}

// Label settings for barcode printing
export interface AssetLabelSettings {
  size: 'small' | 'medium' | 'large' | 'custom';
  showQR: boolean;
  showBarcode: boolean;
  showName: boolean;
  showCategory: boolean;
  showLocation: boolean;
  customWidth?: number;
  customHeight?: number;
}
