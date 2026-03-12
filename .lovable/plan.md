

# Inline My Actions Panel for Action Center — Incidents Module

## Overview

Transform the "My Actions" button on the Incidents Management card from a navigation link into an **inline expandable panel** that displays the user's corrective actions directly within the Action Center, with full workflow capability (Start Work → Complete → Extension Request). This will be built as an extensible pattern reusable across all module cards.

## Current State

- Clicking "My Actions" navigates to `/incidents/my-actions` (full page)
- `ActionModuleCard` only supports navigation links via `href`
- Badge shows **tenant-wide** counts (not user-specific)
- No inline content expansion capability exists in `ActionModuleCard`

## Architecture

```text
ActionModuleCard (enhanced)
├── KPI Strip (unchanged)
├── Action Links (unchanged for nav links)
├── NEW: Inline Panel Slot
│   └── Rendered when an action link has onExpand instead of href
│       └── Panel content provided by parent module
│
IncidentsModule
├── Uses useMyCorrectiveActions() for user-specific data
├── Renders inline ActionsPanel when "My Actions" is expanded
│   ├── Action list items (compact cards)
│   │   ├── Title, ref, priority badge, status, due date
│   │   ├── Start Work / Mark Complete buttons
│   │   └── Click → navigates to incident detail
│   └── Empty state
├── Uses existing mutation hooks (useUpdateMyActionStatus)
└── Renders ExtensionRequestDialog + action confirm dialog
```

## Changes

### 1. Extend `ActionModuleCard` (src/components/action-center/ActionModuleCard.tsx)
- Add optional `onExpand?: () => void` and `isExpanded?: boolean` to `ActionLink` interface
- When a link has `onExpand`, render a toggle button instead of navigating
- Add `children?: React.ReactNode` prop to `ActionModuleCard` — rendered below action links when provided
- PWA-friendly: ensure all touch targets are ≥44px, use `safe-area-inset` padding

### 2. Create `InlineActionsPanel` (src/components/action-center/modules/InlineActionsPanel.tsx)
- Compact, mobile-first action list component
- Reuses existing hooks: `useMyCorrectiveActions`, `useUpdateMyActionStatus`, `useUploadActionEvidence`
- Each action item shows: status icon, title, priority, due date, overdue indicator
- Action buttons: "Start Work" / "Mark Complete" / "Request Extension"
- Workflow dialogs: reuse `ExtensionRequestDialog` and a simple confirm dialog with notes + file upload
- Max 10 items shown, with "View All →" link to `/incidents/my-actions`
- Loading skeleton + empty state
- Full RTL support

### 3. Update `IncidentsModule` (src/components/action-center/modules/IncidentsModule.tsx)
- Add state: `expandedPanel: 'my-actions' | null`
- Fetch user-specific data via `useMyCorrectiveActions()` when panel is expanded
- Replace the "My Actions" `href` with `onExpand` toggle
- Pass `InlineActionsPanel` as children to `ActionModuleCard`
- Badge shows user-specific count (from the hook data length)

### 4. PWA Responsiveness (src/pages/ActionCenter.tsx + ActionModuleCard)
- Add `pb-[env(safe-area-inset-bottom)]` to page container
- KPI grid: `grid-cols-2` on mobile (already done)
- Module cards: single column on mobile (`lg:grid-cols-2` already done)
- Inline panel: full-width, scrollable with `-webkit-overflow-scrolling: touch`
- Action buttons: stack vertically on mobile via `flex-wrap`
- Touch-friendly sizing on all interactive elements

### 5. Translations
- Add keys for inline panel: `actionCenter.inlinePanel.viewAll`, `actionCenter.inlinePanel.noActions`, `actionCenter.inlinePanel.showingCount`

## Files Modified
1. `src/components/action-center/ActionModuleCard.tsx` — Add expandable panel slot + children prop
2. `src/components/action-center/modules/InlineActionsPanel.tsx` — **New** — Reusable inline action list with workflow
3. `src/components/action-center/modules/IncidentsModule.tsx` — Wire up inline panel
4. `src/components/action-center/index.ts` — Export new component
5. `src/locales/en/translation.json` — Add inline panel keys
6. `src/locales/ar/translation.json` — Add inline panel keys

## Extensibility
The pattern is generic: any module card can add inline panels by passing `onExpand` + children. Once validated on Incidents, the same approach applies to Observations, Gate Passes, etc.

