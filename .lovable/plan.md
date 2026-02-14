

## Fix: Gate Pass Details Dialog -- Remaining Issues

### Current State After Previous Fix
The previous fix correctly added `items` prop to `DetailsTab` and `club_mgmt_ack_*` columns to the database query. However, the user is still seeing problems. Here is what is happening:

### Problem 1: "No items listed" on Items and Photos tab
These public gate passes (`PUB-20260210-*`) **genuinely have zero rows** in `gate_pass_items` -- the public request form stores the description directly in `material_description` on the pass itself, not as separate item rows. The dialog currently shows a blank "No items or photos listed" message with no context.

**Fix:** When there are no items but the pass has a `material_description`, show the material description as a fallback in the Items and Photos tab. Pass the `pass` object (or `passDetails`) to `ItemsPhotosTab` so it can display the description.

### Problem 2: Timeline not reflecting the right data
The database query now fetches `club_mgmt_ack_*` fields correctly (verified via network response), but the timeline code at line 632 checks `passDetails.club_mgmt_ack_at && passDetails.club_mgmt_acker`. The `club_mgmt_acker` is resolved from profile lookup using `club_mgmt_ack_by`. This should work since the profile fetch includes that ID. However, the TypeScript cast at line 149 may cause issues if the Supabase types haven't regenerated -- the fields might not be available on `passData` before the cast. The cast is applied correctly, so this should work. The likely cause was the user testing before the build deployed.

**Additional improvement:** For public gate passes, the timeline should also show the current pending step (e.g., "Pending Security Supervisor Approval") as an active/current step, not just completed events. Currently it only shows completed events, which can make the timeline look incomplete.

### Problem 3: Material Description still empty on Details tab
The code at line 267 uses `data.material_description` which should work since the query returns it. But `data` is set to `passDetails || pass` at line 238. The `pass` object comes from the approval queue which uses a different query (`usePendingGatePassApprovals`). If `passDetails` hasn't loaded yet or fails, it falls back to `pass` which should also have `material_description`. This should work correctly after the build deploys.

### Summary of Changes

| # | File | Change |
|---|------|--------|
| 1 | `src/components/contractors/GatePassDetailDialog.tsx` | Pass `pass`/`passDetails` to `ItemsPhotosTab`; show `material_description` as fallback when no items exist |
| 2 | `src/components/contractors/GatePassDetailDialog.tsx` | Add a "pending" step indicator in the timeline for the current workflow stage |

### Technical Details

**Fix 1 -- ItemsPhotosTab fallback for public passes:**

Update the parent call:
```typescript
<ItemsPhotosTab
  items={items || []}
  photos={photos || []}
  materialDescription={passDetails?.material_description || pass.material_description}
  isLoadingItems={isLoadingItems}
  isLoadingPhotos={isLoadingPhotos}
  t={t}
/>
```

Update `ItemsPhotosTab` to accept `materialDescription` prop and show it when no items exist:
```typescript
// When items is empty, show material description instead of just "No items"
{items.length === 0 && materialDescription && (
  <div className="p-3 rounded-lg border bg-muted/30">
    <p className="font-medium text-sm">{materialDescription}</p>
  </div>
)}
```

**Fix 2 -- Timeline pending step:**

After all completed events, add a "pending" step based on current `status`:
```typescript
// Add current pending step
const pendingStepLabels: Record<string, string> = {
  pending_security_approval: "Pending Security Supervisor Approval",
  pending_club_mgmt_ack: "Pending Golf Club Management",
  pending_contractor_approval: "Pending Contractor Approval",
  // etc.
};
if (pendingStepLabels[passDetails.status]) {
  events.push({
    type: "pending",
    label: t(`contractors.gatePassDetail.timeline.${passDetails.status}`, pendingStepLabels[passDetails.status]),
    timestamp: null,
    icon: Clock,
    color: "bg-amber-100 text-amber-800 ...",
  });
}
```

### Risk
- Low -- UI-only changes, no database or RLS modifications
- Backward compatible with internal gate passes that do have items

