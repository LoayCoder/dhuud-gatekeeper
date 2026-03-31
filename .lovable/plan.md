

# Enforce Reviewer Separation & Display "Pending Verification With"

## Phase 1: DB-Level Self-Approval Prevention

**New migration:** Create a BEFORE UPDATE trigger on `corrective_actions` that rejects any update setting `verified_by` equal to `assigned_to`.

```sql
CREATE OR REPLACE FUNCTION prevent_self_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verified_by IS NOT NULL AND NEW.verified_by = NEW.assigned_to THEN
    RAISE EXCEPTION 'Self-verification is not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_self_verification
  BEFORE UPDATE ON corrective_actions
  FOR EACH ROW EXECUTE FUNCTION prevent_self_verification();
```

## Phase 2: Fix Self-Approval Gap in Pending Approvals Mutation

**File: `src/hooks/use-pending-approvals/use-pending-approval-mutations.ts`**
- Add `assigned_to` to the select query (line 31)
- Add guard after fetch: `if (action?.assigned_to === user.id) throw new Error('Cannot verify your own action');`

## Phase 3: Fetch Reviewer Info in Queries

**File: `src/features/incidents/services/incidentQueryService.ts` — `getMyCorrectiveActions`**
- Expand incident join to include reporter profile:
  ```
  incident:incidents!corrective_actions_incident_id_fkey(
    event_type, reporter_id,
    reporter:profiles!incidents_reporter_id_fkey(full_name, job_title)
  )
  ```

**File: `src/features/incidents/hooks/use-inspection-actions/use-action-queries.ts` — `useMyInspectionActions`**
- Expand session join to include inspector profile:
  ```
  session:inspection_sessions!corrective_actions_session_id_fkey(
    session_type,
    inspector:profiles!inspection_sessions_inspector_id_fkey(full_name, job_title)
  )
  ```

## Phase 4: Update Types

**`src/pages/incidents/MyActions/types.ts`** — Add `reviewer_name?: string | null` and `reviewer_job_title?: string | null` to `ActionForDialog`

**`src/features/incidents/hooks/use-inspection-actions/types.ts`** — Update `session` type to include `inspector?: { full_name: string; job_title?: string | null } | null`

## Phase 5: Map Reviewer Data in useMyActions.ts

When building `allActions` (line 66-69), extract reviewer info:
- Incident actions: `reviewer_name` from `a.incident?.reporter?.full_name`
- Inspection actions: `reviewer_name` from `a.session?.inspector?.full_name`
- Fallback: "HSSE Reviewer"

## Phase 6: Display Reviewer on Action Card

**File: `src/pages/incidents/MyActions/tabs/ActionsTab.tsx`**
- When `action.status === 'completed'`, add below the status badge:
  ```
  👤 Pending with: [reviewer_name] · [reviewer_job_title]
  ```
- Fallback text if reviewer missing: "HSSE Reviewer"

## Phase 7: Display Reviewer on Detail Sheet Banner

**File: `src/pages/incidents/MyActions/ActionDetailSheet.tsx`**
- Enhance the "Pending Verification" banner (lines 154-163) to show:
  ```
  Pending with: [reviewer_name] · [reviewer_job_title]
  ```

## Phase 8: Translation Keys

**`src/locales/en/translation.json` & `ar/translation.json`**
- `actions.pendingWith`: "Pending with" / "بانتظار"
- `actions.reviewer`: "Reviewer" / "المراجع"
- `actions.hsseReviewer`: "HSSE Reviewer" / "مراجع السلامة"
- `actions.selfApprovalBlocked`: "You cannot verify your own action" / "لا يمكنك التحقق من الإجراء الخاص بك"

## Security Summary

| Layer | Protection | Status |
|-------|-----------|--------|
| DB trigger | Rejects `verified_by = assigned_to` | New |
| Inspection mutation | `assigned_to === user.id` check | Already exists |
| Pending approvals mutation | Self-approval guard | New (gap fix) |
| UI (ActionDetailSheet) | `canVerify` query excludes assignee | Already exists |

## Files Modified (11 total)
1. DB Migration — trigger
2. `use-pending-approval-mutations.ts` — self-approval guard
3. `incidentQueryService.ts` — expand joins
4. `use-action-queries.ts` — expand session join
5. `types.ts` (MyActions) — reviewer fields
6. `types.ts` (inspection-actions) — session type
7. `useMyActions.ts` — map reviewer
8. `ActionsTab.tsx` — show reviewer on card
9. `ActionDetailSheet.tsx` — show reviewer in banner
10. `en/translation.json` — new keys
11. `ar/translation.json` — new keys

