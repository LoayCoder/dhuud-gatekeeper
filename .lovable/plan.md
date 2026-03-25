

# Fix: Inspection Template Creation Not Saving

## Root Cause

**`InspectionTemplates.tsx` imports from the stub file instead of the real hooks.**

Line 39 of `src/pages/admin/InspectionTemplates.tsx`:
```typescript
// CURRENT — imports no-op stubs that do nothing
import { useCreateTemplate, useUpdateTemplate, useDeleteTemplate, ... }
  from '@/features/incidents/hooks/use-inspection-stubs';
```

The stub's `useCreateTemplate` mutation is literally `async (data) => data` — it returns the input without making any database call. The form appears to submit successfully but nothing is saved.

The **real** implementations exist in `use-inspection-template-hooks.ts` and are already exported from the barrel file `@/features/incidents`.

## Fix

### Single file change: `src/pages/admin/InspectionTemplates.tsx`

Change the import on lines 31-39 from:
```typescript
import {
  useInspectionTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useBulkUpdateTemplateStatus,
  useBulkDeleteTemplates,
  type InspectionTemplate,
} from '@/features/incidents/hooks/use-inspection-stubs';
```

To:
```typescript
import {
  useInspectionTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useBulkUpdateTemplateStatus,
  useBulkDeleteTemplates,
  type InspectionTemplate,
} from '@/features/incidents';
```

This points to the barrel file which exports the real hooks that perform actual Supabase INSERT/UPDATE/DELETE operations with proper tenant isolation and error handling.

### No other changes needed
- The real hooks already exist and are tested
- RLS policies on `inspection_templates` are correctly configured
- The form component (`InspectionTemplateForm.tsx`) passes the right data shape

