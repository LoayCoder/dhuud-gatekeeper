

# E2E Audit — Observations Module (Follow-up)

## Summary

After verifying all previous fixes and re-auditing the full lifecycle, I found **3 remaining bugs** — all in the witness statements subsystem. The core observation workflow (creation, submission, AI processing, assignment, review, approval, status transitions, closure, escalation) is now clean.

---

## Finding 1 — CRITICAL: Witness mutations write to non-existent `status` column

**Impact**: Creating, updating, approving, and returning witness statements silently fails or errors because the mutations write to `status` instead of the actual column `assignment_status`.

**Database reality**: Column is `assignment_status` (confirmed via schema query). No `status` column exists.

**Files affected**:

### `src/hooks/use-witness-statements/use-statement-mutations.ts`
- **Line 49**: Insert uses `status: input.status || 'pending'` → should be `assignment_status`
- **Line 89**: Update uses `updateData.status = updates.status` → should be `updateData.assignment_status`
- **Line 133**: Review approve uses `status: "approved"` → should be `assignment_status`
- **Line 156**: Review return uses `status: "returned"` → should be `assignment_status`

---

## Finding 2 — MEDIUM: Witness insert uses non-existent `statement_method` column

**Impact**: Creating witness statements writes to `statement_method` which doesn't exist. The actual column is `statement_type`.

**File**: `src/hooks/use-witness-statements/use-statement-mutations.ts`
- **Line 45**: `statement_method: input.statement_method` → should be `statement_type: input.statement_method`

---

## Finding 3 — LOW: Query maps `ai_transcription_text: null` (dead field in interface)

**File**: `src/hooks/use-witness-statements/use-statement-queries.ts`
- **Line 31**: Maps `ai_transcription_text: null` — this field was removed from the DB but still exists in `types.ts` interface (line 8). Harmless but should be cleaned up.

**File**: `src/hooks/use-witness-statements/types.ts`
- **Line 8**: `ai_transcription_text: string | null;` — remove from interface.

---

## Implementation Plan

### Step 1: Fix all `status` → `assignment_status` in mutations (Critical)
In `use-statement-mutations.ts`, replace every occurrence of the `status` column name with `assignment_status` in insert/update operations (lines 49, 89, 133, 156).

### Step 2: Fix `statement_method` → `statement_type` in insert (Medium)
In `use-statement-mutations.ts` line 45, change `statement_method` to `statement_type`.

### Step 3: Remove dead `ai_transcription_text` from interface and query mapping (Low)
- Remove from `types.ts` line 8
- Remove from `use-statement-queries.ts` line 31

## Files to Edit

1. `src/hooks/use-witness-statements/use-statement-mutations.ts` — fix column names
2. `src/hooks/use-witness-statements/use-statement-queries.ts` — remove dead mapping
3. `src/hooks/use-witness-statements/types.ts` — remove dead field

## Observation Lifecycle Verification

All other lifecycle stages are confirmed clean:
- Creation (QuickObservationCard) — correct fields, proper offline/online paths
- AI Processing (analyze-observation edge function) — integrated correctly
- Assignment & Routing (current-owner.ts) — all statuses mapped, contractor path resolved
- Timeline (UnifiedTimelineTracker) — all statuses mapped to correct steps
- Workflow Cards (InvestigationWorkflowCards) — all statuses have action cards
- Status Labels (workflow-status-resolver.ts) — complete bilingual coverage
- Escalation to Incident — `upgraded_to_incident` status handled with backlink
- Closure — `pending_hsse_manager_closure` and `pending_hsse_validation` handled

