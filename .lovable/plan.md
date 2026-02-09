

# Link All Golf Saudi Incidents to LIV 2026 Major Event

## Summary

Create a new major event called **LIV 2026** for the Golf Saudi tenant and link all **103 existing incidents** to it.

## What Will Be Done

### Step 1: Create the LIV 2026 Event

Insert a new record into the `special_events` table:
- **Name:** LIV 2026
- **Tenant:** Golf Saudi (`e30ae1a5-7eab-4776-bd0b-bb0b391e68e8`)
- **Dates:** January 1, 2026 - December 31, 2026
- **Active:** Yes

### Step 2: Link All 103 Incidents

Update all 103 Golf Saudi incidents (where `deleted_at IS NULL`) to set their `special_event_id` to the newly created LIV 2026 event.

## Technical Details

Two data operations will be executed:

```sql
-- 1. Create the LIV 2026 event
INSERT INTO special_events (tenant_id, name, start_at, end_at, is_active)
VALUES ('e30ae1a5-...', 'LIV 2026', '2026-01-01', '2026-12-31', true);

-- 2. Link all Golf Saudi incidents to it
UPDATE incidents
SET special_event_id = '<new_event_id>'
WHERE tenant_id = 'e30ae1a5-...'
  AND deleted_at IS NULL;
```

## Expected Results

- A new "LIV 2026" event appears in the Manage Major Events page
- All 103 Golf Saudi incidents show as linked to LIV 2026
- The Active Event Banner displays "LIV 2026" when reporters submit new incidents
- New incidents during 2026 will automatically be associated with LIV 2026

## No Code Changes Required

This is a data-only operation -- no code modifications needed. The existing UI already supports displaying linked events.
