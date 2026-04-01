# HSSE Events Module - Comprehensive Audit & Optimization Execution Plan

**Project:** Dhuud Gatekeeper  
**Module:** HSSE Events (Incident Reporting, Observation Reporting, Investigation)  
**Date:** April 1, 2026  
**Objective:** Complete code verification, UI/UX inspection, data integration validation, workflow optimization

---

## 📋 Executive Overview

| Phase | Duration | Focus |
|-------|----------|-------|
| **1. Discovery** | 2-3 days | Repository analysis, architecture understanding |
| **2. Audit** | 5-7 days | Code-level validation, database integrity, API checks |
| **3. Testing** | 5-7 days | E2E testing, edge cases, failure scenarios |
| **4. Fixing** | 7-14 days | Bug fixes, gap closure, integration repairs |
| **5. Validation** | 3-5 days | Final validation, acceptance criteria |

**Total Estimated:** 22-36 days

---

## 🔍 Phase 1: Discovery (2-3 Days)

### 1.1 Repository Structure Analysis

| Component | Files Found | Location |
|-----------|-------------|----------|
| **Incident Hooks** | 18 files | `src/hooks/use-incidents.ts`, `use-incident-*.ts` |
| **Observation Hooks** | 12 files | `src/hooks/use-observation-*.ts` |
| **Investigation Hooks** | 8 files | `src/hooks/use-investigation*.ts` |
| **Notifications** | 14 files | `src/hooks/notifications/`, `use-hsse-notifications.ts` |
| **Workflow** | 15+ files | `src/hooks/workflow/`, `use-hsse-workflow.ts` |

### 1.2 Key Files Identified

```
src/hooks/
├── use-incidents.ts (28KB - Main incident management)
├── use-incident-closure.ts (16KB)
├── use-incident-confidentiality.ts (11KB)
├── use-investigation.ts (23KB)
├── use-investigation-team.ts (9KB)
├── use-hsse-workflow.ts (24KB)
├── use-hsse-notifications.ts (14KB)
├── incident-management/
│   └── index.ts
└── contractor-observation/
```

### 1.3 Database Schema (Supabase)

```
supabase/
├── migrations/
└── functions/
```

### 1.4 Discovery Checklist ✅

- [x] Repository cloned
- [x] File structure mapped
- [x] Key hooks identified
- [x] Workflow documentation reviewed (HSSE_INCIDENT_LIFECYCLE_WORKFLOW.md)

---

## 📊 Phase 2: Audit (5-7 Days)

### 2.1 Code-Level Validation

#### 2.1.1 Incident Creation Flow

| Check | Status | Issue |
|-------|--------|-------|
| Event type selection | ✅ | Working - branching logic exists |
| Draft state management | ✅ | Implemented |
| Submission validation | ⚠️ | Check required fields enforcement |
| Category/Subcategory selection | ⚠️ | Verify data loading |
| Location/GPS capture | ⚠️ | Test GPS permission handling |
| Photo/Document upload | ⚠️ | Check file size limits, format validation |
| Offline support | ⚠️ | Verify offline-assets.ts integration |

#### 2.1.2 Observation Reporting

| Check | Status | Issue |
|-------|--------|-------|
| Quick observation creation | ✅ | Admin edit observation hook exists |
| Category classification | ⚠️ | Validate categories loading |
| Severity assignment | ⚠️ | Check severity enum mapping |
| Root cause selection | ⚠️ | Verify RCA AI integration |
| Assign to asset | ⚠️ | Test asset linking |

#### 2.1.3 Investigation Process

| Check | Status | Issue |
|-------|--------|-------|
| Investigation team assignment | ✅ | use-investigation-team.ts |
| SLA configuration | ✅ | use-investigation-sla-config.ts |
| Evidence collection | ⚠️ | Check evidence items management |
| Witness statements | ✅ | use-witness-statements.ts |
| Corrective actions | ⚠️ | Verify action tracking |
| Closure workflow | ✅ | use-incident-closure.ts |

### 2.2 Database Integrity & Relationships

#### 2.2.1 Tables to Validate

```
Core Tables:
- incidents
- observations
- investigations
- investigation_teams
- investigation_evidence
- incident_injuries
- incident_property_damages
- corrective_actions
- witness_statements

Relationships:
- incidents -> users (reporter_id, assigned_to)
- incidents -> departments
- investigations -> incidents
- investigation_team_members -> investigations -> users
- corrective_actions -> incidents -> findings
```

#### 2.2.2 Database Checklist

- [ ] Foreign key constraints validation
- [ ] Index performance for common queries
- [ ] RLS (Row Level Security) policies review
- [ ] Data consistency between related tables
- [ ] Audit trail (created_at, updated_at, created_by)

### 2.3 API & Integration Checks

#### 2.3.1 API Endpoints

| Endpoint | Method | Status |
|----------|--------|--------|
| `/incidents` | POST | Create incident |
| `/incidents/:id` | GET/PATCH | Read/Update |
| `/incidents/list` | GET | List with filters |
| `/investigations` | POST | Create investigation |
| `/investigation/:id/assign` | POST | Assign team |
| `/incidents/:id/close` | POST | Closure workflow |
| `/notifications/send` | POST | Trigger notification |

#### 2.3.2 Integration Points

- **Supabase:** Database operations, realtime subscriptions
- **AI Services:** RCA AI, Incident AI Validator, Observation AI Validator
- **Offline Sync:** Offline report queue, local storage
- **Notifications:** Matrix notifications, push subscriptions

### 2.4 UI/UX Consistency

#### 2.4.1 Design System Compliance

- [ ] Component library usage (check components.json)
- [ ] Tailwind consistency (tailwind.config.ts)
- [ ] Color scheme adherence
- [ ] Typography standards
- [ ] Icon library usage

#### 2.4.2 Workflow State Transitions

| State | Next States | Validation |
|-------|-------------|------------|
| Draft | Submitted | Required fields filled |
| Submitted | Dept Review | Auto-transition |
| Pending Dept Rep | Expert Screening | Dept Rep approval |
| Pending Expert | Assignment/Reject | Expert decision |
| Under Investigation | Pending Action | Investigation complete |
| Pending Action | In Progress | Action assigned |
| Closed | - | Final state |

### 2.5 Role-Based Access Control

| Role | Permissions |
|------|-------------|
| Employee | Create incident/observation, view own |
| Dept Rep | Review incidents, approve/reject |
| HSSE Expert | Screen incidents, assign severity |
| HSSE Manager | Assign investigators, oversee |
| HSSE Investigator | Conduct investigation, add evidence |
| Admin | Full access, override capabilities |

### 2.6 Audit Checklist - Detailed

#### Code Level
- [ ] All hooks have proper error handling
- [ ] Loading states implemented
- [ ] TypeScript strict mode compliance
- [ ] No hardcoded values (use env variables)
- [ ] Proper cleanup in useEffect hooks

#### Database
- [ ] All foreign keys have cascade delete rules where appropriate
- [ ] Unique constraints on business logic fields
- [ ] Partitioning strategy for large tables
- [ ] Migration rollback capability

#### API
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Response caching where appropriate
- [ ] Proper error responses (not just 500)

#### UI/UX
- [ ] Responsive design works on mobile
- [ ] Loading skeletons for async operations
- [ ] Toast notifications for user feedback
- [ ] Form validation with clear error messages
- [ ] Empty states for lists

---

## 🧪 Phase 3: Testing (5-7 Days)

### 3.1 End-to-End User Journeys

#### Test Scenario 1: Create Incident (Employee)

```
1. Login as Employee
2. Navigate to HSSE Events
3. Click "Report Incident"
4. Select category: Workplace Safety
5. Fill: Title, Description, Location
6. Upload photo evidence
7. Submit
8. Verify: Notification sent to Dept Rep
9. Verify: Incident appears in my incidents list
```

#### Test Scenario 2: Observation to Incident Escalation

```
1. Login as Dept Rep
2. View pending observations
3. Select observation with potential severity
4. Escalate to incident
5. Verify: New incident created
6. Verify: Original observation marked as escalated
```

#### Test Scenario 3: Full Investigation Flow

```
1. Login as HSSE Manager
2. Receive incident notification
3. Assign investigation team
4. Login as Investigator
5. Add evidence, witness statements
6. Request corrective actions
7. Login as responsible party
8. Complete corrective action
9. Investigator verify and close
10. Manager approve closure
```

### 3.2 Edge Cases & Failure Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Offline submission | Queue for sync, show pending status |
| Large file upload (>10MB) | Show error, suggest compression |
| Session timeout during form | Save draft, prompt re-login |
| Duplicate incident submission | Show warning, allow override |
| SLA breach | Trigger escalation notification |
| Investigation team member unavailable | Allow reassignment |
| Multiple simultaneous closures | Queue processing, no race condition |

### 3.3 Performance Testing

- [ ] Load test: 100 concurrent users creating incidents
- [ ] API response time < 200ms for list queries
- [ ] Image upload processing < 5 seconds
- [ ] Realtime notification delivery < 1 second

### 3.4 Security Testing

- [ ] SQL injection prevention
- [ ] XSS prevention in user inputs
- [ ] IDOR prevention (test accessing other user's incidents)
- [ ] Role escalation prevention
- [ ] Sensitive data exposure check

---

## 🔧 Phase 4: Fixing (7-14 Days)

### 4.1 Prioritized Action Plan

#### HIGH PRIORITY (Week 1-2)

| Issue | Impact | Fix Approach |
|-------|--------|--------------|
| Broken workflow transitions | Complete process halt | Fix state machine logic |
| Missing notifications | Users unaware of tasks | Implement notification triggers |
| Offline sync failures | Data loss risk | Fix sync queue logic |
| RLS policy gaps | Security risk | Add/fix policies |
| SLA not enforced | Compliance risk | Implement SLA monitoring |

#### MEDIUM PRIORITY (Week 2-3)

| Issue | Impact | Fix Approach |
|-------|--------|--------------|
| UI inconsistencies | User confusion | Align with design system |
| Missing form validations | Data quality | Add validation rules |
| Performance bottlenecks | Slow UX | Optimize queries, add caching |
| Missing error handling | Poor UX | Add try-catch, user feedback |

#### LOW PRIORITY (Week 3-4)

| Issue | Impact | Fix Approach |
|-------|--------|--------------|
| Cosmetic issues | Minor UX | Polish UI |
| Documentation gaps | Developer confusion | Add inline docs |
| Minor edge cases | Rare failures | Handle gracefully |

### 4.2 Gap Closure Matrix

| Gap ID | Description | Root Cause | Fix | Owner |
|--------|-------------|------------|-----|-------|
| G001 | Dept Rep review step not accessible | UI routing missing | Add route guard | Frontend |
| G002 | Investigation team can't see incident details | RLS policy | Update policy | Backend |
| G003 | Notification not sent on assignment | Trigger missing | Add hook | Backend |
| G004 | Corrective action status not updating | State mutation issue | Fix state logic | Frontend |
| G005 | Offline incident not syncing | Sync queue bug | Debug sync logic | Frontend |

---

## ✅ Phase 5: Validation (3-5 Days)

### 5.1 Success Criteria & Acceptance Checklist

#### Functional Requirements

- [ ] Can create incident with all required fields
- [ ] Can create observation and escalate to incident
- [ ] Can assign investigation team
- [ ] Can add evidence and witness statements
- [ ] Can create and track corrective actions
- [ ] Can close incident with all approvals
- [ ] Notifications sent at correct workflow stages
- [ ] Offline mode creates and syncs properly

#### Performance Requirements

- [ ] Page load < 2 seconds
- [ ] API responses < 500ms
- [ ] No memory leaks in long sessions
- [ ] Offline mode functional

#### Security Requirements

- [ ] RLS policies enforced
- [ ] No sensitive data in client logs
- [ ] Session timeout works
- [ ] Role-based access enforced

### 5.2 End-to-End Test Scenarios

| Test | Result | Notes |
|------|--------|-------|
| Full incident lifecycle | Pass/Fail | - |
| Full observation lifecycle | Pass/Fail | - |
| Investigation with multiple team members | Pass/Fail | - |
| Offline creation -> Online sync | Pass/Fail | - |
| Notification delivery | Pass/Fail | - |
| Role-based access for all roles | Pass/Fail | - |

### 5.3 Sign-Off Criteria

- [ ] All HIGH priority items resolved
- [ ] 90%+ of MEDIUM priority items resolved
- [ ] All functional test scenarios pass
- [ ] Security review passed
- [ ] Performance targets met
- [ ] Stakeholder acceptance received

---

## 📊 Risk Identification & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Complex workflow logic | High | High | Document thoroughly, test extensively |
| Offline sync issues | Medium | High | Prioritize testing, have fallback |
| Integration failures | Medium | High | Mock services for testing |
| Timeline overrun | Medium | Medium | Buffer time, prioritize ruthlessly |
| Resource constraints | Low | High | Plan for 2 senior engineers |

---

## 📁 Deliverables

1. **Audit Report** - Detailed findings with screenshots
2. **Code Changes** - All fixes committed to repository
3. **Test Results** - E2E test reports
4. **Documentation** - Updated workflow docs
5. **Runbook** - Operational procedures for support team

---

## 🚀 Next Steps

1. **Confirm scope** - Does this plan cover all requirements?
2. **Assign resources** - 2-3 engineers recommended
3. **Set up environment** - Development, staging, testing
4. **Begin Phase 1** - Start discovery immediately
5. **Schedule daily standups** - Track progress

---

*Plan generated: April 1, 2026*  
*For: Dhuud Gatekeeper - HSSE Events Module Audit*