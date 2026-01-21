-- Step 1: Remove duplicates, keeping only the most recent entry per IP
DELETE FROM ip_blocklist a
USING ip_blocklist b
WHERE a.ip_address = b.ip_address
  AND a.blocked_at < b.blocked_at;

-- Step 2: Drop the old non-unique index (redundant after constraint)
DROP INDEX IF EXISTS idx_ip_blocklist_ip;

-- Step 3: Add the unique constraint
ALTER TABLE public.ip_blocklist 
ADD CONSTRAINT ip_blocklist_ip_address_unique UNIQUE (ip_address);