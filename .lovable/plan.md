

# Fix ID Card Export to Match Preview

## Problem

The ID card **preview** (what you see in the dialog) uses the React `IDCardTemplate` component with proper portrait/landscape layouts, local QR codes, and correct sizing. But the **download, print, and WhatsApp send** all use a completely separate file — `src/hooks/id-card-html-renderer.ts` — which is a hardcoded HTML string builder with a simplified landscape-only layout. This is why exported cards look broken (clipped QR codes, wrong proportions, missing layout features).

## Solution

Eliminate the HTML renderer entirely. Instead, capture the actual React `IDCardTemplate` component (the same one shown in the preview) using `html2canvas`. This guarantees the exported image is pixel-identical to what users see.

## Steps

### Step 1: Rewrite `use-id-card-generator.ts` — render React component off-screen

Instead of importing `renderIDCardToHTML` and injecting raw HTML, the `generateCard` function will:

1. Create a hidden container (`position: absolute; left: -9999px`)
2. Use `ReactDOM.createRoot` to render the actual `IDCardTemplate` component into it
3. Wait for images (photo, logo) to load via `onload` promises
4. Capture with `html2canvas` at 3x scale
5. Clean up the container

This removes the dependency on `id-card-html-renderer.ts` entirely.

### Step 2: Delete `src/hooks/id-card-html-renderer.ts`

No longer needed — the React component is the single source of truth for both preview and export.

### Step 3: Add image-load waiting utility

Before capturing with `html2canvas`, wait for all `<img>` elements inside the card to finish loading. This prevents blank photos/logos in the exported image.

```text
Flow:
  Preview Dialog (IDCardTemplate) ──── same component ────┐
                                                          │
  Download/Print/WhatsApp ─── render IDCardTemplate ──────┤
                               off-screen into DOM        │
                                    │                     │
                            wait for images to load       │
                                    │                     │
                            html2canvas capture ──────────┘
                                    │
                            PNG data URL
```

## Technical Details

| Item | Current | After fix |
|------|---------|-----------|
| Renderer for export | `id-card-html-renderer.ts` (HTML strings) | `IDCardTemplate` React component |
| QR code in export | External API (`qrserver.com`) | Local `QRCodeSVG` (same as preview) |
| Portrait support | Broken (wrong layout) | Correct (uses `PortraitFrontLayout`) |
| Image loading | No wait | Explicit `img.onload` promises |

| Step | File | Change |
|------|------|--------|
| 1 | `src/hooks/use-id-card-generator.ts` | Rewrite `generateCard` to render React component off-screen |
| 2 | `src/hooks/id-card-html-renderer.ts` | Delete file |
| 3 | `src/hooks/use-id-card-generator.ts` | Add image-load waiting before canvas capture |

