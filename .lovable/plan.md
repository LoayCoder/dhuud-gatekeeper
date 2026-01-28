

# Observation Action Workflow - Same Issues Confirmed

## Analysis Summary

I verified the database and confirmed that **observations have the exact same issues** as incidents:

### Evidence from Database

**Corrective Actions Missing branch_id:**
| Action ID | Parent Observation | Observation branch_id | Action branch_id |
|-----------|-------------------|----------------------|------------------|
| 9d6b0e8b-... | OBS-2026-0002 | RGC | **NULL** |
| 5192a03c-... | OBS-2026-0003 | RGC | **NULL** |
| cb4c8396-... | OBS-2026-0003 | RGC | **NULL** |

**has_hsse_incident_access Function:**
```sql
-- Current function (contractor_consultant is MISSING):
SELECT has_role(_user_id, 'admin'::app_role) 
  OR has_role_by_code(_user_id, 'hsse_officer')
  OR has_role_by_code(_user_id, 'hsse_investigator')
  OR has_role_by_code(_user_id, 'hsse_manager')
  OR has_role_by_code(_user_id, 'incident_analyst')
  OR has_role_by_code(_user_id, 'emergency_response_leader')
  OR has_role_by_code(_user_id, 'manager')
  OR has_role_by_code(_user_id, 'department_representative')
  -- ❌ contractor_consultant is NOT here
```

---

## Confirmed: Same Fix Applies to Both

Both incidents and observations use the same code paths:
- `useCreateCorrectiveAction` hook in `use-investigation.ts`
- `has_hsse_incident_access` database function
- `corrective_actions` table with same RLS policies

---

## Implementation Plan

### 1. Update Frontend Hook: Add branch_id to Action Creation

**File:** `src/hooks/use-investigation.ts`

**Change:** Fetch the incident's branch_id before inserting the action:

```typescript
export function useCreateCorrectiveAction() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (action: {
      incident_id: string;
      title: string;
      description?: string;
      assigned_to?: string;
      responsible_department_id?: string;
      start_date?: string;
      due_date?: string;
      priority?: string;
      action_type?: string;
      category?: string;
      linked_root_cause_id?: string;
      linked_cause_type?: string;
    }) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error('User not authenticated');
      }

      // Fetch incident's branch_id for proper branch isolation
      const { data: incident } = await supabase
        .from('incidents')
        .select('branch_id')
        .eq('id', action.incident_id)
        .single();

      const { data, error } = await supabase
        .from('corrective_actions')
        .insert({
          ...action,
          tenant_id: profile.tenant_id,
          branch_id: incident?.branch_id || null, // Include branch_id
          status: 'assigned',
        })
        .select()
        .single();

      if (error) throw error;
      // ... rest of function unchanged
    },
    // ... callbacks unchanged
  });
}
```

---

### 2. Database Migration: Add contractor_consultant to Access Function

**SQL Migration:**

```sql
-- Add contractor_consultant to has_hsse_incident_access function
-- This grants explicit HSSE-level incident access to Contractor Consultants
CREATE OR REPLACE FUNCTION public.has_hsse_incident_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'admin'::app_role) 
    OR has_role_by_code(_user_id, 'hsse_officer')
    OR has_role_by_code(_user_id, 'hsse_investigator')
    OR has_role_by_code(_user_id, 'hsse_manager')
    OR has_role_by_code(_user_id, 'incident_analyst')
    OR has_role_by_code(_user_id, 'emergency_response_leader')
    OR has_role_by_code(_user_id, 'manager')
    OR has_role_by_code(_user_id, 'department_representative')
    OR has_role_by_code(_user_id, 'contractor_consultant')
$$;
```

---

### 3. Optional: Fix Existing Actions with NULL branch_id

**Data Fix (one-time):**

```sql
-- Backfill branch_id for existing corrective actions
UPDATE corrective_actions ca
SET branch_id = i.branch_id
FROM incidents i
WHERE ca.incident_id = i.id
  AND ca.branch_id IS NULL
  AND i.branch_id IS NOT NULL
  AND ca.deleted_at IS NULL;
```

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/hooks/use-investigation.ts` | Frontend | Add branch_id from incident when creating actions |
| Database Migration | SQL | Add `contractor_consultant` to `has_hsse_incident_access` |
| Database (optional) | SQL | Backfill existing NULL branch_id values |

---

## Testing After Implementation

### For Observations:
1. Log in as Ruyuf (Contractor Consultant)
2. Open a contractor observation (e.g., OBS-2026-0048) in `expert_screening` status
3. Navigate to Actions tab
4. Create a new corrective action
5. Verify action is created with correct `branch_id` (RGC)

### For Incidents:
1. Log in as HSSE Investigator
2. Open an incident in `investigation_in_progress` status
3. Create a new corrective action
4. Verify action is created with correct `branch_id`

---

## Impact Assessment

| Change | Risk | Scope |
|--------|------|-------|
| Add branch_id to action insert | Low | Improves data integrity for branch reporting |
| Add contractor_consultant to access function | Low | Explicitly grants access already working via fallback |
| Backfill existing NULL branch_id | Low | One-time data cleanup |

