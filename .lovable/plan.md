

# Fix: Localize Raw Subscription Status Badges

## Problem

Three locations display raw database values (`active`, `trialing`, `inactive`) directly in badges instead of using translation keys:

1. **`src/pages/admin/SubscriptionManagement.tsx` line 246** — `{subscription?.subscriptionStatus || 'inactive'}` shown raw
2. **`src/components/tenants/TenantTrialControl.tsx` line 163** — `{tenant.subscription_status || 'inactive'}` shown raw

The translation keys already exist (`subscription.activeStatus`, `subscription.inactiveStatus`, `subscription.trialStatus`, `subscription.canceledStatus`), they're just not used in these spots.

`SubscriptionOverview.tsx` already has a proper `getStatusBadge()` function using translations — no fix needed there.

## Fix

### File 1: `src/pages/admin/SubscriptionManagement.tsx` (line 245-247)

Replace raw status text with a helper that maps status to existing translation keys and capitalizes:

```tsx
// Before
<Badge variant={...}>
  {subscription?.subscriptionStatus || 'inactive'}
</Badge>

// After — use t() with existing keys
<Badge variant={...}>
  {subscription?.subscriptionStatus === 'active' 
    ? t('subscription.activeStatus')
    : subscription?.subscriptionStatus === 'trialing'
    ? t('subscription.trialStatus', { days: getTrialDaysRemaining() })
    : subscription?.subscriptionStatus === 'canceled'
    ? t('subscription.canceledStatus')
    : t('subscription.inactiveStatus')}
</Badge>
```

### File 2: `src/components/tenants/TenantTrialControl.tsx` (line 162-164)

Same pattern — replace raw `tenant.subscription_status` with translated text:

```tsx
// Before
<Badge variant={...}>
  {tenant.subscription_status || 'inactive'}
</Badge>

// After
<Badge variant={...}>
  {tenant.subscription_status === 'active'
    ? t('subscription.activeStatus')
    : tenant.subscription_status === 'trialing'
    ? t('subscription.trialStatus', { days: '' }).replace(' - ', '')
    : tenant.subscription_status === 'canceled'
    ? t('subscription.canceledStatus')
    : t('subscription.inactiveStatus')}
</Badge>
```

Both fixes reuse existing translation keys — no new keys needed. The translated values are already capitalized (e.g., "Active", "نشط").

