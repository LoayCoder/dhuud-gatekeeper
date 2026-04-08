

# Unified Workflow: Induction → ID Card (Tab Switch with Banner)

## Current State
- 4 tabs: Details, Documents, **QR Code**, **Induction** (QR before Induction — wrong order)
- QR tab has "Quick Onboard" card that duplicates induction sending
- No visual connection between completing induction and generating ID

## Changes (single file: `WorkerDetailDialog.tsx`)

### 1. Controlled tab state
Change `<Tabs defaultValue="details">` to `<Tabs value={activeTab} onValueChange={setActiveTab}>` so we can programmatically switch tabs.

### 2. Reorder and rename tabs
```
Details | Documents | Induction | ID Card
```
- Swap tab order: Induction comes before ID Card
- Rename "QR Code" → "ID Card" (value stays `"qr"` to minimize changes)

### 3. Induction tab — add success banner
When `hasCompletedInduction` is true, show a green banner at the top:
```
✓ Induction complete
[Go to ID Card →] (button that sets activeTab to "qr")
```

### 4. ID Card tab — remove Quick Onboard, add gate
- **Remove** the entire "Quick Onboard" card (lines 207-250) — no more duplicate induction sending
- **Add gate**: If `!hasCompletedInduction`, show a blocked state card: "Worker must complete induction first" with a button to switch to the Induction tab
- When induction IS completed, show the existing ID Card + QR Code components as-is

### 5. Summary of UX flow
1. User opens worker → sees Details tab
2. Clicks **Induction** tab → sends induction video
3. Once worker completes induction → green banner appears with "Go to ID Card" button
4. Clicks button → switches to **ID Card** tab → generates QR / downloads ID card

## Files to Modify

| File | Change |
|------|--------|
| `src/features/contractors/components/WorkerDetailDialog.tsx` | Add `activeTab` state, reorder tabs, rename QR→ID Card, add induction success banner, remove Quick Onboard, add induction gate on ID Card tab |

