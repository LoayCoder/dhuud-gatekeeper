
# Fix: Gate Pass Creation Access Control

## Problem Identified

The Gate Pass system currently allows **any authenticated user within a tenant** to create gate passes due to:

1. **Overly permissive RLS policy** - `material_gate_passes_tenant_rls` grants `ALL` operations to any user in the same tenant
2. **Missing role validation at insert time** - No server-side check for who can create gate passes
3. **UI-only checks are bypassable** - Dashboard hides button based on role but doesn't enforce at backend

---

## Intended Gate Pass Creation Rules

Based on the approved dual workflow:

| User Type | Can Create External (Contractor) Pass | Can Create Internal Pass |
|:----------|:-------------------------------------|:------------------------|
| Contractor Representative | Yes (for their company) | No |
| Internal Employee | No | Yes |
| Department Representative | No | Yes |
| Contractor Admin | Yes (all companies) | Yes |
| Admin | Yes | Yes |

---

## Implementation Plan

### Phase 1: Database - Create Validation Function

Create an RPC function `can_create_gate_pass` that validates:
- User's role and type
- For contractor reps: Must be linked to a contractor company
- For internal employees: Must have `user_type = 'employee'`

```sql
CREATE OR REPLACE FUNCTION can_create_gate_pass(
  p_user_id UUID,
  p_is_internal_request BOOLEAN,
  p_company_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_type TEXT;
  v_is_contractor_rep BOOLEAN;
  v_is_admin BOOLEAN;
  v_has_contractor_admin BOOLEAN;
BEGIN
  -- Get user type
  SELECT user_type INTO v_user_type FROM profiles WHERE id = p_user_id;
  
  -- Check if admin
  SELECT is_admin(p_user_id) INTO v_is_admin;
  IF v_is_admin THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;
  
  -- Check if contractor admin
  SELECT has_contractor_admin_access(p_user_id) INTO v_has_contractor_admin;
  IF v_has_contractor_admin THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;
  
  -- INTERNAL REQUEST: Only employees can create
  IF p_is_internal_request THEN
    IF v_user_type = 'employee' THEN
      RETURN jsonb_build_object('allowed', true);
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'Only employees can create internal gate passes');
    END IF;
  END IF;
  
  -- EXTERNAL REQUEST: Only contractor reps for their company
  SELECT EXISTS (
    SELECT 1 FROM contractor_representatives cr
    WHERE cr.user_id = p_user_id 
      AND (p_company_id IS NULL OR cr.company_id = p_company_id)
      AND cr.deleted_at IS NULL
  ) INTO v_is_contractor_rep;
  
  IF v_is_contractor_rep THEN
    RETURN jsonb_build_object('allowed', true);
  ELSE
    RETURN jsonb_build_object('allowed', false, 'reason', 'Only contractor representatives can create external gate passes');
  END IF;
END;
$$;
```

### Phase 2: Database - Fix RLS Policy

Replace the overly permissive `material_gate_passes_tenant_rls` policy with specific role-based policies:

```sql
-- Drop the overly permissive tenant-wide policy
DROP POLICY IF EXISTS "material_gate_passes_tenant_rls" ON material_gate_passes;

-- Create specific INSERT policy with validation
CREATE POLICY "Users can create gate passes based on role" 
ON material_gate_passes
FOR INSERT
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND requested_by = auth.uid()
  AND (
    -- Admins can create any pass
    is_admin(auth.uid())
    -- OR Contractor admin can create any pass
    OR has_contractor_admin_access(auth.uid())
    -- OR Internal request by employee
    OR (is_internal_request = true AND (
      SELECT user_type FROM profiles WHERE id = auth.uid()
    ) = 'employee')
    -- OR External request by contractor rep for their company
    OR (is_internal_request = false AND EXISTS (
      SELECT 1 FROM contractor_representatives cr
      WHERE cr.user_id = auth.uid()
        AND cr.company_id = material_gate_passes.company_id
        AND cr.deleted_at IS NULL
    ))
  )
);

-- Create SELECT policy for users to see their own passes
CREATE POLICY "Users can view own gate passes"
ON material_gate_passes
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (
    -- Requester can always see their own passes
    requested_by = auth.uid()
    -- Approvers can see passes they need to approve
    OR approval_from_id = auth.uid()
    -- Admins can see all
    OR is_admin(auth.uid())
    -- Contractor admins can see all
    OR has_contractor_admin_access(auth.uid())
  )
);
```

### Phase 3: Frontend - Add Creation Validation Hook

Create a new hook to check if the current user can create gate passes:

**File: `src/hooks/contractor-management/use-can-create-gate-pass.ts`**

```typescript
export function useCanCreateGatePass() {
  const { user, profile } = useAuth();
  
  return useQuery({
    queryKey: ["can-create-gate-pass", user?.id],
    queryFn: async () => {
      if (!user?.id) return { canCreate: false, canCreateInternal: false, canCreateExternal: false };
      
      // Check admin
      const { data: isAdmin } = await supabase.rpc('is_admin', { p_user_id: user.id });
      if (isAdmin) return { canCreate: true, canCreateInternal: true, canCreateExternal: true };
      
      // Check contractor admin
      const { data: isContractorAdmin } = await supabase.rpc('has_contractor_admin_access', { p_user_id: user.id });
      if (isContractorAdmin) return { canCreate: true, canCreateInternal: true, canCreateExternal: true };
      
      // Check if internal employee
      const isEmployee = profile?.user_type === 'employee';
      
      // Check if contractor rep
      const { data: repData } = await supabase
        .from('contractor_representatives')
        .select('id, company_id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();
      
      const isContractorRep = !!repData;
      
      return {
        canCreate: isEmployee || isContractorRep,
        canCreateInternal: isEmployee,
        canCreateExternal: isContractorRep,
        contractorCompanyId: repData?.company_id || null,
      };
    },
    enabled: !!user?.id,
  });
}
```

### Phase 4: Frontend - Update Gate Passes Page

**File: `src/pages/contractors/GatePasses.tsx`**

Update to conditionally show/hide the Create button based on permission:

```typescript
const { data: createPermission } = useCanCreateGatePass();

// Hide Create button if user cannot create
{createPermission?.canCreate && (
  <Button onClick={() => setIsCreateOpen(true)}>
    <Plus className="h-4 w-4 me-2" />
    {t("contractors.gatePasses.createPass", "Create Gate Pass")}
  </Button>
)}
```

### Phase 5: Frontend - Update Form Dialog

**File: `src/components/contractors/GatePassFormDialog.tsx`**

Validate user type before showing form options:

```typescript
const { data: createPermission } = useCanCreateGatePass();

// If user is contractor rep, only show external option (project-based)
// If user is internal employee, show both options but default to internal
// If user is neither, show access denied message
```

### Phase 6: Backend - Validate in useCreateGatePass Hook

**File: `src/hooks/contractor-management/use-material-gate-passes.ts`**

Add pre-flight validation before insert:

```typescript
mutationFn: async (data: CreateGatePassData) => {
  // Pre-flight validation
  const { data: canCreate, error: checkError } = await supabase.rpc('can_create_gate_pass', {
    p_user_id: user.id,
    p_is_internal_request: data.is_internal_request || false,
    p_company_id: data.company_id || null,
  });
  
  if (checkError || !canCreate?.allowed) {
    throw new Error(canCreate?.reason || 'You do not have permission to create this gate pass');
  }
  
  // Proceed with creation...
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|:-----|:-------|:--------|
| Migration SQL | Create | Add `can_create_gate_pass` RPC, fix RLS policies |
| `use-can-create-gate-pass.ts` | Create | Permission check hook |
| `GatePasses.tsx` | Modify | Conditionally show Create button |
| `GatePassFormDialog.tsx` | Modify | Restrict form options based on user type |
| `use-material-gate-passes.ts` | Modify | Add pre-flight validation |
| `QuickReportButtons.tsx` | Modify | Update permission check to use new hook |

---

## Security Model After Fix

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    GATE PASS CREATION ACCESS CONTROL                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────┐     ┌─────────────────────┐     ┌──────────────────┐  │
│  │   ADMIN             │     │  CONTRACTOR ADMIN   │     │  INTERNAL USER   │  │
│  │  (Any pass type)    │     │  (Any pass type)    │     │  (Internal only) │  │
│  └─────────────────────┘     └─────────────────────┘     └──────────────────┘  │
│                                                                                  │
│  ┌─────────────────────┐                                                        │
│  │  CONTRACTOR REP     │                                                        │
│  │  (External only,    │                                                        │
│  │   own company)      │                                                        │
│  └─────────────────────┘                                                        │
│                                                                                  │
│  Security Guards, Visitors, Other Roles: ❌ BLOCKED                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

1. **As Admin**: Can create both internal and external gate passes
2. **As Contractor Rep**: Can only create external passes for their company
3. **As Internal Employee**: Can only create internal passes
4. **As Security Guard**: Cannot create any gate passes (button hidden, API blocked)
5. **Direct URL access** (`/contractors/gate-passes?action=create`): Blocked for unauthorized users
6. **RLS enforcement**: Unauthorized INSERT attempts rejected at database level

---

## Regression Risks

| Risk | Mitigation |
|:-----|:-----------|
| Existing passes become inaccessible | SELECT policy includes `requested_by = auth.uid()` |
| Contractor portal breaks | `ContractorPortalRoute` still validates contractor rep status |
| Dashboard shortcut fails | Updated to use same permission hook |
