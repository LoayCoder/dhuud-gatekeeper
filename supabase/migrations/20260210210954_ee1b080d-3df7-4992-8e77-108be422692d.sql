CREATE OR REPLACE FUNCTION public.get_public_gate_pass_status(p_access_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass RECORD;
  v_items JSONB;
  v_branch RECORD;
  v_tenant RECORD;
BEGIN
  SELECT mgp.id, mgp.reference_number, mgp.pass_type,
    mgp.public_requester_name, mgp.public_requester_phone,
    mgp.public_requester_email, mgp.public_requester_company,
    mgp.material_description, mgp.quantity, mgp.vehicle_plate,
    mgp.driver_name, mgp.driver_mobile, mgp.start_date, mgp.end_date,
    mgp.purpose, mgp.notes, mgp.status, mgp.rejection_reason,
    mgp.entry_time, mgp.exit_time, mgp.created_at, mgp.updated_at,
    mgp.branch_id, mgp.tenant_id, mgp.qr_code_token
  INTO v_pass
  FROM material_gate_passes mgp
  WHERE mgp.public_access_token = p_access_token AND mgp.deleted_at IS NULL;

  IF v_pass IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Gate pass not found or access token expired');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', pi.id, 'item_name', pi.item_name, 'description', pi.description,
    'quantity', pi.quantity, 'unit', pi.unit
  ) ORDER BY pi.sort_order, pi.created_at), '[]'::JSONB)
  INTO v_items
  FROM public_gate_pass_items pi
  WHERE pi.gate_pass_id = v_pass.id AND pi.deleted_at IS NULL;

  SELECT b.id, b.name, b.location, b.address, b.contact_phone, b.contact_email
  INTO v_branch
  FROM branches b WHERE b.id = v_pass.branch_id AND b.deleted_at IS NULL;

  SELECT t.id, t.name, t.slug, t.logo_light_url, t.brand_color
  INTO v_tenant FROM tenants t WHERE t.id = v_pass.tenant_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'gate_pass', jsonb_build_object(
      'id', v_pass.id, 'reference_number', v_pass.reference_number,
      'pass_type', v_pass.pass_type,
      'requester_name', v_pass.public_requester_name,
      'requester_phone', v_pass.public_requester_phone,
      'requester_email', v_pass.public_requester_email,
      'requester_company', v_pass.public_requester_company,
      'material_description', v_pass.material_description,
      'quantity', v_pass.quantity, 'vehicle_plate', v_pass.vehicle_plate,
      'driver_name', v_pass.driver_name, 'driver_mobile', v_pass.driver_mobile,
      'start_date', v_pass.start_date, 'end_date', v_pass.end_date,
      'purpose', v_pass.purpose, 'notes', v_pass.notes,
      'status', v_pass.status, 'rejection_reason', v_pass.rejection_reason,
      'entry_time', v_pass.entry_time, 'exit_time', v_pass.exit_time,
      'qr_code_token', v_pass.qr_code_token,
      'created_at', v_pass.created_at, 'updated_at', v_pass.updated_at
    ),
    'items', v_items,
    'branch', jsonb_build_object(
      'id', v_branch.id, 'name', v_branch.name, 'location', v_branch.location,
      'address', v_branch.address, 'contact_phone', v_branch.contact_phone,
      'contact_email', v_branch.contact_email
    ),
    'tenant', jsonb_build_object(
      'id', v_tenant.id, 'name', v_tenant.name, 'slug', v_tenant.slug,
      'logo_url', v_tenant.logo_light_url, 'brand_color', v_tenant.brand_color
    )
  );
END;
$$;