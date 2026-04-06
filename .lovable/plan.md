

# Fix: ID Card Layout Broken + Photo Not Showing

## Problems Identified

From the screenshot, two distinct issues:

### 1. Photo Not Displaying (Shows Initial Letter Instead)
The photo area shows a purple square with just the letter "ل" — meaning `personData.photo` is falsy. The code at `CompanyDetailDialog.tsx` correctly generates a signed URL from `photo_path`, but:
- If the representative's `photo_path` is null/empty in the database, no photo loads
- The fallback shows only a single character initial on accent-colored background — which looks broken on the card

### 2. Layout Overflow — Elements Cut Off
The landscape card layout has oversized elements:
- **Photo**: `height * 0.45` = ~92px — takes ~28% of card width
- **QR Code**: `height * 0.55` = ~112px — takes ~35% of card width  
- Together they consume ~63% of the 323px card width, leaving almost no room for fields/name
- With scale 1.5x in preview, this becomes even more visually broken
- Arabic name text and QR code overflow and get clipped

## Fix Plan

### File 1: `src/features/admin/components/id-cards/IDCardTemplate/layouts/LandscapeFrontLayout.tsx`

- Reduce photo size: `height * 0.35` instead of `0.45`
- Reduce QR size: `height * 0.45` instead of `0.55`
- Add `overflow: hidden` and `text-overflow: ellipsis` to name fields
- Improve the no-photo fallback — show a proper person silhouette icon or styled initials that look intentional, not broken

### File 2: `src/features/admin/components/id-cards/IDCardTemplate/layouts/PortraitFrontLayout.tsx`

- Apply same sizing fixes for consistency

### File 3: `src/hooks/id-card-html-renderer.ts`

- Mirror the same size reductions in the HTML renderer (used for image generation/export)
- Fix the no-photo fallback HTML to match the component version

### File 4: `src/features/contractors/components/CompanyDetailDialog.tsx`

- Improve the `getSiteRepPersonData` to also check `representatives` table for photo if site rep photo is missing
- Add `fullNameAr` field to the person data (currently missing from `getSiteRepPersonData`)

## Summary

| File | Change |
|------|--------|
| `LandscapeFrontLayout.tsx` | Reduce photo/QR sizes, fix overflow, improve no-photo fallback |
| `PortraitFrontLayout.tsx` | Same sizing/fallback fixes |
| `id-card-html-renderer.ts` | Mirror layout fixes in HTML renderer |
| `CompanyDetailDialog.tsx` | Add `fullNameAr`, improve photo data population |

