

# Replace Old Gate Pass Dialog with Enhanced Wizard

## Problem

Both `/my-gate-passes` (List.tsx) and `/contractors/gate-passes` (GatePasses.tsx) use the **old** `GatePassFormDialog` — a basic dialog-based form that lacks all the recent enhancements (structured vehicle plate, driver phone input, approval flow preview, item validation, etc.).

The new `GatePassCreateWizard` with all those features exists but is only wired to `Create.tsx`, which the router redirects away from. So users never see the new form.

## Solution

Replace `GatePassFormDialog` usage in both pages with `GatePassCreateWizard`, rendered inside a full-screen dialog (or sheet).

## Changes

### 1. Create `GatePassCreateDialog.tsx` (New wrapper component)

A new `Dialog` (or full-screen sheet) component that wraps `GatePassCreateWizard`:
- Props: `open`, `onOpenChange`
- Renders `GatePassCreateWizard` inside a `DialogContent` with full height
- Passes `onCancel={() => onOpenChange(false)}` and `onSuccess={() => onOpenChange(false)}` to the wizard
- The wizard already handles all form logic, validation, and submission

### 2. Update `src/pages/my-gate-passes/List.tsx`

- Replace `import { GatePassFormDialog }` with the new `GatePassCreateDialog`
- Remove the `projects`, `canCreateInternal`, `canCreateExternal` props (wizard handles internally)
- Keep the same `createDialogOpen` / `setCreateDialogOpen` state

### 3. Update `src/pages/contractors/GatePasses.tsx`

- Replace `GatePassFormDialog` with `GatePassCreateDialog`
- Remove project/permission props passed to the old dialog

### 4. Restore `/my-gate-passes/create` route

- Remove the redirect in `my-gate-passes.routes.tsx`
- Restore the route to render `MyGatePassCreate` page (the wizard as a full page)
- Keep menu item pointing to `/my-gate-passes/create`

### Files Modified

| File | Change |
|------|--------|
| New: `src/features/contractors/components/GatePassCreateDialog.tsx` | Dialog wrapper around `GatePassCreateWizard` |
| `src/pages/my-gate-passes/List.tsx` | Swap `GatePassFormDialog` → `GatePassCreateDialog` |
| `src/pages/contractors/GatePasses.tsx` | Swap `GatePassFormDialog` → `GatePassCreateDialog` |
| `src/routes/my-gate-passes.routes.tsx` | Restore `/create` route instead of redirect |
| `src/features/contractors/components/index.ts` | Export new dialog |

### Technical Notes

- `GatePassCreateWizard` already has all enhanced features: structured plate, `DhuudPhoneInput`, `ApprovalFlowPreview`, item validation with qty/unit/photos enforcement
- The old `GatePassFormDialog` (663 lines) remains in codebase for now but is no longer used — can be removed in a cleanup pass
- The wizard's `onCancel` and `onSuccess` callbacks handle dialog close and list refresh

