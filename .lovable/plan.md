

# Fix Gate Pass Approver Selection - Bug & Feature Implementation

## Root Cause Identified

The approver list is empty because of a **bug** in `use-dept-approvers.ts`:

```typescript
// Line 61 - BUG: This column does NOT exist!
.is("deleted_at", null)
```

The `user_role_assignments` table has these columns:
- `id`, `user_id`, `role_id`, `tenant_id`, `assigned_at`, `assigned_by`, `branch_id`, `site_id`

**No `deleted_at` column exists**, causing the query to fail silently and return empty results.

---

## Data Verification

The database contains the correct data:
- **Golf Club Management Department** exists (`e1a211c8-2dca-476d-aac2-147996346783`)
- **Khalid Al Shuhail** (`dcf0e39d-d2df-4c14-89bc-7b8ebab82b32`):
  - Has `department_representative` role
  - Assigned to Golf Club Management department
  - Should appear in the approver dropdown

---

## Implementation Plan

### Phase 1: Create New Hook for Golf Club Management Approvers

Per the original approved plan, create `useGolfClubMgmtApprovers` hook that:
1. Finds "Golf Club Management" department
2. Finds users with `department_representative` or `department_manager` role
3. Filters to only those assigned to Golf Club Management
4. **Does NOT use non-existent `deleted_at` column**

**New File: `src/hooks/contractor-management/use-golf-club-mgmt-approvers.ts`**

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GolfClubMgmtApprover {
  id: string;
  full_name: string;
  job_title: string | null;
}

export function useGolfClubMgmtApprovers() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["golf-club-mgmt-approvers", tenantId],
    queryFn: async (): Promise<GolfClubMgmtApprover[]> => {
      if (!tenantId) return [];

      // 1. Find Golf Club Management department
      const { data: golfClubDepts } = await supabase
        .from("departments")
        .select("id")
        .eq("tenant_id", tenantId)
        .or("name.eq.Golf Club Management,name.ilike.%golf%club%management%")
        .is("deleted_at", null);

      if (!golfClubDepts?.length) return [];
      const deptIds = golfClubDepts.map(d => d.id);

      // 2. Find users with department_representative or department_manager role
      // NOTE: user_role_assignments does NOT have deleted_at column
      const { data: roleAssignments } = await supabase
        .from("user_role_assignments")
        .select("user_id, roles!inner(code)")
        .eq("tenant_id", tenantId);

      if (!roleAssignments) return [];

      const repManagerUserIds = roleAssignments
        .filter((item) => {
          const roleCode = (item.roles as { code: string })?.code;
          return roleCode === "department_representative" || roleCode === "department_manager";
        })
        .map((item) => item.user_id);

      if (repManagerUserIds.length === 0) return [];

      // 3. Get profiles of these users who are assigned to Golf Club Management
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, job_title, assigned_department_id")
        .in("id", repManagerUserIds)
        .in("assigned_department_id", deptIds)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("full_name");

      return (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name || "Unknown",
        job_title: p.job_title,
      }));
    },
    enabled: !!tenantId,
  });
}
```

---

### Phase 2: Update Create.tsx to Use New Hook

**File: `src/pages/my-gate-passes/Create.tsx`**

Change import and usage:

```typescript
// Line 40: Change from
import { useDeptApprovers } from "@/hooks/contractor-management/use-dept-approvers";
// To
import { useGolfClubMgmtApprovers } from "@/hooks/contractor-management/use-golf-club-mgmt-approvers";

// Line 89: Change from
const { data: approvers, isLoading: loadingApprovers } = useDeptApprovers();
// To
const { data: approvers, isLoading: loadingApprovers } = useGolfClubMgmtApprovers();
```

---

### Phase 3: Fix the Existing useDeptApprovers Hook (Bonus)

Also fix the bug in `use-dept-approvers.ts` for other places that might use it:

```typescript
// Line 57-61: Remove the invalid .is("deleted_at", null)
const { data: roleAssignments } = await supabase
  .from("user_role_assignments")
  .select("user_id, roles!inner(code)")
  .eq("tenant_id", tenantId);
  // Removed: .is("deleted_at", null) - column does not exist!
```

---

### Phase 4: Export New Hook

**File: `src/hooks/contractor-management/index.ts`**

Add export:
```typescript
export * from "./use-golf-club-mgmt-approvers";
```

---

## Files to Create/Modify

| File | Action | Description |
|:-----|:-------|:------------|
| `src/hooks/contractor-management/use-golf-club-mgmt-approvers.ts` | **Create** | New hook for Golf Club Management approvers |
| `src/pages/my-gate-passes/Create.tsx` | **Modify** | Use new hook instead of `useDeptApprovers` |
| `src/hooks/contractor-management/use-dept-approvers.ts` | **Modify** | Remove invalid `.is("deleted_at", null)` |
| `src/hooks/contractor-management/index.ts` | **Modify** | Export new hook |

---

## Expected Result

After this fix:
- **Khalid Al Shuhail** (Golf Club Management Department Representative) will appear in the approver dropdown
- Any future department representatives/managers assigned to Golf Club Management will also appear
- The existing `useDeptApprovers` hook will work correctly for other features that use it

---

## Technical Summary

| Issue | Cause | Fix |
|:------|:------|:----|
| Empty approver list | Query uses non-existent `deleted_at` column on `user_role_assignments` | Remove the invalid filter + create specific Golf Club Management hook |


