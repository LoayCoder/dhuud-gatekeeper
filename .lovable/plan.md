
# Gate Pass Process Full Audit Report

## Section 1 — Gate Pass Current Workflow (Summary)

### Overview
The Gate Pass system handles **Material/Equipment** transport authorization through a dual-approval workflow. It is NOT designed for "People" or standalone "Vehicle" passes - those are handled by the separate `gate_entry_logs` table (visitor/worker entry system).

### Current Workflow Path

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           GATE PASS LIFECYCLE                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐              │
│  │   REQUEST    │───▶│  PM APPROVAL     │───▶│  SAFETY APPROVAL │              │
│  │   CREATED    │    │ (Stage 1)        │    │  (Stage 2)       │              │
│  └──────────────┘    └──────────────────┘    └──────────────────┘              │
│        │                     │                        │                         │
│        │                     ▼                        ▼                         │
│        │              pending_pm_approval     pending_safety_approval           │
│        │                     │                        │                         │
│        │                     ▼                        ▼                         │
│        │              ┌──────────────┐         ┌──────────────┐                │
│        │              │   approved   │◀────────│   APPROVED   │                │
│        │              │ (QR ISSUED)  │         │  + QR Token  │                │
│        │              └──────────────┘         └──────────────┘                │
│        │                     │                                                  │
│        ▼                     ▼                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                     │
│  │   rejected   │    │    GUARD     │───▶│  COMPLETED   │                     │
│  │              │    │  ENTRY/EXIT  │    │ (exit_time)  │                     │
│  └──────────────┘    └──────────────┘    └──────────────┘                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Pass Types in System
- **Material Gate Pass** (`material_gate_passes` table): Material In, Material Out, Equipment In, Equipment Out
- **Visitor/Worker Entry** (`gate_entry_logs` table): visitor, contractor, delivery, vip, employee, worker

### Approval Path
1. **External Requests** (Contractor): PM Approval → Safety Approval → Approved
2. **Internal Requests** (Employee): Direct to designated approver → Safety Approval → Approved

---

## Section 2 — Issues & Defects List

| # | Area | Issue | Risk | Root Cause |
|:-:|:-----|:------|:----:|:-----------|
| 1 | **Data Model** | **SPLIT-BRAIN LOGGING**: Entry/exit recorded in TWO places: `material_gate_passes.entry_time/exit_time` AND `gate_entry_logs` table | **Critical** | Original design stored timestamps directly on pass; new unified logging was added but not fully migrated |
| 2 | **Data Model** | `material_gate_pass_id` column referenced in code but DOES NOT EXIST in `gate_entry_logs` | **High** | Migration never applied; code uses workarounds (vehicle plate matching) |
| 3 | **Data Model** | **Duplicate timestamp columns**: Both `entry_time/exit_time` AND `entry_confirmed_at/exit_confirmed_at` exist on `material_gate_passes` | **Medium** | Incremental additions without cleanup |
| 4 | **Approval Logic** | **DUAL APPROVAL SYSTEMS**: Frontend uses `pm_approved_by/safety_approved_by`, Edge function uses `contractor_approval_status/security_approval_status` | **Critical** | Two different approval flows implemented at different times |
| 5 | **Status Machine** | Status values inconsistent: DB default is `'pending_pm'` but code expects `'pending_pm_approval'` | **High** | Schema/code drift |
| 6 | **RLS** | Security role (`has_security_access`) grants `ALL` on `material_gate_passes` - guards can INSERT/DELETE passes | **Critical** | Over-privileged policy intended for viewing only |
| 7 | **RLS** | `has_security_access` function only checks `admin`, `security_manager`, `security_supervisor` - missing `security_guard` | **High** | Guards cannot use MaterialPassVerificationPanel due to role mismatch |
| 8 | **Guard Actions** | `useGuardGateAction` checks `hasRole('security_guard')` but RLS uses different roles | **High** | Frontend/backend role mismatch |
| 9 | **Exit Matching** | Exit search matches by `vehicle_plate` only - could match wrong entry if same vehicle enters twice | **Medium** | No direct FK link between pass and entry log |
| 10 | **Audit Trail** | No trigger automatically logs changes to `security_audit_logs` - relies on frontend hook | **Medium** | Audit can be bypassed if direct DB updates occur |
| 11 | **QR Token** | QR token (`qr_code_token`) generated on safety approval but not validated for uniqueness | **Low** | Uses UUID so collision unlikely but not enforced |
| 12 | **Expired Pass Reuse** | No status change when pass date expires - passes remain "approved" forever | **High** | Missing scheduled job to auto-expire old passes |
| 13 | **Time Window** | Time window violations logged as warnings but don't block entry | **Low** | By design, but inconsistent with strict validation elsewhere |
| 14 | **Missing Cancel** | No "cancel" status or workflow - user cannot cancel pending request | **Medium** | Workflow gap - only approve/reject exists |

---

## Section 3 — Fix Plan (Ordered by Priority)

### CRITICAL Fixes (Must Do)

#### Fix 1: Consolidate Approval Status Columns
**Problem**: Two approval systems running in parallel
**Root Cause**: Frontend uses `pm_approved_by/at` + `safety_approved_by/at`, Edge function uses `contractor_approval_status` + `security_approval_status`

**Fix**:
1. Standardize on `pm_approved_by/at` + `safety_approved_by/at` (already in use by frontend)
2. Remove or deprecate `contractor_approval_status`/`security_approval_status` columns
3. Update `approve-gate-pass` edge function to use the same columns as frontend hooks
4. Add migration to copy any data from new columns to old columns if needed

#### Fix 2: Lock Down Security RLS Policy
**Problem**: Security users have `ALL` access including INSERT/DELETE
**Root Cause**: Overly permissive policy

**Database Migration**:
```sql
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Security users can manage gate passes" ON material_gate_passes;

-- Create restricted policy for viewing
CREATE POLICY "Security can view gate passes" ON material_gate_passes
FOR SELECT USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_security_access(auth.uid())
);

-- Create restricted policy for updating entry/exit only
CREATE POLICY "Security can record entry exit" ON material_gate_passes
FOR UPDATE USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_security_access(auth.uid())
) WITH CHECK (
  tenant_id = get_auth_tenant_id()
);
```

#### Fix 3: Add `security_guard` to `has_security_access` Function
**Problem**: Guards blocked from verification panel due to missing role
**Root Cause**: Function only includes supervisor-level roles

**Database Migration**:
```sql
CREATE OR REPLACE FUNCTION public.has_security_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = _user_id
      AND r.code IN ('admin', 'security_manager', 'security_supervisor', 'security_guard', 'security_shift_leader')
      AND r.is_active = true
  );
$$;
```

### HIGH Priority Fixes

#### Fix 4: Add Missing `material_gate_pass_id` Column
**Problem**: No FK link between entry log and gate pass
**Root Cause**: Column never created despite being in design

**Database Migration**:
```sql
ALTER TABLE gate_entry_logs 
ADD COLUMN IF NOT EXISTS material_gate_pass_id UUID REFERENCES material_gate_passes(id);

CREATE INDEX idx_gate_entry_logs_material_pass 
ON gate_entry_logs(material_gate_pass_id) 
WHERE material_gate_pass_id IS NOT NULL;
```

**Code Update**: Update `useGuardGateAction` to insert `material_gate_pass_id` instead of putting it in notes.

#### Fix 5: Fix Status Default Value
**Problem**: DB default is `'pending_pm'` but code expects `'pending_pm_approval'`

**Database Migration**:
```sql
ALTER TABLE material_gate_passes 
ALTER COLUMN status SET DEFAULT 'pending_pm_approval';
```

#### Fix 6: Add Auto-Expiry Scheduled Job
**Problem**: Old approved passes never expire
**Root Cause**: No scheduled cleanup

**Database Migration**:
```sql
-- Create function to expire old passes
CREATE OR REPLACE FUNCTION expire_old_gate_passes()
RETURNS void AS $$
BEGIN
  UPDATE material_gate_passes
  SET status = 'expired'
  WHERE status = 'approved'
    AND pass_date < CURRENT_DATE
    AND entry_time IS NULL
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule daily at midnight (requires pg_cron)
SELECT cron.schedule('expire-gate-passes', '0 0 * * *', 'SELECT expire_old_gate_passes();');
```

### MEDIUM Priority Fixes

#### Fix 7: Deprecate Duplicate Timestamp Columns
**Problem**: Both `entry_time/exit_time` AND `entry_confirmed_at/exit_confirmed_at` exist

**Recommendation**: 
1. Use `entry_time/exit_time` as the canonical columns (already used in validation)
2. Mark `entry_confirmed_at/exit_confirmed_at` as deprecated
3. Add migration to copy data if needed
4. Remove references in code over time

#### Fix 8: Add Cancel Workflow
**Problem**: No way to cancel a pending request

**Code Change**: Add `useCancelGatePass` hook with status = 'cancelled'

**UI Change**: Add "Cancel" button on pending passes for requester only

#### Fix 9: Add Database Trigger for Audit Logging
**Problem**: Audit relies on frontend hooks - can be bypassed

**Database Migration**:
```sql
CREATE OR REPLACE FUNCTION log_gate_pass_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO security_audit_logs (
    tenant_id, actor_id, action, entity_type, entity_id, 
    entity_identifier, old_value, new_value, created_at
  ) VALUES (
    NEW.tenant_id,
    auth.uid(),
    TG_OP,
    'material_gate_pass',
    NEW.id,
    NEW.reference_number,
    row_to_json(OLD),
    row_to_json(NEW),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER gate_pass_audit_trigger
AFTER UPDATE ON material_gate_passes
FOR EACH ROW EXECUTE FUNCTION log_gate_pass_changes();
```

---

## Section 4 — Corrected Logical Model

### Authorization vs. Physical Access

```text
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHORIZATION LAYER                          │
│                  (material_gate_passes)                         │
├─────────────────────────────────────────────────────────────────┤
│  • Request creation                                             │
│  • Dual approval workflow                                       │
│  • QR token generation                                          │
│  • Status: pending_pm → pending_safety → approved               │
│  • Items, photos, approver notes                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ FK: material_gate_pass_id
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHYSICAL ACCESS LAYER                        │
│                    (gate_entry_logs)                            │
├─────────────────────────────────────────────────────────────────┤
│  • Guard scans QR                                               │
│  • Entry recorded (entry_time)                                  │
│  • Exit recorded (exit_time)                                    │
│  • Links to material_gate_pass_id                               │
│  • Unified with visitor/worker entries                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ All actions logged
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AUDIT TRAIL                                │
│                  (security_audit_logs)                          │
├─────────────────────────────────────────────────────────────────┤
│  • gate_pass_entry, gate_pass_exit                              │
│  • Immutable record                                             │
│  • Actor, timestamp, result, metadata                           │
└─────────────────────────────────────────────────────────────────┘
```

### Correct State Machine

```text
 ┌─────────────────┐
 │     CREATED     │ ─ Initial status after request
 │ pending_pm_approval │
 └────────┬────────┘
          │
          ▼
    ┌────────────┐     ┌────────────┐
    │  APPROVE   │────▶│  REJECT    │
    │ (by PM)    │     │            │
    └────────┬───┘     └────────────┘
             │               │
             ▼               ▼
 ┌─────────────────┐   ┌──────────┐
 │pending_safety_approval│   │ rejected │ ─ Terminal
 └────────┬────────┘   └──────────┘
          │
          ▼
    ┌────────────┐     ┌────────────┐
    │  APPROVE   │────▶│  REJECT    │
    │ (by Safety)│     │            │
    └────────┬───┘     └────────────┘
             │               │
             ▼               ▼
    ┌────────────┐     ┌──────────┐
    │  approved  │     │ rejected │
    │ (QR issued)│     └──────────┘
    └────────┬───┘
             │
     ┌───────┴───────┐
     │               │
     ▼               ▼
┌─────────┐    ┌──────────┐
│ used    │    │ expired  │ ─ Auto by scheduler
│(entry_time)│    │ (pass_date < today)│
└────┬────┘    └──────────┘
     │
     ▼
┌───────────┐
│ completed │ ─ Terminal (exit_time set)
└───────────┘
```

### Role Permissions Matrix

| Action | Employee | Contractor Rep | PM/Manager | Safety Officer | Security Guard | Security Supervisor | Admin |
|:-------|:--------:|:--------------:|:----------:|:--------------:|:--------------:|:-------------------:|:-----:|
| Create Request | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| View Own Requests | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| View All Requests | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| PM Approve | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Safety Approve | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Reject | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Record Entry | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Record Exit | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete Pass | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Section 5 — Regression Risks

### If Fixes Are Applied Incorrectly

| Fix | Regression Risk | Mitigation |
|:----|:----------------|:-----------|
| Fix 1 (Consolidate approvals) | Existing passes with `contractor_approval_status` data may become orphaned | Run data migration first to copy values |
| Fix 2 (Lock RLS) | Guards may lose ability to see passes if role check fails | Test with real guard account before deploying |
| Fix 3 (Add security_guard role) | Guards gain access to all security features, not just gate pass | Review all `has_security_access` usages |
| Fix 4 (Add FK column) | Existing entries without `material_gate_pass_id` won't link | Backfill logic needed or graceful null handling |
| Fix 5 (Status default) | Existing passes with 'pending_pm' may not be found by frontend | Update existing records first |
| Fix 6 (Auto-expiry) | Valid passes used next day (for multi-day materials) may expire | Add exception logic or separate "multi-day" flag |
| Fix 9 (Audit trigger) | High-volume environments may see performance impact | Use async logging or batch inserts |

### Testing Checklist Before Deploy

1. Create new gate pass request as Employee (internal)
2. Create new gate pass request as Contractor Rep (external)
3. Approve as PM → Verify status changes correctly
4. Approve as Safety → Verify QR token generated
5. Scan QR as Guard → Verify entry logged to `gate_entry_logs`
6. Scan QR again → Verify exit logged and pass marked "completed"
7. Try to create pass as Guard → Should be denied
8. Try to delete pass as Guard → Should be denied
9. Verify expired passes don't allow entry
10. Check audit log contains all actions
