
# Comprehensive Reporting Health Check - Complete Fix Plan

## Executive Summary

After thorough analysis, I found **6 critical issues** that are causing errors across the incident and observation reporting system. These need to be fixed for the system to function correctly.

---

## Critical Issues Found

### Issue 1: `ura.created_at` Column Does Not Exist (HIGH PRIORITY)
**Error:** `column ura.created_at does not exist`
**Root Cause:** The `user_role_assignments` table uses `assigned_at`, NOT `created_at`
**Affected Functions:**
- `auto_route_observation_on_submit` (TRIGGER - blocks observation submission)
- `consultant_complete_screening` (RPC)

**Fix Required:** Replace `ura.created_at` with `ura.assigned_at` in both functions

---

### Issue 2: Missing `incident_status` Enum Values (HIGH PRIORITY)
**Error:** `invalid input value for enum incident_status: "pending_department_manager_violation_approval"`
**Root Cause:** The contractor violation workflow statuses are NOT in the `incident_status` enum

**Missing Statuses (9 total):**
1. `pending_department_manager_violation_approval`
2. `pending_contract_controller_approval`
3. `pending_contractor_site_rep_approval`
4. `pending_hsse_violation_review`
5. `contractor_violation_enforced`
6. `contractor_violation_approved_fine`
7. `contractor_violation_cancelled`
8. `contractor_violation_warning`
9. `contractor_violation_terminated`

**Fix Required:** Add these enum values to `incident_status` type

---

### Issue 3: `security_zones.name` Column Does Not Exist (MEDIUM)
**Error:** `column security_zones_1.name does not exist`
**Root Cause:** The `security_zones` table uses `zone_name`, NOT `name`
**Affected:** Some query or function is using the wrong column name

---

### Issue 4: `trusted_devices.device_fingerprint` Column Does Not Exist (MEDIUM)
**Error:** `column trusted_devices.device_fingerprint does not exist`
**Root Cause:** The `trusted_devices` table does NOT have a `device_fingerprint` column
**Actual Columns:** `device_token`, `device_name`, `user_agent`, etc.

---

### Issue 5: `branches.is_active` / `departments.is_active` Do Not Exist (MEDIUM)
**Error:** `column branches.is_active does not exist`
**Root Cause:** The `branches` and `departments` tables do NOT have `is_active` columns
**Affected:** Some database function or query is referencing these non-existent columns

---

### Issue 6: `witness_statements.status` Column Does Not Exist (LOW)
**Error:** `column witness_statements.status does not exist`
**Root Cause:** The `witness_statements` table does not have a `status` column
**Affected:** `src/lib/workflow-validation.ts` references this column

---

## Implementation Plan

### Step 1: Fix Database Functions with `ura.created_at` (CRITICAL - Blocks Submissions)

**SQL Migration:**

```sql
-- Fix auto_route_observation_on_submit function
CREATE OR REPLACE FUNCTION public.auto_route_observation_on_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigned_to UUID;
  v_new_status TEXT;
  v_branch_id UUID;
BEGIN
  IF NEW.event_type != 'observation' OR NEW.status != 'submitted' THEN
    RETURN NEW;
  END IF;

  IF NEW.approval_manager_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_branch_id := COALESCE(NEW.branch_id, 
    (SELECT branch_id FROM sites WHERE id = NEW.site_id AND deleted_at IS NULL));

  IF NEW.related_contractor_company_id IS NOT NULL THEN
    SELECT ura.user_id INTO v_assigned_to
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    JOIN profiles p ON p.id = ura.user_id
    WHERE ura.tenant_id = NEW.tenant_id
      AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
      AND r.code = 'contractor_consultant'
      AND r.is_active = true
      AND p.deleted_at IS NULL
    ORDER BY 
      CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END,
      ura.assigned_at  -- ✅ Changed from ura.created_at
    LIMIT 1;
    
    IF v_assigned_to IS NOT NULL THEN
      v_new_status := 'expert_screening';
    END IF;
  END IF;

  IF v_assigned_to IS NULL THEN
    SELECT ura.user_id INTO v_assigned_to
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    JOIN profiles p ON p.id = ura.user_id
    WHERE ura.tenant_id = NEW.tenant_id
      AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
      AND r.code = 'department_representative'
      AND r.is_active = true
      AND p.deleted_at IS NULL
    ORDER BY 
      CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END,
      ura.assigned_at  -- ✅ Changed from ura.created_at
    LIMIT 1;
    
    v_new_status := 'pending_dept_rep_approval';
  END IF;

  IF v_assigned_to IS NOT NULL THEN
    NEW.approval_manager_id := v_assigned_to;
    NEW.status := v_new_status;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix consultant_complete_screening function
CREATE OR REPLACE FUNCTION public.consultant_complete_screening(p_incident_id uuid, p_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_old_status text;
  v_new_status text;
  v_user_id uuid;
  v_site_client_id uuid;
  v_branch_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  SELECT tenant_id, status, branch_id INTO v_tenant_id, v_old_status, v_branch_id
  FROM incidents
  WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  IF v_old_status NOT IN ('pending_consultant_screening', 'expert_screening') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not in consultant screening stage');
  END IF;
  
  SELECT ura.user_id INTO v_site_client_id
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  JOIN profiles p ON p.id = ura.user_id
  WHERE ura.tenant_id = v_tenant_id
    AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
    AND r.code = 'site_client'
    AND r.is_active = true
    AND p.deleted_at IS NULL
  ORDER BY 
    CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END,
    ura.assigned_at  -- ✅ Changed from ura.created_at
  LIMIT 1;
  
  v_new_status := 'pending_site_client_approval';
  
  UPDATE incidents
  SET 
    status = v_new_status,
    approval_manager_id = COALESCE(v_site_client_id, approval_manager_id),
    consultant_screened_at = now(),
    consultant_screening_notes = p_notes,
    updated_at = now()
  WHERE id = p_incident_id;
  
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, new_value)
  VALUES (
    p_incident_id, 
    v_tenant_id, 
    v_user_id, 
    'consultant_screening_complete',
    jsonb_build_object(
      'previous_status', v_old_status,
      'new_status', v_new_status,
      'routed_to', 'site_client',
      'notes', p_notes
    )
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'routed_to', 'site_client');
END;
$$;
```

---

### Step 2: Add Missing `incident_status` Enum Values

**SQL Migration:**

```sql
-- Add missing contractor violation workflow statuses
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_department_manager_violation_approval';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_contract_controller_approval';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_contractor_site_rep_approval';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_hsse_violation_review';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'contractor_violation_enforced';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'contractor_violation_approved_fine';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'contractor_violation_cancelled';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'contractor_violation_warning';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'contractor_violation_terminated';
```

---

### Step 3: Fix Frontend `workflow-validation.ts`

**File:** `src/lib/workflow-validation.ts`
**Issue:** References `witness_statements.status` which doesn't exist
**Fix:** Remove the status filter since witness_statements doesn't have this column

```typescript
// Line 24-28 - Remove .eq('status', 'approved') filter
const { data: witness, error: witError } = await supabase
  .from('witness_statements')
  .select('id')
  .eq('incident_id', incidentId);
  // Note: Removed status filter - column doesn't exist
```

---

## Files to Modify

| File/Component | Change Type | Description |
|----------------|-------------|-------------|
| Database Migration | SQL | Fix `auto_route_observation_on_submit` - change `ura.created_at` to `ura.assigned_at` |
| Database Migration | SQL | Fix `consultant_complete_screening` - change `ura.created_at` to `ura.assigned_at` |
| Database Migration | SQL | Add 9 missing `incident_status` enum values for contractor violation workflow |
| `src/lib/workflow-validation.ts` | Frontend | Remove invalid `status` filter from witness_statements query |

---

## Testing After Implementation

1. **Observation Submission Test:**
   - Create a new observation on `/incidents/report`
   - Select site and fill in details
   - Submit and verify no `ura.created_at` error
   - Verify routing to correct approver

2. **Contractor Violation Workflow Test:**
   - Submit a contractor observation with violation
   - Verify status transitions work without enum errors
   - Test approval flow through all stages

3. **General Health Check:**
   - Navigate to incident list
   - View incident details
   - Check no column errors in console

---

## Risk Assessment

| Change | Risk | Impact |
|--------|------|--------|
| Fix `ura.created_at` → `ura.assigned_at` | Low | Fixes submission blocking error |
| Add enum values | Low | Enables contractor violation workflow |
| Remove witness_statements.status filter | Low | Removes dead code reference |
