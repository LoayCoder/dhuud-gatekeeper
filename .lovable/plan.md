

# Fix Contractor Project Creation Flow

## Problem
Three issues in the current contractor project creation:

1. **Status constraint violation**: Code inserts `status: "planned"` but the DB constraint only allows `active|completed|suspended|cancelled` — causing silent failures
2. **No project type distinction**: All projects require a `company_id` (NOT NULL), but internal projects should not need a contractor company
3. **Label confusion**: "Company" label is ambiguous — should say "Contractor Company"

## Changes

### 1. Database Migration

- **Add `project_type` column** to `contractor_projects`: `TEXT NOT NULL DEFAULT 'contractor'` with CHECK constraint `('internal', 'contractor')`
- **Make `company_id` nullable**: Currently `NOT NULL` — internal projects won't have a contractor company
- **Add `planned` to status constraint**: Drop old constraint and recreate with `('planned', 'active', 'completed', 'suspended', 'cancelled')`

### 2. Update Form Schema (`projectFormSchema.ts`)

- Add `project_type` field: `z.enum(['internal', 'contractor']).default('contractor')`
- Make `company_id` conditional: optional when `project_type = 'internal'`, required when `project_type = 'contractor'` (use `.superRefine()`)

### 3. Update Form Dialog (`ProjectFormDialog.tsx`)

- Add **Project Type** selector (radio or select) at the top of the form — "Internal" or "Contractor"
- Watch `project_type` field:
  - When `internal`: hide the Contractor Company dropdown, clear `company_id`
  - When `contractor`: show Contractor Company dropdown as required
- Rename "Company *" label to "Contractor Company *"
- Wrap submit in try/catch with user-friendly error: *"Project creation failed due to invalid contractor configuration. Please check project type and required fields."*

### 4. Update Create Hook (`use-contractor-projects.ts`)

- Set `status: "active"` instead of `"planned"` (matches constraint)
- Include `project_type` in the insert payload
- Send `company_id: null` for internal projects
- Improve error message in `onError`

### 5. Update List/Table

- Add project type badge (Internal / Contractor) to `ProjectListTable` for visibility

### Summary

| File | Change |
|------|--------|
| DB migration | Add `project_type`, make `company_id` nullable, fix status constraint |
| `projectFormSchema.ts` | Add `project_type`, conditional `company_id` validation |
| `ProjectFormDialog.tsx` | Project type selector, conditional company field, label fix, error handling |
| `use-contractor-projects.ts` | Fix status to `"active"`, include `project_type`, handle null `company_id` |
| `ProjectListTable` (minor) | Show project type badge |

