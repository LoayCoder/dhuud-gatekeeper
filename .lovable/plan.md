

# Improve ID Card Generation — Tenant Logo, Branding & Layout

## Summary

Fix ID card generation so cards display the tenant's logo (e.g., Golf Saudi), use the tenant's brand colors as accent colors, show the company name clearly, handle photos properly, and utilize card space better.

## Root Causes Identified

1. **Missing tenant logo**: `IDCardActionButton` callers pass `tenantData` without `logoUrl` — e.g., `{ id: tenantId, name: companyName }` with no logo. The component never auto-fetches tenant branding from the `tenants` table.
2. **Wrong tenant name**: Callers pass the *contractor company name* as `tenantData.name` instead of the actual *tenant organization name* (e.g., "Golf Saudi").
3. **No brand color integration**: Default accent colors are hardcoded (`#1e40af`, `#f97316`). The tenant's `brand_color` from the `tenants` table is never applied.
4. **Photo rendering issues**: Photos render but may fail during `html2canvas` capture due to CORS. The `crossOrigin` attribute is missing from `<img>` tags.
5. **Small font sizes & cramped layout**: Header tenant name at `9px * scale`, field labels at `7px * scale` — too small. Spaces between sections are tight.

## Changes

### 1. Auto-fetch tenant branding in `IDCardActionButton`
**File**: `src/features/admin/components/id-cards/IDCardActionButton.tsx`

- Add a query to fetch `name, name_ar, logo_light_url, brand_color` from the `tenants` table using `tenantId`
- Build `tenantData` from this query result:
  - `name` → tenant name (not company name)
  - `nameAr` → tenant name_ar
  - `logoUrl` → `logo_light_url`
- If `providedTenantData` has values, merge (provided takes precedence for non-empty fields)
- Use tenant `brand_color` as override for `front_accent_color` in settings when no custom setting exists in `tenant_id_card_settings`

### 2. Add `crossOrigin="anonymous"` to all `<img>` tags in card layouts
**Files**: `LandscapeFrontLayout.tsx`, `PortraitFrontLayout.tsx`

- Add `crossOrigin: 'anonymous'` to photo `<img>` style/attribute for CORS compatibility during html2canvas capture
- Add `crossOrigin: 'anonymous'` to logo `<img>` as well

### 3. Improve header layout — larger logo, clearer tenant name
**Files**: `LandscapeFrontLayout.tsx`, `PortraitFrontLayout.tsx`

**Landscape**:
- Increase logo height from `24 * scale` → `30 * scale`
- Increase tenant name font from `9 * scale` → `11 * scale`
- Increase header padding from `6px` → `8px` vertical
- Card type badge font from `6 * scale` → `7 * scale`

**Portrait**:
- Increase logo height from `20 * scale` → `28 * scale`
- Increase tenant name font from `7 * scale` → `9 * scale`
- Card type badge font from `5 * scale` → `6 * scale`

### 4. Better space utilization for fields
**Files**: `LandscapeFrontLayout.tsx`, `PortraitFrontLayout.tsx`

**Landscape**:
- Name font from `10 * scale` → `12 * scale`
- Field labels from `7 * scale` → `8 * scale`
- Increase content padding

**Portrait**:
- Name font already `11 * scale` — keep
- Field labels from `7 * scale` → `8 * scale`
- Reduce excess photo padding to give fields more room

### 5. Update callers to stop passing incorrect tenantData
**Files**: `CompanyDetailDialog.tsx`, `WorkerDetailDialog.tsx`, `VisitorDetailDialog.tsx`

- Since the button now auto-fetches tenant branding, simplify callers to only pass `tenantId`
- Remove incorrect `tenantData` overrides that were setting company name as tenant name

### 6. Render engine CORS fix
**File**: `src/hooks/use-id-card-generator.ts`

- In `renderCardSide`, after React render and before `html2canvas`, set `crossOrigin = 'anonymous'` on all img elements inside the container
- This ensures photos and logos load correctly during capture

## Technical Notes

- Tenant branding query uses existing `tenants` table columns: `name`, `name_ar`, `logo_light_url`, `brand_color`
- The `brand_color` is used as fallback accent color only when no custom `tenant_id_card_settings` record exists for that card type
- `html2canvas` with `useCORS: true` is already set, but individual `<img>` elements need `crossOrigin="anonymous"` for it to work
- No database changes needed

