-- Fix security definer view issue by recreating as security invoker
DROP VIEW IF EXISTS public.asset_tco_summary;

CREATE VIEW public.asset_tco_summary 
WITH (security_invoker = true)
AS
SELECT 
  a.id AS asset_id,
  a.tenant_id,
  a.asset_code,
  a.name,
  a.purchase_price AS acquisition_cost,
  COALESCE(SUM(CASE WHEN ct.transaction_type = 'maintenance' THEN ct.amount END), 0) AS maintenance_cost,
  COALESCE(SUM(CASE WHEN ct.transaction_type = 'repair' THEN ct.amount END), 0) AS repair_cost,
  COALESCE(SUM(CASE WHEN ct.transaction_type = 'energy' THEN ct.amount END), 0) AS energy_cost,
  COALESCE(SUM(CASE WHEN ct.transaction_type = 'insurance' THEN ct.amount END), 0) AS insurance_cost,
  COALESCE(SUM(CASE WHEN ct.transaction_type = 'upgrade' THEN ct.amount END), 0) AS upgrade_cost,
  COALESCE(SUM(CASE WHEN ct.transaction_type = 'other' THEN ct.amount END), 0) AS other_cost,
  COALESCE(a.purchase_price, 0) + COALESCE(SUM(ct.amount), 0) AS total_cost_of_ownership,
  EXTRACT(YEAR FROM age(CURRENT_DATE, a.installation_date)) * 12 
    + EXTRACT(MONTH FROM age(CURRENT_DATE, a.installation_date)) AS months_in_service,
  CASE 
    WHEN a.installation_date IS NOT NULL AND 
         EXTRACT(YEAR FROM age(CURRENT_DATE, a.installation_date)) * 12 + EXTRACT(MONTH FROM age(CURRENT_DATE, a.installation_date)) > 0
    THEN (COALESCE(a.purchase_price, 0) + COALESCE(SUM(ct.amount), 0)) / 
         (EXTRACT(YEAR FROM age(CURRENT_DATE, a.installation_date)) * 12 + EXTRACT(MONTH FROM age(CURRENT_DATE, a.installation_date)))
    ELSE 0
  END AS cost_per_month
FROM public.hsse_assets a
LEFT JOIN public.asset_cost_transactions ct ON a.id = ct.asset_id AND ct.deleted_at IS NULL
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.tenant_id, a.asset_code, a.name, a.purchase_price, a.installation_date;