

# Fix Audit Trail — Resolve UUIDs to Human-Readable Names

## Problem

The Audit Trail panel has two issues:
1. **Actor name hardcoded as "System / User"** — the `actor_id` field from `incident_audit_logs` is never resolved to a profile name
2. **Raw UUIDs displayed in details** — fields like `branch_id` and `assigned_to` are shown as raw UUIDs instead of branch names / user names

## Fix

### 1. Resolve actor names in the query service

**File:** `src/features/investigation/services/investigationQueryService.ts`

After fetching audit logs, collect all unique `actor_id` values and any UUID values from `details` that match known fields (`assigned_to`, `branch_id`, `site_id`). Batch-fetch profiles and branches to build lookup maps, then enrich each log entry with resolved names.

### 2. Update the query to join profiles

Alternatively (simpler approach): add a second query after fetching logs to resolve `actor_id` values from the `profiles` table, and `branch_id` values from `branches` table. Attach `actor_name` and `branch_name` to each log.

### 3. Update AuditLogPanel rendering

**File:** `src/features/investigation/components/AuditLogPanel.tsx`

- **Line 149**: Replace hardcoded `"System / User"` with `log.actor_name || t('investigation.audit.system', 'System')`.
- **Lines 154-158**: For known UUID fields (`branch_id`, `assigned_to`, `site_id`), display resolved names instead of raw UUIDs. For `assigned_to`, show the user's full name. For `branch_id`, show the branch name. Hide or label other fields appropriately.

### 4. Update the IncidentAuditLog type

Add `actor_name?: string` and ensure the details rendering logic has a field-level formatter that substitutes known UUIDs.

## Files to Edit

1. `src/features/investigation/services/investigationQueryService.ts` — enrich logs with resolved names
2. `src/features/investigation/components/AuditLogPanel.tsx` — display resolved names, remove hardcoded "System / User"
3. `src/features/investigation/types.ts` (or wherever `IncidentAuditLog` is defined) — add `actor_name` field

