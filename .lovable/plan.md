

# Fix N/A Fields on PTW Project Clearance Page

## Root Cause

Two separate issues cause the N/A values:

### Issue 1: Auto-populate from contractor project doesn't always work
When a contractor project is selected in the form, the `useEffect` auto-populates `contractor_company_id` and `site_id` from the linked contractor project. However:
- The contractor project itself may have NULL `site_id` (confirmed: project `147551d7` has `site_id: NULL`)
- Even when `company_id` exists on the contractor project, the PTW project row in the DB still shows `contractor_company_id: NULL` for project `43dfa08c` — this means the form state value isn't being correctly passed through

**Root cause**: In `ProjectFormDialog.tsx` line 77, it sets `contractor_company_id: String(linkedProject.company_id ?? "")`. But in `handleSubmit` (line 144), it sends `contractor_company_id: formData.is_internal_work ? undefined : formData.contractor_company_id || undefined`. The `|| undefined` converts empty string to undefined, which is correct. But the real issue is that `company_id` on the contractor project response may not match the field name — need to verify the contractor project query returns `company_id`.

### Issue 2: No Project Manager field in the creation form
The form has no UI for selecting a Project Manager. The `project_manager_id` column is always NULL.

### Issue 3: Legacy project data
Project `28a83a73` (the one being viewed) was created on Jan 1 with `is_internal_work: false` but before the mandatory contractor project validation was added. All fields are NULL.

## Plan

### Step 1: Add Project Manager selection to the form
Add a PM dropdown in `ProjectFormDialog.tsx` that shows profiles from the tenant. Auto-populate from the linked contractor project's `project_manager_id` if available.

### Step 2: Fix auto-populate to reliably save contractor_company_id
In `createPTWProject` service, when `linked_contractor_project_id` is provided, fetch the contractor project and resolve `contractor_company_id` and `site_id` server-side (in the service function) to guarantee they're always populated — don't rely solely on client-side form state.

### Step 3: Show linked contractor project info as fallback on clearance page
Update `ProjectClearance.tsx` to also display data from the linked contractor project when direct fields are NULL. The query in `getPTWProjects` already joins `linked_contractor_project:contractor_projects(...)` — extend it to include `company:contractor_companies(company_name)`, `site:sites(name)`, and `project_manager:profiles(full_name)`.

## Files Changed

| File | Change |
|------|--------|
| `src/features/ptw/components/ProjectFormDialog.tsx` | Add Project Manager dropdown; auto-populate PM from contractor project |
| `src/features/ptw/services/ptwProjectService.ts` | In `createPTWProject`, resolve `contractor_company_id`, `site_id`, and `project_manager_id` from linked contractor project when not explicitly provided |
| `src/pages/ptw/ProjectClearance.tsx` | Add fallback display from linked contractor project data when direct fields are NULL |
| `src/features/ptw/services/ptwProjectService.ts` | Extend `getPTWProjects` select to include nested contractor project relations |

## Technical Detail

In `createPTWProject`, before inserting:
```typescript
if (data.linked_contractor_project_id && !data.is_internal_work) {
  const { data: cp } = await supabase
    .from('contractor_projects')
    .select('company_id, site_id, project_manager_id')
    .eq('id', data.linked_contractor_project_id)
    .single();
  if (cp) {
    insertData.contractor_company_id = insertData.contractor_company_id || cp.company_id;
    insertData.site_id = insertData.site_id || cp.site_id;
    insertData.project_manager_id = insertData.project_manager_id || cp.project_manager_id;
  }
}
```

In `getPTWProjects`, extend the linked_contractor_project join:
```
linked_contractor_project:contractor_projects(
  project_code, project_name, 
  company:contractor_companies(company_name),
  site:sites(name),
  project_manager:profiles(full_name)
)
```

In `ProjectClearance.tsx`, use fallback:
```typescript
const contractorName = project?.contractor_company?.company_name 
  || project?.linked_contractor_project?.company?.company_name 
  || t("common.na", "N/A");
```

