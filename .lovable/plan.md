
# Gate Pass Item Photo Requirement Plan

## Overview

This plan adds a mandatory photo attachment requirement for each item in a Gate Pass, with automatic image compression to optimize storage while maintaining visibility for security verification.

---

## Current State Analysis

| Component | Current Behavior |
|:----------|:-----------------|
| `gate_pass_items` table | No photo column or photo association |
| `gate_pass_photos` table | Photos linked to `gate_pass_id` only (pass-level, not item-level) |
| `Create.tsx` (My Gate Passes) | No photo upload per item |
| `GatePassFormDialog.tsx` | Has pass-level photos (max 3), not item-level |
| `compressImage()` utility | Already exists with configurable maxWidth/quality |

---

## Implementation Plan

### Phase 1: Database Schema - Create Item Photos Table

Create a new table `gate_pass_item_photos` to link photos to specific items:

```sql
CREATE TABLE gate_pass_item_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES gate_pass_items(id) ON DELETE CASCADE,
  gate_pass_id UUID NOT NULL REFERENCES material_gate_passes(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_gate_pass_item_photos_item_id ON gate_pass_item_photos(item_id);
CREATE INDEX idx_gate_pass_item_photos_gate_pass_id ON gate_pass_item_photos(gate_pass_id);
CREATE INDEX idx_gate_pass_item_photos_tenant_id ON gate_pass_item_photos(tenant_id);

-- RLS policies
ALTER TABLE gate_pass_item_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for item photos"
  ON gate_pass_item_photos
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "Users can insert own item photos"
  ON gate_pass_item_photos
  FOR INSERT
  WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND uploaded_by = auth.uid()
  );
```

---

### Phase 2: Enhanced Image Compression

Update compression settings for optimal security verification:

| Setting | Value | Rationale |
|:--------|:------|:----------|
| `maxWidth` | 1280px | Good detail for item verification |
| `quality` | 0.75 | Balance between size and clarity |
| Target size | ~100-300KB | Fast loading on mobile |

The existing `compressImage()` function in `src/lib/upload-utils.ts` already supports this - we'll use it with optimized parameters.

---

### Phase 3: Create Item Photo Upload Component

Create a new reusable component `GatePassItemPhotoUpload.tsx`:

```text
Location: src/components/contractors/GatePassItemPhotoUpload.tsx

Features:
- Camera capture button (mobile)
- File upload button
- Photo preview thumbnail
- Remove photo button
- Required indicator (red asterisk)
- Validation error message if missing
- Automatic compression on capture/upload
```

**Component Structure:**
```text
┌─────────────────────────────────────────┐
│  📷 [Take Photo]  📁 [Upload]           │
├─────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │ img1 │  │ img2 │  │  +   │          │
│  │  ❌  │  │  ❌  │  │ add  │          │
│  └──────┘  └──────┘  └──────┘          │
├─────────────────────────────────────────┤
│  ⚠️ At least 1 photo required          │ (if empty)
└─────────────────────────────────────────┘
```

---

### Phase 4: Update Items Table UI

Modify the items table in both `Create.tsx` and `GatePassFormDialog.tsx`:

**New Column Structure:**
```text
| # | Item Name* | Description | Qty | Unit | Photo* | ❌ |
|---|------------|-------------|-----|------|--------|-----|
| 1 | Cement     | 50kg bags   | 100 | bags | [📷 +] |  🗑 |
| 2 | Steel bars | 12mm        | 50  | pcs  | [1 📷] |  🗑 |
```

**Photo Cell States:**
1. **No photos**: Camera icon with "Add" - shows error border
2. **Has photos**: Shows count and thumbnail preview
3. **Uploading**: Shows spinner

---

### Phase 5: Update Form Schema and Validation

**Updated Item Schema:**
```typescript
const itemSchema = z.object({
  item_name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  photos: z.array(z.instanceof(File)).min(1, "At least one photo is required"),
  photoPreviewUrls: z.array(z.string()).optional(), // For UI preview
});
```

**Form Validation:**
- Form cannot be submitted if ANY item has 0 photos
- Clear error message indicating which items are missing photos
- Visual indicator on items without photos

---

### Phase 6: Update Create Gate Pass Hook

Modify `useCreateGatePass` in `use-material-gate-passes.ts`:

**New Flow:**
1. Create gate pass record
2. Insert items to `gate_pass_items`
3. For each item with photos:
   a. Compress each photo (maxWidth: 1280, quality: 0.75)
   b. Upload to storage: `gate-pass-photos/{tenant_id}/{gate_pass_id}/{item_id}/{filename}`
   c. Insert record to `gate_pass_item_photos`

**Updated Interface:**
```typescript
export interface GatePassItemInput {
  item_name: string;
  description?: string;
  quantity?: string;
  unit?: string;
  photos: File[];  // NEW: Required photos array
}
```

---

### Phase 7: Add Translation Keys

**English (`src/locales/en/translation.json`):**
```json
{
  "gatePasses": {
    "itemPhoto": "Item Photo",
    "itemPhotoRequired": "At least one photo is required for each item",
    "addItemPhoto": "Add Photo",
    "itemPhotoDescription": "Attach a photo of the item for security verification",
    "itemsWithoutPhotos": "{{count}} item(s) are missing required photos",
    "takePhoto": "Take Photo",
    "uploadPhoto": "Upload",
    "removePhoto": "Remove Photo",
    "photoCompressing": "Compressing...",
    "photoUploading": "Uploading..."
  }
}
```

**Arabic (`src/locales/ar/translation.json`):**
```json
{
  "gatePasses": {
    "itemPhoto": "صورة الصنف",
    "itemPhotoRequired": "مطلوب صورة واحدة على الأقل لكل صنف",
    "addItemPhoto": "إضافة صورة",
    "itemPhotoDescription": "أرفق صورة للصنف للتحقق الأمني",
    "itemsWithoutPhotos": "{{count}} صنف بدون صور مطلوبة",
    "takePhoto": "التقاط صورة",
    "uploadPhoto": "رفع",
    "removePhoto": "حذف الصورة",
    "photoCompressing": "جاري الضغط...",
    "photoUploading": "جاري الرفع..."
  }
}
```

---

## Files to Create/Modify

| File | Action | Description |
|:-----|:-------|:------------|
| Migration SQL | **Create** | Add `gate_pass_item_photos` table with RLS |
| `src/components/contractors/GatePassItemPhotoUpload.tsx` | **Create** | New photo upload component for items |
| `src/pages/my-gate-passes/Create.tsx` | **Modify** | Add photo column to items table, validation |
| `src/components/contractors/GatePassFormDialog.tsx` | **Modify** | Add photo column to items table, validation |
| `src/hooks/contractor-management/use-material-gate-passes.ts` | **Modify** | Handle item photo uploads with compression |
| `src/locales/en/translation.json` | **Modify** | Add photo-related translations |
| `src/locales/ar/translation.json` | **Modify** | Add Arabic photo-related translations |

---

## Compression Settings Summary

| Parameter | Value | Purpose |
|:----------|:------|:--------|
| Max Width | 1280px | Sufficient detail for item identification |
| Quality | 0.75 (75%) | Good balance of size and clarity |
| Format | JPEG | Best compression for photos |
| Expected Size | 100-300KB | Fast upload on mobile networks |

**Compression Logic:**
```typescript
// Optimized for security verification
const compressedFile = await compressImage(file, 1280, 0.75);
```

---

## Validation Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                    USER ADDS ITEMS                           │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────▼───────────────┐
              │  For each item:               │
              │  - Item name (required)       │
              │  - Description (optional)     │
              │  - Quantity (optional)        │
              │  - Unit (optional)            │
              │  - Photo(s) (REQUIRED)        │
              └───────────────┬───────────────┘
                              │
              ┌───────────────▼───────────────┐
              │  User clicks "Submit"         │
              └───────────────┬───────────────┘
                              │
              ┌───────────────▼───────────────┐
              │  Check: All items have ≥1     │
              │  photo?                       │
              └───────────────┬───────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
          ▼                                       ▼
┌─────────────────┐                     ┌─────────────────────┐
│      YES        │                     │        NO           │
│ Compress photos │                     │ Show error:         │
│ Upload to       │                     │ "X item(s) missing  │
│ storage         │                     │  required photos"   │
│ Create records  │                     │ Highlight items     │
└─────────────────┘                     │ Block submission    │
                                        └─────────────────────┘
```

---

## UI Preview

### Items Table with Photo Column

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ # │ Item Name *     │ Description  │ Qty  │ Unit    │ Photo *    │   │
├───┼─────────────────┼──────────────┼──────┼─────────┼────────────┼───┤
│ 1 │ ┌─────────────┐ │ ┌──────────┐ │ ┌──┐ │ ┌─────┐ │ ┌────────┐ │ 🗑│
│   │ │ Cement      │ │ │ 50kg bag │ │ │10│ │ │ bag │ │ │ 📷 1 ✓ │ │   │
│   │ └─────────────┘ │ └──────────┘ │ └──┘ │ └─────┘ │ └────────┘ │   │
├───┼─────────────────┼──────────────┼──────┼─────────┼────────────┼───┤
│ 2 │ ┌─────────────┐ │ ┌──────────┐ │ ┌──┐ │ ┌─────┐ │ ┌────────┐ │ 🗑│
│   │ │ Steel bars  │ │ │ 12mm     │ │ │50│ │ │ pcs │ │ │ ⚠️ Add │ │   │
│   │ └─────────────┘ │ └──────────┘ │ └──┘ │ └─────┘ │ └────────┘ │   │
└───┴─────────────────┴──────────────┴──────┴─────────┴────────────┴───┘

❌ 1 item is missing a required photo

[+ Add Item]                                    [Cancel] [Submit Request]
                                                          ↑ disabled
```

---

## Security Verification Benefits

1. **Visual Verification**: Guards can compare actual items with photos
2. **Audit Trail**: Photos stored with item-level association for accountability
3. **Tamper Detection**: Mismatched items can be identified at entry/exit
4. **Storage Efficiency**: Compressed images reduce storage costs by ~70%
5. **Mobile Performance**: Optimized for field workers on cellular networks

---

## Testing Checklist

**Photo Upload:**
- [ ] Can take photo via camera on mobile
- [ ] Can upload photo from file picker
- [ ] Photo is compressed automatically
- [ ] Can add multiple photos per item
- [ ] Can remove photos before submission

**Validation:**
- [ ] Cannot submit if any item has 0 photos
- [ ] Error message clearly indicates which items need photos
- [ ] Items without photos have visual indicator (red border)

**Storage:**
- [ ] Photos uploaded to correct storage path
- [ ] Records created in `gate_pass_item_photos` table
- [ ] Tenant isolation enforced via RLS

**Performance:**
- [ ] Compression reduces file size significantly
- [ ] Upload completes within reasonable time on 4G
- [ ] Large images (10MB+) handled gracefully
