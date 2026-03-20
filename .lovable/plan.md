

# Fix OBS-2026-0111 — Updated Plan

## Two Active Bugs + Enhanced Unassigned Warning

---

## Bug 1: Timeline shows "Awaiting Contractor Consultant" instead of Luay's name

**File:** `src/lib/current-owner.ts` (lines 56-59)

The `expert_screening` / `pending_expert_screening` case for contractor observations hardcodes `null` name and `isUnassigned = true`, ignoring that `approval_manager_id` is already set.

**Fix:** Check `incident.approval_manager?.full_name` first. If present, show that name with `isUnassigned = false`.

## Bug 2: `witness_statements` query — `status` column does not exist

**File:** `src/hooks/use-witness-statements/use-statement-queries.ts`

Replace `status` with `assignment_status` in the select string and mapping.

## Enhancement: Show "No user has this role" warning when truly unassigned

**Updated behavior** — When the fallback triggers (no manager is set), instead of just showing "Unassigned (Contractor Consultant)", the UI will show:

- A red/destructive warning badge: **"No user assigned to this role"**
- A sub-text: **"Contact admin to assign a Contractor Consultant"**

This requires two changes:

### 1. Add `warningMessage` to `CurrentOwnerInfo` interface

**File:** `src/lib/current-owner.ts`

Add an optional `warningMessage` field to the interface. When `isUnassigned` is true, populate it with a role-specific message like `"Contact admin to assign a {role}"`.

### 2. Render the warning in `ResponsibleUserBadge` and `UnifiedTimelineTracker`

**File:** `src/features/incidents/components/workflow/ResponsibleUserBadge.tsx`

When `unassigned` is true, replace the generic "Unassigned (role)" badge with:
- Badge: "⚠ No user assigned to this role"  
- Sub-line: "Contact admin to assign a {role}"

**File:** `src/features/investigation/components/UnifiedTimelineTracker.tsx`

Same treatment on the active step — show the warning message instead of just "Awaiting {role}".

---

## Files to Edit

1. `src/lib/current-owner.ts` — fix contractor name resolution + add `warningMessage` field
2. `src/hooks/use-witness-statements/use-statement-queries.ts` — replace `status` with `assignment_status`
3. `src/features/incidents/components/workflow/ResponsibleUserBadge.tsx` — render admin contact warning
4. `src/features/investigation/components/UnifiedTimelineTracker.tsx` — render admin contact warning on active step

