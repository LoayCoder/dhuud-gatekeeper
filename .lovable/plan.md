

# Integrate Observations, Incidents, Actions & Violations into Contractor Portal Dashboard

## Summary

Add four new HSSE accountability sections to the Contractor Portal Dashboard, giving contractors full visibility into observations, incidents, corrective actions, and violations linked to their company via `related_contractor_company_id`.

## Architecture

### New Hook: `useContractorPortalHSSEStats`

Create a single hook in `src/features/contractors/hooks/use-contractor-portal-hsse.ts` that accepts `companyId` and returns aggregated stats for all four modules. Uses 4 parallel `useQuery` calls:

| Query | Table | Filter |
|-------|-------|--------|
| Observations | `incidents` | `event_type = 'observation'`, `related_contractor_company_id = companyId`, `deleted_at IS NULL` |
| Incidents | `incidents` | `event_type = 'incident'`, `related_contractor_company_id = companyId`, `deleted_at IS NULL` |
| Actions | `corrective_actions` joined via `incident_id` → `incidents.related_contractor_company_id` | Two-step: fetch incident IDs first, then actions |
| Violations | `contractor_violation_summary` | `contractor_company_id = companyId` |

The hook computes: totals, open/closed counts, overdue actions (where `due_date < now()` and status not closed), severity breakdowns, and active violations.

### New Component: `ContractorPortalHSSESections`

Create `src/components/contractor-portal/dashboard/ContractorHSSESections.tsx` with four card sections using the existing `Card` component pattern already in the dashboard.

### Dashboard Integration

Add the new sections to `src/pages/contractor-portal/Dashboard.tsx` below the existing stats grid, using data from the new hook.

## UI Sections

### 1. Observations Card
- **Total** observations count
- **Open** vs **Closed** breakdown (using `isOpenStatus`/`isClosedStatus` from `incident-status-colors.ts`)
- Recent 5 observations list (title, date, status badge, severity)
- Click → navigate to detail

### 2. Incidents Card
- **Total** incidents count
- **Severity breakdown** (L1–L5 badges with HSSE colors)
- High severity alert banner if any L3+ exist
- Recent 5 incidents list

### 3. Corrective Actions Card
- **Assigned** actions count
- **Overdue** actions with red highlight (`due_date < now()` and not closed)
- **Upcoming** deadlines (next 7 days)
- Each row: title, assignee, due date, status

### 4. Violations Card
- **Total** violations count
- **Active** (where `final_status` is NULL or pending)
- **Final status** breakdown (approved/enforced/cancelled)
- Fine amounts from joined `violation_types` table (using `first_fine_amount`, `second_fine_amount`, `third_fine_amount` based on occurrence)

## Security

- All queries filter by `companyId` derived from the authenticated contractor representative's linked company (already resolved by `useContractorPortalData`)
- Admin fallback uses the same company resolution logic
- RLS on `incidents` and `contractor_violation_summary` already enforces tenant isolation

## Files to Create/Edit

| File | Action |
|------|--------|
| `src/features/contractors/hooks/use-contractor-portal-hsse.ts` | **Create** — hook with 4 queries |
| `src/components/contractor-portal/dashboard/ContractorHSSESections.tsx` | **Create** — 4 section components |
| `src/pages/contractor-portal/Dashboard.tsx` | **Edit** — import and render HSSE sections below existing content |
| `src/features/contractors/hooks/use-contractor-portal.ts` | **Edit** — re-export new hook |
| `src/hooks/contractor-management/index.ts` | **Edit** — re-export new hook |

## Technical Notes

- Uses `isOpenStatus()` and `isClosedStatus()` from `src/lib/incident-status-colors.ts` for consistent status classification
- Severity uses `severity_v2` field (L1–L5)
- Actions require a two-step query: first get contractor incident IDs, then fetch `corrective_actions` with `incident_id.in(ids)`
- Violations join `violation_types` for fine/penalty display
- All Tailwind classes use logical properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`)

