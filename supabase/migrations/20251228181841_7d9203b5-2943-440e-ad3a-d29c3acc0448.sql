-- ============================================
-- INSPECTION TEMPLATE CATEGORIES & ENHANCEMENTS
-- ============================================

-- 1. Create inspection_template_categories table
CREATE TABLE public.inspection_template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_insp_category_code_per_tenant UNIQUE NULLS NOT DISTINCT (tenant_id, code)
);

-- 2. Add new columns to inspection_templates
ALTER TABLE public.inspection_templates 
ADD COLUMN IF NOT EXISTS inspection_category_id UUID REFERENCES public.inspection_template_categories(id),
ADD COLUMN IF NOT EXISTS area_type TEXT,
ADD COLUMN IF NOT EXISTS standard_reference TEXT,
ADD COLUMN IF NOT EXISTS passing_score_percentage INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS requires_photos BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_gps BOOLEAN DEFAULT false;

-- Add comment for area_type values
COMMENT ON COLUMN public.inspection_templates.area_type IS 'warehouse, accommodation, site, building, office, workshop';

-- 3. Enable RLS on inspection_template_categories
ALTER TABLE public.inspection_template_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inspection_template_categories
CREATE POLICY "Users can view categories in their tenant or system categories"
ON public.inspection_template_categories FOR SELECT
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  OR (tenant_id IS NULL AND is_system = true)
);

CREATE POLICY "Admins can insert categories"
ON public.inspection_template_categories FOR INSERT
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND is_admin(auth.uid())
);

CREATE POLICY "Admins can update categories"
ON public.inspection_template_categories FOR UPDATE
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND is_admin(auth.uid())
  AND is_system = false
);

CREATE POLICY "Admins can soft delete categories"
ON public.inspection_template_categories FOR DELETE
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND is_admin(auth.uid())
  AND is_system = false
);

-- 4. Insert default system categories (tenant_id = NULL for system-wide)
INSERT INTO public.inspection_template_categories (tenant_id, code, name, name_ar, description, description_ar, icon, color, sort_order, is_system, is_active)
VALUES 
  (NULL, 'CHEM-STORAGE', 'Chemical Storage', 'التخزين الكيميائي', 'Inspections for chemical warehouses and hazardous material storage', 'فحوصات المستودعات الكيميائية وتخزين المواد الخطرة', 'flask-conical', 'orange', 1, true, true),
  (NULL, 'ACCOMMODATION', 'Accommodation', 'السكن', 'Staff housing and living quarters inspections', 'فحوصات سكن الموظفين والمرافق السكنية', 'home', 'blue', 2, true, true),
  (NULL, 'SITE-SAFETY', 'Site Safety', 'سلامة الموقع', 'General site walkthrough and safety inspections', 'جولات السلامة العامة في الموقع', 'hard-hat', 'yellow', 3, true, true),
  (NULL, 'STRUCTURAL', 'Structural', 'الهيكلية', 'Building structural integrity assessments', 'تقييمات سلامة هيكل المباني', 'building', 'gray', 4, true, true),
  (NULL, 'FIRE-SAFETY', 'Fire Safety', 'السلامة من الحرائق', 'Fire prevention and emergency equipment inspections', 'فحوصات الوقاية من الحرائق ومعدات الطوارئ', 'flame', 'red', 5, true, true),
  (NULL, 'ELECTRICAL', 'Electrical', 'الكهرباء', 'Electrical systems and equipment safety inspections', 'فحوصات سلامة الأنظمة والمعدات الكهربائية', 'zap', 'amber', 6, true, true),
  (NULL, 'GENERAL', 'General', 'عام', 'General purpose inspection templates', 'قوالب الفحص العامة', 'clipboard-check', 'green', 7, true, true);

-- 5. Create updated_at trigger
CREATE TRIGGER update_inspection_template_categories_updated_at
  BEFORE UPDATE ON public.inspection_template_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Create indexes for performance
CREATE INDEX idx_insp_template_categories_tenant ON public.inspection_template_categories(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_insp_templates_insp_category ON public.inspection_templates(inspection_category_id) WHERE deleted_at IS NULL;