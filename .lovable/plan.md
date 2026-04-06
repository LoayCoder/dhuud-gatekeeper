

# Fix: Contractor Representative Photo Not Persisting

## Root Cause

Three cascading failures prevent the photo from being saved and displayed:

### Bug 1: Database column missing (CRITICAL)
The `contractor_representatives` table has **no `photo_path` column**. The form collects it, but the upsert mutation in `use-contractor-site-rep.ts` never writes it — because the column doesn't exist.

### Bug 2: Photo discarded on load
In `CompanyFormDialog.tsx` line 158, when loading an existing rep, `photo_path` is **hardcoded to `null`**:
```typescript
photo_path: null,  // ← always null, even if photo existed
```

### Bug 3: Upsert ignores photo_path
The `useUpsertSiteRep` mutation only writes `full_name`, `national_id`, `mobile_number`, `email`. It never includes `photo_path` in the update or insert payload.

### Bug 4: Missing columns for nationality/phone
The table also lacks `nationality` and `phone` columns, which are collected in the form but silently dropped.

### Impact on ID Card
The ID card reads photo from the synced `contractor_workers` record. Since `siteRep.photo_path` is always null (Bug 2), the worker record also gets `photo_path: null` during sync → ID card shows no photo.

## Plan

### Step 1: Database Migration — Add missing columns

```sql
ALTER TABLE public.contractor_representatives 
  ADD COLUMN IF NOT EXISTS photo_path text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS phone text;
```

### Step 2: `use-contractor-site-rep.ts` — Include photo_path, nationality, phone in upsert

Both the **update** and **insert** branches must include:
- `photo_path: data.photo_path || null`
- `nationality: data.nationality || null`
- `phone: data.phone || null`

### Step 3: `CompanyFormDialog.tsx` — Load photo_path from database

Change line 158 from `photo_path: null` to:
```typescript
photo_path: siteRepFromTable.photo_path || null,
nationality: siteRepFromTable.nationality || "",
phone: siteRepFromTable.phone || "",
```

### Step 4: `SiteRepLockedCard.tsx` — Display photo from storage

The locked card currently uses `data.photo_path` as a direct `<img src>`. But `photo_path` is a Supabase Storage path (e.g., `worker-photos/xxx.jpg`), not a URL. Add a `useEffect` to generate a signed URL from the storage path, matching the pattern used in `WorkerDetailDialog.tsx`.

## Files

| File | Change |
|------|--------|
| **DB Migration** | Add `photo_path`, `nationality`, `phone` columns to `contractor_representatives` |
| `use-contractor-site-rep.ts` | Include all 3 new fields in update/insert |
| `CompanyFormDialog.tsx` | Load `photo_path`, `nationality`, `phone` from fetched data |
| `SiteRepLockedCard.tsx` | Generate signed URL for photo display |

No other files need changes — the sync function (`use-sync-personnel-to-workers.ts`) already passes `siteRep.photo_path` to the worker record, and the ID card reads from the worker record. Once the photo persists, both will work.

