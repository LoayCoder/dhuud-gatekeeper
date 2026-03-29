
# Hybrid Area Session: Asset-Based Inspection (IMPLEMENTED)

## Core Rule
> An inspection session operates in a single execution mode — `asset` or `area` — never both simultaneously.

## What Was Done

### 1. DB Migration ✅
- Added `execution_mode` column (`'asset'` | `'area'` | NULL) to `inspection_sessions`
- Added snapshot columns to `inspection_session_assets`: `asset_name_snapshot`, `asset_code_snapshot`, `asset_location_snapshot`, `asset_type_snapshot`
- Added `UNIQUE (session_id, asset_id)` constraint for idempotency

### 2. Updated `useStartSession` ✅
- For area/audit sessions: queries matching assets first
- If assets found → `execution_mode = 'asset'`, populates `inspection_session_assets` with snapshots
- If no assets → `execution_mode = 'area'`, creates `area_inspection_responses` (flat checklist)
- For asset sessions: always `execution_mode = 'asset'` (unchanged behavior)

### 3. Created `use-backfill-area-assets.ts` ✅
- Self-healing hook for legacy sessions without `execution_mode`
- Checks existing data (assets vs responses) and sets appropriate mode
- Idempotent: skips if assets already exist

### 4. Updated `AreaSessionWorkspace.tsx` ✅
- Hybrid rendering based on `execution_mode`:
  - `'asset'` → Asset accordion with search, condition badges (🟢🔴🟠), per-asset `QuickInspectionCard`
  - `'area'` → Current flat checklist (unchanged)
- Area metadata sidebar preserved in both modes
- Progress card switches between `SessionProgressCard` (asset) and `AreaProgressCard` (area)
