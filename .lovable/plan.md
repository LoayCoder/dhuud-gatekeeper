

# Enable Super Admin for Both Admin Accounts

## What
Set `is_super_admin = true` on the `profiles` table for both admin accounts so they can access all areas of the system, including the Contractor Portal.

## Accounts
| Email | User ID |
|-------|---------|
| `luay@dhuud.com` | `dda8d485-7107-4fbe-a558-a449a1d95f6a` |
| `Luay.Madkhali@golfsaudi.com` | `9e5ae1f2-c51d-4afd-9386-b45d06c13a61` |

## Technical Details

Single SQL update using the data insert tool:

```sql
UPDATE profiles
SET is_super_admin = true
WHERE id IN (
  'dda8d485-7107-4fbe-a558-a449a1d95f6a',
  '9e5ae1f2-c51d-4afd-9386-b45d06c13a61'
);
```

No code or schema changes required — only a data update.

