-- Clean up duplicate trusted devices, keeping only the most recent per user+device_name combination
DELETE FROM trusted_devices td1
WHERE EXISTS (
  SELECT 1 FROM trusted_devices td2
  WHERE td1.user_id = td2.user_id
  AND td1.device_name = td2.device_name
  AND td1.created_at < td2.created_at
);

-- Also clean up any expired devices older than 30 days
DELETE FROM trusted_devices
WHERE trusted_until < NOW() - INTERVAL '30 days';