
# Fix Public Gate Pass Build Errors

## Current Situation

The public gate pass frontend code was created but the **database migrations have NOT been applied** to the live database. This causes TypeScript build errors because the hooks reference columns and RPC functions that don't exist yet.

### Build Errors Summary

| Error Location | Issue | Root Cause |
|----------------|-------|------------|
| `use-tenant-by-slug.ts` | `logo_url` column doesn't exist | Column is actually `logo_light_url` / `logo_dark_url` |
| `use-public-branches.ts` | `address`, `contact_phone`, `contact_email` don't exist | These columns were never added to `branches` table |
| `use-public-gate-pass.ts` | `submit_public_gate_pass` RPC doesn't exist | RPC function not created in database |
| `use-public-gate-pass.ts` | `get_public_gate_pass_status` RPC doesn't exist | RPC function not created in database |
| `use-tenant-by-slug.ts` | `allow_public_gate_pass_requests` doesn't exist | Column not added to `tenants` table |

### Database Reality Check

**Current `tenants` table columns:**
- Has: `logo_light_url`, `logo_dark_url` (NOT `logo_url`)
- Missing: `allow_public_gate_pass_requests`, `public_gate_pass_instructions`, `public_gate_pass_instructions_ar`

**Current `branches` table columns:**
- Has: `id`, `name`, `location`, `latitude`, `longitude`, `tenant_id`
- Missing: `address`, `contact_phone`, `contact_email`

**RPC Functions:**
- `submit_public_gate_pass` - Does NOT exist
- `get_public_gate_pass_status` - Does NOT exist

---

## Fix Strategy

I recommend a **Two-Phase Approach**:

### Phase 1: Fix Frontend to Match CURRENT Database (Immediate)

Update hooks to use existing columns and remove references to non-existent ones. This will fix build errors immediately.

**Changes:**

1. **`use-tenant-by-slug.ts`** - Use `logo_light_url` instead of `logo_url`
2. **`use-public-branches.ts`** - Remove `address`, `contact_phone`, `contact_email` from select
3. **`use-public-gate-pass.ts`** - Temporarily stub the RPC calls to throw "Feature not configured" errors

### Phase 2: Apply Database Migrations (After build is fixed)

Create proper database migration to add:
1. `allow_public_gate_pass_requests` column to `tenants`
2. `public_gate_pass_instructions` / `public_gate_pass_instructions_ar` columns to `tenants`
3. `address`, `contact_phone`, `contact_email` columns to `branches`
4. Public requester columns to `material_gate_passes`
5. RPC functions `submit_public_gate_pass` and `get_public_gate_pass_status`
6. RLS policies for anonymous access

---

## Technical Details

### Phase 1 File Changes

#### 1. `src/hooks/public-gate-pass/use-tenant-by-slug.ts`

```typescript
// Change logo_url to logo_light_url
export interface PublicTenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;        // Keep for interface compatibility
  brand_color: string;
  allow_public_gate_pass_requests: boolean;
  // ...
}

// In query, select logo_light_url and map to logo_url
const { data, error } = await supabase
  .from("tenants")
  .select(`
    id,
    name,
    slug,
    logo_light_url,
    brand_color,
    emergency_contact_number,
    emergency_contact_name
  `)
  .eq("slug", slug)
  .single();

// Map to interface
return {
  ...data,
  logo_url: data.logo_light_url,
  allow_public_gate_pass_requests: false, // Default until migration
  public_gate_pass_instructions: null,
  public_gate_pass_instructions_ar: null,
} as PublicTenant;
```

#### 2. `src/hooks/public-gate-pass/use-public-branches.ts`

```typescript
// Remove non-existent columns, keep only what exists
export interface PublicBranch {
  id: string;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  // Remove: address, contact_phone, contact_email
}

const { data, error } = await supabase
  .from("branches")
  .select(`
    id,
    name,
    location,
    latitude,
    longitude
  `)
  .eq("tenant_id", tenantId)
  .order("name", { ascending: true });
```

#### 3. `src/hooks/public-gate-pass/use-public-gate-pass.ts`

```typescript
// Remove RPC calls - throw clear error until database is ready
export function useSubmitPublicGatePass() {
  return useMutation({
    mutationFn: async (data: PublicGatePassSubmission): Promise<PublicGatePassSubmissionResult> => {
      // Temporary: Feature requires database migration
      throw new Error("Public gate pass feature is not yet configured. Database migration required.");
    },
  });
}

export function usePublicGatePassStatus(tenantSlug: string | undefined, token: string | undefined) {
  return useQuery({
    queryKey: ["public-gate-pass-status", tenantSlug, token],
    queryFn: async (): Promise<PublicGatePassStatusResponse> => {
      throw new Error("Public gate pass feature is not yet configured. Database migration required.");
    },
    enabled: false, // Disable until migration is applied
  });
}
```

#### 4. `src/types/public-gate-pass.types.ts`

Update `PublicTenant` and `PublicBranch` interfaces to match actual schema temporarily.

---

### Phase 2: Database Migration

After Phase 1 fixes the build, apply this migration:

```sql
-- 1. Add public gate pass columns to tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS allow_public_gate_pass_requests BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_gate_pass_instructions TEXT,
ADD COLUMN IF NOT EXISTS public_gate_pass_instructions_ar TEXT;

-- 2. Add contact columns to branches  
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- 3. Add public requester columns to material_gate_passes
ALTER TABLE material_gate_passes
ADD COLUMN IF NOT EXISTS is_public_request BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_access_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS public_requester_name TEXT,
ADD COLUMN IF NOT EXISTS public_requester_phone TEXT,
ADD COLUMN IF NOT EXISTS public_requester_email TEXT,
ADD COLUMN IF NOT EXISTS public_requester_company TEXT,
ADD COLUMN IF NOT EXISTS notify_whatsapp BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_sms BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- 4. Create RPC functions (submit_public_gate_pass, get_public_gate_pass_status)
-- 5. Create RLS policies for anon role
-- 6. Create rate limiting table
```

---

## Execution Order

1. **Fix hooks** (Phase 1) - Immediate build fix
2. **Test that app builds** - Verify no TypeScript errors
3. **Apply database migration** (Phase 2) - Add columns and RPCs
4. **Update hooks to use real RPCs** - Remove stubs
5. **Test end-to-end** - Submit and track public gate pass

---

## Files to Modify

| File | Action | Phase |
|------|--------|-------|
| `src/hooks/public-gate-pass/use-tenant-by-slug.ts` | Use `logo_light_url`, add defaults | 1 |
| `src/hooks/public-gate-pass/use-public-branches.ts` | Remove missing columns | 1 |
| `src/hooks/public-gate-pass/use-public-gate-pass.ts` | Stub RPCs with clear error | 1 |
| `src/types/public-gate-pass.types.ts` | Update interfaces | 1 |
| Database migration | Add columns, RPCs, RLS | 2 |
| Hooks (revisit) | Enable real RPC calls | 2 |

This approach ensures the build is fixed immediately while preparing for the full database migration.
