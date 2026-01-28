
# Comprehensive Contractor Observation Workflow Fix

## Problem Summary

Based on thorough database analysis:

1. **44 total contractor observations** exist (not just 5)
2. **36 are stuck** in `submitted` status with `approval_manager_id = NULL`
3. **Ruyuf Al Otaibi's contractor_consultant role** has `branch_id = NULL` (should be RGC: `8a74df12-6b49-47db-a5a4-ae4d4ef0e7d0`)
4. **Current workflow incorrectly routes** Level 3+ observations to HSSE Expert automatically
5. **Contractor Consultant should handle ALL severity levels** directly, with optional manual escalation to HSSE Expert via button click

---

## Changes Required

### 1. Fix Ruyuf's Role Assignment (Data Fix)

Update the `contractor_consultant` role assignment to have correct `branch_id = RGC`.

**SQL:**
```sql
UPDATE user_role_assignments
SET branch_id = '8a74df12-6b49-47db-a5a4-ae4d4ef0e7d0'
WHERE user_id = 'dc14c4cd-22c0-4d92-90b1-337c379d0cc2'
  AND role_id = (SELECT id FROM roles WHERE code = 'contractor_consultant');
```

---

### 2. Fix ALL Stuck Contractor Observations (Data Fix)

Route all 36+ stuck contractor observations to the Contractor Consultant.

**SQL:**
```sql
UPDATE incidents
SET 
  status = 'expert_screening',
  approval_manager_id = 'dc14c4cd-22c0-4d92-90b1-337c379d0cc2',  -- Ruyuf
  updated_at = NOW()
WHERE status = 'submitted'
  AND event_type = 'observation'
  AND related_contractor_company_id IS NOT NULL
  AND approval_manager_id IS NULL
  AND deleted_at IS NULL;
```

---

### 3. Fix Database Function: Remove Automatic HSSE Expert Routing

Modify `consultant_complete_screening` function to route ALL severity levels directly to Site Client (not HSSE Expert automatically). HSSE Expert involvement will only happen when Consultant explicitly clicks "Escalate to HSSE" button.

**Current Logic (Wrong):**
```sql
-- Level 1-2 → Site Client
-- Level 3+ → HSSE Expert (automatic)
```

**New Logic (Correct):**
```sql
-- ALL Levels → Site Client (default)
-- HSSE Expert → Only via explicit escalation button
```

**Updated Function:**
```sql
CREATE OR REPLACE FUNCTION public.consultant_complete_screening(
  p_incident_id uuid,
  p_notes text DEFAULT NULL
)
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
BEGIN
  v_user_id := auth.uid();
  
  SELECT tenant_id, status INTO v_tenant_id, v_old_status
  FROM incidents
  WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Accept both statuses for consultant screening stage
  IF v_old_status NOT IN ('pending_consultant_screening', 'expert_screening') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not in consultant screening stage');
  END IF;
  
  -- ALL severity levels go to Site Client
  -- HSSE Expert is ONLY via explicit escalation
  v_new_status := 'pending_site_client_approval';
  
  UPDATE incidents
  SET 
    status = v_new_status,
    consultant_screened_at = now(),
    consultant_screening_notes = p_notes,
    updated_at = now()
  WHERE id = p_incident_id;
  
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
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

### 4. Update Frontend: ConsultantReviewCard.tsx

Remove the severity-based UI restrictions and messaging. Allow Consultant to:
- Take action on ALL severity levels (L1-L5)
- Close on Spot for ALL levels (not just L1-2)
- Submit to Site Client (always, not conditionally to HSSE)
- Escalate to HSSE Expert via button (optional, manual)

**Changes:**
- Remove `isHighSeverity` conditional styling
- Remove "Requires HSSE Review" badge for L3+
- Change submit button to always say "Submit to Site Client"
- Keep "Escalate to HSSE" as an optional action
- Allow "Close on Spot" for all severity levels

---

### 5. Update Frontend: UnifiedWorkflowTracker.tsx

Remove the conditional "Expert Review" step for contractor observations. The unified workflow for contractor observations should be:

**Simplified Flow:**
```
Submitted → Consultant Review → Site Client Approval → Actions → Closed
```

**Changes:**
- Remove `isLevel3Plus` conditional logic for contractor path
- Remove "Expert Review" step from contractor workflow (HSSE is optional escalation only)
- Keep "Expert Review" step for non-contractor observations if needed

---

### 6. Update use-consultant-actions.ts

Remove the severity restriction for Close on Spot:
- Currently only allows L1-L2
- Should allow ALL severity levels for contractor observations

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| Database (data fix) | SQL UPDATE | Fix Ruyuf's branch_id assignment |
| Database (data fix) | SQL UPDATE | Route 36+ stuck observations to Ruyuf |
| Database (migration) | SQL Function | Update consultant_complete_screening to always route to Site Client |
| `src/components/investigation/contractor-workflow/ConsultantReviewCard.tsx` | Modify | Remove severity-based restrictions |
| `src/components/investigation/UnifiedWorkflowTracker.tsx` | Modify | Remove Expert Review step for contractors |
| `src/hooks/use-consultant-actions.ts` | Modify | Allow Close on Spot for all severity levels |
| `src/hooks/use-consultant-workflow.ts` | Modify | Update toast messages |

---

## Workflow Diagram (After Fix)

```text
CONTRACTOR OBSERVATION WORKFLOW (All Severity Levels)
=====================================================

  [Reporter Submits]
         │
         ▼
  ┌──────────────────┐
  │  SUBMITTED       │
  │  (auto-route)    │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────────────────────┐
  │  CONTRACTOR CONSULTANT           │
  │  (expert_screening status)       │
  │                                  │
  │  Actions Available:              │
  │  • Create Corrective Actions     │
  │  • Add Review Notes              │
  │  • Close on Spot (any level)     │
  │  • Submit to Site Client         │
  │  • Escalate to HSSE (optional)   │
  └────────┬─────────────────────────┘
           │
    ┌──────┴──────────────────┐
    │                         │
    ▼                         ▼
  [Submit]              [Escalate to HSSE]
    │                         │
    ▼                         ▼
  ┌──────────────┐    ┌──────────────┐
  │ SITE CLIENT  │    │ HSSE MANAGER │
  │ APPROVAL     │    │ ESCALATION   │
  └──────┬───────┘    └──────────────┘
         │
         ▼
  ┌──────────────────┐
  │  CONTRACTOR      │
  │  IMPLEMENTATION  │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  CLOSED          │
  └──────────────────┘
```

---

## Testing After Implementation

1. **Data Fixes:**
   - Verify Ruyuf has `branch_id = RGC` for contractor_consultant role
   - Verify all 36+ stuck observations are now in `expert_screening` with Ruyuf assigned

2. **Routing Test:**
   - Create new Level 1, 2, 3, 4, 5 observations against contractors
   - All should route to Contractor Consultant with `expert_screening` status

3. **Consultant Actions Test:**
   - Log in as Ruyuf (Contractor Consultant)
   - Verify all 36+ observations appear in queue
   - Verify can Close on Spot for ANY severity level
   - Verify Submit always goes to Site Client
   - Verify Escalate button sends to HSSE Manager

4. **UI Test:**
   - Verify no "Requires HSSE Review" badge appears
   - Verify workflow tracker shows: Submitted → Consultant → Site Client → Actions → Closed
