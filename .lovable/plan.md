

# Hybrid Area Session: Asset-Based Inspection (Revised Plan)

## Core Rule

> **An inspection session operates in a single execution mode — `asset` or `area` — never both simultaneously.**

---

## Critical Fixes Addressed

### 1. Source of Truth Conflict → Execution Mode Lock

**Problem:** Two parallel data models (`area_inspection_responses` vs `inspection_session_assets`) could coexist.

**Fix:** Add `execution_mode` column to `inspection_sessions`:
- Set **once** at session start based on whether matching assets exist
- `'asset'` → uses `inspection_session_assets` + `asset_inspection_part_results` only
- `'area'` → uses `area_inspection_responses` only
- When `execution_mode = 'asset'`, **never** create `area_inspection_responses`; hide flat checklist entirely
- Column is immutable after start (no mid-session switching)

**Migration:**
```sql
ALTER TABLE inspection_sessions 
  ADD COLUMN execution_mode text DEFAULT NULL 
  CHECK (execution_mode IN ('asset', 'area'));
```

### 2. Double Creation / Race Conditions → Idempotency

**Fix:**
- Add unique constraint: `UNIQUE (session_id, asset_id)` on `inspection_session_assets`
- Backfill hook checks `COUNT(*) > 0` before inserting — skips if assets already exist
- `useStartSession` is the **sole** creator; backfill only runs for legacy sessions

### 3. Asset Snapshot for Audit Integrity

**Fix:** Add snapshot columns to `inspection_session_assets`:

```sql
ALTER TABLE inspection_session_assets
  ADD COLUMN asset_name_snapshot text,
  ADD COLUMN asset_code_snapshot text,
  ADD COLUMN asset_location_snapshot text,
  ADD COLUMN asset_type_snapshot text;
```

Populated at insert time in `useStartSession` by fetching `name, asset_code, building.name, type.name` from `hsse_assets`.

### 4. Template–Asset Compatibility Validation

**Fix:** In `useStartSession`, when querying assets for area/audit sessions:
- Only fetch assets where `type_id` matches the template's linked `type_id` (or `category_id`)
- If zero assets match → fall back to `execution_mode = 'area'` (flat checklist)
- Log mismatch warnings

### 5. Condition Aggregation Logic

**Fix:** Already implemented in `QuickInspectionCard` (per memory `asset-inspection-condition-logic`):
- All parts pass → `good`
- Any part fails → `not_good`
- Manual `partial` override available
- On checklist update → recalculate and persist `quick_result` on `inspection_session_assets`

No new trigger needed — existing frontend logic handles this.

### 6. Performance (58 assets × 6 parts)

**Fix:**
- Accordion content loads lazily (only expanded items render parts)
- Asset list uses search/filter with debounce (already in `SessionWorkspace`)
- Parts data fetched per-asset on expand, not all at once

### 7. Permissions / Role Control

**Fix:** Use existing `has_role_by_code` RPC:
- Only `inspector_id` or users with `hsse_officer`/`hsse_manager`/`admin` roles can record results
- Manual `partial` override restricted to `hsse_officer+`

### 8. Progress Hook Alignment

**Fix:** When `execution_mode = 'asset'`:
- Progress = `COUNT(assets with quick_result NOT NULL) / total_assets`
- Uses existing `useSessionProgress` which reads session counters
- Update counters on each `quick_result` save

When `execution_mode = 'area'`:
- Progress = `COUNT(responses with result NOT NULL) / total_assets`
- Unchanged from current implementation

### 9. Cleanup / Reset Strategy

**Fix:** On session reset (if re-startable):
- Delete all `inspection_session_assets` and their `asset_inspection_part_results`
- Delete all `area_inspection_responses`
- Reset `execution_mode` to NULL, `total_assets` to 0

### 10. Empty State & Error Handling

**Fix:**
- No matching assets → show "No assets found for this scope. Running as area checklist."
- Query failure → show error toast + retry button
- Partial load → show loaded assets with loading skeleton for remainder

---

## File Changes

| File | Change |
|------|--------|
| **DB Migration** | Add `execution_mode` column, snapshot columns, unique constraint |
| `use-session-lifecycle-mutations.ts` | Branch on asset availability: set `execution_mode`, populate snapshots, validate template–asset compatibility |
| `AreaSessionWorkspace.tsx` | Read `execution_mode`; if `'asset'` → render asset accordion (reuse `SessionWorkspace` patterns); if `'area'` → current flat checklist |
| `use-backfill-area-assets.ts` (new) | Legacy-only: populate missing assets for pre-fix sessions, set `execution_mode`, idempotent |
| `AreaProgressCard` / progress hooks | Respect `execution_mode` for correct metric calculation |

---

## Decision Flow at Session Start

```text
useStartSession(sessionId):
  1. Fetch session (type, template, scope filters)
  2. IF session_type = 'area' OR 'audit':
     a. Query hsse_assets matching scope + template type compatibility
     b. IF matching assets > 0:
        - Insert into inspection_session_assets (with snapshots)
        - SET execution_mode = 'asset'
        - SET total_assets = asset count
     c. ELSE:
        - Insert area_inspection_responses from template items
        - SET execution_mode = 'area'
        - SET total_assets = template item count
  3. IF session_type = 'asset':
     - (unchanged — always asset mode)
     - SET execution_mode = 'asset'
  4. Update session: status='in_progress', started_at, total_assets, execution_mode
```

## Rendering Flow

```text
AreaSessionWorkspace:
  IF session.execution_mode = 'asset':
    → Asset accordion (search, filter, per-asset checklist, condition badges)
    → SessionProgressCard (asset-level metrics)
    → Area metadata sidebar (weather, attendees, scope notes)
    → NO flat checklist
  
  IF session.execution_mode = 'area':
    → Current flat checklist (unchanged)
    → AreaProgressCard
    → Area metadata sidebar
```

