-- =====================================================
-- PHASE 1: Multi-Language Page System Database Schema
-- =====================================================

-- 1. Create page_type enum
CREATE TYPE public.page_type AS ENUM ('visitor_badge', 'worker_pass', 'worker_induction');

-- 2. Create page_status enum
CREATE TYPE public.page_status AS ENUM ('draft', 'published');

-- 3. Create supported_language enum
CREATE TYPE public.supported_language AS ENUM ('ar', 'en', 'ur', 'hi', 'fil', 'zh');

-- =====================================================
-- TABLE: page_content_versions
-- Stores all page content versions (main + translations)
-- =====================================================
CREATE TABLE public.page_content_versions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    page_type public.page_type NOT NULL,
    language public.supported_language NOT NULL,
    is_main BOOLEAN NOT NULL DEFAULT false,
    status public.page_status NOT NULL DEFAULT 'draft',
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Only one main page per tenant per page type
    CONSTRAINT unique_main_page UNIQUE (tenant_id, page_type, is_main) 
        DEFERRABLE INITIALLY DEFERRED,
    -- Only one version per language per page type per tenant
    CONSTRAINT unique_language_version UNIQUE (tenant_id, page_type, language)
);

-- Enable RLS
ALTER TABLE public.page_content_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view page versions for their tenant"
ON public.page_content_versions FOR SELECT
USING (tenant_id IN (
    SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
));

CREATE POLICY "Users can create page versions for their tenant"
ON public.page_content_versions FOR INSERT
WITH CHECK (tenant_id IN (
    SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
));

CREATE POLICY "Users can update page versions for their tenant"
ON public.page_content_versions FOR UPDATE
USING (tenant_id IN (
    SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
));

CREATE POLICY "Users can delete page versions for their tenant"
ON public.page_content_versions FOR DELETE
USING (tenant_id IN (
    SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
));

-- =====================================================
-- TABLE: nationality_language_mapping
-- Maps nationalities to resolved languages
-- =====================================================
CREATE TABLE public.nationality_language_mapping (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nationality_code TEXT NOT NULL UNIQUE,
    country_name_en TEXT NOT NULL,
    country_name_ar TEXT NOT NULL,
    visitor_language public.supported_language NOT NULL DEFAULT 'en',
    worker_language public.supported_language NOT NULL DEFAULT 'en',
    display_order INTEGER NOT NULL DEFAULT 999,
    is_arab_country BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (read-only for authenticated users)
ALTER TABLE public.nationality_language_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read nationality mappings"
ON public.nationality_language_mapping FOR SELECT
USING (true);

-- =====================================================
-- TABLE: page_content_audit_logs
-- Audit trail for page operations
-- =====================================================
CREATE TABLE public.page_content_audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    page_version_id UUID REFERENCES public.page_content_versions(id),
    page_type public.page_type NOT NULL,
    language public.supported_language,
    action_type TEXT NOT NULL, -- 'created', 'updated', 'translated', 'retranslated', 'published', 'deleted'
    performed_by UUID REFERENCES public.profiles(id),
    old_value JSONB,
    new_value JSONB,
    metadata JSONB DEFAULT '{}'::jsonb, -- For additional info like AI model used
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_content_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their tenant"
ON public.page_content_audit_logs FOR SELECT
USING (tenant_id IN (
    SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
));

CREATE POLICY "Users can create audit logs for their tenant"
ON public.page_content_audit_logs FOR INSERT
WITH CHECK (tenant_id IN (
    SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
));

-- =====================================================
-- SEED DATA: Nationality to Language Mappings
-- =====================================================

-- Saudi Arabia (first)
INSERT INTO public.nationality_language_mapping (nationality_code, country_name_en, country_name_ar, visitor_language, worker_language, display_order, is_arab_country)
VALUES ('SA', 'Saudi Arabia', 'المملكة العربية السعودية', 'ar', 'ar', 1, true);

-- Arab Countries (2-20)
INSERT INTO public.nationality_language_mapping (nationality_code, country_name_en, country_name_ar, visitor_language, worker_language, display_order, is_arab_country) VALUES
('AE', 'United Arab Emirates', 'الإمارات العربية المتحدة', 'ar', 'ar', 2, true),
('KW', 'Kuwait', 'الكويت', 'ar', 'ar', 3, true),
('QA', 'Qatar', 'قطر', 'ar', 'ar', 4, true),
('BH', 'Bahrain', 'البحرين', 'ar', 'ar', 5, true),
('OM', 'Oman', 'سلطنة عمان', 'ar', 'ar', 6, true),
('JO', 'Jordan', 'الأردن', 'ar', 'ar', 7, true),
('LB', 'Lebanon', 'لبنان', 'ar', 'ar', 8, true),
('SY', 'Syria', 'سوريا', 'ar', 'ar', 9, true),
('IQ', 'Iraq', 'العراق', 'ar', 'ar', 10, true),
('EG', 'Egypt', 'مصر', 'ar', 'ar', 11, true),
('SD', 'Sudan', 'السودان', 'ar', 'ar', 12, true),
('LY', 'Libya', 'ليبيا', 'ar', 'ar', 13, true),
('TN', 'Tunisia', 'تونس', 'ar', 'ar', 14, true),
('DZ', 'Algeria', 'الجزائر', 'ar', 'ar', 15, true),
('MA', 'Morocco', 'المغرب', 'ar', 'ar', 16, true),
('YE', 'Yemen', 'اليمن', 'ar', 'ar', 17, true),
('PS', 'Palestine', 'فلسطين', 'ar', 'ar', 18, true),
('MR', 'Mauritania', 'موريتانيا', 'ar', 'ar', 19, true),
('SO', 'Somalia', 'الصومال', 'ar', 'ar', 20, true);

-- Countries with specific worker languages (21-30)
INSERT INTO public.nationality_language_mapping (nationality_code, country_name_en, country_name_ar, visitor_language, worker_language, display_order, is_arab_country) VALUES
('PK', 'Pakistan', 'باكستان', 'en', 'ur', 21, false),
('IN', 'India', 'الهند', 'en', 'hi', 22, false),
('PH', 'Philippines', 'الفلبين', 'en', 'fil', 23, false),
('CN', 'China', 'الصين', 'en', 'zh', 24, false),
('BD', 'Bangladesh', 'بنغلاديش', 'en', 'en', 25, false),
('NP', 'Nepal', 'نيبال', 'en', 'en', 26, false),
('LK', 'Sri Lanka', 'سريلانكا', 'en', 'en', 27, false),
('ID', 'Indonesia', 'إندونيسيا', 'en', 'en', 28, false),
('MY', 'Malaysia', 'ماليزيا', 'en', 'en', 29, false),
('TH', 'Thailand', 'تايلاند', 'en', 'en', 30, false);

-- Other common nationalities (31+)
INSERT INTO public.nationality_language_mapping (nationality_code, country_name_en, country_name_ar, visitor_language, worker_language, display_order, is_arab_country) VALUES
('US', 'United States', 'الولايات المتحدة', 'en', 'en', 31, false),
('GB', 'United Kingdom', 'المملكة المتحدة', 'en', 'en', 32, false),
('CA', 'Canada', 'كندا', 'en', 'en', 33, false),
('AU', 'Australia', 'أستراليا', 'en', 'en', 34, false),
('DE', 'Germany', 'ألمانيا', 'en', 'en', 35, false),
('FR', 'France', 'فرنسا', 'en', 'en', 36, false),
('TR', 'Turkey', 'تركيا', 'en', 'en', 37, false),
('IR', 'Iran', 'إيران', 'en', 'en', 38, false),
('AF', 'Afghanistan', 'أفغانستان', 'en', 'en', 39, false),
('ET', 'Ethiopia', 'إثيوبيا', 'en', 'en', 40, false),
('KE', 'Kenya', 'كينيا', 'en', 'en', 41, false),
('NG', 'Nigeria', 'نيجيريا', 'en', 'en', 42, false),
('ZA', 'South Africa', 'جنوب أفريقيا', 'en', 'en', 43, false);

-- Create indexes for performance
CREATE INDEX idx_page_content_versions_tenant ON public.page_content_versions(tenant_id);
CREATE INDEX idx_page_content_versions_type_lang ON public.page_content_versions(page_type, language);
CREATE INDEX idx_page_content_versions_status ON public.page_content_versions(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_nationality_mapping_code ON public.nationality_language_mapping(nationality_code);
CREATE INDEX idx_page_audit_logs_tenant ON public.page_content_audit_logs(tenant_id);
CREATE INDEX idx_page_audit_logs_version ON public.page_content_audit_logs(page_version_id);

-- Create updated_at trigger for page_content_versions
CREATE TRIGGER update_page_content_versions_updated_at
BEFORE UPDATE ON public.page_content_versions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();