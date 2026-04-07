

# Unify Gate Pass Creation — Replace Old Form Everywhere

## Problem

The contractor portal (`/contractor-portal/gate-passes`) and `MyGatePassesTab` still use the **old** `GatePassFormDialog` (663 lines, legacy form), while the admin pages (`/contractors/gate-passes`, `/my-gate-passes`) already use the **new** `GatePassCreateDialog` → `GatePassCreateWizard`.

## Plan

### 1. Update contractor portal page — `src/pages/contractor-portal/GatePasses.tsx`
- Replace `GatePassFormDialog` import with `GatePassCreateDialog`
- Replace `<GatePassFormDialog ... projects={} canCreateInternal={} canCreateExternal={} contractorCompanyId={} />` with `<GatePassCreateDialog open={isFormOpen} onOpenChange={setIsFormOpen} />`
- Remove unused imports (`ContractorProject` type)

### 2. Update MyGatePassesTab — `src/features/contractors/components/MyGatePassesTab.tsx`
- Replace `GatePassFormDialog` import with `GatePassCreateDialog`
- Replace `<GatePassFormDialog ...>` with `<GatePassCreateDialog open={} onOpenChange={} />`
- Remove the `GatePassFormDialogWrapper` component (no longer needed since the wizard handles project fetching internally)

### 3. Remove old form — `src/features/contractors/components/GatePassFormDialog.tsx`
- Delete the file (663 lines of legacy code)
- Remove its export from `src/features/contractors/index.ts`

**Files changed:** 4 files (2 updates, 1 delete, 1 export cleanup)

