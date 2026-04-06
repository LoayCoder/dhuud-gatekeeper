

# Restrict Contractor Access & Add Incident Detail Modal

## Summary

Replace the current `navigate('/incidents/{id}')` drill-down with an in-portal detail modal that fetches and displays incident/observation data scoped to the contractor's company. No global page navigation occurs.

## Architecture

```text
ContractorHSSESections.tsx
  └── onClick → sets selectedIncidentId state
        └── renders <ContractorIncidentDetailDialog>
              ├── Overview (title, type, date, location, description, attachments)
              ├── Investigation (summary, root cause — read-only)
              └── Corrective Actions (list with status/due date)
```

## Changes

### 1. New Component: `ContractorIncidentDetailDialog.tsx`
**Location**: `src/components/contractor-portal/dashboard/ContractorIncidentDetailDialog.tsx`

A Dialog-based modal that receives an `incidentId` and `companyId`, then:

- Fetches incident data from `incidents` table filtered by `related_contractor_company_id = companyId` AND `id = incidentId` (double-gated: if the incident doesn't belong to the company, returns null and shows nothing)
- Select fields: `id, title, reference_id, event_type, subtype, incident_type, description, occurred_at, status, severity_v2, location, media_attachments, immediate_actions, has_injury, injury_classification, has_damage`, plus joins for `branch(name)`, `site(name)`, `related_contractor_company(company_name)`
- Fetches investigation summary from `investigations` table via `incident_id` — select only `scope, started_at, completed_at` and investigator name
- Fetches RCA from `incident_rca` via `incident_id` — select only `immediate_cause, root_causes_summary` (RLS will gate access)
- Fetches corrective actions from `corrective_actions` via `incident_id` — select `title, status, due_date, assigned_user:profiles(full_name)`
- Renders in three sections with vertical scroll:
  - **Overview**: type badge, severity, date, location, description, attachments (reuse `IncidentAttachmentsSection`)
  - **Investigation**: summary card (graceful empty state if RCA not visible due to RLS)
  - **Actions**: list with status badges, overdue highlighting

- Uses `DialogContent` with `dir={direction}` for RTL
- All Tailwind uses logical properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`)

### 2. Update: `ContractorHSSESections.tsx`
- Remove `useNavigate` import and `navigateToIncident` function
- Add `useState<string | null>` for `selectedIncidentId`
- Replace all `onClick={() => navigateToIncident(id)}` with `onClick={() => setSelectedIncidentId(id)}`
- Render `<ContractorIncidentDetailDialog>` at bottom, passing `incidentId={selectedIncidentId}`, `companyId`, `onClose`

### 3. Props Threading
- `ContractorHSSESections` needs to receive `companyId` prop from its parent to pass to the dialog for the security filter

### 4. Security
- Frontend: modal query double-checks `related_contractor_company_id = companyId`
- Backend: existing RLS on `incidents` table already enforces tenant isolation
- No navigation to `/incidents/*` routes from contractor portal

## Technical Notes

- Reuse `IncidentAttachmentsSection` for media display inside the modal
- Investigation/RCA data may return null due to RLS restrictions on `incident_rca` — show graceful "Not available" state
- Corrective actions query reuses the same pattern as `IncidentActionsTab` but read-only (no "Add Action" button)
- Dialog max-width: `max-w-3xl` with `max-h-[85vh] overflow-y-auto` for scrollable content
- Arabic translations for new modal labels added to both locale files

