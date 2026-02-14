

## Fix: Gate Pass Details Dialog -- Empty Tabs and Missing Timeline Data

### Problems Identified

1. **Build Error (blocks all rendering):** The `DetailsTab` sub-component references an `items` variable (line 264) that is not in its scope. The `items` data is fetched in the parent `GatePassDetailDialog` but never passed down. This causes a TypeScript build failure, which prevents the entire dialog from rendering -- explaining why Details, Material Description, and Items tabs all appear empty.

2. **Timeline Missing Golf Club Management Step:** The database query in `useGatePassDetails` does not include `club_mgmt_ack_by`, `club_mgmt_ack_at`, or `club_mgmt_ack_notes` in its SELECT statement. A TypeScript cast pretends the fields exist, but no data is actually fetched. The timeline therefore never shows the "Golf Club Management acknowledged" event.

### Fix 1: Pass `items` prop to `DetailsTab` (GatePassDetailDialog.tsx)

Add `items` to the `DetailsTab` props interface and pass it from the parent:

**Parent call (around line 163):**
```typescript
<DetailsTab
  pass={pass}
  passDetails={passDetails}
  items={items || []}          // ADD THIS
  isLoading={isLoadingDetails}
  getStatusBadge={getStatusBadge}
  t={t}
/>
```

**Component signature (around line 211):**
```typescript
function DetailsTab({
  pass,
  passDetails,
  items,                       // ADD THIS
  isLoading,
  getStatusBadge,
  t,
}: {
  pass: MaterialGatePass;
  passDetails: ...;
  items: GatePassItem[];       // ADD THIS
  isLoading: boolean;
  getStatusBadge: ...;
  t: ...;
}) {
```

### Fix 2: Add missing columns to database query (use-gate-pass-details.ts)

Add `club_mgmt_ack_by, club_mgmt_ack_at, club_mgmt_ack_notes` to the SELECT in the `useGatePassDetails` query (line 130), so the timeline can render the acknowledgment step.

### Files Modified
| File | Change |
|------|--------|
| `src/components/contractors/GatePassDetailDialog.tsx` | Pass `items` prop to `DetailsTab`; add `items` to its type signature |
| `src/hooks/contractor-management/use-gate-pass-details.ts` | Add `club_mgmt_ack_by, club_mgmt_ack_at, club_mgmt_ack_notes` to SELECT query |

### Risk
- Low -- purely fixing missing prop threading and an incomplete SELECT statement
- No schema or RLS changes needed
