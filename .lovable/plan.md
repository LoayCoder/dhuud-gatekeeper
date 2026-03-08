

## Plan: Fix i18n for `/contractors/gate-passes` page

### Problem
The Gate Passes page and its sub-components use `t()` calls correctly, but many translation keys are missing from both EN and AR locale files. The `contractors.passStatus` section exists in EN but is missing from AR. The `contractorPortal.gatePasses` section is sparse in both languages.

### Missing Keys by Component

**GatePasses.tsx (page) — missing from EN `contractors.gatePasses`:**
| Key | Default | Status |
|-----|---------|--------|
| `title` | "Material Gate Passes" | Missing EN+AR |
| `description` | "Manage material and equipment gate passes" | Missing EN+AR |
| `createPass` | "Create Gate Pass" | Missing EN+AR |
| `allPasses` | — | Exists AR, missing EN |
| `todayPasses` | "Today's Passes" | Missing EN+AR |
| `searchPlaceholder` | — | Exists AR, missing EN |
| `project` | "Project" | Missing EN |
| `noTodayPasses` | "No approved passes for today" | Missing EN+AR |

**GatePassListTable.tsx — missing from EN `contractors.gatePasses`:**
| Key | Default |
|-----|---------|
| `noPasses` | "No gate passes found" |
| `reference` | "Reference" |
| `type` | "Type" |
| `material` | "Material" |
| `requestedBy` | "Requested By" |
| `vehiclePlate` | "Vehicle" |
| `timeWindow` | "Time Window" |
| `internalRequest` | "Internal Request" |

**GatePassListTable.tsx — `contractors.passType.*` (dynamic):**
Used via `t(\`contractors.passType.${pass.pass_type}\`)` — need to ensure coverage for pass type codes.

**GatePassFormDialog.tsx — missing from EN `contractors.gatePasses`:**
| Key | Default |
|-----|---------|
| `selectProject` | "Select project" |
| `noProject` | "-- No Project (Internal) --" |
| `noProjectRequired` | "No Project Required" |
| `selectPassType` | "Select pass type" |
| `materialIn` | "Material In" |
| `materialOut` | "Material Out" |
| `equipmentIn` | "Equipment In" |
| `equipmentOut` | "Equipment Out" |
| `approvalFrom` | "Approval From" |
| `noProjectManager` | "No project manager assigned" |
| `assignPMFirst` | "Please assign a project manager..." |
| `selectApprover` | "Select Approver" |
| `selectApproverPlaceholder` | "Select an approver" |
| `internalApproverNote` | "For internal requests..." |
| `itemName` | "Item Name" |
| `itemNamePlaceholder` | "e.g., Cement" |
| `description` (form context) | "Description" |
| `descriptionPlaceholder` | "e.g., 50kg bags" |
| `quantity` | "Qty" |
| `unit` | "Unit" |
| `selectUnit` | "Select" |
| `units.*` (15 unit types) | Pieces, Bags, etc. |
| `photos` | "Photos" |
| `generalDocuments` | "General Documents (Optional)" |
| `attachedPhoto` | "Attached photo" |
| `addPhoto` | "Add" |
| `singlePhotoNote` | "Single photo..." |
| `startDate` | "Start Date" |
| `endDate` | "End Date" |
| `dateRangeNote` | "Pass validity..." |
| `timeLoggedByGuard` | "Actual entry and exit times..." |
| `driverName` | "Driver Name" |
| `driverMobile` | "Driver Mobile" |
| `missingProjectInfoError` | "Missing project manager..." |

**TodayGatePasses.tsx — missing from EN `contractors.gatePasses`:**
| Key | Default |
|-----|---------|
| `exited` | "Exited" |
| `onSite` | "On Site" |
| `entryAt` | "Entry" |
| `exitAt` | "Exit" |
| `awaitingEntry` | "Awaiting Entry" |
| `completed` | "Completed" |

**GatePassApprovalQueue.tsx — missing from `contractorPortal.gatePasses`:**
| Key | Default |
|-----|---------|
| `noPendingForRole` | "There are no gate passes waiting..." |
| `awaitingContractor` | "Awaiting Contractor Approval" |
| `awaitingDeptAck` | "Awaiting Dept Acknowledgment" |
| `awaitingDeptApproval` | "Awaiting Dept Approval" |
| `awaitingClubMgmtAck` | "Awaiting Golf Club Management" |
| `awaitingSecurity` | "Awaiting Security Approval" |
| `awaitingPm` | "Awaiting PM Approval" |
| `awaitingSafety` | "Awaiting Safety Approval" |
| `bulk.selectAll` | "Select All" |

**`contractors.passStatus` — exists in EN (8297-8311), completely missing from AR.**

### Changes

#### 1. `src/locales/en/translation.json`
- Add ~40 missing keys to `contractors.gatePasses` (title, description, createPass, form fields, unit options, today pass statuses, etc.)
- Add missing keys to `contractorPortal.gatePasses` (approval stage labels, bulk actions, empty states)

#### 2. `src/locales/ar/translation.json`
- Add ~40 matching Arabic keys to `contractors.gatePasses`
- Add `contractors.passStatus` section (13 statuses)
- Add missing keys to `contractorPortal.gatePasses` (approval stage labels, bulk actions)

### No component changes needed
All components already use correct `t()` calls.

### Summary
| Section | EN Missing | AR Missing |
|---------|-----------|-----------|
| `contractors.gatePasses` | ~40 | ~50 |
| `contractors.passStatus` | 0 | 13 |
| `contractorPortal.gatePasses` | ~10 | ~15 |
| **Total** | **~50** | **~78** |

