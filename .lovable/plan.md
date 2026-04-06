

# PTW Module — Full Mobile-First Responsive Overhaul

Applying the same mobile-first patterns established in the Contractor Portal to all PTW pages.

## Pages to Update

### 1. PTW Dashboard (`src/pages/ptw/PTWDashboard.tsx`)
- Stats grid: already `grid-cols-2` on mobile — good
- Charts grid: change to single column on mobile (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- Quick Actions + Recent Permits: stack vertically on mobile (`grid-cols-1 lg:grid-cols-2`)
- Recent permit items: ensure text wraps with `break-words whitespace-normal` instead of truncating

### 2. Permit Console (`src/pages/ptw/PermitConsole.tsx`)
- Header: already has `flex-col` → `flex-row` pattern
- Legend card: permit type chips should wrap properly on small screens
- Map height: reduce from `h-[600px]` to `h-[350px] sm:h-[600px]` on mobile
- Tabs: ensure touch-friendly sizing

### 3. Permit List View (`src/features/ptw/components/PermitListView.tsx`)
- **Replace table with card layout on mobile** (same dual-layout pattern as Contractor Portal workers table)
- Desktop: keep existing table (`hidden md:block`)
- Mobile: interactive cards (`block md:hidden`) showing reference, type icon, status badge, project name, and planned date
- Each card is a tappable Link to the permit detail
- Filters: stack vertically on mobile, full-width search

### 4. Create Permit Wizard (`src/pages/ptw/CreatePermit.tsx`)
- Step indicators: already hide labels on mobile (`hidden sm:block`) — good
- Step circles: reduce size on mobile
- Navigation buttons: make full-width on mobile (`w-full sm:w-auto`)
- Submit button: larger touch target on mobile (`min-h-[48px]`)

### 5. Permit View (`src/pages/ptw/PermitView.tsx`)
- Layout: change 3-column grid to single column on mobile (`grid-cols-1 lg:grid-cols-3`)
- Action buttons: full-width stacked on mobile instead of inline wrap
- QR code card: center and reduce size on mobile
- Info sections: single column grids on mobile

### 6. Project Mobilization (`src/pages/ptw/ProjectMobilization.tsx`)
- Kanban board: already responsive with `md:grid-cols-2 lg:grid-cols-4`
- On mobile (below `md`): show as vertically stacked status-grouped cards
- ProjectCard: ensure text wraps (`break-words whitespace-normal`)
- Header button: full-width on mobile

### 7. Project Clearance (`src/pages/ptw/ProjectClearance.tsx`)
- Context card grid: `grid-cols-2 md:grid-cols-4` (2-column on mobile, 4 on desktop)
- Progress stats grid: `grid-cols-2 md:grid-cols-4`
- Filter tabs: scrollable horizontally on mobile with `overflow-x-auto`
- Back button + header: compact on mobile
- Completion banner: stack vertically on mobile

### 8. PTW Field Inspection (`src/pages/ptw/PTWFieldInspection.tsx`)
- Already mobile-first design — minimal changes needed
- Ensure safe-area bottom padding for the fixed submit button: `pb-[env(safe-area-inset-bottom)]`

## Files Changed

| File | Change |
|------|--------|
| `src/pages/ptw/PTWDashboard.tsx` | Stack charts and cards on mobile |
| `src/pages/ptw/PermitConsole.tsx` | Responsive map height, touch-friendly tabs |
| `src/features/ptw/components/PermitListView.tsx` | Add mobile card layout alongside table |
| `src/pages/ptw/CreatePermit.tsx` | Full-width nav buttons, larger touch targets |
| `src/pages/ptw/PermitView.tsx` | Single-column layout on mobile, stacked actions |
| `src/pages/ptw/ProjectMobilization.tsx` | Stacked kanban on mobile, full-width button |
| `src/pages/ptw/ProjectClearance.tsx` | 2-col context grid, scrollable tabs on mobile |
| `src/pages/ptw/PTWFieldInspection.tsx` | Safe-area padding for fixed button |

## Design Principles (from Contractor Portal)
- Touch targets minimum 48px
- Cards over tables on mobile
- Wrapping over truncation for long text
- `break-words` and `whitespace-normal` for badges/titles
- Stacked layouts (flex-col) on mobile, inline (flex-row) on desktop
- CSS logical properties only (ms-, me-, ps-, pe-, text-start, text-end)

