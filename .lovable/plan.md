
# Internal Gate Pass Module for All Employees

## Problem Statement

Currently, the Gate Pass module has two sections:
- `/contractors/gate-passes` → For External (Contractor) passes, accessible by contractor reps
- `/dept-gate-passes` → For Department Representatives to **approve** internal passes

**What's Missing:** Regular internal employees have no dedicated page to:
1. Create internal gate passes
2. Track their own internal pass requests
3. View approval status

The `/dept-gate-passes` is currently restricted to `department_representative` role only and shows passes for an entire department (for approval purposes), not the user's own requests.

---

## Solution: New "My Gate Passes" Module

Create a new **"My Gate Passes"** section in the sidebar accessible to all internal employees where they can:
- Create new internal gate pass requests
- View their own passes (both internal and external if applicable)
- Track approval status

---

## Implementation Plan

### 1. Database - Add Menu Items and Access

Add new menu items to the database for the "My Gate Passes" module and grant access to `normal_user` role (which all employees have):

```sql
-- Create parent menu group
INSERT INTO menu_items (code, name_ar, parent_code, url, icon, sort_order)
VALUES ('my_gate_passes', 'تصاريحي', NULL, '/my-gate-passes', 'FileKey', 14);

-- Create sub-menu items
INSERT INTO menu_items (code, name_ar, parent_code, url, icon, sort_order) VALUES
('my_gate_pass_list', 'تصاريحي', 'my_gate_passes', '/my-gate-passes', 'List', 1),
('my_gate_pass_create', 'طلب جديد', 'my_gate_passes', '/my-gate-passes/create', 'Plus', 2);

-- Grant access to normal_user role (all employees have this role)
INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
SELECT t.id, r.id, m.id
FROM tenants t
CROSS JOIN roles r
CROSS JOIN menu_items m
WHERE r.code = 'normal_user'
  AND m.code IN ('my_gate_passes', 'my_gate_pass_list', 'my_gate_pass_create');
```

### 2. Frontend - Create New Route Configuration

**File: `src/routes/my-gate-passes.routes.tsx`** (New)

```typescript
export const myGatePassRoutes: RouteObject[] = [
  {
    path: "my-gate-passes",
    element: <MenuBasedAdminRoute menuCode="my_gate_pass_list"><MyGatePassesList /></MenuBasedAdminRoute>,
  },
  {
    path: "my-gate-passes/create",
    element: <MenuBasedAdminRoute menuCode="my_gate_pass_create"><MyGatePassCreate /></MenuBasedAdminRoute>,
  },
];
```

### 3. Frontend - Create Pages

**File: `src/pages/my-gate-passes/List.tsx`** (New)

A page showing the current user's own gate passes:
- Filter by status
- Show approval progress
- Quick access to create new request

**File: `src/pages/my-gate-passes/Create.tsx`** (New)

A simplified creation form for internal gate passes:
- Material description
- Quantity
- Vehicle details
- Pass date and time window
- Approver selection (department manager)

### 4. Frontend - Create Hook for User's Own Passes

**File: `src/hooks/contractor-management/use-my-gate-passes.ts`** (New)

```typescript
export function useMyGatePasses(filters?: GatePassFilters) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["my-gate-passes", user?.id, filters],
    queryFn: async () => {
      // Fetch gate passes where requested_by = current user
      const { data } = await supabase
        .from("material_gate_passes")
        .select("...")
        .eq("requested_by", user?.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return data;
    },
    enabled: !!user?.id,
  });
}
```

### 5. Add to Route Registry

**File: `src/config/route-registry.ts`**

Add new route definitions for the My Gate Passes module.

**File: `src/config/menu-groups.ts`**

Add new menu group for "My Gate Passes" positioned appropriately in the sidebar.

### 6. Update Routes Index

**File: `src/routes/index.tsx`**

Add the new `myGatePassRoutes` to `protectedLayoutRoutes`.

---

## Menu Structure After Implementation

```text
Sidebar Navigation
├── Dashboard
├── HSSE Management
├── Gate Passes (NEW - for all employees)   ← Accessible by normal_user
│   ├── My Requests                          ← View own passes
│   └── Create Request                       ← Create internal pass
├── Contractors                              ← Existing (for contractor management)
│   ├── ...
│   └── Gate Passes                          ← External passes (contractor reps)
├── Dept Gate Passes                         ← Existing (for dept reps to approve)
└── ...
```

---

## Files to Create/Modify

| File | Action | Purpose |
|:-----|:-------|:--------|
| Migration SQL | Create | Add menu items, grant access to normal_user |
| `src/routes/my-gate-passes.routes.tsx` | Create | New route definitions |
| `src/pages/my-gate-passes/List.tsx` | Create | User's own passes list |
| `src/pages/my-gate-passes/Create.tsx` | Create | Create internal gate pass form |
| `src/hooks/contractor-management/use-my-gate-passes.ts` | Create | Fetch user's own passes |
| `src/config/route-registry.ts` | Modify | Add route entries |
| `src/config/menu-groups.ts` | Modify | Add menu group |
| `src/routes/index.tsx` | Modify | Include new routes |

---

## Access Control Summary

| Module | Who Can Access | Purpose |
|:-------|:---------------|:--------|
| `/my-gate-passes` | All employees (`normal_user`) | Create & track own internal passes |
| `/contractors/gate-passes` | Contractor admins, contractor reps | Create & manage external passes |
| `/dept-gate-passes` | Department representatives | Approve department's passes |

---

## Technical Details

### Status Flow for Internal Gate Pass (User's View)

```text
User creates pass → pending_dept_approval → pending_security_approval → approved → used → completed
                              ↓                        ↓
                          rejected                 rejected
```

### UI Components to Reuse

- `GatePassStatusBadge` - For showing status labels
- `GatePassFormDialog` - Reuse creation form (with internal-only mode)
- `GatePassDetailDialog` - View pass details and timeline

---

## Testing Checklist

1. **As normal employee**: Can see "Gate Passes" in sidebar
2. **As normal employee**: Can create internal gate pass request
3. **As normal employee**: Can view only their own requests
4. **As normal employee**: Cannot see external/contractor passes
5. **As department rep**: Still has access to `/dept-gate-passes` for approvals
6. **As admin**: Has access to all gate pass modules
