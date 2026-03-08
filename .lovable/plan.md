

## Plan: Add i18n for `/client-site-rep` dashboard

### Problem
The entire `clientSiteRep` top-level namespace is **missing** from both EN and AR locale files. All 8 components under this page use `t("clientSiteRep.*")` keys that currently fall back to default strings. Additionally, `violations.severity.*`, `violations.status.*`, `violations.type`, `violations.company`, and `violations.reportedAt` keys used by ViolationsCard are missing from the existing `violations` section.

### Missing Keys

**`clientSiteRep` namespace (~55 keys):**

| Key | Default | Source |
|-----|---------|--------|
| `dashboard` | "Site Representative Dashboard" | Dashboard.tsx |
| `welcome` | "Welcome" | Dashboard.tsx |
| `managingCompanies` | "You manage {{count}} contractor companies" | Dashboard.tsx |
| `myCompanies` | "My Companies" | AssignedCompaniesCard |
| `noCompaniesAssigned` | "No companies assigned to you" | AssignedCompaniesCard |
| `contractEnds` | "Contract ends" | AssignedCompaniesCard |
| `contractorReps` | "Contractor Representatives" | AssignedCompaniesCard, PersonnelCard |
| `safetyOfficers` | "Safety Officers" | AssignedCompaniesCard, PersonnelCard, WorkersSummaryCard |
| `onsite` | "Onsite" | AssignedCompaniesCard |
| `offsite` | "Offsite" | AssignedCompaniesCard |
| `noPersonnelAssigned` | "No personnel assigned" | AssignedCompaniesCard |
| `workers` | "Workers" | WorkersSummaryCard |
| `approved` | "Approved" | WorkersSummaryCard, GatePassesSummaryCard |
| `pending` | "Pending" | WorkersSummaryCard, GatePassesSummaryCard |
| `rejected` | "Rejected" | WorkersSummaryCard, GatePassesSummaryCard |
| `blacklisted` | "Blacklisted" | WorkersSummaryCard |
| `expired` | "Expired" | GatePassesSummaryCard |
| `safetyCoverage` | "Safety Coverage" | WorkersSummaryCard |
| `noSafetyOfficerAssigned` | "No Safety Officer" | WorkersSummaryCard |
| `showingFiltered` | "Showing {{status}} workers ({{count}})" | WorkersSummaryCard |
| `allWorkers` | "All Workers ({{count}})" | WorkersSummaryCard |
| `noWorkersMatchFilter` | "No workers match this filter" | WorkersSummaryCard |
| `noWorkersFound` | "No workers found" | WorkersSummaryCard |
| `gatePasses` | "Gate Passes" | GatePassesSummaryCard |
| `showingFilteredGatePasses` | "Showing {{status}} gate passes ({{count}})" | GatePassesSummaryCard |
| `allGatePasses` | "All Gate Passes ({{count}})" | GatePassesSummaryCard |
| `noGatePassesMatchFilter` | "No gate passes match this filter" | GatePassesSummaryCard |
| `noGatePassesFound` | "No gate passes found" | GatePassesSummaryCard |
| `projects` | "Projects" | ProjectsSummaryCard |
| `noProjectsAssigned` | "No projects assigned" | ProjectsSummaryCard |
| `active` | "Active" | ProjectsSummaryCard |
| `planned` | "Planned" | ProjectsSummaryCard |
| `completed` | "Completed" | ProjectsSummaryCard |
| `onHold` | "On Hold" | ProjectsSummaryCard |
| `showingFilteredProjects` | "Showing {{status}} projects ({{count}})" | ProjectsSummaryCard |
| `allProjects` | "All Projects ({{count}})" | ProjectsSummaryCard |
| `noProjectsMatchFilter` | "No projects match this filter" | ProjectsSummaryCard |
| `noProjectsFound` | "No projects found" | ProjectsSummaryCard |
| `startDate` | "Start" | ProjectsSummaryCard |
| `hsseEvents` | "HSSE Events" | IncidentsSummaryCard |
| `open` | "Open" | IncidentsSummaryCard |
| `underInvestigation` | "Under Investigation" | IncidentsSummaryCard |
| `closed` | "Closed" | IncidentsSummaryCard |
| `showingFilteredEvents` | "Showing {{status}} events ({{count}})" | IncidentsSummaryCard |
| `allEvents` | "All HSSE Events ({{count}})" | IncidentsSummaryCard |
| `noEventsMatchFilter` | "No events match this filter" | IncidentsSummaryCard |
| `noEventsFound` | "No HSSE events found" | IncidentsSummaryCard |
| `noDescription` | "No description" | IncidentsSummaryCard |
| `personnelOverview` | "Personnel Overview" | PersonnelCard |
| `noSafetyOfficers` | "No safety officers found" | PersonnelCard |
| `noContractorReps` | "No contractor representatives found" | PersonnelCard |
| `recentViolations` | "Recent Violations" | ViolationsCard |
| `noViolations` | "No violations recorded" | ViolationsCard |
| `export.title` | "Export Reports" | ClientSiteRepExport |
| `export.workers` | "Workers" | ClientSiteRepExport |
| `export.incidents` | "Incidents" | ClientSiteRepExport |
| `export.violations` | "Violations" | ClientSiteRepExport |
| `export.csv` | "CSV" | ClientSiteRepExport |
| `export.excel` | "Excel" | ClientSiteRepExport |
| `export.noCompanies` | "No companies assigned" | ClientSiteRepExport |
| `export.noWorkers` | "No workers to export" | ClientSiteRepExport |
| `export.noIncidents` | "No incidents to export" | ClientSiteRepExport |
| `export.noViolations` | "No violations to export" | ClientSiteRepExport |
| `export.success` | "Export successful" | ClientSiteRepExport |
| `export.downloadStarted` | "Your download has started" | ClientSiteRepExport |
| `export.failed` | "Failed to export data" | ClientSiteRepExport |
| `export.columns.fullName` | "Full Name" | ClientSiteRepExport |
| `export.columns.arabicName` | "Arabic Name" | ClientSiteRepExport |
| `export.columns.nationalId` | "National ID" | ClientSiteRepExport |
| `export.columns.nationality` | "Nationality" | ClientSiteRepExport |
| `export.columns.mobile` | "Mobile" | ClientSiteRepExport |
| `export.columns.status` | "Status" | ClientSiteRepExport |
| `export.columns.company` | "Company" | ClientSiteRepExport |
| `export.columns.createdAt` | "Created At" | ClientSiteRepExport |
| `export.columns.reference` | "Reference" | ClientSiteRepExport |
| `export.columns.title` | "Title" | ClientSiteRepExport |
| `export.columns.type` | "Type" | ClientSiteRepExport |
| `export.columns.severity` | "Severity" | ClientSiteRepExport |
| `export.columns.location` | "Location" | ClientSiteRepExport |
| `export.columns.occurredAt` | "Occurred At" | ClientSiteRepExport |
| `export.columns.violationType` | "Violation Type" | ClientSiteRepExport |
| `export.columns.reportedAt` | "Reported At" | ClientSiteRepExport |

**`violations` namespace — missing keys (~7):**

| Key | Default | Source |
|-----|---------|--------|
| `severity.low` | "Low" | ViolationsCard |
| `severity.medium` | "Medium" | ViolationsCard |
| `severity.high` | "High" | ViolationsCard |
| `severity.critical` | "Critical" | ViolationsCard |
| `status.open` | "Open" | ViolationsCard |
| `status.investigating` | "Investigating" | ViolationsCard |
| `status.resolved` | "Resolved" | ViolationsCard |
| `status.dismissed` | "Dismissed" | ViolationsCard |
| `type` (label) | "Type" | ViolationsCard |
| `company` (label) | "Company" | ViolationsCard |
| `reportedAt` | "Reported At" | ViolationsCard |

**`accessControl` namespace — missing keys (~2, used by ClientSiteRepRoute):**
The key `accessControl.accessDenied` already exists elsewhere but `accessControl.notClientSiteRep` is missing.

### Changes

#### 1. `src/locales/en/translation.json`
- Add top-level `clientSiteRep` object with all ~80 keys (dashboard, cards, export, columns)
- Add ~11 missing keys to existing `violations` object (`severity.*`, `status.*`, `type`, `company`, `reportedAt`)
- Add `accessControl.notClientSiteRep` if not present

#### 2. `src/locales/ar/translation.json`
- Add matching `clientSiteRep` object with Arabic translations
- Add matching `violations` sub-keys with Arabic translations
- Add `accessControl.notClientSiteRep` Arabic translation

### No component changes needed
All components already use correct `t()` call paths with proper defaults.

