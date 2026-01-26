

# Plan: Fix Build Errors Blocking Incident Report Page

## Problem Summary
The build is failing with 50+ TypeScript errors, preventing the `/incidents/report` page from loading. The errors fall into these categories:

1. **Missing Database Tables**: Code references `incident_rca` and `incident_evidence` tables that don't exist
2. **Missing Database Columns**: Code references `assigned_environmental_expert_id` on `incidents` table - doesn't exist
3. **Incorrect Type Exports**: `RootCauseEntry` is being re-exported from wrong file
4. **Missing Interface Properties**: `WitnessStatement` interface is missing `assignment_status` field

---

## Root Cause Analysis

| Error Category | Count | Cause |
|----------------|-------|-------|
| `incident_rca` table missing | ~15 | Table never created in DB |
| `incident_evidence` table missing | ~12 | Table never created in DB |
| `RootCauseEntry` not exported | 3 | Wrong export path in index.ts |
| `assignment_status` missing | 5 | WitnessStatement interface incomplete |
| `assigned_environmental_expert_id` missing | 4 | Column not in incidents table |
| `Profile.id` missing | 4 | Profile type not fully exposed |

---

## Fix Strategy

### Fix 1: Create Missing Database Tables

**Create `incident_rca` table** to store Root Cause Analysis data:

```sql
CREATE TABLE public.incident_rca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  five_whys JSONB DEFAULT '[]',
  root_causes JSONB DEFAULT '[]',
  contributing_factors JSONB DEFAULT '[]',
  immediate_causes TEXT[] DEFAULT '{}',
  underlying_causes TEXT[] DEFAULT '{}',
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(incident_id)
);

-- Enable RLS
ALTER TABLE public.incident_rca ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant isolation
CREATE POLICY tenant_isolation ON public.incident_rca
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
```

**Create `incident_evidence` table** for evidence storage:

```sql
CREATE TABLE public.incident_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  evidence_type TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  cctv_metadata JSONB,
  description TEXT,
  review_comment TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES profiles(id),
  is_soft_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.incident_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.incident_evidence
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
```

### Fix 2: Add Missing Column to Incidents Table

```sql
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS assigned_environmental_expert_id UUID REFERENCES profiles(id);
```

### Fix 3: Fix RootCauseEntry Export

**File: `src/components/investigation/index.ts`**

Change line 7 from:
```typescript
export { RootCausesBuilder, type RootCauseEntry } from './RootCausesBuilder';
```

To:
```typescript
export { RootCausesBuilder } from './RootCausesBuilder';
export type { RootCauseEntry } from '@/hooks/use-investigation';
```

**File: `src/components/investigation/AISummaryPanel.tsx`**

Change line 10 from:
```typescript
import type { RootCauseEntry } from "./RootCausesBuilder";
```

To:
```typescript
import type { RootCauseEntry } from "@/hooks/use-investigation";
```

**File: `src/components/investigation/RCAPanel.tsx`**

Change line 13 from:
```typescript
import { RootCausesBuilder, type RootCauseEntry } from "./RootCausesBuilder";
```

To:
```typescript
import { RootCausesBuilder } from "./RootCausesBuilder";
import type { RootCauseEntry } from "@/hooks/use-investigation";
```

### Fix 4: Update WitnessStatement Interface

**File: `src/hooks/use-witness-statements.ts`**

Add `assignment_status` to the interface:

```typescript
export interface WitnessStatement {
  id: string;
  incident_id: string | null;
  tenant_id: string;
  name: string;
  contact: string | null;
  relationship: string | null;
  statement: string;
  statement_method: StatementType;
  audio_url: string | null;
  ai_transcription_text: string | null;
  original_transcription: string | null;
  transcription_edited: boolean;
  transcription_approved: boolean;
  ai_analysis: Record<string, unknown> | null;
  assigned_witness_id: string | null;
  assignment_status: string | null;  // ← ADD THIS
  status: WitnessStatus | null;
  created_by: string | null;
  created_at: string | null;
  deleted_at: string | null;
  return_reason: string | null;
  return_count: number;
  returned_by: string | null;
  returned_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}
```

Also update the query select and mapping to include `assignment_status`.

### Fix 5: Fix Profile ID References

**File: `src/hooks/use-contractors.ts`**

The issue is that `profile` from `useAuth()` returns a type that doesn't expose `id`. Update `getProfileId` to handle this:

```typescript
const getProfileId = (profile: { id?: string } | null | undefined): string | undefined => profile?.id;
```

**File: `src/hooks/use-environmental-assignment.ts`**

Add explicit type handling for profile.id access.

---

## Files to Modify

| File | Change Type |
|------|-------------|
| Database Migration | Create `incident_rca` table |
| Database Migration | Create `incident_evidence` table |
| Database Migration | Add `assigned_environmental_expert_id` to incidents |
| `src/components/investigation/index.ts` | Fix RootCauseEntry export |
| `src/components/investigation/AISummaryPanel.tsx` | Fix import path |
| `src/components/investigation/RCAPanel.tsx` | Fix import path |
| `src/hooks/use-witness-statements.ts` | Add assignment_status to interface |
| `src/hooks/use-contractors.ts` | Fix profile.id type |
| `src/hooks/use-environmental-assignment.ts` | Fix profile.id type |
| `src/hooks/use-evidence-items.ts` | Will work after table created |
| `src/components/investigation/WitnessDirectEntry.tsx` | Will work after interface updated |
| `src/components/investigation/WitnessTaskAssignment.tsx` | Will work after interface updated |

---

## Execution Order

1. **Database migrations first** - Create tables and columns
2. **Wait for types to regenerate** - Supabase types auto-update
3. **Fix TypeScript imports and interfaces** - Update code files

---

## Expected Outcome

After these fixes:
- Build errors will be resolved
- `/incidents/report` page will load
- RCA panel will function correctly
- Evidence upload will work
- Witness statements will include assignment tracking

