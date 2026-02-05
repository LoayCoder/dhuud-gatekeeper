

# Fix: Constraint Violation and Build Error

## Two Issues Identified

### Issue 1: Database Constraint Violation
**Error**: `new row for relation "material_gate_passes" violates check constraint "material_gate_passes_request_type_check"`

**Root Cause**: The `submit_public_gate_pass` function doesn't account for the existing constraint logic:

```sql
CHECK (
  (is_internal_request = true) OR 
  ((is_internal_request = false) AND (project_id IS NOT NULL) AND (company_id IS NOT NULL))
)
```

When the function inserts a public gate pass:
- `is_internal_request` defaults to `false`
- `project_id` and `company_id` are both `NULL`
- This violates the second condition (external requests need project AND company)

**Solution**: Update the constraint to handle the new `is_public_request` case as a third valid scenario.

### Issue 2: Build Error - Missing Import
**Error**: `Cannot find name 'toast'` in `GatePassFormDialog.tsx` line 256

**Root Cause**: `toast.error()` is used but `toast` from `sonner` was never imported.

**Solution**: Add the missing import.

---

## Technical Changes

### 1. Database Migration - Update Constraint

Drop the old constraint and create a new one that handles all three cases:

```sql
-- Drop the existing constraint
ALTER TABLE material_gate_passes 
  DROP CONSTRAINT IF EXISTS material_gate_passes_request_type_check;

-- Create updated constraint that handles:
-- 1. Internal requests (is_internal_request = true)
-- 2. External requests (project_id and company_id required)
-- 3. Public requests (is_public_request = true, no project/company needed)
ALTER TABLE material_gate_passes 
  ADD CONSTRAINT material_gate_passes_request_type_check 
  CHECK (
    (is_internal_request = true) OR
    (is_public_request = true) OR
    ((is_internal_request = false) AND (project_id IS NOT NULL) AND (company_id IS NOT NULL))
  );
```

### 2. Fix GatePassFormDialog.tsx - Add Missing Import

```typescript
// Add to imports at top of file
import { toast } from "sonner";
```

---

## Files to Modify

| File | Action |
|------|--------|
| Database Migration | **Create** - Update `material_gate_passes_request_type_check` constraint |
| `src/components/contractors/GatePassFormDialog.tsx` | **Modify** - Add missing `toast` import |

---

## Constraint Logic After Fix

```text
Valid INSERT scenarios:
┌─────────────────────────────────────────────────────────────────┐
│ Scenario 1: Internal Request                                    │
│   is_internal_request = true                                    │
│   (project_id and company_id can be NULL)                       │
├─────────────────────────────────────────────────────────────────┤
│ Scenario 2: Public Request                                      │
│   is_public_request = true                                      │
│   (project_id and company_id can be NULL)                       │
├─────────────────────────────────────────────────────────────────┤
│ Scenario 3: External/Contractor Request                         │
│   is_internal_request = false AND is_public_request = false     │
│   project_id IS NOT NULL AND company_id IS NOT NULL             │
└─────────────────────────────────────────────────────────────────┘
```

