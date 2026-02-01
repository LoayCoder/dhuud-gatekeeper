

# Fix: Correct Table Name in `can_approve_gate_pass` Function

## Problem Identified

The 3-parameter `can_approve_gate_pass` function references a non-existent table:

| Issue | Details |
|:------|:--------|
| **Error** | `relation "gate_passes" does not exist` |
| **Wrong Table** | `gate_passes` |
| **Correct Table** | `material_gate_passes` |

### Current Broken Code (Line 14-18)
```sql
SELECT gp.*, cc.consultant_id
INTO v_gate_pass
FROM gate_passes gp  -- WRONG TABLE NAME
LEFT JOIN contractor_companies cc ON cc.id = gp.company_id
WHERE gp.id = p_gate_pass_id
```

### Comparison
| Function | Table Used | Status |
|:---------|:-----------|:-------|
| `can_approve_gate_pass(uuid, uuid)` | `material_gate_passes` | Correct |
| `can_approve_gate_pass(uuid, uuid, text)` | `gate_passes` | **WRONG** |

---

## Solution

Create a database migration to update the 3-parameter function, changing `gate_passes` to `material_gate_passes`.

### SQL Fix
```sql
-- Change from:
FROM gate_passes gp

-- To:
FROM material_gate_passes gp
```

---

## Database Migration

| File | Action | Description |
|:-----|:-------|:------------|
| New migration SQL file | **Create** | Fix table name in `can_approve_gate_pass(uuid, uuid, text)` |

The migration will:
1. Drop and recreate the 3-parameter function
2. Change `gate_passes` to `material_gate_passes`
3. Keep all approval logic intact
4. Grant EXECUTE permission to authenticated role

---

## Expected Result

After migration:
1. Khalid Al Shuhail will be able to approve **GP-2026-00001**
2. No more `relation "gate_passes" does not exist` errors
3. Complete gate pass approval workflow will function correctly

