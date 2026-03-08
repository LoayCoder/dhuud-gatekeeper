

## Plan: Fix i18n for `/contractors/workers` page

### Problem
The `/contractors/workers` page has missing translation keys (TYPE B) in both EN and AR locale files. Console logs confirm `contractors.workers.selectWorker` is missing. Many keys used by `Workers.tsx`, `WorkerListTable.tsx`, `WorkerFormDialog.tsx`, `WorkerApprovalQueue.tsx`, `WorkerSecurityApprovalQueue.tsx`, `WorkerBulkActionsToolbar.tsx`, and `WorkerActionsDropdown.tsx` are absent from the locale files.

### Missing Keys Analysis

**EN `contractors.workers` (lines 8063-8086) — currently has only 12 keys, needs ~25 more:**

| Missing Key | Default Value | Component |
|---|---|---|
| `title` | "Contractor Workers" | Workers.tsx |
| `description` | "Manage contractor workers and approvals" | Workers.tsx |
| `addWorker` | "Add Worker" | Workers.tsx |
| `allWorkers` | "All Workers" | Workers.tsx |
| `securityApprovals` | "Security Approvals" | Workers.tsx |
| `searchPlaceholder` | "Search workers..." | Workers.tsx |
| `bulkImport` | "Bulk Import" | Workers.tsx |
| `noWorkers` | "No workers found" | WorkerListTable.tsx |
| `selectAll` | "Select all" | WorkerListTable.tsx |
| `selectWorker` | "Select {{name}}" | WorkerListTable.tsx |
| `name` | "Full Name" | WorkerListTable.tsx |
| `role` | "Role" | WorkerListTable.tsx |
| `company` | "Company" | WorkerListTable.tsx |
| `selectCompany` | "Select company" | WorkerFormDialog.tsx |
| `editWorker` | "Edit Worker" | WorkerFormDialog.tsx |
| `editWorkerDescription` | "Update the worker information..." | WorkerFormDialog.tsx |
| `updateSuccess` | "Worker updated successfully" | WorkerFormDialog.tsx |
| `blacklistedWarning` | "Blacklisted" | WorkerListTable.tsx |
| `editsPending` | "Edits pending review" | WorkerListTable.tsx |
| `siteRep` | "Site Rep" | WorkerListTable.tsx |
| `safetyOfficer` | "Safety Officer" | WorkerListTable.tsx |
| `changeStatus` | "Change Status" | WorkerActionsDropdown.tsx |
| `addToBlacklist` | "Add to Blacklist" | WorkerActionsDropdown.tsx |
| `bulkApprove` | "Approve Selected" | WorkerBulkActionsToolbar.tsx |
| `bulkReject` | "Reject Selected" | WorkerBulkActionsToolbar.tsx |
| `bulkMessage` | "Send Message" | WorkerBulkActionsToolbar.tsx |
| `bulkInduction` | "Send Induction" | WorkerBulkActionsToolbar.tsx |
| `noPendingApprovals` | "No pending approvals" | WorkerApprovalQueue.tsx |

**EN `contractors.workerStatus` (lines 8139-8144) — exists, complete.**

**EN `contractors.induction` (lines 8146-8179) — exists, has all needed keys.**

**EN — missing `contractors` root-level keys used by SecurityApprovalQueue:**

| Missing Key | Default Value |
|---|---|
| `securityRoleOnly` | "Only Security Supervisors or Security Managers can approve workers" |
| `contactSecurity` | "Please contact your Security team..." |
| `noWorkersAwaitingSecurityApproval` | "No workers awaiting security approval" |
| `securityApprovalQueue` | "Security Approval Queue" |
| `securityApproverRoles` | "Security Supervisor / Security Manager" |
| `pending` | "pending" |
| `securityApprovalNote` | "After approval, a safety induction video..." |
| `securityApprovalDescription` | "These workers have been pre-approved..." |
| `nationalId` | "ID" |
| `siteRepresentative` | "Site Representative" |
| `safetyOfficer` | "Safety Officer" |
| `preApprovedAt` | "Pre-approved by Contractor Admin/Consultant" |
| `grantSecurityClearance` | "Grant Security Clearance" |
| `returnToPending` | "Return with Comments" |
| `returnWorkerToPending` | "Return Worker to Pending" |
| `returnWorkerDescription` | "Please provide comments..." |
| `securityCommentsPlaceholder` | "Enter security comments/concerns..." |
| `pendingSecurityReview` | "Pending Security Review" |

**AR — `contractors.workers` (line 6872-6878) has only 5 keys. Needs all the above + AR translations.**
**AR — `contractors.workerStatus` section is completely missing.**
**AR — `contractors.induction` section needs verification.**

### Changes

#### 1. `src/locales/en/translation.json`
- Expand `contractors.workers` section (line 8063) with ~25 missing keys
- Add ~18 missing `contractors.*` root-level keys for security approval queue

#### 2. `src/locales/ar/translation.json`
- Expand `contractors.workers` section (line 6872) with Arabic translations for all ~30 keys
- Add `contractors.workerStatus` section with Arabic translations
- Add ~18 `contractors.*` root-level keys for security approval queue in Arabic

### No component changes needed
All components already use `t()` calls correctly.

