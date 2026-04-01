

# Audit Report: Inspections & Audits Module — Gaps & Fixes

## Summary

After thorough code review across all workspace pages, hooks, mutations, session creation dialogs, findings, lifecycle, dashboard, analytics, schedules, exports, and templates, here are the remaining gaps:

---

## GAP 1: No "Create Audit Session" Button on Sessions Dashboard (CRITICAL)

The `InspectionSessionsDashboard.tsx` has buttons for **Asset** (`CreateSessionDialog`) and **Area** (`CreateAreaSessionDialog`) sessions, but **no button for Audit sessions**. The `CreateAuditSessionDialog` component exists but is never rendered on the dashboard.

**Fix:** Add a third button and dialog state for `CreateAuditSessionDialog` in `InspectionSessionsDashboard.tsx`.

---

## GAP 2: Audit Workspace — No Sticky Completion Bar (MODERATE)

The Area workspace has a sticky bottom bar showing progress + "Complete Inspection" button. The **Audit workspace** has no equivalent — users must scroll to the sidebar to find the status card's complete button.

**Fix:** Add a sticky completion bar to `AuditSessionWorkspace.tsx` (same pattern as Area workspace), showing `progress.responded / progress.total` and a "Complete Audit" button.

---

## GAP 3: Audit Workspace — FindingsPanel Only Shows After Completion (MODERATE)

In `AuditSessionWorkspace.tsx` line 422: `{(findingsCount?.total ?? 0) > 0 && (...)}`. This means findings are invisible during `in_progress` even though the audit save mutation auto-creates findings on non-conforming items.

**Fix:** Change condition to also show during `in_progress`: `{(session.status === 'in_progress' || (findingsCount?.total ?? 0) > 0) && (...)}` — matching the Area workspace pattern.

---

## GAP 4: Audit Finding Dedup — Missing `.neq('status', 'closed')` (BUG)

In `use-audit-session-mutations.ts` line 143-148, the audit save mutation's finding dedup check does NOT exclude closed findings (unlike the area mutation which was fixed). This causes the same race condition: changing conforming → non-conforming → conforming → non-conforming will fail to create a new finding.

**Fix:** Add `.neq('status', 'closed')` to the existing finding check in `useSaveAuditResponse`.

---

## GAP 5: Audit Workspace — Missing Session Export Data (MINOR)

`AuditSessionWorkspace.tsx` passes `responses` to `SessionExportDropdown` but does NOT pass `templateItems`, so CSV/Excel exports lack question text columns.

**Fix:** Pass `templateItems` prop to `SessionExportDropdown`.

---

## GAP 6: Audit Scoring Card Not Populated Correctly (VERIFY)

`AuditScoringCard` and `AuditProgressCard` rely on `useAuditProgress` and `useNCCounts`. These hooks exist and use RPCs. This should work if the RPCs exist — but the `can_close_area_session` RPC had a column error previously. Need to verify `get_audit_progress` and `get_audit_nc_counts` RPCs exist and function.

**Action:** Verify these RPCs exist in DB. If they don't, create them.

---

## Files to Change

1. **`src/pages/inspections/InspectionSessionsDashboard.tsx`** — Add Create Audit Session button + dialog
2. **`src/pages/inspections/AuditSessionWorkspace.tsx`** — Add sticky completion bar, fix FindingsPanel visibility condition, pass templateItems to export
3. **`src/hooks/use-audit-sessions/use-audit-session-mutations.ts`** — Fix finding dedup to exclude closed findings
4. **`src/locales/en/translation.json`** + **`src/locales/ar/translation.json`** — New keys for audit completion bar
5. **Database migration (if needed)** — Verify/create audit progress RPCs

## No Changes Needed (Verified Working)

- Template checklist editor with CRUD and bulk Excel import
- Area inspection checklist with GPS, photos, notes, auto-save
- Area findings auto-creation on fail with dedup fix
- FindingsPanel with manual add, edit, description, GPS/notes/photos display
- SLA countdown timers on findings
- Session lifecycle (complete, close, reopen)
- Corrective action creation from findings
- Session export (PDF, CSV, Excel)
- Dashboard with real RPC-backed stats (overriding stubs)
- Inspection schedules
- Inspection analytics

