

## Fix: /incidents/investigate Page Failed to Load

The page crashes due to multiple TypeScript build errors across several files. Here is a categorized breakdown and fix plan.

---

### Error Group 1: Missing `@/types/incidents` Module

**Files:** `IncidentOverviewTab.tsx`, `IncidentTabs.tsx`

**Problem:** These files import `Incident` from `@/types/incidents`, which does not exist. The correct path is `@/types/incident.types`.

**Fix:** Change import path in both files from `@/types/incidents` to `@/types/incident.types`.

---

### Error Group 2: AuditLogPanel Props Mismatch

**File:** `IncidentTabs.tsx` (line 67)

**Problem:** `AuditLogPanel` accepts `incidentId: string`, but IncidentTabs passes `referenceId`, `tableName`, and `excludeColumns` which don't exist on `AuditLogPanelProps`.

**Fix:** Change the prop from `referenceId` to `incidentId` and remove the unsupported `tableName` and `excludeColumns` props:

```typescript
<AuditLogPanel incidentId={incident.id} />
```

---

### Error Group 3: IncidentEvidenceTab Type Mismatches

**File:** `IncidentEvidenceTab.tsx` (lines 32-38)

**Problem:** The `Incident` type from `@/types/incident.types` doesn't have `occurred_at`, `location`, `branch`, `site`, `related_contractor_company`, `latitude`, `longitude`. These are runtime properties from the Supabase query join (available via `any` cast).

**Fix:** Cast `incident` as `any` for the metadata block to safely access joined/dynamic properties:

```typescript
const inc = incident as any;
incidentMetadata={{
    referenceId: incident.reference_id,
    occurredAt: inc.occurred_at,
    location: inc.location || undefined,
    branchName: inc.branch?.name,
    siteName: inc.site?.name,
    contractorName: inc.related_contractor_company?.company_name,
    latitude: inc.latitude,
    longitude: inc.longitude,
}}
```

---

### Error Group 4: DatePickerWithRange Wrong Prop

**File:** `IncidentFilterPanel.tsx` (line 357)

**Problem:** The component expects `onDateChange` but is being passed `setDate`.

**Fix:** Rename `setDate` to `onDateChange`:

```typescript
<DatePickerWithRange
  date={filters.dateRange}
  onDateChange={(range) => onFiltersChange({ ...filters, dateRange: range })}
  className="w-full"
/>
```

---

### Error Group 5: InvestigationWorkspace `incidents?.filter()` on Non-Array

**File:** `InvestigationWorkspace.tsx` (line 321)

**Problem:** `useIncidents()` returns `{ data: [...], count }`, so `incidents` is an object, not an array. The code calls `incidents?.filter(...)` which fails.

**Fix:** Access `.data` before filtering:

```typescript
const investigableIncidents = incidents?.data?.filter(
    (inc) => inc.status !== 'closed'
);
```

---

### Error Group 6: InvestigationWorkspaceDebug Same Issue

**File:** `InvestigationWorkspaceDebug.tsx` (lines 298, 303)

**Problem:** Same as Group 5 -- accessing `.length` and `.slice()` on the `{ data, count }` object.

**Fix:** Use `incidents?.data?.length` and `incidents?.data?.slice(...)`.

---

### Error Group 7: Type Casting in Hooks (use-gamification, use-incidents, use-user-overview-stats)

**Problem:** Multiple deep type instantiation errors and string literal mismatches due to Supabase schema lagging behind actual DB.

**Fixes (using the established `as any` casting convention):**

- **`use-gamification.ts` (line 62-63):** Cast `supabase.from('observations')` as `(supabase as any).from('observations')`.

- **`use-incidents.ts` (lines 317, 320):** Cast filter values with `as any`:
  ```typescript
  query = query.eq('status', filters.status as any);
  query = query.eq('severity_v2', filters.severity as any);
  ```

- **`use-user-overview-stats.ts` (multiple lines):** Apply `as any` casts for:
  - `.from('observations')` calls (line 154-155)
  - `.neq('status', 'cancelled')` (line 105)
  - `.in('status', ['draft', 'pending_more_info'])` (line 113)
  - Result casts to `as unknown as IncidentSummary[]` (lines 122-124)
  - Role checks `.includes('hsse_manager')` / `.includes('manager')` (lines 199, 202)
  - Status string `'pending_investigation_plan_approval'` (line 211)
  - `.from('incidents')` deep type issues (line 99, 207)

---

### Summary of Files to Edit

| File | Changes |
|------|---------|
| `src/components/incidents/detail/IncidentOverviewTab.tsx` | Fix import path |
| `src/components/incidents/detail/IncidentTabs.tsx` | Fix import path + AuditLogPanel props |
| `src/components/incidents/detail/IncidentEvidenceTab.tsx` | Cast to `any` for joined fields |
| `src/components/incidents/listing/IncidentFilterPanel.tsx` | `setDate` to `onDateChange` |
| `src/pages/incidents/InvestigationWorkspace.tsx` | Access `incidents?.data` |
| `src/pages/incidents/InvestigationWorkspaceDebug.tsx` | Access `incidents?.data` |
| `src/hooks/use-gamification.ts` | `as any` cast for observations table |
| `src/hooks/use-incidents.ts` | `as any` cast for filter values |
| `src/hooks/use-user-overview-stats.ts` | Multiple `as any` casts for schema mismatches |

All fixes follow the project's established `(supabase as any)` casting convention for schema lag.

