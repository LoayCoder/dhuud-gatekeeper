# Implementation Plan: Architecture Compliance Fixes

## Executive Summary

This plan addresses 8 deviations identified in the architecture compliance audit, organized by priority. The implementation follows existing patterns discovered in the codebase and maintains consistency with the established architecture.

---

## Implementation Order & Dependencies

### Phase 1: Quick Wins (Week 1)
1. **Issue 8: AI Context Feeds** - Low complexity, immediate benefit
2. **Issue 5: RCA Unlock** - UI fix, high visibility
3. **Issue 6: Contract Controller** - Integration verification

### Phase 2: Core Workflows (Week 2-3)
4. **Issue 1: AI Auto-Trigger** - High priority, self-contained
5. **Issue 4: Environmental Expert** - Uses existing role, simpler

### Phase 3: New Roles & Workflows (Week 4-5)
6. **Issue 2: Clinic User** - New role, new workflow
7. **Issue 3: Tech Evaluator** - New role, similar to #6

### Phase 4: Optional Enhancements (Week 6+)
8. **Issue 7: Leader Review Cycles** - Complex, lower priority

---

## Issue 1: AI Auto-Trigger Missing (HIGH PRIORITY)

### Current State
- AI Analysis requires manual trigger via "Analyze with AI" button in `/src/pages/incidents/IncidentReport.tsx` (line 1008-1019)
- The `useIncidentAIValidator` hook has the analysis capability but is only called via `handleAnalyzeDescription` callback

### Solution Design
Implement debounced auto-trigger when description meets minimum length requirements (20 characters).

### Implementation Steps

**Step 1.1: Create Auto-Trigger Hook**
- **New File:** `/src/hooks/use-ai-auto-trigger.ts`
- Create a hook that debounces description changes and auto-triggers AI analysis
- Include configurable debounce delay (recommend 1500-2000ms after user stops typing)
- Add minimum character threshold check (20 characters per existing validation)
- Track whether AI has already been triggered for current content (prevent duplicate calls)

**Step 1.2: Modify IncidentReport.tsx**
- **File:** `/src/pages/incidents/IncidentReport.tsx`
- Add `useEffect` to watch `description` and `title` fields (lines 217-218)
- Implement debounced auto-trigger after user stops typing
- Keep manual "Analyze with AI" button as fallback (for re-analysis or if auto-trigger fails)
- Add state to track if auto-analysis is in progress vs user-initiated

**Step 1.3: Add User Preferences**
- **File:** `/src/hooks/use-ai-auto-trigger.ts`
- Add localStorage-based preference to enable/disable auto-trigger
- Add UI toggle in incident form to control auto-trigger behavior

### Files to Modify
| File | Change Type |
|------|-------------|
| `/src/hooks/use-ai-auto-trigger.ts` | **New file** |
| `/src/pages/incidents/IncidentReport.tsx` | Modify |
| `/src/hooks/use-incident-ai-validator.ts` | Minor modification (add cancellation support) |

### Estimated Complexity
Medium - Requires careful debouncing logic and state management

---

## Issue 2: Clinic User Role Assignment (MEDIUM PRIORITY)

### Current State
- `InjuryPanel.tsx` accepts `canEdit` prop but has no role-specific assignment
- No `clinic_user` role defined in database
- Any investigator can complete injury data

### Solution Design
Implement clinic user role with automatic assignment workflow when injury is detected.

### Implementation Steps

**Step 2.1: Add Clinic User Role**
- **New Migration:** Create SQL migration to add `clinic_user` role
- Insert into `roles` table with category `hsse`, module_access `['hsse_core']`
- Add role description focused on medical/injury documentation

**Step 2.2: Create Assignment Workflow Hook**
- **New File:** `/src/hooks/use-injury-assignment.ts`
- Create hook to manage clinic user assignment for incidents
- Query available clinic users in the branch/site
- Track assignment status in `incident_injuries` or new join table

**Step 2.3: Create Clinic Assignment Card Component**
- **New File:** `/src/components/investigation/ClinicUserAssignmentCard.tsx`
- Display when incident has injury but no clinic user assigned
- Allow HSSE Expert/Manager to assign clinic user from available list
- Send notification to assigned clinic user

**Step 2.4: Modify InjuryPanel.tsx**
- **File:** `/src/components/investigation/InjuryPanel.tsx`
- Add role check: only assigned clinic user OR investigator can edit
- Display assignment status banner
- Add audit logging for clinic user actions

**Step 2.5: Update InvestigationWorkspace**
- **File:** `/src/pages/incidents/InvestigationWorkspace.tsx`
- Add ClinicUserAssignmentCard to workflow cards (similar to InvestigatorAssignmentStep)
- Show card when incident has injury and no clinic user assigned

### Database Changes
```sql
-- Add clinic_user role
INSERT INTO roles (code, name, category, description, module_access, sort_order)
VALUES ('clinic_user', 'Clinic User', 'hsse', 'Medical/clinic professional for injury documentation', ARRAY['hsse_core'], 25);

-- Add assigned_clinic_user_id to incidents table (or use incident_assignments)
ALTER TABLE incidents ADD COLUMN assigned_clinic_user_id UUID REFERENCES auth.users(id);
```

### Files to Create/Modify
| File | Change Type |
|------|-------------|
| `/supabase/migrations/YYYYMMDD_add_clinic_user_role.sql` | **New file** |
| `/src/hooks/use-injury-assignment.ts` | **New file** |
| `/src/components/investigation/ClinicUserAssignmentCard.tsx` | **New file** |
| `/src/components/investigation/InjuryPanel.tsx` | Modify |
| `/src/pages/incidents/InvestigationWorkspace.tsx` | Modify |
| `/src/components/investigation/index.ts` | Modify (export new component) |

### Estimated Complexity
Medium-High - Requires new role, assignment workflow, and notification integration

---

## Issue 3: Tech Evaluator Role Assignment (MEDIUM PRIORITY)

### Current State
- Property damage panel has `canEdit` prop but no role-specific assignment
- No `tech_evaluator` role defined
- Any investigator can complete property damage data

### Solution Design
Mirror the clinic user pattern for tech evaluator role assignment.

### Implementation Steps

**Step 3.1: Add Tech Evaluator Role**
- **New Migration:** Create SQL migration to add `tech_evaluator` role
- Insert into `roles` table with category `hsse`, module_access `['hsse_core']`

**Step 3.2: Create Assignment Workflow Hook**
- **New File:** `/src/hooks/use-property-damage-assignment.ts`
- Create hook to manage tech evaluator assignment
- Query available tech evaluators in branch/site

**Step 3.3: Create Tech Evaluator Assignment Card**
- **New File:** `/src/components/investigation/TechEvaluatorAssignmentCard.tsx`
- Display when incident has property damage but no evaluator assigned
- Allow HSSE Expert/Manager to assign from available list

**Step 3.4: Modify PropertyDamagePanel**
- Add role check: only assigned tech evaluator OR investigator can edit
- Display assignment status banner

**Step 3.5: Update InvestigationWorkspace**
- **File:** `/src/pages/incidents/InvestigationWorkspace.tsx`
- Add TechEvaluatorAssignmentCard to workflow

### Database Changes
```sql
-- Add tech_evaluator role
INSERT INTO roles (code, name, category, description, module_access, sort_order)
VALUES ('tech_evaluator', 'Tech Evaluator', 'hsse', 'Technical evaluator for property/asset damage assessment', ARRAY['hsse_core'], 26);

-- Add assigned_tech_evaluator_id to incidents table
ALTER TABLE incidents ADD COLUMN assigned_tech_evaluator_id UUID REFERENCES auth.users(id);
```

### Files to Create/Modify
| File | Change Type |
|------|-------------|
| `/supabase/migrations/YYYYMMDD_add_tech_evaluator_role.sql` | **New file** |
| `/src/hooks/use-property-damage-assignment.ts` | **New file** |
| `/src/components/investigation/TechEvaluatorAssignmentCard.tsx` | **New file** |
| Property damage panel | Modify |
| `/src/pages/incidents/InvestigationWorkspace.tsx` | Modify |

### Estimated Complexity
Medium - Similar pattern to Issue 2

---

## Issue 4: Environmental Expert Role Assignment (MEDIUM PRIORITY)

### Current State
- `EnvironmentalImpactPanel.tsx` has `canEdit` prop but no explicit assignment workflow
- `environmental_expert` role EXISTS in database (found in migration 20251203224313)
- No assignment workflow to link expert to specific incident

### Solution Design
Create assignment workflow using existing `environmental_expert` role.

### Implementation Steps

**Step 4.1: Create Assignment Workflow Hook**
- **New File:** `/src/hooks/use-environmental-assignment.ts`
- Create hook to manage environmental expert assignment
- Query available environmental experts in branch/site

**Step 4.2: Create Environmental Expert Assignment Card**
- **New File:** `/src/components/investigation/EnvironmentalExpertAssignmentCard.tsx`
- Display when incident has environmental impact but no expert assigned
- Allow HSSE Manager to assign from available list

**Step 4.3: Modify EnvironmentalImpactPanel.tsx**
- **File:** `/src/components/investigation/environmental-impact/EnvironmentalImpactPanel.tsx`
- Add role check: only assigned environmental expert OR investigator can edit
- Display assignment status banner

**Step 4.4: Update InvestigationWorkspace**
- **File:** `/src/pages/incidents/InvestigationWorkspace.tsx`
- Add EnvironmentalExpertAssignmentCard to workflow

### Database Changes
```sql
-- Add assigned_environmental_expert_id to incidents table
ALTER TABLE incidents ADD COLUMN assigned_environmental_expert_id UUID REFERENCES auth.users(id);
```

### Files to Create/Modify
| File | Change Type |
|------|-------------|
| `/supabase/migrations/YYYYMMDD_add_specialist_assignments.sql` | **New file** |
| `/src/hooks/use-environmental-assignment.ts` | **New file** |
| `/src/components/investigation/EnvironmentalExpertAssignmentCard.tsx` | **New file** |
| `/src/components/investigation/environmental-impact/EnvironmentalImpactPanel.tsx` | Modify |
| `/src/pages/incidents/InvestigationWorkspace.tsx` | Modify |

### Estimated Complexity
Medium - Similar pattern to Issues 2 and 3

---

## Issue 5: RCA Unlock by HSSE Manager (MEDIUM PRIORITY)

### Current State
- RCA locking IS implemented (`is_locked` field, `handleLockAnalysis` function)
- Unlock button IS present in RCAPanel.tsx (lines 462-476)
- `unlock_rca` RPC function EXISTS (found in migration 20260124221625)
- **However:** The unlock button may have visibility issues or role checking problems

### Solution Design
Verify and fix the unlock flow visibility and functionality.

### Implementation Steps

**Step 5.1: Verify RPC Function**
- Confirm `unlock_rca` function accepts correct parameter name (`rca_id`)
- Test RPC function directly to ensure it works

**Step 5.2: Fix Unlock Button Visibility**
- **File:** `/src/components/investigation/RCAPanel.tsx`
- Current condition: `{!isClosed && isHSSEManager && (...)`
- Ensure `isHSSEManager` is correctly derived from `useUserRoles`
- Add visual distinction for unlock button

**Step 5.3: Add Unlock Confirmation Dialog**
- Add confirmation dialog before unlock
- Include warning about implications of unlocking

**Step 5.4: Add Audit Logging for Unlock**
- Log unlock action to `incident_audit_logs`
- Include who unlocked and when

**Step 5.5: Enhance UI Visibility**
- Make unlock button more prominent when RCA is locked
- Add clear "Locked by: [Name] at [Date]" information
- Display locked_by and locked_at from rcaData

### Files to Modify
| File | Change Type |
|------|-------------|
| `/src/components/investigation/RCAPanel.tsx` | Modify |
| `/src/locales/en/translation.json` | Add new translation keys |
| `/src/locales/ar/translation.json` | Add new translation keys |

### Estimated Complexity
Low-Medium - Primarily UI enhancements and verification

---

## Issue 6: Contract Controller Review (MEDIUM PRIORITY)

### Current State
- `ContractControllerApprovalCard.tsx` EXISTS and is implemented
- Handles `pending_contract_controller_approval` status
- Uses `useContractControllerApproval` hook

### Gap Analysis
The card exists but may not be properly integrated into the workflow routing.

### Solution Design
Ensure contract controller workflow is properly integrated.

### Implementation Steps

**Step 6.1: Verify Status Routing in InvestigationWorkspace**
- **File:** `/src/pages/incidents/InvestigationWorkspace.tsx`
- Check if `pending_contract_controller_approval` is handled in `renderWorkflowCards()`
- Add case if missing

**Step 6.2: Verify Workflow Transition**
- Ensure status transitions properly to `pending_contract_controller_approval`
- Check `InvestigatorViolationSubmissionCard` triggers correct status change

**Step 6.3: Add to Pending Approvals**
- **File:** `/src/hooks/use-pending-approvals.ts`
- Add `pending_contract_controller_approval` to `pendingStatuses` array

**Step 6.4: Verify RPC Permission Check**
- Ensure `can_approve_investigation` RPC handles contract controller role
- Or create separate `can_approve_contract_controller` RPC if needed

### Files to Modify
| File | Change Type |
|------|-------------|
| `/src/pages/incidents/InvestigationWorkspace.tsx` | Modify (add case) |
| `/src/hooks/use-pending-approvals.ts` | Modify |

### Estimated Complexity
Low-Medium - Mostly integration verification and routing

---

## Issue 7: Leader Review Cycles (LOW PRIORITY)

### Current State
- Injury, Property, and Environmental panels don't have explicit leader review/return cycles
- Data is saved directly without approval gate

### Solution Design
Add optional review/return workflow for specialist-completed data.

### Implementation Steps

**Step 7.1: Add Review Status Fields**
- Add `review_status` field to injury/property/environmental records
- Values: `draft`, `pending_review`, `approved`, `returned`

**Step 7.2: Create Generic Review Component**
- **New File:** `/src/components/investigation/SpecialistDataReviewCard.tsx`
- Reusable component for reviewing specialist data
- Show summary of changes, approve/return actions

**Step 7.3: Modify Panel Components**
- Add "Submit for Review" button in each panel
- Show review status banner
- Disable editing when pending review or approved

**Step 7.4: Add Notification Flow**
- Notify lead investigator when data submitted for review
- Notify specialist when data returned with comments

### Database Changes
```sql
-- Add review fields to incident_injuries
ALTER TABLE incident_injuries ADD COLUMN review_status TEXT DEFAULT 'draft';
ALTER TABLE incident_injuries ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE incident_injuries ADD COLUMN reviewed_at TIMESTAMPTZ;
ALTER TABLE incident_injuries ADD COLUMN review_notes TEXT;

-- Similar for property damage and environmental tables
```

### Files to Create/Modify
| File | Change Type |
|------|-------------|
| `/supabase/migrations/YYYYMMDD_add_review_workflow.sql` | **New file** |
| `/src/components/investigation/SpecialistDataReviewCard.tsx` | **New file** |
| `/src/components/investigation/InjuryPanel.tsx` | Modify |
| Property damage panel | Modify |
| `/src/components/investigation/environmental-impact/EnvironmentalImpactPanel.tsx` | Modify |

### Estimated Complexity
High - Requires schema changes and new workflow logic

---

## Issue 8: AI Context Feeds (LOW PRIORITY)

### Current State
- RCA AI edge function (`/supabase/functions/rca-ai-assistant/index.ts`) DOES support automatic data enrichment
- It fetches witness statements, evidence, environmental details, injury details, damage details
- **However:** The frontend hook `use-rca-ai.ts` doesn't pass `incident_id` to enable this enrichment

### Solution Design
Pass `incident_id` to RCA AI calls to enable automatic context enrichment.

### Implementation Steps

**Step 8.1: Modify use-rca-ai.ts**
- **File:** `/src/hooks/use-rca-ai.ts`
- Add `incidentId` parameter to hook
- Pass `incident_id` in all RCA AI calls

**Step 8.2: Modify RCAPanel.tsx**
- **File:** `/src/components/investigation/RCAPanel.tsx`
- Pass `incidentId` to `useRCAAI` hook (currently not passed)
- Update all AI function calls to include incident_id

**Step 8.3: Modify AI Function Calls**
- Update `callRCAAI` payload to include `incident_id` when available
- The edge function will automatically enrich context

**Step 8.4: Add Context Indicator UI**
- Show what context data is being used for AI suggestions
- Display "Using X witness statements, Y evidence items" in AI cards

### Files to Modify
| File | Change Type |
|------|-------------|
| `/src/hooks/use-rca-ai.ts` | Modify |
| `/src/components/investigation/RCAPanel.tsx` | Modify |
| `/src/components/investigation/FiveWhysBuilder.tsx` | Modify (if directly using AI) |
| `/src/components/investigation/RootCausesBuilder.tsx` | Modify (if directly using AI) |
| `/src/components/investigation/ContributingFactorsBuilder.tsx` | Modify (if directly using AI) |

### Estimated Complexity
Low - Primarily passing parameters through existing structure

---

## Shared Migration Strategy

Create a single consolidated migration for Issues 2, 3, 4:

```sql
-- Migration: Add specialist assignment workflow

-- Add new roles
INSERT INTO roles (code, name, category, description, module_access, sort_order)
VALUES
  ('clinic_user', 'Clinic User', 'hsse', 'Medical professional for injury documentation', ARRAY['hsse_core'], 25),
  ('tech_evaluator', 'Tech Evaluator', 'hsse', 'Technical evaluator for property damage assessment', ARRAY['hsse_core'], 26)
ON CONFLICT (code) DO NOTHING;

-- Add assignment columns to incidents
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS assigned_clinic_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_tech_evaluator_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_environmental_expert_id UUID REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_incidents_specialist_assignments
  ON incidents(assigned_clinic_user_id, assigned_tech_evaluator_id, assigned_environmental_expert_id);
```

---

## Testing Strategy

### Unit Tests
- Test debounce logic for AI auto-trigger
- Test role permission checks for each panel
- Test assignment workflow hooks

### Integration Tests
- Test full assignment workflow from detection to completion
- Test RCA lock/unlock cycle
- Test contract controller approval flow

### E2E Tests
- Test incident with injury → clinic user assignment → completion
- Test incident with damage → tech evaluator assignment → completion
- Test AI auto-trigger on new incident creation

---

## Summary: Files to Create

| New File | Purpose | Phase |
|----------|---------|-------|
| `/src/hooks/use-ai-auto-trigger.ts` | Debounced AI auto-trigger hook | Phase 2 |
| `/src/hooks/use-injury-assignment.ts` | Clinic user assignment workflow | Phase 3 |
| `/src/hooks/use-property-damage-assignment.ts` | Tech evaluator assignment workflow | Phase 3 |
| `/src/hooks/use-environmental-assignment.ts` | Environmental expert assignment workflow | Phase 2 |
| `/src/components/investigation/ClinicUserAssignmentCard.tsx` | Clinic user assignment UI | Phase 3 |
| `/src/components/investigation/TechEvaluatorAssignmentCard.tsx` | Tech evaluator assignment UI | Phase 3 |
| `/src/components/investigation/EnvironmentalExpertAssignmentCard.tsx` | Environmental expert assignment UI | Phase 2 |
| `/src/components/investigation/SpecialistDataReviewCard.tsx` | Reusable review component | Phase 4 |
| `/supabase/migrations/YYYYMMDD_add_specialist_assignments.sql` | Database schema changes | Phase 3 |
| `/supabase/migrations/YYYYMMDD_add_review_workflow.sql` | Review workflow schema | Phase 4 |

## Summary: Files to Modify

| File | Issues | Changes |
|------|--------|---------|
| `/src/pages/incidents/IncidentReport.tsx` | #1 | Add auto-trigger effect |
| `/src/hooks/use-rca-ai.ts` | #8 | Add incident_id parameter |
| `/src/components/investigation/RCAPanel.tsx` | #5, #8 | Fix unlock visibility, pass incident_id |
| `/src/components/investigation/InjuryPanel.tsx` | #2, #7 | Role check, review workflow |
| `/src/components/investigation/environmental-impact/EnvironmentalImpactPanel.tsx` | #4, #7 | Role check, review workflow |
| `/src/pages/incidents/InvestigationWorkspace.tsx` | #2, #3, #4, #6 | Add workflow cards |
| `/src/hooks/use-pending-approvals.ts` | #6 | Add contract controller status |

---

*Plan Generated: 2026-01-25*
