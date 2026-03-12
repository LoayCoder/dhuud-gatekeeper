

## Problem: `IncidentDetailHeader` receives incomplete incident data

The root cause is in `IncidentDetail.tsx` lines 223-241. When passing props to `IncidentDetailHeader`, a **subset** of the incident is constructed manually, and it **excludes** `approval_manager`, `approval_manager_id`, `investigations`, and `related_contractor_company`. These are the exact fields that `getCurrentOwner()` needs to resolve the owner name.

```text
IncidentDetail.tsx → constructs partial incident object for header
  ↓ missing: approval_manager, investigations, related_contractor_company
IncidentDetailHeader → passes incident to ResponsibleUserBadge
  ↓ 
ResponsibleUserBadge → getCurrentOwner(incident)
  ↓ incident.approval_manager is undefined
getCurrentOwner → isUnassigned: true → "Unassigned (Contractor Consultant)"
```

## Fix

In `IncidentDetail.tsx`, add the missing fields to the object passed to `IncidentDetailHeader`:

```typescript
<IncidentDetailHeader
    incident={{
      // ...existing fields...
      approval_manager: incident.approval_manager,
      approval_manager_id: incident.approval_manager_id,
      investigations: incident.investigations,
      related_contractor_company: incident.related_contractor_company,
    }}
    ...
/>
```

**File to modify:** `src/pages/incidents/IncidentDetail.tsx` (lines 223-241)

This is the same root cause pattern: the `getCurrentOwner` function needs `approval_manager`, `investigations`, and `related_contractor_company` to resolve the owner, but they were omitted from the props.

