
# Add Public Gate Pass Toggle to Tenant Settings

## Overview

Create an admin toggle UI in the `TenantDetailDialog` to enable/disable public gate pass requests for each tenant. This will be added as a new "Public Features" tab (or integrated into the existing Security tab) following the exact patterns established in `TenantModuleControl` and `TenantSecurityControl`.

## Current Architecture

| Component | Purpose |
|-----------|---------|
| `TenantDetailDialog.tsx` | Container with 4 tabs: Invitations, Modules, Trial, Security |
| `TenantModuleControl.tsx` | Toggle switches for module access (pattern to follow) |
| `TenantSecurityControl.tsx` | MFA settings with Card layout (pattern to follow) |
| `tenants.allow_public_gate_pass_requests` | Boolean column (already exists in DB) |
| `tenants.public_gate_pass_instructions` | Text column for EN instructions (already exists) |
| `tenants.public_gate_pass_instructions_ar` | Text column for AR instructions (already exists) |

## Implementation Approach

**Option A: Add a new "Public Features" tab** (Recommended)
- Create `TenantPublicFeaturesControl.tsx` component
- Add as 5th tab in `TenantDetailDialog`
- Future-proof for other public features (visitor registration, etc.)

**Option B: Add to existing Security tab**
- Extend `TenantSecurityControl.tsx`
- Less future-proof but simpler

I recommend **Option A** for better separation of concerns.

## Technical Details

### 1. New Component: `TenantPublicFeaturesControl.tsx`

```text
+----------------------------------------------------------+
|  [Globe Icon] Public Gate Pass Requests                  |
|  ------------------------------------------------        |
|  Allow visitors and contractors to submit gate           |
|  pass requests via public URL.                           |
|                                                          |
|  Public URL: dhuud-guard.../golf-saudi/request    [Copy] |
|                                                          |
|  [Toggle Switch]  Enable Public Gate Pass Requests       |
|                                                          |
|  ------------------------------------------------        |
|  Instructions (English)                                  |
|  [Textarea]                                              |
|                                                          |
|  Instructions (Arabic)                                   |
|  [Textarea]                                              |
|                                                          |
|                                    [Save Instructions]   |
+----------------------------------------------------------+
```

**Features:**
- Toggle switch for `allow_public_gate_pass_requests`
- Copy button for public URL
- Text areas for EN/AR instructions
- Badge showing "Enabled" / "Disabled" status
- RTL-compliant using logical properties (`ms-`, `me-`, `text-start`)

### 2. Update `TenantDetailDialog.tsx`

- Add 5th tab: "Public Features"
- Update `TabsList` to `grid-cols-5`
- Import and render `TenantPublicFeaturesControl`

### 3. Add Translation Keys

**English (`src/locales/en/translation.json`):**
```json
"publicFeatures": {
  "title": "Public Features",
  "gatePass": {
    "title": "Public Gate Pass Requests",
    "description": "Allow visitors and contractors to submit gate pass requests via a public URL without authentication.",
    "enabled": "Public requests enabled",
    "disabled": "Public requests disabled",
    "publicUrl": "Public Request URL",
    "copyUrl": "Copy URL",
    "urlCopied": "URL copied to clipboard",
    "instructions": "Request Instructions",
    "instructionsDesc": "Optional instructions shown to visitors on the public form.",
    "instructionsEn": "Instructions (English)",
    "instructionsAr": "Instructions (Arabic)",
    "placeholderEn": "e.g., Please arrive at Gate 2 and present this pass to security...",
    "placeholderAr": "مثال: يرجى الوصول إلى البوابة 2 وتقديم هذا التصريح للأمن...",
    "updated": "Public Features Updated",
    "updatedDesc": "Public gate pass settings have been saved.",
    "toggleUpdated": "Setting Updated",
    "toggleEnabled": "Public gate pass requests are now enabled.",
    "toggleDisabled": "Public gate pass requests are now disabled."
  }
}
```

**Arabic (`src/locales/ar/translation.json`):**
```json
"publicFeatures": {
  "title": "الميزات العامة",
  "gatePass": {
    "title": "طلبات تصاريح البوابة العامة",
    "description": "السماح للزوار والمقاولين بتقديم طلبات تصاريح البوابة عبر رابط عام دون مصادقة.",
    "enabled": "الطلبات العامة مفعلة",
    "disabled": "الطلبات العامة معطلة",
    "publicUrl": "رابط الطلب العام",
    "copyUrl": "نسخ الرابط",
    "urlCopied": "تم نسخ الرابط إلى الحافظة",
    "instructions": "تعليمات الطلب",
    "instructionsDesc": "تعليمات اختيارية تظهر للزوار في النموذج العام.",
    "instructionsEn": "التعليمات (الإنجليزية)",
    "instructionsAr": "التعليمات (العربية)",
    "placeholderEn": "مثال: يرجى الوصول إلى البوابة 2 وتقديم هذا التصريح للأمن...",
    "placeholderAr": "مثال: يرجى الوصول إلى البوابة 2 وتقديم هذا التصريح للأمن...",
    "updated": "تم تحديث الميزات العامة",
    "updatedDesc": "تم حفظ إعدادات تصاريح البوابة العامة.",
    "toggleUpdated": "تم تحديث الإعداد",
    "toggleEnabled": "تم تفعيل طلبات تصاريح البوابة العامة.",
    "toggleDisabled": "تم تعطيل طلبات تصاريح البوابة العامة."
  }
}
```

### 4. Component Implementation Pattern

Following `TenantSecurityControl.tsx` pattern:

```typescript
// Key patterns to follow:
// 1. Use Card components for sections
// 2. Use useMutation for updates
// 3. Invalidate 'tenants' query on success
// 4. Toast notifications for feedback
// 5. RTL support with logical properties

const toggleMutation = useMutation({
  mutationFn: async (enabled: boolean) => {
    const { error } = await supabase
      .from('tenants')
      .update({ allow_public_gate_pass_requests: enabled })
      .eq('id', tenant.id);
    if (error) throw error;
  },
  onSuccess: (_, enabled) => {
    queryClient.invalidateQueries({ queryKey: ['tenants'] });
    toast({
      title: t('tenantManagement.publicFeatures.gatePass.toggleUpdated'),
      description: enabled
        ? t('tenantManagement.publicFeatures.gatePass.toggleEnabled')
        : t('tenantManagement.publicFeatures.gatePass.toggleDisabled'),
    });
  },
});
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/tenants/TenantPublicFeaturesControl.tsx` | **Create** - New component |
| `src/components/tenants/TenantDetailDialog.tsx` | **Modify** - Add 5th tab |
| `src/locales/en/translation.json` | **Modify** - Add translation keys |
| `src/locales/ar/translation.json` | **Modify** - Add Arabic translations |
| `src/locales/hi/translation.json` | **Modify** - Add Hindi translations |
| `src/locales/ur/translation.json` | **Modify** - Add Urdu translations |
| `src/locales/fil/translation.json` | **Modify** - Add Filipino translations |

## Security Considerations

- Only platform admins can access this UI (via `AdminRoute`)
- Toggle updates are protected by RLS (tenant update policy)
- Public URL is only functional when toggle is enabled
- Instructions are sanitized before display on public form

## User Flow

1. Admin navigates to `/admin/tenants`
2. Clicks "Manage Tenant" on a tenant row
3. Opens `TenantDetailDialog`
4. Clicks "Public Features" tab
5. Toggles "Enable Public Gate Pass Requests"
6. Optionally adds instructions in EN/AR
7. Public URL becomes active at `/{tenantSlug}/request`
