

# Fix: Remove Duplicate Status Display

## Problem
On the subscription page, both a `<p>` tag (line 239-243) and a `<Badge>` (line 245-253) display the identical subscription status text (e.g., "Active" / "نشط"). This is redundant.

## Fix

**File: `src/pages/admin/SubscriptionManagement.tsx`**

Remove the `<p>` element on lines 239-243 entirely. The Badge already conveys the status clearly. The remaining `<p>` on line 236-238 showing the plan name is kept.

```tsx
// Before (lines 234-254)
<div className="flex items-center justify-between">
  <div>
    <p className="text-lg font-semibold">
      {subscription?.planName || t('subscription.noPlan')}
    </p>
    <p className="text-sm text-muted-foreground">   // ← REMOVE this
      {status text...}                                // ← duplicate
    </p>                                              // ← of Badge
  </div>
  <Badge ...>{same status text}</Badge>
</div>

// After
<div className="flex items-center justify-between">
  <div>
    <p className="text-lg font-semibold">
      {subscription?.planName || t('subscription.noPlan')}
    </p>
  </div>
  <Badge ...>{status text}</Badge>
</div>
```

One file, one deletion — clean and simple.

