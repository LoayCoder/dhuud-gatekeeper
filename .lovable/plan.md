## Goal

Align the inspection flow with the real asset register, not with `asset_type_parts`.

## What I found

```text
Current behavior
inspection template → "Generate items" → writes parts/questions into inspection_template_items
Example: CO2 → cylinder / pressure gauge / discharge horn

What you need
inspection template/session scope → branch/site/building/category/type/subtype
→ pull real assets from hsse_assets
Example: Club House + Fire Safety Equipment + Fire Extinguisher
→ list all matching extinguishers in that building
```

Also, the project already has the correct bulk-inspection backbone:

- `inspection_sessions`
- `inspection_session_assets`

That is the right place to materialize real assets.  
Right now the wrong generator was added to the template items area.

## Plan

### 1. Separate the two concepts clearly

Keep these as two different behaviors:

- **Checklist items** = detailed questions for a single asset inspection
- **Matching assets** = real assets pulled from Asset Management for bulk/location inspections

I will not treat real assets as template questions anymore.

### 2. Replace the confusing template generator behavior

In the template editor:

- Rename the current action so it is clearly **“Generate checklist from asset parts”**
- Add a new **“Matching assets”** panel for asset templates
- Show:
  - total matching asset count
  - sample asset rows (code, name, subtype, building)
  - empty-state warning if no assets match the selected hierarchy

This gives admins immediate confirmation that the template scope is correct.

### 3. Make asset session scope use the full hierarchy

Update the asset-session flow so real assets are pulled using:

- branch
- site
- building
- floor zone (if used)
- category
- type
- subtype

Current gap:

- `branch_id` exists on `inspection_sessions` but is not wired through the TS types/forms/hooks
- `subtype_id` is not stored on `inspection_sessions`, so it should be added and then used in filtering

### 4. Generate real assets at session start, not at template item generation

For bulk asset inspections:

- `useStartSession`
- `useRefreshSessionAssets`
- `useAddAssetToSession`

will query `hsse_assets` with the full saved session scope and create rows in `inspection_session_assets`.

That means:

- the session gets the real extinguishers/hydrants/panels from the asset register
- the list stays tied to Asset Management
- newly added matching assets can be pulled later with **Refresh Assets**

### 5. Fix the validation rules

Right now asset sessions can be blocked by “template has no items”.

That rule is only correct for detailed checklist-based inspections.

I will split validation like this:

- **Single asset inspection**: requires checklist items
- **Bulk asset session**: requires at least 1 matching asset in scope

### 6. Update the session create/edit UI

In the asset session dialogs:

- add/build out missing hierarchy filters, especially **building** and **subtype**
- prefill them from the selected template
- show a live **matching asset count**
- use `NativeSelect` for cascading hierarchy fields to avoid dynamic select bugs

### 7. Keep the existing single-asset inspection flow working

The current detailed inspection path should remain intact:

```text
Asset details → Start Inspection → choose matching template → checklist items appear
```

So:

- `StartInspectionDialog` and checklist workspaces stay checklist-based
- bulk/location inspection sessions stay asset-list-based

This avoids breaking the detailed inspection use case while fixing the scope-driven asset session use case you want.

## Files likely involved

- `src/features/incidents/components/inspections/TemplateItemBuilder.tsx`
- `src/features/incidents/components/inspections/InspectionTemplateForm.tsx`
- `src/features/incidents/hooks/use-inspections/use-inspection-template-hooks.ts`
- `src/features/incidents/components/inspections/sessions/CreateSessionDialog.tsx`
- `src/features/incidents/components/inspections/sessions/EditSessionDialog.tsx`
- `src/features/incidents/hooks/use-inspection-sessions/types.ts`
- `src/features/incidents/hooks/use-inspection-sessions/use-session-lifecycle-mutations.ts`
- `src/features/incidents/hooks/use-inspection-sessions/use-session-asset-mutations.ts`
- `src/features/incidents/hooks/use-inspection-sessions/use-inspection-session-queries.ts`
- database migration for `inspection_sessions.subtype_id` and related indexing if needed

## Technical details

```text
Template (scope only)
  branch/site/building/category/type/subtype
            │
            ├─ Single asset inspection
            │    uses checklist items
            │
            └─ Bulk asset session
                 query hsse_assets by scope
                 ↓
                 create inspection_session_assets
                 ↓
                 inspect real assets in the workspace
```

## Verification I will perform after implementation

1. Create/edit a template for:
  - Branch = RGC
  - Site/Building = Club House
  - Category = Fire Safety Equipment
  - Type = Fire Extinguisher
  - Subtype = Dry Powder (ABC) this pount must opational , if user selected them will dispaly the selected  Subtype, if not will display all subtype. 
2. Confirm the template shows the correct matching asset count/sample list.
3. Start a bulk asset session from that template.
4. Confirm `inspection_session_assets` contains the real extinguisher assets from Club House only.
5. Add a new matching asset in Asset Management, click **Refresh Assets**, and confirm it is added to the session.
6. Confirm the single-asset checklist flow still works separately and still uses checklist items rather than the bulk asset list.