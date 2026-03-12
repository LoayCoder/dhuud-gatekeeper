

# Enhanced Action Center: Sheet-Based Interactive Panels for Incidents Module

## What Changes

Replace the current inline expandable panel with a **slide-over Sheet** pattern. Each metric/button on the Incidents card opens a right-side Sheet containing a filtered, searchable, sortable, paginated table. This becomes a reusable pattern for all module cards.

## Architecture

```text
Reusable Components (new):
├── ActionListSheet.tsx          — Generic Sheet wrapper (title, description, children slot)
├── ActionListTable.tsx          — Generic table with search, sort, pagination
├── useActionListState.ts        — Hook: search, sort, pagination state management
│
Incidents-specific:
├── IncidentsModule.tsx          — Updated: each button opens a Sheet with type filter
├── InlineActionsPanel.tsx       — Kept as the Sheet content for "My Actions"
├── IncidentApprovalsList.tsx    — New: Sheet content for "Pending Approvals"
├── IncidentInvestigationsList.tsx — New: Sheet content for "Investigations"
```

## Detailed Changes

### 1. `src/components/action-center/ActionListSheet.tsx` (New)
Reusable Sheet wrapper component:
- Props: `open`, `onOpenChange`, `title`, `description`, `badge?`, `children`
- Uses existing `Sheet` + `SheetContent` (side="right") from `src/components/ui/sheet.tsx`
- Width: `w-full sm:max-w-lg` on mobile full-screen, desktop 512px
- PWA safe-area padding at bottom
- RTL-aware (uses `side` prop — Sheet already handles this)

### 2. `src/components/action-center/ActionListTable.tsx` (New)
Reusable table component with built-in UX features:
- Props: generic `<T>` with `items`, `columns`, `onRowClick`, `isLoading`, `emptyMessage`
- Built-in: search input (filters client-side across all string fields), column sort toggles, pagination (25 per page)
- Uses existing `Table`, `TableHead`, `TableRow`, `TableCell` from `src/components/ui/table.tsx`
- Mobile: horizontal scroll with sticky first column
- Loading: skeleton rows
- Empty: centered icon + message

### 3. `src/hooks/use-action-list-state.ts` (New)
Lightweight state hook:
- `searchQuery`, `sortField`, `sortDirection`, `page`, `pageSize`
- `filteredItems(items)` — applies search + sort + pagination
- No external dependencies, pure client-side filtering (data already fetched by parent hooks)

### 4. `src/components/action-center/modules/IncidentsModule.tsx` (Updated)
- Replace `expandedPanel` state with `openSheet: 'my-actions' | 'approvals' | 'investigations' | null`
- "My Actions" button → opens Sheet with `InlineActionsPanel` content (already built, just move into Sheet)
- "Pending Approvals" button → `onExpand` that opens Sheet with `IncidentApprovalsList`
- "Investigation Workspace" button → `onExpand` that opens Sheet with `IncidentInvestigationsList`
- KPI cards (Overdue, Pending, Investigations, Total) — make clickable, each opens the appropriate Sheet with pre-applied filter
- Remove `children` prop usage (content now in Sheets, not inline)

### 5. `src/components/action-center/modules/IncidentApprovalsList.tsx` (New)
- Uses `usePendingIncidentApprovals()` hook (already exists)
- Renders via `ActionListTable` with columns: Reference, Title, Status, Severity, Created Date
- Row click → navigate to `/incidents/{id}`
- Action buttons per row: "Review" → navigates to incident detail

### 6. `src/components/action-center/modules/IncidentInvestigationsList.tsx` (New)
- Uses `useMyAssignedInvestigations()` hook (already exists in `use-my-workflow-tasks.ts`)
- Renders via `ActionListTable` with columns: Reference, Title, Status, Severity, Assigned Date, Target Date
- Row click → navigate to `/incidents/{incident_id}`

### 7. `src/components/action-center/ActionModuleCard.tsx` (Updated)
- Add optional `onKpiClick?: (kpiKey: string) => void` to `ModuleKPI` interface
- When a KPI has `onClick`, make it a clickable card with hover/cursor styles
- No other changes needed — `ActionLink.onExpand` already supports toggling

### 8. PWA Responsiveness (Minor tweaks)
- `ActionCenter.tsx`: Add `pb-[env(safe-area-inset-bottom)]` to page container
- `ActionListSheet`: Full-screen on mobile (`w-full` below 640px), drawer on desktop
- All touch targets already ≥44px from previous work

### 9. Translations
Add keys for Sheet headers and table columns:
- `actionCenter.sheet.myActions`, `actionCenter.sheet.pendingApprovals`, `actionCenter.sheet.investigations`
- `actionCenter.table.search`, `actionCenter.table.noResults`, `actionCenter.table.showing`
- Column labels: `actionCenter.columns.referenceId`, `actionCenter.columns.title`, etc.

## Files Summary
| File | Action |
|------|--------|
| `src/components/action-center/ActionListSheet.tsx` | Create |
| `src/components/action-center/ActionListTable.tsx` | Create |
| `src/hooks/use-action-list-state.ts` | Create |
| `src/components/action-center/modules/IncidentApprovalsList.tsx` | Create |
| `src/components/action-center/modules/IncidentInvestigationsList.tsx` | Create |
| `src/components/action-center/modules/IncidentsModule.tsx` | Update |
| `src/components/action-center/modules/InlineActionsPanel.tsx` | Minor update (remove border-t, adapt for Sheet context) |
| `src/components/action-center/ActionModuleCard.tsx` | Update (clickable KPIs) |
| `src/pages/ActionCenter.tsx` | Update (safe-area padding) |
| `src/components/action-center/modules/index.ts` | Update exports |
| `src/components/action-center/index.ts` | Update exports |
| `src/locales/en/translation.json` | Add keys |
| `src/locales/ar/translation.json` | Add keys |

## Extensibility
The `ActionListSheet` + `ActionListTable` + `useActionListState` trio is fully generic. To add the same pattern to Observations, Audits, etc., each module just needs to:
1. Add `openSheet` state
2. Create a module-specific list component using `ActionListTable`
3. Wrap it in `ActionListSheet`

No changes to the reusable components required.

