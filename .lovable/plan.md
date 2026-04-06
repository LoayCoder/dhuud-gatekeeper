

# Fix Project Form Edit Rules

## Issues
1. **Project Code**: Already read-only — correct, no change needed.
2. **Branch, Company disabled on edit**: Currently `disabled={isEditing}` blocks editing even for active projects. Should only block for completed/cancelled.
3. **No completed/cancelled guard**: Users can edit projects in any status. Completed/cancelled projects should be fully read-only.

## Changes

### File: `src/features/contractors/components/ProjectFormDialog.tsx`

1. **Add `isCompleted` flag** derived from project status:
   ```typescript
   const isCompleted = project?.status === 'completed' || project?.status === 'cancelled';
   ```

2. **Branch select**: Change `disabled={isEditing}` → `disabled={isCompleted}`. When branch changes on an active project, still reset downstream fields and regenerate code.

3. **Company select**: Change `disabled={!watchedBranchId || isEditing}` → `disabled={!watchedBranchId || isCompleted}`.

4. **Project Manager, Site, Department**: Already enabled when branch is selected. Add `|| isCompleted` to their disabled conditions.

5. **Project Name, Start Date, End Date, Notes**: Add `disabled={isCompleted}` or `readOnly`.

6. **Save button**: `disabled={isCompleted}` — hide or disable when completed.

7. **Project Code**: Remains `readOnly` always (no change).

8. **Branch change in edit mode**: Allow changing branch for active projects, which resets downstream fields and regenerates code — same as create mode.

### Summary
- 1 file modified
- No DB changes
- Active projects: all fields editable except Code
- Completed/cancelled: entire form read-only, Save disabled

