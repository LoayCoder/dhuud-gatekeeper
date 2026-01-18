-- Copy organization structure (divisions, departments, sections) from RGC to DGC branch

DO $$
DECLARE
  v_tenant_id uuid;
  v_dgc_branch_id uuid := '79e21aa0-40b3-41cd-9f46-337b1cc8047e';
  v_rgc_branch_id uuid := '8a74df12-6b49-47db-a5a4-ae4d4ef0e7d0';
  v_division_mapping jsonb := '{}';
  v_department_mapping jsonb := '{}';
  rec record;
  v_new_division_id uuid;
  v_new_department_id uuid;
BEGIN
  -- Get tenant_id from existing branch
  SELECT tenant_id INTO v_tenant_id 
  FROM branches WHERE id = v_rgc_branch_id;
  
  -- 1. Copy divisions from RGC to DGC
  FOR rec IN 
    SELECT id, name FROM divisions 
    WHERE branch_id = v_rgc_branch_id AND deleted_at IS NULL
  LOOP
    v_new_division_id := gen_random_uuid();
    INSERT INTO divisions (id, name, branch_id, tenant_id, created_at)
    VALUES (v_new_division_id, rec.name, v_dgc_branch_id, v_tenant_id, now());
    
    -- Store mapping: old_id -> new_id
    v_division_mapping := v_division_mapping || 
      jsonb_build_object(rec.id::text, v_new_division_id::text);
  END LOOP;
  
  -- 2. Copy departments (linked to new DGC divisions)
  FOR rec IN 
    SELECT id, name, division_id FROM departments 
    WHERE branch_id = v_rgc_branch_id AND deleted_at IS NULL
  LOOP
    v_new_department_id := gen_random_uuid();
    INSERT INTO departments (id, name, division_id, branch_id, tenant_id, created_at)
    VALUES (
      v_new_department_id, 
      rec.name, 
      (v_division_mapping->>rec.division_id::text)::uuid,
      v_dgc_branch_id, 
      v_tenant_id,
      now()
    );
    
    v_department_mapping := v_department_mapping || 
      jsonb_build_object(rec.id::text, v_new_department_id::text);
  END LOOP;
  
  -- 3. Copy sections (linked to new DGC departments)
  FOR rec IN 
    SELECT id, name, department_id FROM sections 
    WHERE branch_id = v_rgc_branch_id AND deleted_at IS NULL
  LOOP
    INSERT INTO sections (id, name, department_id, branch_id, tenant_id, created_at)
    VALUES (
      gen_random_uuid(), 
      rec.name, 
      (v_department_mapping->>rec.department_id::text)::uuid,
      v_dgc_branch_id, 
      v_tenant_id,
      now()
    );
  END LOOP;
END;
$$;