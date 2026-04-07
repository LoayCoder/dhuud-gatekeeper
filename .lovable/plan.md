

# Enhance Gate Pass Create Form

## Overview

Rebuild the Gate Pass creation wizard with fixed items section, structured vehicle plate, driver details with phone input, approval flow preview, and improved validation/UX.

## Changes

### 1. Fix & Enhance Items Section (`GatePassItemCard.tsx`)

- Rename "Item Name" label → "Item Description" (swap roles: `item_name` field becomes the description field, or relabel)
- Make Qty field required with numeric-only validation (`inputMode="decimal"`, reject non-numeric)
- Make Unit required (dropdown: Bags, Units, Tons, Pieces, etc.)
- Make Photos mandatory — already enforced but strengthen error display
- Add per-field error highlighting for incomplete items
- Update validation in `GatePassCreateWizard.tsx`:
  ```
  step2Valid = items.every(item => 
    item.item_name.trim() && 
    item.quantity.trim() && !isNaN(Number(item.quantity)) &&
    item.unit.trim() && 
    item.photos.length > 0
  )
  ```

### 2. Driver Details Section (New — Step 3)

Restructure Step 3 "Vehicle & Driver" into two clear sub-sections:

**Driver Details card:**
- Driver Name (text input)
- Driver Mobile (`DhuudPhoneInput` with SA default country code, replacing plain `Input type="tel"`)

**Vehicle Details card:**
- Vehicle Plate split into structured inputs:
  - Letters field (text, max 3 chars, placeholder "ABC")
  - Numbers field (numeric, max 4 digits, placeholder "1234")
  - Combined display preview below
- Vehicle Plate Image Upload (mandatory — reuse `GatePassPhotoCapture` with `maxPhotos={1}`)

State additions in wizard:
```
const [plateLetters, setPlateLetters] = useState("")
const [plateNumbers, setPlateNumbers] = useState("")
const [platePhoto, setPlatePhoto] = useState<File[]>([])
const [platePhotoUrls, setPlatePhotoUrls] = useState<string[]>([])
```

Update `step3Valid` to require plate letters + numbers + plate photo.

### 3. Update Create Service (`materialGatePassCreateService.ts`)

- Pass `vehicle_plate_letters` and `vehicle_plate_numbers` (columns already exist in DB)
- Compose `vehicle_plate` as `${letters} ${numbers}` for backward compatibility
- Upload plate photo to `gate-pass-photos` bucket under `{tenantId}/{passId}/plate/`
- Store plate photo path (add to `gate_pass_photos` table with a `photo_type: 'plate'` distinction or store in notes)

### 4. Update `CreateGatePassData` interface

Add fields:
```typescript
vehicle_plate_letters?: string;
vehicle_plate_numbers?: string;
plate_photos?: File[];
```

### 5. Approval Flow Preview (Step 1 — after approver selection)

After the approver is selected/auto-resolved, display an approval flow preview card:

```
Approval Flow Preview:
  Step 1: Department Manager ← (selected approver)
  Step 2: Club Management Acknowledgment
  Step 3: Security Supervisor
  ✓ Approved → QR Generated
```

This is a **read-only display** based on the known internal workflow:
- `pending_dept_approval` → `pending_club_mgmt_ack` → `pending_security_approval` → `approved`

Implementation: A simple `ApprovalFlowPreview` component showing the static 3-step chain with the selected approver name at step 1.

### 6. Date Validation Enhancement

- Already enforces `endDate >= passDate` via calendar `disabled` prop
- Add explicit warning if date range > 1 day for material passes
- Show policy note: "Material passes are typically limited to 1 day"

### 7. Wizard Step Restructure

Keep 4 steps but rename for clarity:
```
Step 1: Request Info (type, dates, approver + flow preview)
Step 2: Items (description, qty, unit, photos)
Step 3: Driver & Vehicle (driver name/mobile, plate letters/numbers, plate image)
Step 4: Review & Submit
```

### 8. Review Step Enhancement

- Show all new fields: structured plate, driver mobile, plate image thumbnail
- Show approval flow preview summary
- Items show description + qty + unit + photo count

### Files Modified

| File | Change |
|------|--------|
| `GatePassCreateWizard.tsx` | Add structured plate state, DhuudPhoneInput for driver mobile, plate photo, approval flow preview, enhanced validation |
| `GatePassItemCard.tsx` | Rename "Item Name" → "Item Description", make qty/unit required, numeric validation |
| `materialGatePassCreateService.ts` | Pass `vehicle_plate_letters`, `vehicle_plate_numbers`, upload plate photo |
| `use-material-gate-passes.ts` | Update `CreateGatePassData` interface with new fields |
| New: `ApprovalFlowPreview.tsx` | Static approval chain display component |

### Technical Notes

- DB already has `vehicle_plate_letters` and `vehicle_plate_numbers` columns — no migration needed
- `DhuudPhoneInput` exists at `src/components/ui/phone-input.tsx`
- Approval chain is hardcoded display based on existing `approve_gate_pass_unified` RPC logic (dept → club mgmt → security)
- No DB migration required — all columns exist
- Mobile responsive via existing `grid-cols-1 md:grid-cols-2` pattern

