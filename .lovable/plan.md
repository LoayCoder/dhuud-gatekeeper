
# Gate Pass System Consolidation Plan

## Executive Summary
The Gate Pass system has grown organically and now contains duplicate creation flows, conflicting approval logic, and legacy status references. This plan consolidates the system into a single, unified workflow.

---

## Confirmed Duplications

### 1. Creation Components (DUPLICATE)

| Component | Location | Status |
|-----------|----------|--------|
| `GatePassFormDialog` | `src/components/contractors/GatePassFormDialog.tsx` | **AUTHORITATIVE** - Full-featured, uses unified hook |
| `GatePassCreateWizard` | `src/components/contractors/gate-pass-create/` | **AUTHORITATIVE** - PWA wizard, uses unified hook |
| `ContractorGatePassRequest` | `src/components/contractor-portal/ContractorGatePassRequest.tsx` | **LEGACY** - Simple form, uses legacy hook |

### 2. Creation Hooks (DUPLICATE)

| Hook | Location | Initial Status Set | Status |
|------|----------|-------------------|--------|
| `useCreateGatePass` | `use-material-gate-passes.ts` line 237 | `pending_dept_approval` / `pending_contractor_approval` | **AUTHORITATIVE** |
| `useContractorPortalRequestGatePass` | `use-contractor-portal.ts` line 222 | `pending_pm_approval` (**WRONG**) | **LEGACY** |

### 3. Approval Logic (DUPLICATE)

| Component | Location | Status |
|-----------|----------|--------|
| `approve_gate_pass_unified` RPC | Database | **AUTHORITATIVE** - Full workflow validation |
| `useApproveGatePass` hook | `use-material-gate-passes.ts` line 441 | **AUTHORITATIVE** - Calls RPC |
| `useRejectGatePass` hook | `use-material-gate-passes.ts` line 485 | **LEGACY** - Direct DB update, bypasses RPC |
| `approve-gate-pass` edge function | `supabase/functions/approve-gate-pass/` | **LEGACY** - Parallel logic, outdated workflow |

### 4. Legacy Status References

Found in 25+ files:
- `pending_pm_approval` - Old external workflow status
- `pending_safety_approval` - Old external workflow status

---

## Consolidation Actions

### Phase 1: Remove Duplicate Creation Flow

**Action 1.1: Delete Legacy Contractor Portal Form**
- Delete: `src/components/contractor-portal/ContractorGatePassRequest.tsx`
- Update: `src/pages/contractor-portal/GatePasses.tsx`
  - Replace `ContractorGatePassRequest` with `GatePassFormDialog`
  - Pass contractor company context to the dialog

**Action 1.2: Remove Legacy Creation Hook**
- Delete export: `useContractorPortalRequestGatePass` from `use-contractor-portal.ts` (lines 222-278)
- Delete alias: `useCreateContractorGatePass` from `use-contractor-portal.ts` (line 304)
- Remove import from `ContractorGatePassRequest.tsx` (will be deleted)

### Phase 2: Unify Approval Logic

**Action 2.1: Update Rejection to Use RPC**
- Modify: `useRejectGatePass` in `use-material-gate-passes.ts`
- Change from direct `.update()` to calling `approve_gate_pass_unified` RPC with `action: "reject"`
- This ensures audit logging and proper status validation

**Action 2.2: Delete Legacy Edge Function**
- Delete: `supabase/functions/approve-gate-pass/` directory
- Deploy function deletion via Supabase

### Phase 3: Clean Legacy Status References

**Action 3.1: Update UI Components**
Files requiring updates (remove/replace legacy statuses):
- `src/pages/contractor-portal/GatePasses.tsx`
- `src/components/contractors/MyGatePassesTab.tsx`
- `src/components/contractors/GatePassApprovalActions.tsx`
- `src/components/contractors/GatePassPDFTemplate.tsx`
- `src/pages/dept-gate-passes/PendingApprovals.tsx`
- `src/hooks/use-my-workflow-tasks.ts`

**Action 3.2: Map Legacy to Unified Statuses**
```
pending_pm_approval     → pending_contractor_approval (external)
pending_safety_approval → pending_security_approval (both)
```

---

## Unified Workflow Reference

### Internal Gate Pass Flow
```text
┌──────────────┐    ┌────────────────────┐    ┌─────────────────────┐    ┌───────────────┐
│   Employee   │───▶│ pending_dept_      │───▶│ pending_club_       │───▶│ pending_      │
│   Creates    │    │ approval           │    │ mgmt_ack            │    │ security_     │
└──────────────┘    │ (Dept Rep/Manager) │    │ (Golf Club Mgmt)    │    │ approval      │
                    └────────────────────┘    └─────────────────────┘    │ (Security     │
                                                                         │  Supervisor)  │
                                                                         └───────┬───────┘
                                                                                 │
                    ┌──────────────────────────────────────────────────────────────┘
                    ▼
              ┌───────────┐    ┌────────────┐    ┌─────────────┐
              │ approved  │───▶│   used     │───▶│  completed  │
              │ (QR Ready)│    │ (Entry)    │    │   (Exit)    │
              └───────────┘    └────────────┘    └─────────────┘
```

### External Gate Pass Flow
```text
┌──────────────┐    ┌────────────────────┐    ┌─────────────────────┐    ┌───────────────┐
│  Contractor  │───▶│ pending_           │───▶│ pending_club_       │───▶│ pending_      │
│   Creates    │    │ contractor_        │    │ mgmt_ack            │    │ security_     │
└──────────────┘    │ approval           │    │ (Golf Club Mgmt)    │    │ approval      │
                    │ (Consultant)       │    └─────────────────────┘    │ (Security     │
                    └────────────────────┘                               │  Supervisor)  │
                                                                         └───────┬───────┘
                                                                                 │
                    ┌──────────────────────────────────────────────────────────────┘
                    ▼
              ┌───────────┐    ┌────────────┐    ┌─────────────┐
              │ approved  │───▶│   used     │───▶│  completed  │
              │ (QR Ready)│    │ (Entry)    │    │   (Exit)    │
              └───────────┘    └────────────┘    └─────────────┘
```

---

## Technical Implementation Details

### File Changes Summary

| Action | File | Change Type |
|--------|------|-------------|
| Delete | `src/components/contractor-portal/ContractorGatePassRequest.tsx` | Remove file |
| Delete | `supabase/functions/approve-gate-pass/` | Remove directory |
| Modify | `src/pages/contractor-portal/GatePasses.tsx` | Replace form, update imports |
| Modify | `src/hooks/contractor-management/use-contractor-portal.ts` | Remove legacy hooks |
| Modify | `src/hooks/contractor-management/use-material-gate-passes.ts` | Update `useRejectGatePass` |
| Modify | `src/components/contractors/MyGatePassesTab.tsx` | Update status references |
| Modify | `src/components/contractors/GatePassApprovalActions.tsx` | Remove legacy cases |
| Modify | `src/components/contractors/GatePassPDFTemplate.tsx` | Update status labels |
| Modify | `src/pages/contractor-portal/GatePasses.tsx` | Update status badges |
| Modify | `src/pages/dept-gate-passes/PendingApprovals.tsx` | Update status map |
| Modify | `src/hooks/use-my-workflow-tasks.ts` | Update status filter |

### Contractor Portal Form Replacement

The Contractor Portal page (`/contractor-portal/gate-passes`) will use `GatePassFormDialog` with these props:
```tsx
<GatePassFormDialog
  open={isFormOpen}
  onOpenChange={setIsFormOpen}
  projects={activeProjects}
  canCreateInternal={false}
  canCreateExternal={true}
  contractorCompanyId={company.id}
/>
```

A new prop `contractorCompanyId` will be added to `GatePassFormDialog` to pre-fill the company context for contractor users.

### Rejection Hook Update

```tsx
// use-material-gate-passes.ts - useRejectGatePass
export function useRejectGatePass() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ passId, reason }: { passId: string; reason: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Use unified RPC instead of direct update
      const { data, error } = await supabase.rpc("approve_gate_pass_unified", {
        p_user_id: user.id,
        p_gate_pass_id: passId,
        p_action: "reject",
        p_notes: reason,
      });

      if (error) throw error;
      return { passId, newStatus: data };
    },
    // ... rest of mutation config
  });
}
```

---

## Backward Compatibility

The database constraint `material_gate_passes_status_check` already includes all statuses (legacy and unified). Existing passes with `pending_pm_approval` or `pending_safety_approval` will continue to work because:

1. The `approve_gate_pass_unified` RPC handles these legacy statuses
2. UI will display them with appropriate labels (mapped to modern equivalents)
3. No database migration needed - status column is unchanged

---

## Testing Checklist

After implementation:
1. Create external gate pass from Contractor Portal
2. Create internal gate pass from My Gate Passes
3. Approve gate pass through all workflow stages
4. Reject gate pass (verify audit log created)
5. Verify existing passes with legacy statuses still display correctly
6. Scan approved gate pass QR code at security checkpoint
