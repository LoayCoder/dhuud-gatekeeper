
# Public Gate Pass Form – Full Functional Enhancement

## Executive Summary

This plan transforms the Public Gate Pass form from a basic single-material submission into a production-ready, multi-item workflow with mandatory per-item photos, structured vehicle plate entry, secure anonymous file uploads, and full visibility for all stakeholders (Requester, Club Management, Security Supervisor).

---

## Current State Analysis

| Component | Current State | Gap |
|-----------|--------------|-----|
| Items | Single `material_description` text field | No multi-item support |
| Photos | General upload (5 max), stored separately | Not linked to specific items |
| Vehicle Plate | Single `vehicle_plate` text field | No letters/numbers separation |
| RLS for Anonymous | No anon INSERT policy on items/photos | Public users cannot persist data |
| Storage | Bucket exists but requires authentication | Anonymous users cannot upload |
| Tracking Page | Shows single material description | Cannot display item list with photos |
| RPC | Creates parent record only | No item/photo child records |

---

## Solution Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    PUBLIC GATE PASS FORM                             │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Requester Info (Name, Phone, Email, Company)                    │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ ITEMS (Dynamic Add/Remove)                                      │ │
│  │ ┌─────────────────────────────────────────────────────────────┐ │ │
│  │ │ Item 1: SR# | Name | Qty | Unit | Photo* (mandatory)       │ │ │
│  │ └─────────────────────────────────────────────────────────────┘ │ │
│  │ ┌─────────────────────────────────────────────────────────────┐ │ │
│  │ │ Item 2: SR# | Name | Qty | Unit | Photo* (mandatory)       │ │ │
│  │ └─────────────────────────────────────────────────────────────┘ │ │
│  │ [+ Add Another Item]                                            │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Vehicle Details                                                  │ │
│  │ Plate Letters: [A B C] | Plate Numbers: [1234]                  │ │
│  │ Driver Name: [...] | Driver Mobile: [...]                       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Schedule: Date | Time Window | Pass Type                       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Changes

### 1. New Table: `public_gate_pass_items`

This separate table stores items for **public** requests, with anonymous-compatible RLS:

```sql
CREATE TABLE public.public_gate_pass_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_pass_id UUID NOT NULL REFERENCES material_gate_passes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  sr_number TEXT,                    -- Serial/Reference number
  item_name TEXT NOT NULL,
  description TEXT,
  quantity TEXT,
  unit TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_public_gate_pass_items_gate_pass ON public_gate_pass_items(gate_pass_id);
CREATE INDEX idx_public_gate_pass_items_tenant ON public_gate_pass_items(tenant_id);
```

### 2. New Table: `public_gate_pass_item_photos`

```sql
CREATE TABLE public.public_gate_pass_item_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public_gate_pass_items(id) ON DELETE CASCADE,
  gate_pass_id UUID NOT NULL REFERENCES material_gate_passes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  storage_path TEXT NOT NULL,        -- Path in storage bucket
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  public_token UUID NOT NULL,        -- Links to gate pass access token
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Index for retrieval
CREATE INDEX idx_public_item_photos_item ON public_gate_pass_item_photos(item_id);
CREATE INDEX idx_public_item_photos_gate_pass ON public_gate_pass_item_photos(gate_pass_id);
CREATE INDEX idx_public_item_photos_token ON public_gate_pass_item_photos(public_token);
```

### 3. Add Vehicle Plate Columns

```sql
ALTER TABLE material_gate_passes
ADD COLUMN IF NOT EXISTS vehicle_plate_letters TEXT,
ADD COLUMN IF NOT EXISTS vehicle_plate_numbers TEXT;
```

### 4. RLS Policies for Anonymous Access

```sql
-- Enable RLS
ALTER TABLE public_gate_pass_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_gate_pass_item_photos ENABLE ROW LEVEL SECURITY;

-- Anonymous users can insert items/photos via the secure RPC (handled in function)
-- Authenticated users with security/admin access can view
CREATE POLICY "Authenticated users can view public gate pass items"
ON public_gate_pass_items FOR SELECT
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (has_security_access(auth.uid()) OR is_admin(auth.uid()))
);

-- Authenticated users with security/admin access can view photos
CREATE POLICY "Authenticated users can view public gate pass item photos"
ON public_gate_pass_item_photos FOR SELECT
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (has_security_access(auth.uid()) OR is_admin(auth.uid()))
);
```

### 5. Storage Policy for Anonymous Photo Uploads

```sql
-- Create dedicated bucket for public gate pass photos (anonymous-accessible)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-gate-pass-photos',
  'public-gate-pass-photos',
  true,  -- Public for read access
  5242880,  -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Anonymous users can upload to this bucket
CREATE POLICY "Anon can upload public gate pass photos"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'public-gate-pass-photos');

-- Anyone can read public gate pass photos (for tracking page)
CREATE POLICY "Public read access for gate pass photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'public-gate-pass-photos');
```

---

## RPC Function Update: `submit_public_gate_pass`

Update the existing function to handle multi-item submission with photos:

```sql
CREATE OR REPLACE FUNCTION public.submit_public_gate_pass(
  p_tenant_slug TEXT,
  p_branch_id UUID DEFAULT NULL,
  p_requester_name TEXT,
  p_requester_phone TEXT,
  p_requester_email TEXT DEFAULT NULL,
  p_requester_company TEXT DEFAULT NULL,
  p_pass_type TEXT DEFAULT 'in_out',
  p_pass_date DATE DEFAULT CURRENT_DATE,
  p_time_window_start TIME DEFAULT NULL,
  p_time_window_end TIME DEFAULT NULL,
  -- Vehicle info with separated plate fields
  p_vehicle_plate_letters TEXT DEFAULT NULL,
  p_vehicle_plate_numbers TEXT DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL,
  p_driver_mobile TEXT DEFAULT NULL,
  -- Items array (JSONB)
  p_items JSONB DEFAULT '[]'::jsonb,
  -- Photo references (JSONB array of storage paths per item)
  p_item_photos JSONB DEFAULT '[]'::jsonb,
  -- Notification preferences
  p_notify_whatsapp BOOLEAN DEFAULT true,
  p_notify_email BOOLEAN DEFAULT true,
  p_notify_sms BOOLEAN DEFAULT false,
  p_client_ip TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_gate_pass_id UUID;
  v_access_token UUID;
  v_reference_number TEXT;
  v_item_record RECORD;
  v_inserted_item_id UUID;
  v_photo_path TEXT;
  v_vehicle_plate TEXT;
  v_material_description TEXT;
BEGIN
  -- Validate tenant, rate limiting, etc. (existing logic)
  -- ...
  
  -- Combine plate for legacy column
  v_vehicle_plate := NULLIF(TRIM(COALESCE(p_vehicle_plate_letters, '') || ' ' || COALESCE(p_vehicle_plate_numbers, '')), '');
  
  -- Build material description from items
  SELECT STRING_AGG(item->>'item_name', ', ')
  INTO v_material_description
  FROM jsonb_array_elements(p_items) AS item;
  
  -- Create gate pass with new plate columns
  INSERT INTO material_gate_passes (
    tenant_id, branch_id, reference_number, pass_type,
    material_description, vehicle_plate, vehicle_plate_letters, vehicle_plate_numbers,
    driver_name, driver_mobile, pass_date, time_window_start, time_window_end,
    status, is_public_request, public_access_token, public_requester_name,
    public_requester_phone, public_requester_email, public_requester_company,
    notify_whatsapp, notify_email, notify_sms, token_expires_at
  ) VALUES (
    v_tenant_id, p_branch_id, v_reference_number, p_pass_type,
    v_material_description, v_vehicle_plate, p_vehicle_plate_letters, p_vehicle_plate_numbers,
    p_driver_name, p_driver_mobile, p_pass_date, p_time_window_start, p_time_window_end,
    'pending_club_mgmt_ack', true, v_access_token, p_requester_name,
    p_requester_phone, p_requester_email, p_requester_company,
    p_notify_whatsapp, p_notify_email, p_notify_sms, now() + interval '30 days'
  )
  RETURNING id INTO v_gate_pass_id;
  
  -- Insert items and link photos
  FOR v_item_record IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    sr_number TEXT, item_name TEXT, description TEXT, quantity TEXT, unit TEXT, photo_path TEXT
  )
  LOOP
    INSERT INTO public_gate_pass_items (
      gate_pass_id, tenant_id, sr_number, item_name, description, quantity, unit
    ) VALUES (
      v_gate_pass_id, v_tenant_id, v_item_record.sr_number, v_item_record.item_name,
      v_item_record.description, v_item_record.quantity, v_item_record.unit
    )
    RETURNING id INTO v_inserted_item_id;
    
    -- Insert photo reference if provided
    IF v_item_record.photo_path IS NOT NULL AND v_item_record.photo_path != '' THEN
      INSERT INTO public_gate_pass_item_photos (
        item_id, gate_pass_id, tenant_id, storage_path, file_name, public_token
      ) VALUES (
        v_inserted_item_id, v_gate_pass_id, v_tenant_id, v_item_record.photo_path,
        split_part(v_item_record.photo_path, '/', -1), v_access_token
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'gate_pass_id', v_gate_pass_id,
    'reference_number', v_reference_number,
    'public_access_token', v_access_token
  );
END;
$$;
```

---

## Frontend Components

### 1. New Component: `PublicGatePassItemForm`

**File:** `src/pages/public-gate-pass/components/PublicGatePassItemForm.tsx`

Card-based item entry with:
- SR Number input (optional)
- Item Name input (required)
- Description textarea
- Quantity + Unit inputs
- **Mandatory** single photo upload per item
- Remove item button
- Visual error state when photo missing

### 2. New Component: `PublicVehiclePlateInput`

**File:** `src/pages/public-gate-pass/components/PublicVehiclePlateInput.tsx`

Structured vehicle plate input with:
- Separate field for letters (3 chars, uppercase, Latin/Arabic)
- Separate field for numbers (4 digits)
- Visual plate preview (Saudi style)
- RTL-aware layout

### 3. Update: `PublicRequestPage.tsx`

Major updates:
- Replace single `material_description` with dynamic items array
- Add "Add Another Item" button
- Integrate vehicle plate component
- Form validation: at least 1 item, each item must have photo
- Client-side image compression before upload (existing logic reused)
- Upload photos to new public bucket before form submission
- Pass items + photo paths to updated RPC

### 4. Update: `PublicStatusPage.tsx`

Display items with photos:
- Fetch items via updated `get_public_gate_pass_status` RPC
- Display item list with thumbnails
- Show structured vehicle plate
- Swipeable photo gallery for each item

---

## Updated RPC: `get_public_gate_pass_status`

Add items and photos to the response:

```sql
-- Within the function, add:
-- Fetch items with photos
SELECT jsonb_agg(
  jsonb_build_object(
    'id', i.id,
    'sr_number', i.sr_number,
    'item_name', i.item_name,
    'description', i.description,
    'quantity', i.quantity,
    'unit', i.unit,
    'photo_url', CASE WHEN p.storage_path IS NOT NULL 
      THEN 'https://[SUPABASE_URL]/storage/v1/object/public/public-gate-pass-photos/' || p.storage_path
      ELSE NULL END
  )
)
INTO v_items
FROM public_gate_pass_items i
LEFT JOIN public_gate_pass_item_photos p ON p.item_id = i.id
WHERE i.gate_pass_id = v_gate_pass.id
  AND i.deleted_at IS NULL;

-- Include in response
'items', COALESCE(v_items, '[]'::jsonb),
'vehicle_plate_letters', v_gate_pass.vehicle_plate_letters,
'vehicle_plate_numbers', v_gate_pass.vehicle_plate_numbers,
```

---

## Security Measures

| Concern | Mitigation |
|---------|------------|
| Anonymous file injection | Files uploaded to separate `public-gate-pass-photos` bucket with 5MB limit, image-only MIME types |
| Cross-tenant data access | All queries scoped by `tenant_id`, validated in RPC |
| Rate limiting | Existing IP-based rate limiting (5 requests/hour) |
| Token expiry | 30-day expiry on public access tokens |
| Photo validation | Client-side: compression to 1280px, 75% quality; Server-side: MIME type enforcement |
| Input sanitization | All text inputs escaped via parameterized queries in RPC |

---

## Role-Based Viewing Experience

| Role | What They See |
|------|---------------|
| **Requester** (Public Tracking Page) | Own items with photos, status stepper, QR code when approved |
| **Golf Club Management** (Dept Gate Passes) | Full item list with photos in GatePassDetailDialog, Acknowledge button |
| **Security Supervisor** (Dept Gate Passes) | Full item list with photos, Approve/Reject buttons, vehicle plate details |

The existing `GatePassDetailDialog` already supports items and photos via `useGatePassItems` and `useGatePassPhotos` hooks. We need to:
1. Update hooks to also query `public_gate_pass_items` for public requests
2. Update photo hook to query `public_gate_pass_item_photos` for public requests

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| **Database Migration** | Create | New tables, columns, RLS policies, storage bucket |
| `src/pages/public-gate-pass/components/PublicGatePassItemForm.tsx` | Create | Multi-item entry component with mandatory photo |
| `src/pages/public-gate-pass/components/PublicVehiclePlateInput.tsx` | Create | Structured plate letters/numbers input |
| `src/pages/public-gate-pass/PublicRequestPage.tsx` | Modify | Integrate new components, update form schema, handle item photos |
| `src/pages/public-gate-pass/PublicStatusPage.tsx` | Modify | Display items with photos, show structured plate |
| `src/types/public-gate-pass.types.ts` | Modify | Add item types, update form data types |
| `src/hooks/public-gate-pass/use-public-gate-pass.ts` | Modify | Update submission to handle items/photos |
| `src/hooks/contractor-management/use-gate-pass-details.ts` | Modify | Query public items for public gate passes |
| **Update RPC** `submit_public_gate_pass` | Migration | Handle items array with photos |
| **Update RPC** `get_public_gate_pass_status` | Migration | Return items with photos |

---

## Type Definitions

```typescript
// src/types/public-gate-pass.types.ts

export interface PublicGatePassItem {
  id?: string;
  sr_number?: string;
  item_name: string;
  description?: string;
  quantity?: string;
  unit?: string;
  photo?: File;           // For form state
  photo_path?: string;    // After upload
  photo_url?: string;     // For display
}

export interface PublicGatePassFormData {
  requester_name: string;
  requester_phone: string;
  requester_email?: string;
  requester_company?: string;
  branch_id?: string;
  pass_type: GatePassType;
  items: PublicGatePassItem[];  // Multi-item support
  vehicle_plate_letters?: string;
  vehicle_plate_numbers?: string;
  driver_name?: string;
  driver_mobile?: string;
  pass_date: string;
  time_window_start?: string;
  time_window_end?: string;
  notify_whatsapp?: boolean;
  notify_email?: boolean;
  notify_sms?: boolean;
}
```

---

## Validation Rules

| Field | Rule |
|-------|------|
| Items array | At least 1 item required |
| Item name | Required, min 2 characters |
| Item photo | **Mandatory** for each item |
| Plate letters | Optional, max 3 characters, uppercase Latin/Arabic |
| Plate numbers | Optional, 1-4 digits only |
| Phone number | International format with country code |

---

## UI/UX Considerations

1. **Mobile-First Design**: All components optimized for mobile with 48px touch targets
2. **Loading States**: Skeleton loaders during submission, photo upload progress
3. **Error Handling**: Inline validation messages, toast notifications
4. **RTL Support**: All new components use logical CSS properties (ps-, pe-, ms-, me-)
5. **Photo Preview**: Instant preview after selection, tap to enlarge
6. **Add Item Animation**: Smooth slide-in for new item cards
7. **Remove Confirmation**: Require tap-and-hold or swipe to remove items

---

## Testing Checklist

1. Submit public request with 3 items, each with photo
2. Verify all items and photos stored correctly
3. Track request via public URL - see all items with photos
4. Login as Golf Club Management - view and acknowledge request
5. Login as Security Supervisor - view items, approve request
6. Verify approved pass shows QR code and downloadable PDF includes items
7. Test rate limiting (6th submission blocked)
8. Test with RTL Arabic language
9. Test on mobile device with camera capture
