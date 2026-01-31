# HSSE Event Lifecycle Workflow - Current Implementation State

**Document Type:** Technical Audit - As-Implemented Workflow Analysis
**Generated:** 2026-01-31
**Codebase Version:** HEAD (commit b3e9fc0)
**Scope:** Incident & Observation lifecycle system (Current State Only)

---

## Executive Summary

This document presents the **ACTUAL IMPLEMENTED STATE** of the HSSE Event (Incident & Observation) lifecycle system in the Dhuud Gatekeeper platform. The workflow diagrams below are derived from:

- ✅ Database schema analysis (migrations, enums, triggers)
- ✅ Backend API and RPC function logic
- ✅ Frontend component flows and UI guards
- ✅ Role-based access control (RLS policies)
- ✅ Business logic validation gates

**Critical Finding:** Multiple workflow breaks and incomplete implementations identified and documented visually in the diagrams.

---

## How to Read This Diagram

### Color Coding

- **Red Nodes (🔴):** BROKEN - Critical functionality missing or unreachable
- **Orange Nodes (🟠):** PARTIAL - Implemented but incomplete/not enforced
- **Blue Nodes (🔵):** System automated transitions
- **Standard Nodes:** Fully implemented and functional

### Node Format

Each node displays:
```
[Status Name]
(Role: Who can trigger)
(Trigger: UI/API/System/???)
Additional context or issues
```

### Key Symbols

- `✅` - Implemented and working
- `❌` - Not implemented or missing
- `⚠️` - Broken or unreachable
- `???` - Trigger mechanism unclear/missing

---

## Mermaid Workflow Diagram

### Usage Instructions

1. **Copy the entire code block below** (between the triple backticks)
2. **Paste into any Mermaid renderer:**
   - [Mermaid Live Editor](https://mermaid.live)
   - GitHub Markdown (supports Mermaid natively)
   - GitLab Markdown
   - VS Code with Mermaid extension
   - Confluence (with Mermaid plugin)
3. **Render** to view the interactive flowchart

---

```mermaid
flowchart TD
    subgraph LEGEND["🔍 LEGEND"]
        L1["Normal Flow"]
        L2["⚠️ BROKEN/MISSING: Critical Gap"]
        L3["❌ PARTIAL: Incomplete Implementation"]
        L4["System Auto-Transition"]

        style L2 fill:#ff6b6b,stroke:#c92a2a,color:#fff
        style L3 fill:#ffa94d,stroke:#d9480f,color:#000
        style L4 fill:#a5d8ff,stroke:#1864ab,color:#000
    end

    subgraph CREATION["📝 EVENT CREATION (Any User)"]
        START([User Creates Event])
        DRAFT["Draft\n(Role: Reporter)\n(Trigger: UI)"]
        SUBMIT{Event Type?}

        START --> DRAFT
        DRAFT --> SUBMIT
    end

    subgraph INCIDENT_FLOW["🔴 INCIDENT WORKFLOW"]
        INC_SUBMITTED["Submitted\n(Role: System)\n(Trigger: Auto)"]
        INC_DEPT_REV["Pending Dept Rep Review\n(Role: Dept Rep - Read Only)\n(Trigger: Auto)\n⚠️ Mandatory Step"]
        INC_EXPERT["Pending Expert Screening\n(Role: HSSE Expert)\n(Trigger: UI/API)\n✅ SLA: 2hr escalation"]
        INC_REJECTED["Expert Rejected\n(Role: HSSE Expert)\n(Trigger: UI)\nFinal State"]
        INC_ASSIGN["Pending Investigator Assignment\n(Role: HSSE Manager)\n(Trigger: UI)"]
        INC_INVESTIGATION["Under Investigation\n(Role: HSSE Investigator)\n(Trigger: UI)"]

        SUBMIT -->|Incident| INC_SUBMITTED
        INC_SUBMITTED --> INC_DEPT_REV
        INC_DEPT_REV --> INC_EXPERT
        INC_EXPERT -->|Rejected| INC_REJECTED
        INC_EXPERT -->|Approved| INC_ASSIGN
        INC_ASSIGN --> INC_INVESTIGATION
    end

    subgraph OBS_DEPT_FLOW["🟡 OBSERVATION WORKFLOW - Department"]
        OBS_SUBMITTED["Submitted\n(Role: System)\n(Trigger: Auto)"]
        OBS_DEPT["Pending Dept Rep Approval\n(Role: Dept Rep)\n(Trigger: UI)\n❌ NO SLA CHECK"]
        OBS_DEPT_REJECT["Returned to Reporter\n(Role: Dept Rep)\n(Trigger: UI)"]
        OBS_EXPERT["Pending Expert Screening\n(Role: HSSE Expert)\n(Trigger: UI)\n❌ NO SLA CHECK"]

        SUBMIT -->|Observation\n(Non-Contractor)| OBS_SUBMITTED
        OBS_SUBMITTED --> OBS_DEPT
        OBS_DEPT -->|Rejected| OBS_DEPT_REJECT
        OBS_DEPT -->|Approved| OBS_EXPERT
    end

    subgraph OBS_CONTRACTOR_FLOW["🟠 OBSERVATION WORKFLOW - Contractor"]
        OBS_CONTRACTOR["Submitted\n(Role: System)\n(Trigger: Auto)"]
        OBS_CONSULTANT["Pending Consultant Screening\n(Role: Consultant)\n(Trigger: UI)\n❌ NO SLA CHECK"]
        OBS_CLIENT["Pending Site Client Approval\n(Role: Site Client)\n(Trigger: UI)\n❌ NO SLA CHECK"]
        OBS_IMPL["Pending Contractor Implementation\n(Role: Contractor)\n(Trigger: UI)\n❌ NO SLA CHECK"]
        OBS_VERIFY["Pending Consultant Verification\n(Role: Consultant)\n(Trigger: UI)"]
        OBS_VIOLATION["Pending Violation Processing\n(Role: HSSE Manager)\n(Trigger: UI)"]
        OBS_VIOLATION_GAP["⚠️ BROKEN: Violation Management UI\nMissing - Database exists but no frontend"]

        SUBMIT -->|Observation\n(Contractor-Related)| OBS_CONTRACTOR
        OBS_CONTRACTOR --> OBS_CONSULTANT
        OBS_CONSULTANT --> OBS_CLIENT
        OBS_CLIENT --> OBS_IMPL
        OBS_IMPL --> OBS_VERIFY
        OBS_VERIFY -->|Violation Identified| OBS_VIOLATION
        OBS_VIOLATION --> OBS_VIOLATION_GAP

        style OBS_VIOLATION_GAP fill:#ff6b6b,stroke:#c92a2a,color:#fff
    end

    subgraph INVESTIGATION["🔬 INVESTIGATION PHASE (Incidents Only)"]
        INV_WITNESS["Pending Witness Review\n(Role: HSSE Investigator)\n(Trigger: UI)"]
        INV_WITNESS_GAP["❌ PARTIAL: Witness approval check\nSoft validation only - not enforced"]
        INV_RCA["Pending RCA Locking\n(Role: HSSE Investigator)\n(Trigger: ???)"]
        INV_RCA_GAP["⚠️ BROKEN: RCA Locking UI Missing\nDatabase: incident_rca table exists\nFrontend: Uses legacy investigations.root_cause\nUNREACHABLE from UI"]
        INV_HSSE_VAL["Pending HSSE Validation\n(Role: HSSE Expert/Manager)\n(Trigger: UI)"]
        INV_APPROVED["HSSE Validation Approved\n(Role: HSSE Expert/Manager)\n(Trigger: UI)"]
        INV_RETURNED["Returned to Investigator\n(Role: HSSE Expert/Manager)\n(Trigger: UI)"]

        INC_INVESTIGATION --> INV_WITNESS
        INV_WITNESS --> INV_WITNESS_GAP
        INV_WITNESS_GAP --> INV_RCA
        INV_RCA --> INV_RCA_GAP
        INV_RCA_GAP --> INV_HSSE_VAL
        INV_HSSE_VAL -->|Approved| INV_APPROVED
        INV_HSSE_VAL -->|Rejected| INV_RETURNED
        INV_RETURNED --> INC_INVESTIGATION

        style INV_WITNESS_GAP fill:#ffa94d,stroke:#d9480f,color:#000
        style INV_RCA_GAP fill:#ff6b6b,stroke:#c92a2a,color:#fff
    end

    subgraph GOVERNANCE["⚖️ GOVERNANCE PHASE (Violations)"]
        GOV_LEGAL["Pending Legal Review\n(Role: Legal Team)\n(Trigger: UI)"]
        GOV_DISPUTE["Dispute Resolution\n(Role: Dispute Admin)\n(Trigger: UI)"]
        GOV_CONTRACTOR["Pending Contractor Dispute Review\n(Role: Contractor)\n(Trigger: UI)"]
        GOV_APPROVAL["Pending Violation Approval\n(Role: HSSE Manager)\n(Trigger: UI)"]
        GOV_FINE["Pending Fine Calculation\n(Role: Compliance)\n(Trigger: UI)"]

        INV_APPROVED -->|Violation Identified| GOV_LEGAL
        GOV_LEGAL --> GOV_DISPUTE
        GOV_DISPUTE --> GOV_CONTRACTOR
        GOV_CONTRACTOR --> GOV_APPROVAL
        GOV_APPROVAL --> GOV_FINE
    end

    subgraph ACTION_MGMT["✅ ACTION MANAGEMENT PHASE"]
        ACT_PENDING["Pending Action Completion\n(Role: Action Owners)\n(Trigger: System)\nAll corrective actions created"]
        ACT_VERIFICATION["Pending Action Verification\n(Role: Verifiers)\n(Trigger: System)\nAll actions marked completed"]
        ACT_OBS_PENDING["Observation Actions Pending\n(Role: Action Owners)\n(Trigger: System)\nObservation-specific"]
        ACT_EVIDENCE_GAP["⚠️ BROKEN: Gate n57 Not Enforced\nActions can close without evidence\nSoft UI check only - no database trigger"]
        ACT_FINAL_CLOSURE["Pending Final Closure\n(Role: HSSE Manager)\n(Trigger: UI)\nGate n26 Validation"]

        INV_APPROVED -->|No Violation| ACT_PENDING
        GOV_FINE --> ACT_PENDING
        OBS_EXPERT --> ACT_OBS_PENDING
        OBS_VERIFY -->|No Violation| ACT_OBS_PENDING
        OBS_VIOLATION_GAP -->|If Resolved| ACT_OBS_PENDING

        ACT_PENDING --> ACT_VERIFICATION
        ACT_OBS_PENDING --> ACT_VERIFICATION
        ACT_VERIFICATION --> ACT_EVIDENCE_GAP
        ACT_EVIDENCE_GAP --> ACT_FINAL_CLOSURE

        style ACT_EVIDENCE_GAP fill:#ff6b6b,stroke:#c92a2a,color:#fff
    end

    subgraph CLOSURE["🏁 CLOSURE & MONITORING"]
        GATE_N26["Gate n26: Closure Prerequisites Check\n(Role: System)\n(Trigger: API)"]
        GATE_CHECK{All Gates Pass?}
        GATE_FAIL["❌ PARTIAL: Some checks are warnings\n- Evidence count > 0 (soft)\n- Witness approval (soft)\n- RCA locked (soft - unreachable)\n- Actions verified (hard)\n- Investigation complete (hard)"]
        MONITORING_30["Monitoring 30-Day\n(Role: System)\n(Trigger: Timer)"]
        MONITORING_60["Monitoring 60-Day\n(Role: System)\n(Trigger: Timer)"]
        MONITORING_90["Monitoring 90-Day\n(Role: System)\n(Trigger: Timer)"]
        CLOSED["Closed\n(Final State)\n(Role: System)\nRead-Only Archive"]
        REJECTED["Rejected Invalid\n(Final State)\n(Role: HSSE Expert)"]
        REOPENED["Reopened\n(Role: HSSE Manager)\n(Trigger: UI)\nCan return to Submitted"]

        ACT_FINAL_CLOSURE --> GATE_N26
        GATE_N26 --> GATE_CHECK
        GATE_CHECK -->|Fail| GATE_FAIL
        GATE_CHECK -->|Pass| MONITORING_30
        GATE_FAIL -->|Fix Issues| ACT_FINAL_CLOSURE

        MONITORING_30 -->|30 days elapsed| MONITORING_60
        MONITORING_60 -->|60 days elapsed| MONITORING_90
        MONITORING_90 -->|90 days elapsed| CLOSED

        INC_REJECTED --> REJECTED
        OBS_DEPT_REJECT --> REJECTED
        CLOSED -.->|Special Case| REOPENED
        REOPENED -.-> INC_SUBMITTED

        style GATE_FAIL fill:#ffa94d,stroke:#d9480f,color:#000
    end

    subgraph ACTIONS["🎯 CORRECTIVE ACTIONS LIFECYCLE (Parallel to Main Flow)"]
        A_CREATE([Action Created\nfrom Investigation])
        A_ASSIGNED["Assigned\n(Role: Action Owner)\n(Trigger: System)\nSLA starts"]
        A_PROGRESS["In Progress\n(Role: Action Owner)\n(Trigger: UI)\nWork ongoing"]
        A_COMPLETED["Completed\n(Role: Action Owner)\n(Trigger: UI)\nAwaiting verification"]
        A_VERIFIED["Verified\n(Role: Verifier)\n(Trigger: UI)"]
        A_CLOSED["Closed\n(Final State)\n(Role: System/Verifier)"]
        A_OVERDUE["⚠️ Overdue\n(System Flag)\n(Trigger: Cron)\nPast due_date"]
        A_CANCELLED["Cancelled\n(Role: HSSE Manager)\n(Trigger: UI)\nRequires approval"]

        A_CREATE --> A_ASSIGNED
        A_ASSIGNED --> A_PROGRESS
        A_PROGRESS --> A_COMPLETED
        A_COMPLETED --> A_VERIFIED
        A_VERIFIED --> A_CLOSED

        A_ASSIGNED -.->|Past due_date| A_OVERDUE
        A_PROGRESS -.->|Past due_date| A_OVERDUE
        A_ASSIGNED -.->|Cancelled| A_CANCELLED
        A_PROGRESS -.->|Cancelled| A_CANCELLED

        A_COMPLETED -.->|Rejected| A_PROGRESS
    end

    subgraph EXTENSIONS["📅 ACTION EXTENSION WORKFLOW"]
        E_REQUEST([Extension Requested\nby Action Owner])
        E_MANAGER["Manager Review\n(Role: Line Manager)\n(Trigger: UI)"]
        E_MANAGER_DECISION{Approved?}
        E_HSSE["HSSE Manager Review\n(Role: HSSE Manager)\n(Trigger: UI)"]
        E_HSSE_DECISION{Approved?}
        E_APPROVED["Extension Approved\nDue date updated"]
        E_REJECTED["Extension Rejected\nOriginal due date stands"]

        E_REQUEST --> E_MANAGER
        E_MANAGER --> E_MANAGER_DECISION
        E_MANAGER_DECISION -->|No| E_REJECTED
        E_MANAGER_DECISION -->|Yes| E_HSSE
        E_HSSE --> E_HSSE_DECISION
        E_HSSE_DECISION -->|No| E_REJECTED
        E_HSSE_DECISION -->|Yes| E_APPROVED

        A_ASSIGNED -.-> E_REQUEST
        A_PROGRESS -.-> E_REQUEST
        E_APPROVED -.-> A_ASSIGNED
        E_REJECTED -.-> A_ASSIGNED
    end

    subgraph SLA_ESCALATION["⏱️ SLA & ESCALATION (Background Processes)"]
        SLA_CHECK([Scheduled: check_sla_escalation])
        SLA_SCREENING["Screening SLA Check\n✅ pending_expert_screening: 2hr\n❌ MISSING: Other 7+ screening statuses\n(dept_rep, consultant, client, contractor, etc.)"]
        SLA_SCREENING_GAP["⚠️ BROKEN: SLA only checks expert screening\nHardcoded - ignores configured SLAs\nOther screening statuses have NO escalation"]
        SLA_ACTION["Action SLA Escalation\n✅ Priority-based SLA\nCritical: 1d, High: 2d, Medium: 3d, Low: 5d"]
        SLA_WARN["Warning: T-N days\n(Email notification)"]
        SLA_ESC1["Escalation 1: T+N days\n(Escalate to supervisor)\nescalation_level++"]
        SLA_ESC2["Escalation 2: T+N days\n(Escalate to director)\nescalation_level++"]

        SLA_CHECK --> SLA_SCREENING
        SLA_SCREENING --> SLA_SCREENING_GAP
        SLA_CHECK --> SLA_ACTION
        SLA_ACTION --> SLA_WARN
        SLA_WARN --> SLA_ESC1
        SLA_ESC1 --> SLA_ESC2

        style SLA_SCREENING_GAP fill:#ff6b6b,stroke:#c92a2a,color:#fff
    end

    subgraph EVIDENCE_MGMT["📎 EVIDENCE MANAGEMENT"]
        EV_UPLOAD([Evidence Upload])
        EV_TABLE["incident_evidence Table\n(V1.1 Schema)"]
        EV_UI_GAP["⚠️ BROKEN: Evidence Management UI Missing\nDatabase table exists with soft delete policy\nFrontend still uses old attachment approach\nDeletion policy (hard vs soft) not implemented"]
        EV_REVIEW["Evidence Review\n(Role: Investigator)\n(Trigger: UI)"]
        EV_DELETION["Evidence Deletion Policy\n✅ Database: Hard delete in Draft/Screening/Investigation\n✅ Database: Soft delete in Governance/Action Mgmt/Closed\n❌ Frontend: No UI implementation"]

        EV_UPLOAD --> EV_TABLE
        EV_TABLE --> EV_UI_GAP
        EV_UI_GAP -.-> EV_REVIEW
        EV_TABLE --> EV_DELETION

        style EV_UI_GAP fill:#ff6b6b,stroke:#c92a2a,color:#fff
    end

    subgraph IMPACT_ASSESSMENT["🏥 IMPACT ASSESSMENT (Parallel)"]
        IMP_INJURY([Injury Impact Tab\nOpened by Investigator])
        IMP_CLINIC["Clinic User Auto-Assignment\n(Role: Clinic User)\n(Trigger: ???)"]
        IMP_CLINIC_GAP["⚠️ MISSING: Auto-assignment not implemented\nV1.1 spec n29 - UI exists but no auto-assign trigger"]

        IMP_ENV([Environmental Impact Tab\nOpened by Investigator])
        IMP_ENV_EXPERT["Env Expert Auto-Assignment\n(Role: Env Expert)\n(Trigger: ???)"]
        IMP_ENV_GAP["⚠️ MISSING: Auto-assignment not implemented\nV1.1 spec n48 - UI exists but no auto-assign trigger"]

        IMP_TECH([Technical Impact Tab\nOpened by Investigator])
        IMP_TECH_EVAL["Tech Evaluator Auto-Assignment\n(Role: Tech Evaluator)\n(Trigger: ???)"]
        IMP_TECH_GAP["⚠️ MISSING: Auto-assignment not implemented\nV1.1 spec n40 - UI exists but no auto-assign trigger"]

        IMP_INJURY --> IMP_CLINIC
        IMP_CLINIC --> IMP_CLINIC_GAP
        IMP_ENV --> IMP_ENV_EXPERT
        IMP_ENV_EXPERT --> IMP_ENV_GAP
        IMP_TECH --> IMP_TECH_EVAL
        IMP_TECH_EVAL --> IMP_TECH_GAP

        style IMP_CLINIC_GAP fill:#ffa94d,stroke:#d9480f,color:#000
        style IMP_ENV_GAP fill:#ffa94d,stroke:#d9480f,color:#000
        style IMP_TECH_GAP fill:#ffa94d,stroke:#d9480f,color:#000
    end

    subgraph AI_ANALYSIS["🤖 AI AUTOMATION"]
        AI_TRIGGER([Incident Description Entered])
        AI_ANALYSIS_MANUAL["AI Analyze Button\n(Role: Reporter/Investigator)\n(Trigger: Manual)"]
        AI_AUTO_GAP["❌ PARTIAL: Should auto-trigger on description blur\nV1.1 spec - Currently requires manual button click"]
        AI_CATEGORIZE["AI Auto-Categorization\n(Contractor/Department linking)"]
        AI_TAGS["AI Tags & Analysis\nai_analysis_data stored"]

        AI_TRIGGER --> AI_ANALYSIS_MANUAL
        AI_ANALYSIS_MANUAL --> AI_AUTO_GAP
        AI_AUTO_GAP --> AI_CATEGORIZE
        AI_CATEGORIZE --> AI_TAGS

        style AI_AUTO_GAP fill:#ffa94d,stroke:#d9480f,color:#000
    end

    style INCIDENT_FLOW fill:#ffe0e0,stroke:#c92a2a
    style OBS_DEPT_FLOW fill:#fff4e6,stroke:#d9480f
    style OBS_CONTRACTOR_FLOW fill:#fff0db,stroke:#e67700
    style INVESTIGATION fill:#e7f5ff,stroke:#1864ab
    style GOVERNANCE fill:#f3f0ff,stroke:#5f3dc4
    style ACTION_MGMT fill:#d3f9d8,stroke:#2b8a3e
    style CLOSURE fill:#f8f9fa,stroke:#495057
    style ACTIONS fill:#d0ebff,stroke:#1971c2
    style EXTENSIONS fill:#ffec99,stroke:#e67700
    style SLA_ESCALATION fill:#ffc9c9,stroke:#c92a2a
    style EVIDENCE_MGMT fill:#e9ecef,stroke:#495057
    style IMPACT_ASSESSMENT fill:#d0bfff,stroke:#6741d9
    style AI_ANALYSIS fill:#b2f2bb,stroke:#2b8a3e
```

---

## Critical Issues Identified

### 🔴 BROKEN (Immediate Action Required)

1. **RCA Locking UI Missing** (Investigation Phase)
   - **Impact:** Cannot lock RCA as required by V1.1 specification (Gate requirement)
   - **Root Cause:** Frontend uses legacy `investigations.root_cause`, not `incident_rca` table
   - **Files:** `src/hooks/use-investigation.ts`, `supabase/migrations/20260124221625_workflow_v1_1_schema.sql:189-226`

2. **Action Evidence Gate (n57) Not Enforced** (Action Management)
   - **Impact:** Corrective actions can be closed without evidence
   - **Root Cause:** No database trigger; soft UI check only
   - **Files:** `src/components/actions/ActionProgressDialog.tsx`

3. **SLA Escalation Only Covers Expert Screening** (Screening Phase)
   - **Impact:** 7+ screening statuses have no SLA monitoring
   - **Root Cause:** Hardcoded logic in `check_sla_escalation()`
   - **Files:** `supabase/migrations/20260124221625_workflow_v1_1_schema.sql:334-346`

4. **Evidence Management UI Missing** (Evidence Phase)
   - **Impact:** Cannot use V1.1 `incident_evidence` table features
   - **Root Cause:** Frontend still uses old attachment approach
   - **Files:** `supabase/migrations/20260124221625_workflow_v1_1_schema.sql:152-187`

5. **Contractor Violation Management UI Missing** (Governance Phase)
   - **Impact:** Cannot process contractor violations from observations
   - **Root Cause:** Database schema exists, no frontend implementation
   - **Files:** `supabase/migrations/20260124221625_workflow_v1_1_schema.sql:235-249`

### 🟠 PARTIAL (Enhancement Required)

6. **Witness Approval Check Not Enforced** (Investigation Phase)
   - **Impact:** Investigation can progress without proper witness review
   - **Current:** Soft validation (warning only)
   - **Files:** `supabase/migrations/20260124221625_workflow_v1_1_schema.sql:431-440`

7. **Gate n26 Has Soft Checks** (Closure Phase)
   - **Impact:** Inconsistent enforcement of closure prerequisites
   - **Current:** Evidence count and witness approval are warnings, not exceptions
   - **Files:** `supabase/migrations/20260124221625_workflow_v1_1_schema.sql:357-511`

8. **Impact Specialist Auto-Assignment Missing** (Investigation Phase)
   - **Impact:** Manual assignment required (should be automatic)
   - **Affected:** Clinic User (n29), Tech Evaluator (n40), Env Expert (n48)
   - **Files:** `src/components/incidents/EnvironmentalDetailsSection.tsx` and similar

9. **AI Analysis Not Automatic** (Creation Phase)
   - **Impact:** Requires manual button click (should auto-trigger)
   - **Current:** Manual "AI Analyze" button in IncidentReport
   - **Files:** Referenced in WORKFLOW_AUDIT_REPORT.md

---

## Database Schema Quick Reference

### Status Enums (36+ values)

**Draft:** `draft`
**Screening:** `submitted`, `pending_expert_screening`, `pending_dept_rep_approval`, `pending_contractor_screening`, `pending_consultant_screening`, `pending_site_client_approval`, `pending_contractor_implementation`
**Investigation:** `under_investigation`, `pending_investigator_assignment`, `pending_witness_review`, `pending_rca_locking`, `pending_hsse_validation`
**Governance:** `pending_legal_review`, `dispute_resolution`, `pending_contractor_dispute_review`, `pending_violation_approval`, `pending_fine_calculation`
**Action Management:** `pending_action_completion`, `pending_action_verification`, `observation_actions_pending`, `pending_final_closure`, `monitoring_30_day`, `monitoring_60_day`, `monitoring_90_day`
**Closed:** `closed`, `rejected_invalid`, `reopened`

### Stage Enum (V1.1)

`Draft` | `Screening` | `Investigation` | `Governance` | `Action_Management` | `Closed`

### Key Tables

- `incidents` - Main event table (both incidents and observations)
- `incident_evidence` - V1.1 evidence management (⚠️ UI missing)
- `incident_rca` - V1.1 RCA with locking (⚠️ UI missing)
- `investigations` - Legacy investigation table (still in use)
- `witness_statements` - Witness accounts
- `corrective_actions` - Action management
- `action_evidence` - Action verification evidence
- `action_extension_requests` - Extension workflow
- `contract_violations` - Contractor violations (⚠️ UI missing)

---

## Role-Based Access Control

### HSSE Roles

- `hsse_officer` - Data entry, basic reporting
- `hsse_investigator` - Investigation conduct
- `hsse_expert` - Expert screening, validation
- `hsse_manager` - Management decisions, RCA unlock, approvals
- `incident_analyst` - Analysis and categorization
- `emergency_response_leader` - Emergency response

### Access Function

`has_hsse_incident_access(user_id)` - Returns TRUE if user has any HSSE role

### RLS Policies

- **Incidents SELECT:** All tenant users
- **Incidents UPDATE:** HSSE users OR incident reporter
- **Investigations:** HSSE users only (INSERT/UPDATE)
- **Corrective Actions UPDATE:** HSSE users OR assigned user
- **Witness Statements:** Hardened RLS (tenant + HSSE OR assigned OR reporter)

---

## Key Files Reference

### Database Migrations

- **Primary schema:** `supabase/migrations/20251206011005_e0fe197e-2865-40b4-96e6-71f456b3071f.sql`
- **V1.1 updates:** `supabase/migrations/20260124221625_workflow_v1_1_schema.sql`
- **SLA configs:** `supabase/migrations/20251207210438_df30d697-6cb2-4475-b035-83f7155df4e9.sql`
- **Action extensions:** `supabase/migrations/20251212152012_80026f64-895f-4513-bb1c-d7c9036f5098.sql`

### Frontend Hooks

- `src/hooks/use-incidents.ts` - Core incident CRUD
- `src/hooks/use-incident-closure.ts` - Closure workflow
- `src/hooks/use-investigation.ts` - Investigation management (⚠️ needs migration to incident_rca)
- `src/hooks/use-overdue-actions.ts` - Action SLA management

### Frontend Components

- `src/components/incidents/detail/` - Incident detail UI
- `src/pages/incidents/InvestigationWorkspace.tsx` - Investigation workspace
- `src/components/investigation/HSSEObservationValidationCard.tsx` - HSSE validation
- `src/components/actions/` - Action management UI

---

## Recommendations (Priority Order)

### Immediate (Critical Path Blockers)

1. ✅ **Migrate RCA UI to `incident_rca` table** - Enable RCA locking workflow
2. ✅ **Add database trigger for action evidence validation** - Enforce Gate n57
3. ✅ **Expand SLA escalation to all screening statuses** - Fix incomplete monitoring

### Short-Term (High Priority)

4. ✅ **Implement evidence management UI** - Enable V1.1 `incident_evidence` features
5. ✅ **Implement contractor violation management UI** - Enable governance workflow
6. ✅ **Harden Gate n26 checks** - Convert warnings to exceptions

### Medium-Term (Enhancement)

7. ✅ **Add specialist auto-assignment triggers** - Clinic/Tech/Env specialist automation
8. ✅ **Auto-trigger AI analysis** - Remove manual button requirement
9. ✅ **Unify investigation completeness checks** - Frontend/backend consistency

### Long-Term (Cleanup)

10. ✅ **Remove legacy `severity` column** - Consolidate to `severity_v2`
11. ✅ **Create status display utility library** - Reduce statusMappings complexity
12. ✅ **Consolidate RLS policy role checks** - Use centralized functions

---

## Document Maintenance

**Last Updated:** 2026-01-31
**Next Review:** When implementing fixes or adding new workflow stages
**Contact:** Architecture team for clarifications on workflow logic

---

**END OF DOCUMENT**
