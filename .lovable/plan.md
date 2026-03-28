

# Fix Remaining Gaps in Asset Inspection System

## Current State Summary

The code is mostly wired correctly. Here are the **actual remaining gaps**:

### Gap 1: UI is "select-one-at-a-time" — tedious for 58+ assets
The `SessionWorkspace` uses a two-panel layout: a sidebar list of uninspected assets on the right, and a single `QuickInspectionCard` on the left. With 58+ assets, this is painfully slow. Each asset must be clicked individually, inspected, then the next one selected.

### Gap 2: No parts-level progress tracking
`SessionProgressCard` only shows asset-level metrics (inspected/passed/failed counts). There is no visibility into how many parts have been inspected across all assets. The inspector cannot see "120 of 348 parts checked" at a glance.

### Gap 3: Part results not reflected in dashboards
The `useCompleteSession` hook only checks for `not_good` quick results to determine session completion status. It does not aggregate part-level pass/fail data. Dashboard and reporting queries do not include part inspection summaries.

### Gap 4: `useStartSession` doesn't validate total_assets
If zero assets match the session filters, the session still transitions to `in_progress` with `total_assets: 0`, which is a dead-end state.

---

## Plan

### 1. Redesign SessionWorkspace — Expandable Accordion Cards
**File:** `src/pages/inspections/SessionWorkspace.tsx`

Replace the two-panel layout (sidebar list + single inspection card) with a single scrollable list of expandable accordion cards.

- Each card shows: asset code, name, location, quick result badge, parts completion count (e.g. "4/6 parts")
- Clicking expands the card inline to reveal:
  - Quick Result buttons (Good / Not Good / Not Accessible)
  - Full parts checklist (reusing `AssetPartInspectionCard` component)
- Add a search/filter bar at the top to filter by asset code or name
- Inspected assets show colored status and sort to bottom
- Remove `UninspectedAssetsList` as a separate panel — everything is inline
- Keep QR scanner functionality in the header

### 2. Add Parts Progress to SessionProgressCard
**File:** `src/features/incidents/components/inspections/sessions/SessionProgressCard.tsx`

Add a secondary progress metric showing parts completion:
- "X of Y parts checked" with a progress bar
- Show critical failures count if any
- Requires a new query or prop that aggregates `asset_inspection_part_results` across all session assets

**New hook:** `useSessionPartsProgress(sessionId)` — queries `asset_inspection_part_results` joined with `inspection_session_assets` to get total parts vs completed parts across the session.

### 3. Guard useStartSession Against Zero Assets
**File:** `src/features/incidents/hooks/use-inspection-sessions/use-session-lifecycle-mutations.ts`

- If `assets.length === 0`, throw an error instead of proceeding: `"No assets match the session scope. Add assets or adjust filters."`
- Session stays in `draft` status (existing behavior preserved)
- Add `.throwOnError()` to the insert chain for safety

### 4. Wire Part Results Into Session Completion Logic
**File:** `use-session-lifecycle-mutations.ts` (`useCompleteSession`)

- When completing a session, query `asset_inspection_part_results` for all session assets
- Include summary data (total parts, passed, failed, critical failures) in the completion metadata
- This data feeds into dashboards and reports

### 5. Ensure Dashboard Queries Include Part Data
**Files:** Dashboard/reporting components that display session results

- Add part-level compliance metrics to session detail views
- Show "X critical part failures" as a prominent warning

---

## Files Modified

| File | Change |
|------|--------|
| `SessionWorkspace.tsx` | Complete redesign: replace two-panel with expandable accordion cards, add search bar |
| `QuickInspectionCard.tsx` | Refactor into an accordion-compatible card (collapsed/expanded states) |
| `SessionProgressCard.tsx` | Add parts-level progress metrics |
| `use-session-lifecycle-mutations.ts` | Add zero-asset guard in `useStartSession`; add `.throwOnError()`; wire part results into `useCompleteSession` |
| New: `use-session-parts-progress.ts` | Hook to aggregate part results across all session assets |
| `UninspectedAssetsList.tsx` | Remove (replaced by integrated accordion) |

## Implementation Order
1. Guard `useStartSession` against zero assets (quick fix)
2. Create `useSessionPartsProgress` hook
3. Redesign `SessionWorkspace` with accordion cards
4. Update `SessionProgressCard` with parts metrics
5. Wire part results into completion logic

