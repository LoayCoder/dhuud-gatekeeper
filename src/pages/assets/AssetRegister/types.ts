import { z } from 'zod';

export const assetSchema = z.object({
  // Classification
  category_id: z.string().min(1, 'Category is required'),
  type_id: z.string().min(1, 'Type is required'),
  subtype_id: z.string().optional().nullable(),
  name: z.string().optional(), // Auto-generated from category + type + code
  description: z.string().optional(),
  asset_code: z.string().min(1, 'Asset code is required'),
  
  // Identification
  serial_number: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  qr_code_data: z.string().optional(),
  tags: z.array(z.string()).optional(),
  
  // Location
  branch_id: z.string().optional().nullable(),
  site_id: z.string().optional().nullable(),
  building_id: z.string().optional().nullable(),
  floor_zone_id: z.string().optional().nullable(),
  location_details: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  
  // Status
  status: z.enum(['active', 'missing', 'out_of_service', 'pending_inspection', 'retired', 'under_maintenance']).default('active'),
  condition_rating: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']).optional().nullable(),
  criticality_level: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  ownership: z.enum(['company', 'leased', 'rented', 'contractor']).default('company'),
  
  // Lifecycle
  installation_date: z.string().optional().nullable(),
  commissioning_date: z.string().optional().nullable(),
  warranty_expiry_date: z.string().optional().nullable(),
  expected_lifespan_years: z.number().optional().nullable(),
  
  // Maintenance
  inspection_interval_days: z.number().optional().nullable(),
  maintenance_vendor: z.string().optional(),
  maintenance_contract_id: z.string().optional(),
});


export type AssetFormValues = z.infer<typeof assetSchema>;
