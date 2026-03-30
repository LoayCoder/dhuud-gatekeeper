

# Fix: `partial` Not Saving — Database Constraint Blocking It

## Root Cause

The `inspection_session_assets` table has a CHECK constraint:
```sql
CHECK (quick_result = ANY (ARRAY['good', 'not_good', 'not_accessible']))
```

`partial` is **not included**. When the UI calls `handleConfirm('partial')`, the Supabase update silently fails (the error is caught but the toast doesn't show the DB error), so nothing saves and nothing happens.

## Fix

### 1. Database Migration — Add `partial` to the CHECK constraint
Drop and recreate the constraint to include `partial`:
```sql
ALTER TABLE public.inspection_session_assets
  DROP CONSTRAINT inspection_session_assets_quick_result_check;

ALTER TABLE public.inspection_session_assets
  ADD CONSTRAINT inspection_session_assets_quick_result_check
  CHECK (quick_result = ANY (ARRAY['good', 'not_good', 'not_accessible', 'partial']));
```

### 2. Add Missing i18n Keys
The console shows missing translation keys. Add to the English and Arabic translation files:
- `inspectionSessions.confirmFail` → "Confirm — Fail"
- `inspectionSessions.confirmPartial` → "Confirm — Partial"
- `assetParts.hasNotes` → "•"

### 3. Improve Error Visibility in `handleConfirm`
In `QuickInspectionCard.tsx`, the catch block only does `console.error`. Add a `toast.error` so users see DB errors:
```typescript
} catch (error) {
  console.error('Failed to confirm inspection:', error);
  toast.error(t('inspectionSessions.confirmFailed', 'Failed to confirm inspection. Please try again.'));
}
```

## Files to Change
| File | Change |
|------|--------|
| Database migration | Add `partial` to CHECK constraint |
| `QuickInspectionCard.tsx` | Add `toast.error` to catch block |
| Translation files (en/ar) | Add missing keys |

