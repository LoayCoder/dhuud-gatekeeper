

## Operationalize People Metrics - Comprehensive Plan

### Current State

- The `incident_injuries` table exists with injury data (body diagram, severity, types, days lost) but is **missing** three critical columns: `person_type`, `involvement_type`, and `injury_classification`.
- The current `get_people_metrics` RPC reads `worker_type` from the `incidents` table (which is always NULL) and uses hardcoded manhour defaults. It does not query `incident_injuries` at all.
- The `PeopleMetricsCard` component shows manhour breakdowns and employee/contractor ratios but has no charts, no body-part analysis, and no injury classification pyramid.
- The `InjuryEntryForm` captures detailed injury data but does not ask **who** the person is (employee/contractor/visitor) or **how** they were involved (injured vs. witness), nor does it capture OSHA classification (LTI, MTC, etc.).

---

### Phase 1: Database Schema Update (Migration)

Add three new columns to `incident_injuries`:

| Column | Type | Values | Default |
|--------|------|--------|---------|
| `person_type` | TEXT | `employee`, `contractor`, `visitor`, `public` | `employee` |
| `involvement_type` | TEXT | `injured_person`, `witness`, `driver`, `suspect` | `injured_person` |
| `injury_classification` | TEXT | `LTI`, `MTC`, `RWC`, `FAC`, `FAT`, `NM` | NULL |

All three default to sensible values so existing records remain valid. The defaults ensure backward compatibility (existing 2 injury records become `employee` / `injured_person`).

---

### Phase 2: New RPC - `get_incident_people_metrics`

Replace the current `get_people_metrics` with a new, accurate RPC that queries `incident_injuries` directly:

- **Filter**: Only rows where `involvement_type = 'injured_person'` and `deleted_at IS NULL`
- **Exclude**: Security/theft incidents (join to `incidents` table, exclude `incident_type` in security/theft categories)
- **Return aggregates**:
  1. Count by `person_type` (employee vs contractor vs visitor vs public)
  2. Count by `injury_classification` (the Safety Pyramid: FAT, LTI, MTC, RWC, FAC, NM)
  3. Count by `body_parts_affected` (flattened array, top 5 for heatmap)
  4. Total injured count
  5. Employee/contractor split percentages

---

### Phase 3: Update InjuryEntryForm

Add three new fields to the injury form (`InjuryEntryForm.tsx`):

1. **Person Type** selector (Employee / Contractor / Visitor / Public) - required
2. **Involvement Type** selector (Injured Person / Witness / Driver / Suspect) - required
3. **Injury Classification** selector (LTI / MTC / RWC / FAC / Fatality / Near Miss) - required only when `involvement_type = 'injured_person'`

These fields appear at the top of the "Person Details" section, right after the person name lookup.

Update the Zod schema, form defaults, and submit handler to include these fields.

---

### Phase 4: Update Incident Report Form

In `IncidentReport.tsx`, when `has_injury = true` and the event category is Safety-related:
- The `injury_classification` field (already in the schema at line 83) will be validated as required
- No changes needed for Security/Theft incidents since `has_injury` defaults to false for those

This is a lightweight change since the detailed injury data entry happens in the Investigation phase via `InjuryEntryForm`.

---

### Phase 5: Redesign PeopleMetricsCard

Replace the current manhour-focused card with injury-focused analytics:

1. **Pie Chart** (using Recharts `PieChart`): Employee vs. Contractor injury split
2. **Horizontal Bar Chart**: Top 5 body parts injured
3. **Summary Badges**: Total injuries, LTI count, FAC count, and TRIR (if manhours available, otherwise raw count)
4. **Empty State**: "No injuries recorded in this period" with a subtle icon when no data exists

The component will connect to the new `get_incident_people_metrics` RPC.

---

### Phase 6: Update Hook and Type Definitions

- Update `use-kpi-indicators.ts`: Replace `usePeopleMetrics` to call the new `get_incident_people_metrics` RPC
- Update `PeopleMetrics` interface to match the new return shape
- Update `incident.types.ts` with the new enum types for person_type, involvement_type, and injury_classification
- Update `use-incident-injuries.ts` interfaces to include the 3 new fields

---

### Technical Details

**Files to create:**
- `supabase/migrations/XXXXXX_add_people_metrics_columns.sql` - Schema changes + new RPC

**Files to modify:**
- `src/components/investigation/injury/InjuryEntryForm.tsx` - Add 3 new fields
- `src/hooks/use-incident-injuries.ts` - Update interfaces with new columns
- `src/hooks/use-kpi-indicators.ts` - Update PeopleMetrics interface and hook
- `src/components/incidents/dashboard/PeopleMetricsCard.tsx` - Full redesign with charts
- `src/types/incident.types.ts` - Add new type definitions
- `src/pages/incidents/IncidentReport.tsx` - Conditional validation for injury_classification

**Verification logic:**
- A "Theft" incident with a "Suspect" (`involvement_type = 'suspect'`) will NOT increase injury counts (filtered out by `involvement_type = 'injured_person'`)
- A "Safety" incident with an "LTI" (`involvement_type = 'injured_person'`, `injury_classification = 'LTI'`) WILL increase the count

