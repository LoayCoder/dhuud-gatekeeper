
# Unified Observation & Incident Workflow Bug Fix Plan

## Executive Summary

This plan addresses three interconnected issues in the HSSA event reporting system related to Contractor Consultant workflow routing, capabilities, and UI consistency.

## Current State Analysis

### Issue 1: Contractor Observation Routing to Contractor Consultant

**Current Implementation:**
- The `auto_route_observation_on_submit()` trigger function in the database is designed to route contractor-related observations to Contractor Consultants
- When `related_contractor_company_id IS NOT NULL`, the system should:
  - Find a `contractor_consultant` for the branch
  - Set status to `pending_consultant_screening` (or legacy `expert_screening`)
  - Assign `approval_manager_id` to the consultant

**Identified Gap:**
- There are multiple migration files with conflicting versions of the routing function
- Some versions query `user_role_assignments.role` directly (text column that may not exist) instead of joining with the `roles` table properly
- The trigger relies on `ura.role = 'contractor_consultant'` in some migrations but `r.code = 'contractor_consultant'` in others
- This inconsistency can cause routing failures depending on which migration ran last

**Fix Required:**
Consolidate and fix the `auto_route_observation_on_submit()` function to:
1. Always join `user_role_assignments` with `roles` table using `r.code`
2. Properly set status to `pending_consultant_screening` for contractor observations
3. Include tenant-wide fallback (where `branch_id IS NULL`)

---

### Issue 2: Contractor Consultant Full Capabilities

**Current Implementation (Working Correctly):**
- The `can_approve_investigation()` RPC function explicitly allows Contractor Consultants to act on contractor-related observations they reported (no self-approval restriction)
- The `ConsultantReviewCard` component renders for statuses: `expert_screening`, `pending_consultant_screening`, `pending_consultant_review`, `pending_consultant_actions`
- The `useCanReviewAsConsultant` hook properly checks branch-aware RBAC via `has_contractor_consultant_access_for_branch` RPC

**Current Capabilities:**
- Review observation details
- Create corrective actions via the Actions Panel
- Submit notes and route based on severity (Level 1-2 to Site Client, Level 3+ to HSSE Expert)
- Access to ActionsPanel tab when in consultant workflow statuses

**Missing Capabilities:**
1. **Corrective Action Creation from Card:** The `ConsultantReviewCard` has a "Create Action" button but it calls `onActionCreated` which navigates to tab - not a direct inline action creation
2. **Task Assignment:** No dedicated task assignment capability within the consultant screening flow
3. **Close on Spot:** No quick close option for minor observations (unlike Department Rep who has this via `DeptRepApprovalCard`)
4. **Escalation to HSSE:** While routing exists, there's no explicit "Escalate to HSSE Manager" action like Department Reps have

**Fix Required:**
Enhance `ConsultantReviewCard` to include:
1. Inline action creation modal (similar to DeptRepApprovalCard pattern)
2. "Close on Spot" option for Level 1-2 observations with evidence upload
3. Clear escalation path to HSSE Manager for contractor-related disputes

---

### Issue 3: Unified Workflow UI (Two Separate Timelines)

**Current Implementation:**
The system currently displays two different workflow tracker components:

1. **`ObservationWorkflowTracker`** - For observations only, with:
   - `getContractorWorkflowSteps()` - Shows contractor path (Consultant Screening → Dept Rep → HSSE Expert → Site Client → Contractor Implementation → Verification → Closed)
   - `getNormalWorkflowSteps()` - Shows department path (Dept Rep Review → HSSE Expert → Actions → Closed)
   - Different step counts and visual indicators per path

2. **`InvestigationWorkflowStatusCard`** - For incidents only, with:
   - Fixed workflow: Submitted → Dept Rep → Manager → Investigator → Investigation → Closure

**Problem:**
- Users see completely different workflow UIs based on whether the report is contractor-related vs non-contractor
- Step counts, labels, and visual progression differ between paths
- This creates confusion about where reports are in their lifecycle
- The header explicitly says "Contractor Observation Path" vs "Standard Observation Path"

**Fix Required:**
Create a **Unified Workflow Tracker** that:
1. Shows a single consistent timeline for all observations regardless of contractor involvement
2. Uses generic stage names that apply to both paths
3. Dynamically shows/hides role-specific steps based on report type
4. Maintains visual consistency with the same step count structure

---

## Technical Implementation Plan

### Phase 1: Fix Contractor Observation Routing (Database)

**File:** New migration file

```sql
-- Consolidate and fix auto_route_observation_on_submit()
CREATE OR REPLACE FUNCTION public.auto_route_observation_on_submit()
RETURNS TRIGGER AS $$
DECLARE
  v_assigned_to UUID;
  v_new_status TEXT;
  v_branch_id UUID;
BEGIN
  -- Only process observations on submission
  IF NEW.event_type != 'observation' OR NEW.status != 'submitted' THEN
    RETURN NEW;
  END IF;

  -- Skip if already has approval_manager_id
  IF NEW.approval_manager_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_branch_id := COALESCE(NEW.branch_id, 
    (SELECT branch_id FROM sites WHERE id = NEW.site_id));

  -- CONTRACTOR OBSERVATIONS: Route to Contractor Consultant FIRST
  IF NEW.related_contractor_company_id IS NOT NULL THEN
    -- Branch-specific consultant
    SELECT ura.user_id INTO v_assigned_to
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    JOIN profiles p ON p.id = ura.user_id
    WHERE ura.tenant_id = NEW.tenant_id
      AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
      AND r.code = 'contractor_consultant'
      AND r.is_active = true
      AND p.deleted_at IS NULL
    ORDER BY 
      CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END,
      ura.created_at
    LIMIT 1;
    
    IF v_assigned_to IS NOT NULL THEN
      v_new_status := 'pending_consultant_screening';
    END IF;
  END IF;

  -- NON-CONTRACTOR or FALLBACK: Route to Department Representative
  IF v_assigned_to IS NULL THEN
    SELECT ura.user_id INTO v_assigned_to
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    JOIN profiles p ON p.id = ura.user_id
    WHERE ura.tenant_id = NEW.tenant_id
      AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
      AND r.code = 'department_representative'
      AND r.is_active = true
      AND p.deleted_at IS NULL
    ORDER BY 
      CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END,
      ura.created_at
    LIMIT 1;
    
    v_new_status := 'pending_dept_rep_approval';
  END IF;

  -- Apply routing
  IF v_assigned_to IS NOT NULL THEN
    NEW.approval_manager_id := v_assigned_to;
    NEW.status := v_new_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

### Phase 2: Enhance Contractor Consultant Capabilities (Frontend)

**File:** `src/components/investigation/contractor-workflow/ConsultantReviewCard.tsx`

**Enhancements:**
1. Add inline action creation dialog (reuse ActionProgressDialog pattern)
2. Add "Close on Spot" button for Level 1-2 severity
3. Add escalation button for HSSE Manager review
4. Ensure all actions are properly logged to audit trail

**New Props:**
```typescript
interface ConsultantReviewCardProps {
  incidentId: string;
  status: string;
  severityLevel?: SeverityLevelV2;
  // Add new props for enhanced capabilities
  canCloseOnSpot?: boolean;
  onActionCreate?: (action: ActionFormData) => void;
  onEscalate?: () => void;
}
```

**New Hook:** `src/hooks/use-consultant-actions.ts`
- `useConsultantCloseOnSpot()` - Mutation for quick closure with evidence
- `useConsultantEscalateToHSSE()` - Mutation to escalate to HSSE Manager

---

### Phase 3: Unified Workflow Tracker (Frontend)

**File:** `src/components/investigation/UnifiedWorkflowTracker.tsx` (New)

Create a single unified component that replaces both `ObservationWorkflowTracker` and `InvestigationWorkflowStatusCard` for observations.

**Design Approach:**
1. Define 6 universal workflow stages that apply to all observation types:
   - Submitted
   - Initial Review (Consultant OR Dept Rep - dynamic label)
   - Expert Review (Optional - only for L3+)
   - Implementation Approval (Site Client OR skip)
   - Actions & Verification
   - Closed

2. The component dynamically determines:
   - Which role is responsible at each stage
   - Which stages to show based on report characteristics
   - Visual indicator for contractor vs department path

3. Visual consistency:
   - Same color scheme for all observations
   - Same step node sizes and spacing
   - Single unified title: "Observation Progress"
   - Role badge shows current responsible party

**Component Structure:**
```typescript
interface UnifiedWorkflowTrackerProps {
  incident: IncidentWithDetails;
  variant?: 'horizontal' | 'vertical' | 'compact';
}

const UNIFIED_STAGES = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'review', label: 'Initial Review' },      // Dynamic: Consultant or Dept Rep
  { key: 'expert', label: 'Expert Review' },        // Conditional: L3+ only
  { key: 'approval', label: 'Approval' },           // Site Client or Manager
  { key: 'actions', label: 'Actions' },             // Implementation & Verification
  { key: 'closed', label: 'Closed' },
];
```

---

### Phase 4: Update Investigation Workspace

**File:** `src/pages/incidents/InvestigationWorkspace.tsx`

**Changes:**
1. Replace separate tracker imports with unified tracker
2. Remove conditional rendering based on contractor vs non-contractor
3. Use single `<UnifiedWorkflowTracker />` for all observations

```tsx
// Before:
{incidentData?.event_type === 'observation' && (
  <ObservationWorkflowTracker 
    incident={incidentData}
    variant="horizontal"
    showSeverityRouting={true}
  />
)}

// After:
{incidentData?.event_type === 'observation' && (
  <UnifiedWorkflowTracker 
    incident={incidentData}
    variant="horizontal"
  />
)}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/xxx_fix_contractor_routing.sql` | Create | Fix routing trigger function |
| `src/hooks/use-consultant-actions.ts` | Create | Consultant action mutations |
| `src/components/investigation/contractor-workflow/ConsultantReviewCard.tsx` | Modify | Add enhanced capabilities |
| `src/components/investigation/UnifiedWorkflowTracker.tsx` | Create | Single unified workflow UI |
| `src/pages/incidents/InvestigationWorkspace.tsx` | Modify | Use unified tracker |
| `src/components/investigation/index.ts` | Modify | Export new component |

---

## Testing Requirements

1. **Routing Test:**
   - Create observation against contractor company
   - Verify it routes to Contractor Consultant (not Dept Rep)
   - Verify status is `pending_consultant_screening`

2. **Capabilities Test:**
   - Log in as Contractor Consultant
   - Verify ability to: create actions, add notes, close on spot, escalate
   - Verify actions appear in "My Actions" for assigned users

3. **UI Consistency Test:**
   - View contractor observation workflow
   - View non-contractor observation workflow  
   - Verify both use the same unified tracker with consistent stages

---

## Rollback Plan

If issues occur:
1. Database: Re-run previous working migration for routing function
2. Frontend: Revert to using separate `ObservationWorkflowTracker` via git revert
3. Both changes are additive and do not delete existing functionality

---

## RTL/Localization Compliance

All new components will:
- Use CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`)
- Support `dir` prop or inherit from parent
- Include translation keys for all user-facing strings
- Follow existing i18n patterns using `useTranslation()` hook
