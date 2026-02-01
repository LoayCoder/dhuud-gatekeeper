# Gate Pass Process Audit Report & Fix Plan

## 1. Executive Summary
This audit analyzed the **Gate Pass** and **Entry/Exit** workflows within the HSSE platform.
**Status:** ✅ FIXES APPLIED (2026-02-01)

**Primary Objective:** Consolidate all entry/exit events into `gate_entry_logs` and restrict Security roles to "Operational" access only (No creation/deletion of passes).

---

## 2. Fixes Applied

### ✅ Database Changes (Migration Applied)

| Fix | Description | Status |
| :--- | :--- | :--- |
| **RLS Lockdown** | Replaced `ALL` policy with separate `SELECT` and `UPDATE` for Security | ✅ Complete |
| **Add `security_guard` role** | Updated `has_security_access()` to include `security_guard` and `security_shift_leader` | ✅ Complete |
| **Add FK Column** | Added `material_gate_pass_id` to `gate_entry_logs` with index | ✅ Complete |
| **Fix Status Default** | Changed default from `pending_pm` to `pending_pm_approval` | ✅ Complete |
| **Auto-Expiry Function** | Created `expire_old_gate_passes()` function | ✅ Complete |
| **Audit Trigger** | Created `log_gate_pass_changes()` trigger for automatic audit logging | ✅ Complete |

### ✅ Code Changes

| Fix | Description | Status |
| :--- | :--- | :--- |
| **useGuardGateAction** | Now inserts `material_gate_pass_id` FK and updates pass status atomically | ✅ Complete |
| **useConfirmGatePassEntry** | Creates entry log with FK link, updates pass entry_time + status | ✅ Complete |
| **useConfirmGatePassExit** | Finds log by FK first (fallback: plate), closes log + updates pass | ✅ Complete |
| **useCancelGatePass** | New hook for requesters to cancel pending passes | ✅ Complete |

---

## 3. Corrected Architecture

### Authorization vs. Physical Access Separation

```text
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHORIZATION LAYER                          │
│                  (material_gate_passes)                         │
├─────────────────────────────────────────────────────────────────┤
│  • Request creation                                             │
│  • Dual approval workflow (PM → Safety)                         │
│  • QR token generation                                          │
│  • Status: pending_pm_approval → pending_safety_approval → approved │
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
│  • Links to material_gate_pass_id (FK)                          │
│  • Unified with visitor/worker entries                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ All actions logged (trigger)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AUDIT TRAIL                                │
│                  (security_audit_logs)                          │
├─────────────────────────────────────────────────────────────────┤
│  • gate_pass_pm_approved, gate_pass_safety_approved             │
│  • gate_pass_entry, gate_pass_exit                              │
│  • gate_pass_rejected, gate_pass_cancelled, gate_pass_expired   │
│  • Immutable record (database trigger)                          │
└─────────────────────────────────────────────────────────────────┘
```

### State Machine

```text
 ┌─────────────────┐
 │     CREATED     │ ─ Initial status after request
 │ pending_pm_approval │
 └────────┬────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌────────┐  ┌──────────┐
│APPROVE │  │ REJECT   │
│ (PM)   │  │          │
└────┬───┘  └────┬─────┘
     │           │
     ▼           ▼
┌─────────────────┐   ┌──────────┐   ┌───────────┐
│pending_safety_  │   │ rejected │   │ cancelled │ (requester only)
│approval         │   └──────────┘   └───────────┘
└────────┬────────┘
         │
   ┌─────┴─────┐
   ▼           ▼
┌────────┐  ┌──────────┐
│APPROVE │  │ REJECT   │
│(Safety)│  │          │
└────┬───┘  └────┬─────┘
     │           │
     ▼           ▼
┌────────────┐   ┌──────────┐
│  approved  │   │ rejected │
│ (QR issued)│   └──────────┘
└────────┬───┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐  ┌─────────┐
│ used  │  │ expired │ (auto by scheduler)
│(entry)│  │         │
└───┬───┘  └─────────┘
    │
    ▼
┌───────────┐
│ completed │ (exit recorded)
└───────────┘
```

---

## 4. Role Permissions Matrix

| Action | Employee | Contractor Rep | PM/Manager | Safety Officer | Security Guard | Security Supervisor | Admin |
|:-------|:--------:|:--------------:|:----------:|:--------------:|:--------------:|:-------------------:|:-----:|
| Create Request | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Cancel Own Request | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| View Own Requests | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| View All Requests | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PM Approve | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Safety Approve | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Reject | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Record Entry/Exit | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete Pass | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 5. Remaining Tasks

### Recommended (Not Blocking)

1. **Schedule Auto-Expiry Cron Job**: Add `SELECT cron.schedule('expire-gate-passes', '0 0 * * *', 'SELECT expire_old_gate_passes();');` via pg_cron
2. **Add Cancel Button to UI**: Use `useCancelGatePass` hook on pending pass detail pages
3. **Backfill FK Data**: Run migration to link existing `gate_entry_logs` with `vehicle` type to their passes

### Testing Checklist

- [x] DB migration applied
- [ ] Test: Create pass as Employee → PM approve → Safety approve → Guard entry → Guard exit
- [ ] Test: Cancel pending pass as requester
- [ ] Test: Guard cannot create/delete passes (RLS check)
- [ ] Test: Expired pass blocked at entry
