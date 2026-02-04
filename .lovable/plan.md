
# Fix Public Gate Pass Toggle and Custom Domain URL

## Issues Identified

### Issue 1: Toggle Badge Not Updating After Toggle
The toggle switch successfully updates the database (toast shows "enabled"), but the badge still shows "Disabled". This happens because:

1. `TenantManagement.tsx` stores `detailTenant` in local state
2. When user clicks "Manage", it sets `detailTenant` from the tenants list
3. When toggle mutation runs, it invalidates `['tenants']` query
4. BUT `detailTenant` is NOT updated because it's a snapshot stored in state
5. React-Query refetches the list, but the dialog still shows stale data

**Solution**: Use optimistic local state in `TenantPublicFeaturesControl` to immediately update the UI while the mutation runs, similar to how the `Switch` component should reflect changes instantly.

### Issue 2: Public URL Shows Preview Domain Instead of Custom Domain
Currently the URL is generated as:
```typescript
const publicUrl = `${window.location.origin}/${tenant.slug}/request`;
```
This returns the Lovable preview URL. User needs it to show their production domain like `www.dhuud.com`.

**Solution**: Add a `public_gate_pass_domain` column to the `tenants` table to store the custom domain, then use it to generate the correct URL.

---

## Technical Changes

### 1. Database Migration
Add a new column to store the custom domain for public gate pass URLs:

```sql
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS public_gate_pass_domain TEXT;

-- Example: 'https://www.dhuud.com'
COMMENT ON COLUMN tenants.public_gate_pass_domain IS 
  'Custom domain URL for public gate pass requests (e.g., https://www.dhuud.com)';
```

### 2. Update `TenantPublicFeaturesControl.tsx`

**Fix Toggle with Optimistic State**:
```typescript
// Add local state to track enabled status
const [isEnabled, setIsEnabled] = useState(tenant.allow_public_gate_pass_requests ?? false);
const [customDomain, setCustomDomain] = useState(tenant.public_gate_pass_domain ?? '');

// Sync with parent when tenant prop changes (e.g., after re-fetch)
useEffect(() => {
  setIsEnabled(tenant.allow_public_gate_pass_requests ?? false);
  setCustomDomain(tenant.public_gate_pass_domain ?? '');
}, [tenant.id, tenant.allow_public_gate_pass_requests, tenant.public_gate_pass_domain]);

// Update toggle handler for optimistic UI
const handleToggle = (checked: boolean) => {
  setIsEnabled(checked); // Optimistic update
  toggleMutation.mutate(checked);
};

// Rollback on error
onError: (error, variables) => {
  setIsEnabled(!variables); // Revert optimistic update
  toast({ title: t('common.error'), ... });
};
```

**Fix URL Generation**:
```typescript
// Use custom domain if configured, otherwise fall back to current origin
const getPublicUrl = () => {
  const baseUrl = customDomain?.trim() || window.location.origin;
  // Ensure no trailing slash
  const cleanBase = baseUrl.replace(/\/$/, '');
  return `${cleanBase}/${tenant.slug}/request`;
};

const publicUrl = getPublicUrl();
```

**Add Custom Domain Input Field**:
```text
+----------------------------------------------------------+
|  Custom Domain (Optional)                                |
|  [Input: https://www.dhuud.com]                          |
|  Configure a custom domain for the public URL.           |
|  Leave empty to use the default system domain.           |
|                                            [Save Domain] |
+----------------------------------------------------------+
```

### 3. Update Translation Files

Add new keys for the domain configuration:

```json
// English
"customDomain": "Custom Domain",
"customDomainDesc": "Configure a custom domain for the public gate pass URL. Leave empty to use the default system domain.",
"customDomainPlaceholder": "https://www.example.com",
"domainSaved": "Custom domain saved successfully."

// Arabic
"customDomain": "النطاق المخصص",
"customDomainDesc": "قم بتكوين نطاق مخصص لرابط تصريح البوابة العام. اتركه فارغاً لاستخدام نطاق النظام الافتراضي.",
"customDomainPlaceholder": "https://www.example.com",
"domainSaved": "تم حفظ النطاق المخصص بنجاح."
```

---

## Component Structure After Fix

```text
+----------------------------------------------------------+
|  [Globe Icon] Public Gate Pass Requests       [Enabled]  |
|  ------------------------------------------------        |
|  Allow visitors and contractors to submit gate           |
|  pass requests via public URL.                           |
|                                                          |
|  Custom Domain (Optional)                                |
|  [Input: https://www.dhuud.com]               [Save]     |
|  Configure a custom domain for the public URL.           |
|                                                          |
|  Public Request URL                                      |
|  [https://www.dhuud.com/golf-saudi/request]       [Copy] |
|                                                          |
|  [Toggle Switch ON]  Enable Public Gate Pass Requests    |
+----------------------------------------------------------+
```

---

## Files to Modify

| File | Action |
|------|--------|
| Database Migration | **Create** - Add `public_gate_pass_domain` column |
| `src/components/tenants/TenantPublicFeaturesControl.tsx` | **Modify** - Add optimistic toggle, custom domain input, fix URL generation |
| `src/locales/en/translation.json` | **Modify** - Add custom domain translation keys |
| `src/locales/ar/translation.json` | **Modify** - Add Arabic translations |
| `src/locales/hi/translation.json` | **Modify** - Add Hindi translations |
| `src/locales/ur/translation.json` | **Modify** - Add Urdu translations |
| `src/locales/fil/translation.json` | **Modify** - Add Filipino translations |

---

## Result After Implementation

1. **Toggle**: Badge will update immediately when toggle is clicked (optimistic UI)
2. **URL**: Will show custom domain (e.g., `https://www.dhuud.com/golf-saudi/request`) when configured
3. **Admin Control**: Admins can configure the custom domain per tenant
4. **Fallback**: If no custom domain is set, uses the current system domain

---

## Security Considerations

- Custom domain input should be validated for URL format
- Domain should allow only HTTPS URLs in production
- The domain is only used for display/copy purposes; actual routing depends on DNS and hosting configuration
