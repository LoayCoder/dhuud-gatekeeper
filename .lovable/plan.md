

# E2E Gate Pass Lifecycle — Gap Analysis & Implementation Plan

## Current State Summary

The gate pass system is a **material movement** pass system (not a worker-based gate pass). Key observations:

- **`material_gate_passes`** table tracks material in/out passes, NOT worker-linked passes
- Gate passes are linked to **projects** and **companies**, not individual workers
- The workflow is: `pending_contractor_approval` → `pending_club_mgmt_ack` → `pending_security_approval` → `approved` → `used` → `completed`
- Photo requirements are on **items** (material photos), not worker photos
- ID Card generation is a **separate** worker workflow, not part of gate pass lifecycle
- Induction is also a **separate** worker workflow

## Completed Fixes

### ✅ Performance Indexes Added
- `idx_material_gate_passes_company_id` — speeds up contractor rep queries
- `idx_material_gate_passes_status` — speeds up admin status filtering
- `idx_material_gate_passes_requested_by` — speeds up "my passes" queries
- `idx_material_gate_passes_tenant_id` — speeds up RLS checks

### ✅ Audit Trail Fixed
- `materialGatePassCreateService.ts` — now passes `tenant_id` and uses correct `entity_type: 'material_gate_pass'`
- `materialGatePassActionService.ts` — same fixes for approve/reject actions
- Audit logs write to `contractor_module_audit_logs` table (verified)

### ✅ Lifecycle Tracking
- Added `submitted_at` column to `material_gate_passes`
- Set on creation in `materialGatePassCreateService.ts`

### ✅ UI Improvements (Previous Round)
- "No Active Projects" warning with link to projects page
- Rejection reason prominently displayed in red banner
- Gate pass action types added to audit hook
