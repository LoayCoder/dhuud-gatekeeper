

# Fix: "record 'new' has no field 'status'" on Worker Insert

## Problem
The `enforce_contractor_access_duration` trigger on `contractor_workers` references `NEW.status` but the actual column is `approval_status`. This causes every INSERT to fail.

## Fix
Single SQL migration to recreate the trigger function, replacing all `NEW.status` and `OLD.status` references with `NEW.approval_status` and `OLD.approval_status`.

### Technical Detail
```sql
-- In enforce_contractor_access_duration():
-- BEFORE (broken):
IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

-- AFTER (fixed):
IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
```

One migration, no frontend changes.

