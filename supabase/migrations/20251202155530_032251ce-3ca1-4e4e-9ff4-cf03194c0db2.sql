-- Add dark mode color columns
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS brand_color_dark text DEFAULT '217 91% 60%',
ADD COLUMN IF NOT EXISTS secondary_color_dark text;

-- Rename existing asset columns to light variants and add dark variants
-- Logo: logo_url becomes logo_light_url
ALTER TABLE public.tenants RENAME COLUMN logo_url TO logo_light_url;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_dark_url text;

-- Sidebar icon: sidebar_icon_url becomes sidebar_icon_light_url  
ALTER TABLE public.tenants RENAME COLUMN sidebar_icon_url TO sidebar_icon_light_url;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS sidebar_icon_dark_url text;

-- App icon: app_icon_url becomes app_icon_light_url
ALTER TABLE public.tenants RENAME COLUMN app_icon_url TO app_icon_light_url;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS app_icon_dark_url text;