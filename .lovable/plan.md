

# Legacy & Dead Code Cleanup

## Summary of Findings

After scanning the codebase, here are the categories of legacy code that can be cleaned up:

---

## Category 1: Stub Components That Render Nothing

These components exist only as empty stubs (`return null`) and provide zero functionality:

| File | Used By | Verdict |
|------|---------|---------|
| `src/components/notifications/ChannelIcon.tsx` | `NotificationDeliveryLog.tsx` | Stub — renders nothing in the delivery log page |
| `src/components/notifications/DeliveryStatusBadge.tsx` | `NotificationDeliveryLog.tsx` | Stub — renders nothing |
| `src/components/notifications/DeliveryLogStatsCards.tsx` | `NotificationDeliveryLog.tsx` | Stub — renders nothing |
| `src/components/notifications/DeliveryLogDetailDialog.tsx` | `NotificationDeliveryLog.tsx` | Stub — renders nothing |
| `src/components/notifications/NotificationPermissionPrompt.tsx` | Exported from index, no real consumer | Stub — renders nothing |
| `src/components/layout/AppSidebar/AppSidebarModals.tsx` | `AppSidebar.tsx` | Stub — renders nothing |

**Action:** These are placeholders for features not yet built. They should be kept if there's intent to implement them, but flagged as "not yet implemented" rather than legacy. **No action needed** unless you want to remove placeholders.

---

## Category 2: Deprecated Functions Still Called (Migrate Callers)

These are marked `@deprecated` but still have active callers:

| Deprecated Function | Replacement | Active Callers |
|---------------------|-------------|----------------|
| `generatePDFFromElement` (pdf-utils.ts) | `generateBrandedPDFFromElement` | 3 files: `generate-session-report-pdf.ts`, `generate-audit-report-pdf.ts`, `ExecutiveReport.tsx`, `generate-witness-statement-pdf.ts` |
| `sendEmailViaSES` (email-sender.ts) | `sendEmail` / `sendEmailToOne` | 7 edge functions still call it |
| `formatSAR` / `formatSARArabic` (pricing-engine.ts) | `formatCurrency` from currency-utils.ts | `BillingOverview.tsx` still uses `formatSAR` |
| `useGatePassItems` / `useGatePassPhotos` (use-gate-pass-details.ts) | `useGatePassMedia` | 3 components: `GatePassApprovalCard`, `ItemsPhotosTab`, `GatePassDetailDialog` |

**Action:** Migrate callers to the new functions, then remove the deprecated ones.

---

## Category 3: Redirect-Only Page (Can Remove Route)

| File | Purpose |
|------|---------|
| `src/pages/inspections/MyInspectionActions.tsx` | Only redirects to `/incidents/my-actions` — the route `/inspections/my-actions` could be removed from `inspection.routes.tsx` and the sidebar menu, and the file deleted |

**Action:** Remove the redirect page, its route entry, and update the sidebar menu link to point directly to `/incidents/my-actions`.

---

## Category 4: Massive Inspection Stubs File

| File | Lines | Purpose |
|------|-------|---------|
| `src/features/incidents/hooks/use-inspection-stubs.ts` | ~450+ | Contains ~40 stub hooks/functions for inspection features that were "removed during migration" |

**Action:** This file is actively imported by `src/features/incidents/index.ts` and `src/features/assets/index.ts`. It provides no real functionality. These stubs should be replaced with real implementations or the consuming components should be updated to not depend on them. **Keep for now** — removing would break imports.

---

## Recommended Cleanup Plan (Safe to Execute)

### Step 1: Migrate `useGatePassItems`/`useGatePassPhotos` callers → `useGatePassMedia`
- Update `GatePassApprovalCard.tsx`, `ItemsPhotosTab.tsx`, `GatePassDetailDialog.tsx`
- Remove the deprecated exports from `use-gate-pass-details.ts`

### Step 2: Migrate `formatSAR` → `formatCurrency`
- Update `BillingOverview.tsx` to use `formatCurrency` from `currency-utils.ts`
- Remove `formatSAR`/`formatSARArabic` from `pricing-engine.ts`

### Step 3: Remove redirect page `MyInspectionActions.tsx`
- Remove route from `inspection.routes.tsx`
- Update sidebar menu in `useHsseMenu.ts` to point to `/incidents/my-actions`
- Delete the file

### Step 4: Migrate `sendEmailViaSES` → `sendEmailToOne` in edge functions
- Update 7 edge functions to use `sendEmailToOne`
- Remove the deprecated wrapper from `email-sender.ts`

### Step 5: Remove `AppSidebarModals` empty stub
- Remove from `AppSidebar.tsx` and delete the file

**Files changed:** ~15 files modified, 3 files deleted

