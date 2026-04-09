

## Reporting Card Popup — Two-Circle Selector

### What We're Building

When users tap the **Reportings** card on the homepage, instead of navigating directly to `/incidents/report`, a premium popup (Dialog) appears with two circular buttons:

1. **Observation** (Eye icon, warning color) → navigates to `/incidents/report` with observation mode
2. **Incident** (Siren icon, danger/red color) → navigates to `/incidents/report` with incident mode

The popup uses large circular icon containers (similar to the existing `EventTypeSelector` design) with smooth animations.

### How It Works

- The `ActionCard` for the `reportings` card (id: `reportings`) will **not** navigate via `<Link>`. Instead, it opens a Dialog.
- The Dialog shows two large circles side by side with icons, labels, and brief descriptions — all already translated (`quickObservation.observationTitle`, `quickObservation.incidentTitle`, etc.).
- Tapping a circle navigates to `/incidents/report?mode=observation` or `/incidents/report?mode=incident` and closes the dialog.
- All other cards continue to work as normal `<Link>` navigation.

### Technical Details

**File: `src/components/home/ActionCard.tsx`**
- Add an optional `onClickOverride` callback prop. When present, render a `<button>` instead of `<Link>`.

**File: `src/components/home/ReportingTypeDialog.tsx`** (new)
- A Dialog component with two large circular buttons (w-20 h-20 rounded-full).
- Uses existing translation keys: `quickObservation.observationTitle`, `quickObservation.incidentTitle`, `quickObservation.observationDescription`, `quickObservation.incidentDescription`.
- Icons: `Eye` (observation), `Siren` (incident).
- Colors: warning scheme for observation, destructive scheme for incident.
- Passes `dir={i18n.dir()}` to DialogContent for RTL support.

**File: `src/components/home/RoleBasedActionGrid.tsx`**
- For the card with `id === 'reportings'`, render ActionCard with `onClickOverride` that opens the ReportingTypeDialog.
- Manage dialog open state here.

### Files to Create/Modify
- **Create**: `src/components/home/ReportingTypeDialog.tsx`
- **Modify**: `src/components/home/ActionCard.tsx` — add `onClickOverride` prop
- **Modify**: `src/components/home/RoleBasedActionGrid.tsx` — handle reportings card specially

