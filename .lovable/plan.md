

# Gate Pass Module — Full E2E Audit Report

## Critical Bugs

### BUG-1: Zero Trust Violation — External API Call to `api.ipify.org`
**Severity: HIGH** | **Files:** `src/features/contractors/hooks/use-public-gate-pass.ts:31`, `src/hooks/common/use-audit-log.ts:27`

The `getClientIP()` function calls `https://api.ipify.org?format=json` — an external third-party service. This directly violates the Zero Trust security policy which forbids all external network requests from the client. Additionally, this call blocks the gate pass submission while it resolves.

**Fix:** Remove the external fetch entirely. Pass `null` for `p_client_ip` — the server-side edge function can extract IP from request headers.

---

### BUG-2: Duplicate Service File — Legacy `src/services/security/gateQRService.ts`
**Severity: MEDIUM** | **Files:** `src/services/security/gateQRService.ts` vs `src/features/security/services/gateQRService.ts`

Two copies of gate QR service exist. The legacy file at `src/services/security/gateQRService.ts` uses `SELECT *` (PII violation), `logged_by` instead of `guard_id`, and has a stub WhatsApp notification function. The correct version is in `src/features/security/services/gateQRService.ts`. Any import from the legacy path will silently use broken code.

**Fix:** Delete `src/services/security/gateQRService.ts`. Verify no imports reference it.

---

### BUG-3: `confirmGatePassEntry` Doesn't Validate Pass Type or Date Range
**Severity: MEDIUM** | **File:** `src/features/contractors/services/gatePassVerificationService.ts:122-158`

`confirmGatePassEntry()` only checks `status === 'approved'` but doesn't validate:
- Pass type (`in`/`out`/`in_out`) — an exit-only pass can have entry recorded
- Date range (`start_date`/`end_date`) — expired passes can have entry recorded
- Time window — entry outside allowed hours succeeds

The `processGuardGateAction` in `gatePassGuardService.ts` correctly validates all of these. The `confirmGatePassEntry` function (used by `GatePassVerificationPanel`) skips them.

**Fix:** Either redirect `GatePassVerificationPanel` to use `useGuardGateAction` (preferred), or add the same validations to `confirmGatePassEntry`.

---

### BUG-4: Three Duplicate Entry/Exit Implementations — Inconsistent Behavior
**Severity: HIGH** | **Files:**
- `gatePassVerificationService.ts` → `confirmGatePassEntry` / `confirmGatePassExit`
- `gatePassGuardService.ts` → `processGuardGateAction`
- `materialGatePassActionService.ts` → `verifyGatePass`

Three separate implementations do the same thing with different validation levels:
| Feature | verificationService | guardService | actionService |
|---------|-------------------|--------------|---------------|
| Date range check | No | Yes | No |
| Pass type check | No | Yes | No |
| Exit validation RPC | No | Yes | No |
| Audit logging | No | Yes | No |
| Haptic feedback | N/A (service) | N/A | N/A |

**Fix:** Consolidate to a single canonical service (`gatePassGuardService.ts` which has the most complete logic). All hooks should delegate to it.

---

## Functional Gaps

### GAP-1: No WhatsApp/Push Notification on Internal Gate Pass Approval
**Severity: MEDIUM** | **File:** `src/features/contractors/services/materialGatePassActionService.ts`

When an internal gate pass is approved, no notification is sent. Notifications only fire for **public** gate passes (`is_public_request === true`). Internal approvals update the DB status but the requester has no way to know unless they check the app.

**Fix:** Trigger in-app + push notification (via existing `hsse_notifications` table) when status transitions to `approved` for internal passes.

---

### GAP-2: Print View Requires `qr_code_token` — Blocks Non-Approved Passes
**Severity: LOW** | **File:** `src/features/contractors/components/GatePassPrintView.tsx:39`

Line 39: `if (!gatePass || !gatePass.qr_code_token) return null;` — The print view returns nothing if QR token is absent. This prevents printing pending/rejected passes for record-keeping. Only approved passes get QR tokens.

**Fix:** Allow print without QR — show a "QR not yet generated" placeholder when `qr_code_token` is null.

---

### GAP-3: Gate Pass Status Filter Missing New Workflow Stages
**Severity: MEDIUM** | **File:** `src/pages/contractors/GatePasses.tsx:148-154`

The status filter dropdown only offers: `pending_pm_approval`, `pending_safety_approval`, `approved`, `rejected`, `completed`. Missing statuses from the actual workflow:
- `pending_contractor_approval`
- `pending_club_mgmt_ack`
- `pending_dept_ack`
- `pending_security_approval`
- `used`
- `expired`
- `cancelled`
- `pending_resubmission`

**Fix:** Add all workflow statuses to the filter dropdown with proper translations.

---

### GAP-4: `GatePassVerificationPanel` Uses Deprecated Hooks
**Severity: LOW** | **File:** `src/features/contractors/components/GatePassVerificationPanel.tsx:13,52-53`

Uses `useGatePassItems` and `useGatePassPhotos` which are marked `@deprecated` in `use-gate-pass-details.ts`. Should use `useGatePassMedia` instead.

**Fix:** Replace with `useGatePassMedia` hook.

---

### GAP-5: No Guard Role Gate on `GatePassVerificationPanel`
**Severity: MEDIUM** | **File:** `src/features/contractors/components/GatePassVerificationPanel.tsx`

`GatePassVerificationPanel` (used in `GateGuardDashboard`) does **not** check for `security_guard` role before allowing entry/exit confirmation. It uses `useConfirmGatePassEntry` / `useConfirmGatePassExit` which don't enforce role checks. In contrast, `useGuardGateAction` properly requires `security_guard` role.

**Fix:** Switch to `useGuardGateAction` which enforces role-based access and logs audit entries.

---

### GAP-6: Public Gate Pass — No Rate Limiting Display
**Severity: LOW** | **File:** `src/pages/public-gate-pass/PublicRequestPage.tsx`

The `submit_public_gate_pass` RPC accepts `p_client_ip` for rate limiting, but on failure due to rate limit, the error message is generic. No countdown or retry-after indicator is shown.

---

## Integration Issues

### INT-1: Dept Gate Passes Pages May Reference Stale Data
**Severity: LOW** | **Files:** `src/pages/dept-gate-passes/`

The department gate passes module has 4 pages. Need to verify they use the same query service and invalidation keys as the main gate pass module to avoid stale data when approvals happen from the main dashboard.

---

### INT-2: My Gate Passes Create Page — Potential Duplication
**Severity: LOW** | **Files:** `src/pages/my-gate-passes/Create.tsx`

There's both `GatePassFormDialog` (used in `GatePasses.tsx`) and a dedicated `Create.tsx` page. These may use different creation flows, causing inconsistency.

---

## Proposed Fix Plan (Priority Order)

1. **Remove `api.ipify.org` calls** — Replace with `null` in both files (BUG-1)
2. **Delete legacy `src/services/security/gateQRService.ts`** (BUG-2)
3. **Consolidate entry/exit to single service** — Make `GatePassVerificationPanel` use `useGuardGateAction` instead of `useConfirmGatePassEntry/Exit` (BUG-3, BUG-4, GAP-5)
4. **Replace deprecated hooks** in `GatePassVerificationPanel` (GAP-4)
5. **Add missing status filters** to `GatePasses.tsx` dropdown (GAP-3)
6. **Allow print without QR** in `GatePassPrintView.tsx` (GAP-2)
7. **Add internal pass approval notifications** (GAP-1)

### Files to Modify
- `src/features/contractors/hooks/use-public-gate-pass.ts` — Remove ipify call
- `src/hooks/common/use-audit-log.ts` — Remove ipify call
- `src/services/security/gateQRService.ts` — **DELETE**
- `src/features/contractors/components/GatePassVerificationPanel.tsx` — Switch to `useGuardGateAction` + `useGatePassMedia`
- `src/pages/contractors/GatePasses.tsx` — Add missing statuses to filter
- `src/features/contractors/components/GatePassPrintView.tsx` — Allow print without QR

