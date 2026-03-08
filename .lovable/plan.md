

## Plan: Fix i18n for `/contractors/settings` (GatePassSettings page)

### Problem
The GatePassSettings page and its sub-components (`ApproversSettingsCard`, `PassTypeSettingsCard`, `utils.tsx`) use ~20 `t()` keys under `contractors.gatePasses.*` that are **missing** from both EN and AR locale files.

### Missing Keys (all under `contractors.gatePasses`)

| Key | Default Value | Used In |
|-----|---------------|---------|
| `settings` | "Gate Pass Settings" | GatePassSettings.tsx |
| `settingsDescription` | "Configure approver options for gate pass requests" | GatePassSettings.tsx |
| `deleteApproverTitle` | "Delete Approver?" | GatePassSettings.tsx |
| `deleteApproverDescription` | "This approver will be removed..." | GatePassSettings.tsx |
| `deletePassTypeTitle` | "Delete Pass Type?" | GatePassSettings.tsx |
| `deletePassTypeDescription` | "This pass type will be removed..." | GatePassSettings.tsx |
| `approverSources` | "Approval Sources" | ApproversSettingsCard |
| `approverSourcesDescription` | "Define who can approve gate pass requests" | ApproversSettingsCard |
| `addApprover` | "Add Approver" | ApproversSettingsCard |
| `approverUser` | "User" | ApproversSettingsCard |
| `approverScope` | "Scope" | ApproversSettingsCard/PassTypeSettingsCard |
| `selectUser` | "Select user..." | ApproversSettingsCard |
| `scopeExternal` | "External" | ApproversSettingsCard/PassTypeSettingsCard/utils |
| `scopeInternal` | "Internal" | ApproversSettingsCard/PassTypeSettingsCard/utils |
| `scopeBoth` | "Both" | ApproversSettingsCard/PassTypeSettingsCard/utils |
| `noApprovers` | "No approvers configured. Add one to get started." | ApproversSettingsCard |
| `passTypeControl` | "Pass Type Control" | PassTypeSettingsCard |
| `passTypeControlDescription` | "Configure which pass types are available..." | PassTypeSettingsCard |
| `addPassType` | "Add Pass Type" | PassTypeSettingsCard |
| `code` | "Code" | PassTypeSettingsCard |
| `passTypeName` | "Name" | PassTypeSettingsCard |
| `passTypeNameAr` | "Name (Arabic)" | PassTypeSettingsCard |
| `noPassTypes` | "No pass types configured. Add one to get started." | PassTypeSettingsCard |

### Changes

#### 1. `src/locales/en/translation.json`
Add 23 keys to the existing `contractors.gatePasses` object (insert before closing brace at line ~8416).

#### 2. `src/locales/ar/translation.json`
Add matching 23 Arabic keys to the `contractors.gatePasses` section.

### No component changes needed
All components already use correct `t()` call paths.

