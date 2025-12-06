
-- =====================================================
-- HSSE ASSET MANAGEMENT MODULE - DATABASE FOUNDATION
-- Part 1: Tables, Enums, and Basic Structure
-- =====================================================

-- 1. EXTEND LOCATION HIERARCHY
-- =====================================================

-- Buildings table (child of sites)
CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  code TEXT,
  floor_count INTEGER DEFAULT 1,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, site_id, code)
);

-- Floors/Zones table (child of buildings)
CREATE TABLE IF NOT EXISTS public.floors_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  zone_type TEXT DEFAULT 'floor' CHECK (zone_type IN ('floor', 'zone', 'area', 'room')),
  level_number INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. ASSET CLASSIFICATION SYSTEM
-- =====================================================

-- Asset Categories (system + tenant-extensible)
CREATE TABLE IF NOT EXISTS public.asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Asset Types within categories
CREATE TABLE IF NOT EXISTS public.asset_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.asset_categories(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  inspection_interval_days INTEGER DEFAULT 30,
  requires_certification BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Asset Subtypes (optional granularity)
CREATE TABLE IF NOT EXISTS public.asset_subtypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES public.asset_types(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 3. ENUMS FOR ASSETS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE public.asset_status AS ENUM (
    'active', 'out_of_service', 'under_maintenance', 'retired', 'missing', 'pending_inspection'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.asset_condition AS ENUM (
    'excellent', 'good', 'fair', 'poor', 'critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.asset_ownership AS ENUM (
    'company', 'contractor', 'leased', 'rented'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.asset_criticality AS ENUM (
    'low', 'medium', 'high', 'critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.asset_document_type AS ENUM (
    'manual', 'certificate', 'purchase_order', 'warranty', 'compliance', 'inspection_report', 'maintenance_record', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_frequency AS ENUM (
    'daily', 'weekly', 'monthly', 'quarterly', 'semi_annually', 'annually', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_type AS ENUM (
    'preventive', 'predictive', 'condition_based', 'corrective'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. MAIN HSSE ASSETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.hsse_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_code TEXT NOT NULL,
  qr_code_data TEXT,
  category_id UUID NOT NULL REFERENCES public.asset_categories(id),
  type_id UUID NOT NULL REFERENCES public.asset_types(id),
  subtype_id UUID REFERENCES public.asset_subtypes(id),
  name TEXT NOT NULL,
  description TEXT,
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  floor_zone_id UUID REFERENCES public.floors_zones(id) ON DELETE SET NULL,
  location_details TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  installation_date DATE,
  commissioning_date DATE,
  warranty_expiry_date DATE,
  expected_lifespan_years INTEGER,
  replacement_due_date DATE,
  status public.asset_status DEFAULT 'active',
  condition_rating public.asset_condition,
  ownership public.asset_ownership DEFAULT 'company',
  inspection_interval_days INTEGER,
  last_inspection_date DATE,
  next_inspection_due DATE,
  maintenance_vendor TEXT,
  maintenance_contract_id TEXT,
  criticality_level public.asset_criticality DEFAULT 'medium',
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  custom_fields JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, asset_code)
);

-- 5. ASSET PHOTOS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.asset_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.hsse_assets(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  is_primary BOOLEAN DEFAULT false,
  caption TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 6. ASSET DOCUMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.asset_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.hsse_assets(id) ON DELETE CASCADE,
  document_type public.asset_document_type NOT NULL,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  expiry_date DATE,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 7. ASSET AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.asset_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.hsse_assets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id),
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. ASSET MAINTENANCE SCHEDULES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.asset_maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.hsse_assets(id) ON DELETE CASCADE,
  schedule_type public.maintenance_type NOT NULL,
  frequency_type public.maintenance_frequency NOT NULL,
  frequency_value INTEGER DEFAULT 1,
  description TEXT,
  vendor_name TEXT,
  estimated_duration_hours DECIMAL(5,2),
  last_performed DATE,
  next_due DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
