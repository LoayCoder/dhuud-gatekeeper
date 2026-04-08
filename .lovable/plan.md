

# Mobile Responsiveness Fix — Security Approval Queue

## Problems (from screenshot)
1. "Pending Security Review" badge overflows/clips on the right side of worker cards
2. "Return with Comments" button text gets cut off even with the mobile shortening
3. Worker name + badge row doesn't wrap properly on narrow screens
4. Card content has insufficient breathing room on small devices

## Changes

### File 1: `src/features/contractors/components/WorkerSecurityApprovalQueue.tsx`

**Badge overflow fix:** The worker card header currently places the avatar, name, and a status badge in a single flex row. On mobile, the badge overflows. Fix by:
- Removing the inline "Pending Security Review" badge from the header row
- Moving any status indicator below the name as a small block-level badge that wraps naturally

**Button layout fix:** Change buttons from side-by-side (`flex`) to stacked vertically on mobile (`flex-col sm:flex-row`), ensuring both "Grant Security Clearance" / "Approve" and "Return with Comments" / "Reject" buttons get full width on small screens.

**Worker info section:** Ensure all info rows (ID, phone, nationality) use `break-all` on values to prevent long IDs from overflowing.

**Pre-approved text:** Add `break-words` and ensure the timestamp line wraps cleanly.

### File 2: `src/pages/security/AccessControlDashboard.tsx`

**Approvals tab grid:** Change `grid gap-4 lg:grid-cols-2` to `grid gap-3 grid-cols-1 lg:grid-cols-2` — on mobile the two approval cards (Visitor + Worker) should always stack vertically with tighter gaps.

**Container padding:** Reduce `py-4 px-4` to `py-3 px-3 sm:px-4 md:px-6` for tighter mobile fit.

---

**Files changed:** 2 files updated

