

# Gate Pass System Audit — Double-Check Results

## Findings Summary

| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| 1 | **Audit logging completely broken** — 0 records ever written | 🔴 Critical | 3 CHECK constraints reject the values the code sends |
| 2 | **WhatsApp notifications for internal passes never verified** | 🟠 High | No delivery logs in `auto_notification_logs` for gate passes |
| 3 | **Dept rep notification silently skipped** | 🟠 High | Only fires when `project_id` is set — all 11 passes have NULL `project_id` |
| 4 | **Fallback audit insert also fails** | 🔴 Critical | Same CHECK constraints apply to direct inserts from client code |

---

## Detail: Audit Logging Failure (CRITICAL)

The `contractor_module_audit_logs` table has **3 CHECK constraints** that reject every gate pass audit entry:

### Constraint 1: `entity_type`
- **Allowed:** `company`, `representative`, `project`, `safety_officer`, `worker`, `assignment`, `induction`, `qr_code`, `gate_pass`
- **Code sends:** `material_gate_pass` ← **REJECTED**
- **Fix:** Change code to send `gate_pass` (matches constraint)

### Constraint 2: `action`
- **Allowed:** `created`, `updated`, `deleted`, `approved`, `rejected`, `suspended`, `activated`, `revoked`, `assigned`, `removed`, `sent`, `viewed`, `acknowledged`, `verified`, `expired`
- **Code sends:** `gate_pass_created`, `gate_pass_approved`, `gate_pass_rejected` ← **ALL REJECTED**
- **Fix:** Change code to send `created`, `approved`, `rejected` (matches constraint)

### Constraint 3: `actor_type`
- **Allowed:** `admin`, `contractor_rep`, `supervisor`, `guard`, `system`
- **Code sends:** `user` ← **REJECTED**
- **Fix:** Change edge function to resolve actual role, or add `user` to constraint

**Verified via live edge function test** — confirmed 500 error with constraint violation.

---

## Detail: Notification Integration Status

| Notification Path | Status | Issue |
|---|---|---|
| Public gate pass WhatsApp (via `notify-public-gate-pass`) | ⚠️ Code exists, 0 delivery logs | No logs in `auto_notification_logs` — either never triggered or logging broken |
| Internal approval WhatsApp (via `send-gate-whatsapp`) | ⚠️ Code exists, 0 delivery logs | Same — no evidence of any WhatsApp ever sent for gate passes |
| Dept rep notification (via `notify-dept-rep-gate-pass`) | ❌ Never fires | Gated by `if (result?.project_id && tenantId)` — all passes have NULL project_id |
| In-app notification (hsse_notifications insert) | ✅ Code exists | Fires on approval for internal passes; no verification data available |

---

## Fix Plan

### Step 1: Fix audit logging (3 code changes)

**File: `materialGatePassCreateService.ts`**
- Change `entity_type: 'material_gate_pass'` → `'gate_pass'`
- Change `action: 'gate_pass_created'` → `'created'`
- Change fallback `actor_type: 'user'` → resolve from role or use `'system'`

**File: `materialGatePassActionService.ts`**
- Change `entity_type: 'material_gate_pass'` → `'gate_pass'`
- Change `gate_pass_approved` → `'approved'`, `gate_pass_rejected` → `'rejected'`
- Change fallback `actor_type: 'user'` → resolve or use `'admin'`

**File: `contractor-audit-log/index.ts` (edge function)**
- Change default `actorType = 'system'` (already correct)
- Change authenticated `actorType = 'user'` → resolve actual role from profile, or default to `'admin'`

### Step 2: Add `user` to actor_type constraint (migration)

Add `'user'` to the `contractor_module_audit_logs_actor_type_check` constraint as a safe catch-all, since the edge function resolves from JWT and may not always know the specific role.

### Step 3: Verify WhatsApp integration

- Deploy and test `send-gate-whatsapp` with a real phone number
- Verify `notify-public-gate-pass` delivery path
- Check if WaSender API key is configured

### Step 4: Backfill audit records

Generate audit entries from existing timestamp data (created_at, security_approved_at, rejected_at, club_mgmt_ack_at) for the 11 existing passes.

---

## Technical Changes

| File | Change |
|------|--------|
| `src/features/contractors/services/materialGatePassCreateService.ts` | Fix entity_type, action, actor_type values |
| `src/features/contractors/services/materialGatePassActionService.ts` | Fix entity_type, action, actor_type values |
| `supabase/functions/contractor-audit-log/index.ts` | Resolve actor_type from profile role |
| Migration SQL | Add `'user'` to actor_type CHECK constraint |
| Migration SQL | Backfill audit records from existing gate pass timestamps |

