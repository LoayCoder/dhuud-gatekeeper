

# Fix "Complete Mobilization" 404 — Route Mismatch

## Root Cause

The "Complete Mobilization" button in `MobilizationStatusBanner.tsx` navigates to:
```
/ptw/projects/{projectId}/mobilization
```

But the route defined in `ptw.routes.tsx` is:
```
/ptw/projects/{projectId}/clearance
```

No route matches `/mobilization`, so the user sees a 404.

## Fix

**File: `src/features/ptw/components/MobilizationStatusBanner.tsx`** (line 101)

Change the Link `to` prop from:
```tsx
<Link to={`/ptw/projects/${projectId}/mobilization`}>
```
to:
```tsx
<Link to={`/ptw/projects/${projectId}/clearance`}>
```

This aligns the button with the existing route that renders `ProjectClearance`.

## Files Changed

| File | Change |
|------|--------|
| `src/features/ptw/components/MobilizationStatusBanner.tsx` | Fix link path from `/mobilization` to `/clearance` |

