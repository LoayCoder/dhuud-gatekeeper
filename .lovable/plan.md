
# Add Duplicate Detection Logic for All Organization Structure Items

## Problem Summary
The current duplicate validation for Departments and Sections only checks within the same parent (division/department) + branch, which allowed duplicates to be created across branches. Other items (Divisions, Branches, Sites, Buildings, Floors/Zones) have **no duplicate validation at all**.

## Solution
Implement tenant-wide duplicate detection based on **name + tenant_id** for all organization structure items. This prevents any two items with the same name from existing within the same tenant.

---

## Items to Protect

| Item Type | Current Validation | New Validation |
|:----------|:-------------------|:---------------|
| Branches | None | Name unique within tenant |
| Divisions | None | Name unique within tenant |
| Departments | Name + Division + Branch | Name unique within tenant |
| Sections | Name + Department + Branch | Name unique within tenant |
| Sites | None | Name unique within tenant |
| Buildings | None | Name + Site (same building name can exist at different sites) |
| Floors/Zones | None | Name + Building (same floor name can exist in different buildings) |

---

## Implementation Details

### File to Modify
`src/pages/admin/OrgStructure.tsx`

### Changes to `handleCreate` Function

**1. Add Branch Duplicate Check (new)**
```typescript
if (table === 'branches') {
  const existingBranch = branches.find(b => 
    b.name.toLowerCase() === newItemName.trim().toLowerCase()
  );
  if (existingBranch) {
    toast({ 
      title: t('common.error'), 
      description: t('orgStructure.branchAlreadyExists'),
      variant: "destructive" 
    });
    setCreating(false);
    return;
  }
}
```

**2. Add Division Duplicate Check (new)**
```typescript
if (table === 'divisions') {
  const existingDivision = divisions.find(d => 
    d.name.toLowerCase() === newItemName.trim().toLowerCase()
  );
  if (existingDivision) {
    toast({ 
      title: t('common.error'), 
      description: t('orgStructure.divisionAlreadyExists'),
      variant: "destructive" 
    });
    setCreating(false);
    return;
  }
}
```

**3. Simplify Department Duplicate Check (modify existing)**
```typescript
// Before: Checked name + division_id + branch_id
// After: Check name only (tenant-wide)
if (table === 'departments') {
  const existingDept = departments.find(d => 
    d.name.toLowerCase() === newItemName.trim().toLowerCase()
  );
  if (existingDept) {
    toast({ 
      title: t('common.error'), 
      description: t('orgStructure.departmentAlreadyExists'),
      variant: "destructive" 
    });
    setCreating(false);
    return;
  }
}
```

**4. Simplify Section Duplicate Check (modify existing)**
```typescript
// Before: Checked name + department_id + branch_id
// After: Check name only (tenant-wide)
if (table === 'sections') {
  const existingSection = sections.find(s => 
    s.name.toLowerCase() === newItemName.trim().toLowerCase()
  );
  if (existingSection) {
    toast({ 
      title: t('common.error'), 
      description: t('orgStructure.sectionAlreadyExists'),
      variant: "destructive" 
    });
    setCreating(false);
    return;
  }
}
```

**5. Add Site Duplicate Check (new)**
```typescript
if (table === 'sites') {
  const existingSite = sites.find(s => 
    s.name.toLowerCase() === newItemName.trim().toLowerCase()
  );
  if (existingSite) {
    toast({ 
      title: t('common.error'), 
      description: t('orgStructure.siteAlreadyExists'),
      variant: "destructive" 
    });
    setCreating(false);
    return;
  }
}
```

**6. Add Building Duplicate Check (new)**
```typescript
if (table === 'buildings') {
  // Buildings: same name allowed at different sites, but not same site
  const existingBuilding = buildings.find(b => 
    b.name.toLowerCase() === newItemName.trim().toLowerCase() &&
    b.site_id === selectedSiteForBuilding
  );
  if (existingBuilding) {
    toast({ 
      title: t('common.error'), 
      description: t('orgStructure.buildingAlreadyExists'),
      variant: "destructive" 
    });
    setCreating(false);
    return;
  }
}
```

**7. Add Floor/Zone Duplicate Check (new)**
```typescript
if (table === 'floors_zones') {
  // Floors: same name allowed in different buildings, but not same building
  const existingFloor = floorsZones.find(f => 
    f.name.toLowerCase() === newItemName.trim().toLowerCase() &&
    f.building_id === selectedBuildingForFloor
  );
  if (existingFloor) {
    toast({ 
      title: t('common.error'), 
      description: t('orgStructure.floorZoneAlreadyExists'),
      variant: "destructive" 
    });
    setCreating(false);
    return;
  }
}
```

---

## Translation Keys to Add

Add to all locale files (`en`, `ar`, `hi`, `ur`, `fil`):

```json
{
  "orgStructure": {
    "branchAlreadyExists": "A branch with this name already exists.",
    "divisionAlreadyExists": "A division with this name already exists.",
    "siteAlreadyExists": "A site with this name already exists.",
    "buildingAlreadyExists": "A building with this name already exists at this site.",
    "floorZoneAlreadyExists": "A floor/zone with this name already exists in this building."
  }
}
```

**Arabic translations:**
```json
{
  "branchAlreadyExists": "يوجد بالفعل فرع بهذا الاسم.",
  "divisionAlreadyExists": "يوجد بالفعل قطاع بهذا الاسم.",
  "siteAlreadyExists": "يوجد بالفعل موقع بهذا الاسم.",
  "buildingAlreadyExists": "يوجد بالفعل مبنى بهذا الاسم في هذا الموقع.",
  "floorZoneAlreadyExists": "يوجد بالفعل طابق/منطقة بهذا الاسم في هذا المبنى."
}
```

---

## Summary

| Change | Description |
|:-------|:------------|
| Code changes | Add 5 new duplicate checks, simplify 2 existing checks |
| Translation updates | Add 5 new keys across 5 locale files |
| Validation scope | Tenant-wide for main items, parent-scoped for Buildings/Floors |

This prevents future duplicates while aligning with the hybrid organizational model where items are shared across branches.
