

# Inspection Module Audit Report — Follow-Up

## Module Health Score: ⚠️ Minor Issue (1 remaining bug)

All 5 issues from the previous audit are confirmed fixed and deployed. However, a **new routing bug** was found in the Action Center's inspection actions list.

---

## Findings Table

| # | Area | Issue | Severity | Root Cause | Impact |
|---|------|-------|----------|------------|--------|
| 1 | Action Center / Navigation | `InspectionActionsList` always routes to asset workspace for non-audit actions — area session actions navigate to wrong workspace | **Medium** | The `useMyInspectionActions` query does not join `inspection_sessions` to retrieve `session_type`. The `InspectionActionsList` click handler uses `sourceType === 'audit' ? '/audit' : ''` — so area sessions get no suffix and land on the asset workspace. | Users clicking an inspection action from the Action Center that belongs to an area session see the wrong workspace (QR scanner instead of checklist). |

---

## Previously Fixed (Verified)

- CreateAreaSessionDialog → navigates to `/area` suffix ✅
- CreateAuditSessionDialog → navigates to `/audit` suffix ✅
- CreateSessionDialog → dynamic session-type routing ✅
- InspectionSessionsDashboard → status counts from full dataset, session cards route by type ✅
- InspectionDashboard → findings link uses correct path ✅
- InspectionsTab (My Actions) → uses `session_type` for routing ✅

---

## Fix Plan

### Step 1: Add `session_type` to the corrective actions query

**File:** `src/features/incidents/hooks/use-inspection-actions/use-action-queries.ts`

In `useMyInspectionActions`, add a join to `inspection_sessions` to get `session_type`:

```sql
session:inspection_sessions!corrective_actions_session_id_fkey(session_type)
```

Add `session` to the `InspectionAction` type in `types.ts`:

```ts
session?: {
    reference_id: string;
    name: string | null;
    session_type?: string;
} | null;
```

### Step 2: Use `session_type` in InspectionActionsList routing

**File:** `src/components/action-center/modules/InspectionActionsList.tsx`

Change the `onRowClick` handler from:
```ts
const suffix = sourceType === 'audit' ? '/audit' : '';
```
To:
```ts
const sessionType = (item as any).session_type || (sourceType === 'audit' ? 'audit' : 'asset');
const suffix = sessionType === 'area' ? '/area' : sessionType === 'audit' ? '/audit' : '';
```

And pass `session_type` through from the query data into the `items` mapping.

### Files to Modify

1. `src/features/incidents/hooks/use-inspection-actions/types.ts` — add `session_type` to session join type
2. `src/features/incidents/hooks/use-inspection-actions/use-action-queries.ts` — join `inspection_sessions` for `session_type`
3. `src/components/action-center/modules/InspectionActionsList.tsx` — use `session_type` for routing

