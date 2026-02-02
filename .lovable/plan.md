
# Comprehensive Gate Pass UI Enhancement Plan (PWA-First)

## Executive Summary
This plan transforms the Gate Pass workflow into a modern, mobile-first, PWA-optimized experience. The redesign prioritizes offline capability, touch-friendly interactions, native-like animations, and full RTL support for field workers using installed PWA on mobile devices.

---

## Current State Analysis

| Component | Current Issues |
|:----------|:---------------|
| **Create Form** | Dense table layout, cramped photo upload, poor mobile experience, no offline support |
| **Details Dialog** | Small QR code (80px), basic tabs, not optimized for mobile viewing |
| **Approval Queue** | Card grid OK but lacks urgency indicators, no swipe gestures |
| **Verification Panel** | Basic scanner, no item confirmation workflow, small action buttons |
| **PWA Integration** | Safe areas exist but not fully utilized in gate pass components |

---

## Design Philosophy

### PWA-First Principles
1. **Installable Experience**: Full-screen dialogs become sheets on mobile PWA
2. **Offline-Ready**: Form drafts saved to IndexedDB, photos queued for upload
3. **Touch-First**: 48px minimum touch targets, swipe gestures, bottom sheets
4. **Native Feel**: Haptic feedback patterns, pull-to-refresh, smooth animations
5. **Safe Areas**: All fixed elements respect `env(safe-area-inset-*)` on notched devices

### RTL Compliance
- All margins/paddings use `ms-`/`me-`/`ps-`/`pe-` (never left/right)
- Text alignment uses `text-start`/`text-end`
- Directional icons use `rtl:rotate-180`
- Touch targets maintain 48px minimum in both directions

### Visual Language
- **Green** = Approved/Safe/Entry
- **Amber** = Pending/Warning
- **Red** = Rejected/Danger/Overdue
- **Blue** = Information/Security
- **Orange** = Exit action

---

## Phase 1: Gate Pass Request Form (PWA Wizard)

### Mobile-First Multi-Step Wizard

```text
┌─────────────────────────────────────────┐
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │ (Safe area top)
│                                         │
│ ← Create Gate Pass          Step 1/4    │
│                                         │
│ ━━━━━●━━━━━━○━━━━━━○━━━━━━○             │ (Progress dots)
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │    📥 ENTRY      📤 EXIT     🔄 BOTH │ │ (Pass type cards)
│ │    ────────      ────────    ─────── │ │
│ │    ✓ Selected                        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Select Date                             │
│ ┌─────────────────────────────────────┐ │
│ │ 📅  February 1, 2026             ▼  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ │ (Safe area bottom)
│     [           Next →           ]      │ (Sticky footer button)
└─────────────────────────────────────────┘
```

### PWA Enhancements

| Feature | Implementation |
|:--------|:---------------|
| **Offline Draft** | Auto-save form state to IndexedDB every 5 seconds |
| **Photo Queue** | Photos cached locally, uploaded when online |
| **Pull to Refresh** | Native gesture to reload approvers list |
| **Camera Integration** | Direct camera access for item photos |
| **Haptic Feedback** | Vibrate on step completion (navigator.vibrate) |
| **Bottom Sheet** | Use Vaul drawer on mobile instead of Dialog |

### New Component Structure
```text
GatePassCreateWizard/
├── GatePassCreateWizard.tsx         (Main orchestrator)
├── WizardProgressIndicator.tsx      (Step dots with animation)
├── PassTypeSelector.tsx             (Visual card selection)
├── ItemsStep.tsx                    (Card-based item entry)
├── GatePassItemCard.tsx             (Individual item with photos)
├── GatePassPhotoCapture.tsx         (Camera + gallery picker)
├── VehicleDriverStep.tsx            (Optional vehicle info)
├── ReviewStep.tsx                   (Summary before submit)
└── hooks/
    ├── use-gate-pass-draft.ts       (IndexedDB persistence)
    └── use-offline-photo-queue.ts   (Photo upload queue)
```

### Technical Implementation
- New file: `src/components/contractors/gate-pass-create/GatePassCreateWizard.tsx`
- New file: `src/components/contractors/gate-pass-create/WizardProgressIndicator.tsx`
- New file: `src/components/contractors/gate-pass-create/PassTypeSelector.tsx`
- New file: `src/components/contractors/gate-pass-create/GatePassItemCard.tsx`
- New file: `src/components/contractors/gate-pass-create/GatePassPhotoCapture.tsx`
- New file: `src/hooks/contractor-management/use-gate-pass-draft.ts`
- Update: `src/pages/my-gate-passes/Create.tsx` - Use wizard component

---

## Phase 2: Gate Pass Details (PWA Sheet)

### Mobile-Optimized Detail View

```text
┌─────────────────────────────────────────┐
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │
│                                         │
│ ─────────── GP-2026-00001 ───────────  │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │              [QR CODE]              │ │ (Large 180px QR)
│ │               180x180               │ │
│ │                                     │ │
│ │        ═══ Scan to Verify ═══       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│        ████████ APPROVED ████████       │ (Large status badge)
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ Dept ── ✓ Club ── ○ Security      │ │ (Horizontal timeline)
│ └─────────────────────────────────────┘ │
│                                         │
│ [Details] [Items (3)] [Timeline]        │ (Tabs with counts)
│ ─────────────────────────────────────── │
│                                         │
│  Project: Club Renovation               │
│  Date: Feb 1, 2026                      │
│  Time: 08:00 - 17:00                    │
│                                         │
│ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ │
│  [Approve]              [Reject]        │ (Sticky bottom actions)
└─────────────────────────────────────────┘
```

### PWA Enhancements

| Feature | Implementation |
|:--------|:---------------|
| **Share API** | Native share button for approved passes |
| **Save to Photos** | Download QR code image to device gallery |
| **Swipe Navigation** | Swipe between tabs on mobile |
| **Full-Screen QR** | Tap QR to show full-screen for scanning |
| **Offline View** | Cache pass details for offline access |
| **Bottom Sheet** | Use Vaul drawer instead of Dialog on mobile |

### Visual Improvements
1. **QR Section**: Large 180px QR with white background, tap to full-screen
2. **Approval Timeline**: Horizontal stepper with animated completion
3. **Items Gallery**: Swipeable photo carousel per item
4. **Action Buttons**: Full-width sticky footer with safe-area padding

### Technical Implementation
- New file: `src/components/contractors/gate-pass-detail/GatePassDetailSheet.tsx`
- New file: `src/components/contractors/gate-pass-detail/ApprovalTimeline.tsx`
- New file: `src/components/contractors/gate-pass-detail/FullScreenQRView.tsx`
- New file: `src/components/contractors/gate-pass-detail/ItemPhotoCarousel.tsx`
- Update: `src/components/contractors/GatePassDetailDialog.tsx` - Responsive wrapper

---

## Phase 3: Approval Queue (PWA Kanban)

### Mobile-First Approval Interface

```text
┌─────────────────────────────────────────┐
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │
│                                         │
│ Pending Approvals (5)     [Filter ▼]    │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🟡 DEPT APPROVAL                    │ │ (Swipe right = approve)
│ ├─────────────────────────────────────┤ │
│ │ GP-2026-00001                       │ │
│ │ Steel Pipes (50 pcs)                │ │
│ │ ─────────────────────────────────── │ │
│ │ 👤 Mohammed    ⏰ 2h ago            │ │
│ │ ─────────────────────────────────── │ │
│ │ ← Swipe to Approve/Reject →         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🔴 OVERDUE                          │ │ (Red = urgent)
│ ├─────────────────────────────────────┤ │
│ │ GP-2026-00002                       │ │
│ │ Safety Equipment (10 sets)          │ │
│ │ ─────────────────────────────────── │ │
│ │ 👤 Ahmed       ⏰ 5h ago   ⚠️ URGENT │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ │
│ ━━━━━━━━━━━ 2 Selected ━━━━━━━━━━━━━━━ │ (Bulk action bar)
│  [✓ Approve All]     [✗ Reject All]    │
└─────────────────────────────────────────┘
```

### PWA Enhancements

| Feature | Implementation |
|:--------|:---------------|
| **Swipe Actions** | Swipe right = approve (green), left = reject (red) |
| **Pull to Refresh** | Native gesture to reload queue |
| **Push Notifications** | Alert when new pass needs approval |
| **Batch Mode** | Long-press to enter selection mode |
| **Haptic Feedback** | Vibrate on approval/rejection |
| **Offline Queue** | Queue approvals for sync when online |

### Urgency Indicators
- **< 1 hour**: Green time badge
- **1-4 hours**: Amber time badge  
- **> 4 hours**: Red "OVERDUE" badge with pulse animation

### Technical Implementation
- New file: `src/components/contractors/gate-pass-approval/ApprovalSwipeCard.tsx`
- New file: `src/components/contractors/gate-pass-approval/ApprovalListView.tsx`
- New file: `src/components/contractors/gate-pass-approval/UrgencyBadge.tsx`
- New hook: `src/hooks/contractor-management/use-offline-approvals.ts`
- Update: `src/components/contractors/GatePassApprovalQueue.tsx`

---

## Phase 4: PDF Document with Branding

### Integration with Document Settings

| Element | Source |
|:--------|:-------|
| Header Logo | `tenant_document_settings.header_logo_url` |
| Footer Text | `tenant_document_settings.footer_text` |
| Watermark | `tenant_document_settings.watermark_text` |
| Colors | `organization_branding.primary_color` |

### PDF Layout
- A4 format with proper margins
- Large QR code (180px) in header
- Photo grid for each item
- Digital signature placeholders
- Bilingual labels (English/Arabic)

### Technical Implementation
- Update: `src/components/contractors/GatePassPDFTemplate.tsx`
- New hook: `src/hooks/use-document-branding.ts`
- Update: `src/hooks/contractor-management/use-gate-pass-pdf.ts`

---

## Phase 5: Security Supervisor Approval (PWA Dashboard)

### Dedicated Security Interface

```text
┌─────────────────────────────────────────┐
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │
│                                         │
│ 🛡 Security Approval                    │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ GP-2026-00001          ⏰ 15m ago   │ │
│ │ ─────────────────────────────────── │ │
│ │ Steel Pipes (50), Tools (5)         │ │
│ │ Vehicle: ABC 1234 | Driver: Ahmed   │ │
│ │ ─────────────────────────────────── │ │
│ │ Prior Approvals:                    │ │
│ │ ✓ Dept: Khalid (09:00)              │ │
│ │ ✓ Club: Sarah (10:30)               │ │
│ │ ─────────────────────────────────── │ │
│ │ [📷 Photos] [📋 Full Details]       │ │
│ │ ─────────────────────────────────── │ │
│ │ Note: ________________________      │ │
│ │ ─────────────────────────────────── │ │
│ │ [✓ APPROVE & GENERATE QR]           │ │
│ │ [✗ Reject]                          │ │
│ └─────────────────────────────────────┘ │
│ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ │
└─────────────────────────────────────────┘
```

### PWA Enhancements
- Full-screen photo viewer for item inspection
- One-tap approve with confirmation animation
- Push notification when pass is queued

### Technical Implementation
- New file: `src/components/contractors/gate-pass-security/SecurityApprovalPanel.tsx`
- New file: `src/components/contractors/gate-pass-security/SecurityApprovalCard.tsx`
- New page: `src/pages/security/GatePassSecurityApproval.tsx`

---

## Phase 6: Guard QR Verification (PWA Scanner)

### Full-Screen Mobile Scanner

```text
┌─────────────────────────────────────────┐
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │
│                                         │
│              Gate Pass Scan             │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │    ┌─────────────────────────┐      │ │
│ │    │                         │      │ │
│ │    │    [CAMERA VIEWFINDER]  │      │ │
│ │    │       with overlay      │      │ │
│ │    │                         │      │ │
│ │    └─────────────────────────┘      │ │
│ │                                     │ │
│ │       Point at QR Code              │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [🔦 Torch]   [🔄 Camera]   [⌨️ Manual] │
│                                         │
│ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ │
│              [✕ Close]                  │
└─────────────────────────────────────────┘
```

### After Successful Scan

```text
┌─────────────────────────────────────────┐
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │
│                                         │
│        ✓ GATE PASS VERIFIED             │ (Green success)
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Reference: GP-2026-00001            │ │
│ │ Valid: Feb 1, 2026 08:00-17:00      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🚗 VEHICLE CHECK                    │ │
│ │ ─────────────────────────────────── │ │
│ │ Expected Plate: ABC 1234            │ │
│ │ Driver: Ahmed Khan                  │ │
│ │ ─────────────────────────────────── │ │
│ │ ☑ Plate matches                     │ │
│ │ ☑ Driver ID verified                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📦 ITEMS TO CONFIRM (3)             │ │
│ │ ─────────────────────────────────── │ │
│ │ ☐ Steel Pipes (50 pcs) [📷]         │ │
│ │ ☐ Hand Tools (5 sets) [📷]          │ │
│ │ ☐ Safety Equipment (10 pcs) [📷]    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ │
│     [⬇️ CONFIRM ENTRY]                  │ (Large green button)
│     [Scan Another]  [Report Issue]      │
└─────────────────────────────────────────┘
```

### PWA Enhancements

| Feature | Implementation |
|:--------|:---------------|
| **Full-Screen Scanner** | Use html5-qrcode with custom overlay |
| **Torch Toggle** | Access device flashlight for low-light |
| **Camera Switch** | Toggle front/back camera |
| **Offline Verify** | Cache approved passes for offline verification |
| **Haptic Feedback** | Strong vibration on successful scan |
| **Audio Feedback** | Beep on valid/invalid scan |
| **Item Confirmation** | Checklist with photo comparison |

### Technical Implementation
- New file: `src/components/contractors/gate-pass-verification/FullScreenScanner.tsx`
- New file: `src/components/contractors/gate-pass-verification/VerificationResult.tsx`
- New file: `src/components/contractors/gate-pass-verification/VehicleVerification.tsx`
- New file: `src/components/contractors/gate-pass-verification/ItemsConfirmationList.tsx`
- Update: `src/components/contractors/GatePassVerificationPanel.tsx`

---

## Phase 7: Items Confirmation Workflow

### Item-by-Item Verification with Photo Comparison

```text
┌─────────────────────────────────────────┐
│                                         │
│  Item 1 of 3: Steel Pipes               │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Expected: 50 pieces                 │ │
│ │ ─────────────────────────────────── │ │
│ │ [REQUEST PHOTO]                     │ │ (From request)
│ │      ↕                              │ │
│ │ [CURRENT PHOTO]  [📷 Take Photo]    │ │ (Take new photo)
│ │ ─────────────────────────────────── │ │
│ │ Actual Count: [    50    ]          │ │
│ │ ─────────────────────────────────── │ │
│ │ ☐ Item matches request              │ │
│ │ ☐ Quantity verified                 │ │
│ │ ─────────────────────────────────── │ │
│ │ [⚠️ Report Discrepancy]             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ │
│   [← Prev]   [Confirm & Next →]         │
└─────────────────────────────────────────┘
```

### PWA Enhancements
- Side-by-side photo comparison (swipe to compare)
- Camera capture for verification photos
- Quantity input with +/- buttons for touch
- Discrepancy notes with voice input option

### Technical Implementation
- New file: `src/components/contractors/gate-pass-verification/ItemVerificationCard.tsx`
- New file: `src/components/contractors/gate-pass-verification/PhotoComparisonView.tsx`
- New file: `src/components/contractors/gate-pass-verification/DiscrepancyDialog.tsx`
- Database: Add `gate_entry_item_confirmations` table
- Edge function: `confirm-gate-pass-items`

---

## Files Summary

### New Files (20+)

| Path | Purpose |
|:-----|:--------|
| `src/components/contractors/gate-pass-create/GatePassCreateWizard.tsx` | Multi-step PWA wizard |
| `src/components/contractors/gate-pass-create/WizardProgressIndicator.tsx` | Animated step dots |
| `src/components/contractors/gate-pass-create/PassTypeSelector.tsx` | Visual card selection |
| `src/components/contractors/gate-pass-create/GatePassItemCard.tsx` | Touch-friendly item entry |
| `src/components/contractors/gate-pass-create/GatePassPhotoCapture.tsx` | Camera integration |
| `src/components/contractors/gate-pass-detail/GatePassDetailSheet.tsx` | Mobile bottom sheet |
| `src/components/contractors/gate-pass-detail/ApprovalTimeline.tsx` | Horizontal stepper |
| `src/components/contractors/gate-pass-detail/FullScreenQRView.tsx` | Tap-to-expand QR |
| `src/components/contractors/gate-pass-detail/ItemPhotoCarousel.tsx` | Swipeable gallery |
| `src/components/contractors/gate-pass-approval/ApprovalSwipeCard.tsx` | Swipe-to-approve |
| `src/components/contractors/gate-pass-approval/UrgencyBadge.tsx` | Time-based urgency |
| `src/components/contractors/gate-pass-security/SecurityApprovalPanel.tsx` | Security view |
| `src/components/contractors/gate-pass-verification/FullScreenScanner.tsx` | PWA scanner |
| `src/components/contractors/gate-pass-verification/VerificationResult.tsx` | Scan result |
| `src/components/contractors/gate-pass-verification/VehicleVerification.tsx` | Vehicle checks |
| `src/components/contractors/gate-pass-verification/ItemsConfirmationList.tsx` | Item checklist |
| `src/components/contractors/gate-pass-verification/ItemVerificationCard.tsx` | Item compare |
| `src/hooks/contractor-management/use-gate-pass-draft.ts` | IndexedDB persistence |
| `src/hooks/contractor-management/use-offline-approvals.ts` | Offline approval queue |
| `src/hooks/use-document-branding.ts` | Fetch tenant document settings |

### Files to Update (8)

| Path | Changes |
|:-----|:--------|
| `src/pages/my-gate-passes/Create.tsx` | Use wizard, add safe-area |
| `src/components/contractors/GatePassDetailDialog.tsx` | Responsive sheet wrapper |
| `src/components/contractors/GatePassApprovalQueue.tsx` | Swipe cards, urgency |
| `src/components/contractors/GatePassPDFTemplate.tsx` | Document branding |
| `src/components/contractors/GatePassVerificationPanel.tsx` | Full redesign |
| `src/hooks/contractor-management/use-gate-pass-pdf.ts` | Fetch branding |
| `src/components/contractors/GatePassFormDialog.tsx` | Visual improvements |
| `public/sw.js` | Cache gate pass data for offline |

---

## Implementation Priority

| Phase | Effort | Impact | Priority |
|:------|:-------|:-------|:---------|
| Phase 1: Create Wizard | High | High | 1st |
| Phase 6: Guard Scanner | Medium | High | 2nd |
| Phase 7: Items Confirmation | Medium | High | 3rd |
| Phase 2: Details Sheet | Medium | Medium | 4th |
| Phase 3: Approval Queue | Medium | Medium | 5th |
| Phase 4: PDF Branding | Low | Medium | 6th |
| Phase 5: Security Panel | Medium | Medium | 7th |

---

## PWA-Specific CSS Additions

```css
/* Safe area utilities for gate pass components */
.gate-pass-header {
  padding-top: max(1rem, env(safe-area-inset-top));
}

.gate-pass-footer {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
  padding-inline: env(safe-area-inset-left) env(safe-area-inset-right);
}

/* Touch-friendly targets */
.gate-pass-action-button {
  min-height: 48px;
  min-width: 48px;
}

/* Swipe card styles */
.gate-pass-swipe-card {
  touch-action: pan-y;
  transition: transform 0.2s ease-out;
}

.gate-pass-swipe-card.swiping-right {
  background: linear-gradient(90deg, hsl(var(--success)/0.1), transparent);
}

.gate-pass-swipe-card.swiping-left {
  background: linear-gradient(270deg, hsl(var(--destructive)/0.1), transparent);
}
```

---

## Offline Capabilities

| Feature | Storage | Sync Strategy |
|:--------|:--------|:--------------|
| Form drafts | IndexedDB | Background sync on submit |
| Photos | IndexedDB + Blob URLs | Queue for upload |
| Approvals | IndexedDB | Sync when online |
| Pass cache | Cache API | Stale-while-revalidate |
| Verification | Service Worker | Pre-cache approved passes |

---

## Accessibility & RTL

- All touch targets: 48x48px minimum
- All text uses logical properties (`text-start`, `text-end`)
- All spacing uses `ms-`/`me-`/`ps-`/`pe-`
- Directional icons have `rtl:rotate-180`
- Color contrast meets WCAG AA
- Focus states visible with ring utility
- Screen reader labels on all interactive elements
