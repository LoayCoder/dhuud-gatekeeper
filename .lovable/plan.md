

# Empty Contractor Project Dropdown — Root Cause

## Finding: No Data Issue, Not a Code Bug

The dropdown is working correctly. The query executes successfully (HTTP 200) and returns an empty array `[]` because **your tenant has no contractor projects**.

### Evidence from Network Requests

| Item | Value |
|------|-------|
| Logged-in user | LUAY IBRAHIM - Admin (`luay.madkhali@golfsaudi.com`) |
| User's tenant_id | `e30ae1a5-7eab-4776-bd0b-bb0b391e68e8` |
| Contractor projects in this tenant | **0** |
| Query response | HTTP 200, body: `[]` |

The 8 test contractor projects that exist in the database belong to a **different tenant** (`9290e913-...`), so they are correctly filtered out by tenant isolation.

## What Needs to Happen

You need to **create contractor projects first** before they appear in the PTW "Link to Contractor Project" dropdown.

### Path to create contractor projects:
Navigate to the **Contractor Management → Projects** section and create projects there. Once projects exist for your tenant, they will automatically appear in the PTW project form dropdown.

## Code Improvement (Optional)

Add a helpful empty-state message in the dropdown so users understand why it's empty:

**File**: `src/features/ptw/components/ProjectFormDialog.tsx`

In the `<SelectContent>` for contractor projects (around line 296), add a fallback when `contractorProjects` is empty:

```typescript
<SelectContent>
  {contractorProjects && contractorProjects.length > 0 ? (
    contractorProjects.map((project) => (
      <SelectItem key={project.id} value={project.id}>
        <span className="font-medium">{project.project_code}</span>
        <span className="text-muted-foreground ms-2">- {project.project_name}</span>
      </SelectItem>
    ))
  ) : (
    <div className="p-3 text-sm text-muted-foreground text-center">
      No contractor projects available. Create one in Contractor Management first.
    </div>
  )}
</SelectContent>
```

## Files Changed

| File | Change |
|------|--------|
| `src/features/ptw/components/ProjectFormDialog.tsx` | Add empty-state message for contractor projects dropdown |

