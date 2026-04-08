
## Fix plan: remove the remaining mobile overlap in Security Approvals

### What is actually causing it
From the current code, the remaining mobile issue is not only button width. The dashboard is rendering:

- an outer **“Security Approvals”** card in `AccessControlDashboard.tsx`
- and inside it, a full standalone **`WorkerSecurityApprovalQueue`** header with:
  - its own title
  - role subtitle
  - pending count
  - intro note

On small screens, that creates duplicated section chrome and makes the area feel stacked/overlapping even before the worker card starts.

### Implementation plan

#### 1. Make `WorkerSecurityApprovalQueue` support an embedded/mobile-compact mode
**File:** `src/features/contractors/components/WorkerSecurityApprovalQueue.tsx`

Add a small prop like `embedded?: boolean` (or `showHeader?: boolean`) so the component can behave differently when used inside another dashboard card.

In embedded mode:
- hide the internal queue title/subtitle/count block
- keep the worker cards and essential note only
- tighten spacing so the first worker card starts sooner
- keep the standalone full header for the Contractors page

Also update the standalone header itself so it wraps safely on mobile:
- use `flex-col sm:flex-row` instead of competing left/right layout
- replace `truncate` with `whitespace-normal break-words` for titles/company names
- keep the count badge on its own row on mobile if needed

#### 2. Flatten the Security Approvals section inside the dashboard
**File:** `src/pages/security/AccessControlDashboard.tsx`

Update the dashboard usage to pass the embedded variant:
```tsx
<WorkerSecurityApprovalQueue embedded />
```

Then refine the outer card so it becomes the only section header on mobile:
- make the card title row `flex-wrap`
- keep the badge from colliding with the title
- reduce inner content padding slightly on mobile
- remove extra top spacing so the queue starts cleanly under the header

This will eliminate the current double-title / double-count effect:
- outer: “Security Approvals”
- inner: “Security Approval Queue / 1 pending”

#### 3. Keep worker cards in “wrap, don’t truncate” mode
**File:** `src/features/contractors/components/WorkerSecurityApprovalQueue.tsx`

Apply the same mobile pattern used in the contractor portal:
- `break-words` / `whitespace-normal` for long names and company names
- `break-all` for ID and phone
- keep action buttons stacked vertically on mobile
- if any status pill is shown, place it on its own wrapping row under the name, never in the same header row

#### 4. Preserve the standalone Workers page behavior
**File:** `src/pages/contractors/Workers.tsx`

No visual redesign is needed there beyond using the default standalone variant. The component should still show its full header when opened from the dedicated workers security tab.

### Technical details
- No backend or database changes
- Main change is a UI composition fix, not a data fix
- Likely files:
  - `src/features/contractors/components/WorkerSecurityApprovalQueue.tsx`
  - `src/pages/security/AccessControlDashboard.tsx`
  - optionally `src/pages/contractors/Workers.tsx` if explicit prop usage is preferred for clarity

### Expected result
On mobile, the Security Approvals section will show:
- one clean section heading
- no duplicate pending counters competing for space
- no clipped/stacked header chrome
- worker cards that wrap naturally and remain readable

### QA to verify
Test at the current narrow viewport range (around 384–390px) in both English and Arabic:
- no overlap in the Access Dashboard Security Approvals section
- no duplicate queue header inside the dashboard card
- worker name/company/ID/phone all wrap correctly
- approve/reject buttons remain full-width and readable
- standalone Contractors → Workers → Security tab still looks correct
