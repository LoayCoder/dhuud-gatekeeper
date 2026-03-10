

# Implement Real Stat Fetchers for Action Center

## Problem
The Action Center page (`/action-center`) shows all zeros because every stat fetcher in `stat-fetchers.ts` is a stub returning `{}`. The page structure and aggregation logic in `use-action-center-stats.ts` is already correct — only the data fetchers need real database queries.

## What Changes

**Single file: `src/features/incidents/hooks/use-action-center-stats/stat-fetchers.ts`**

Replace all 9 stub functions with real Supabase queries. Each fetcher returns the exact shape expected by `use-action-center-stats.ts`:

### 1. `fetchIncidentStats(tenantId)`
Query `incidents` table (non-deleted):
- `total`: count all
- `openInvestigations`: count where status in `investigation_pending`, `investigation_in_progress`
- `pendingApprovals`: count where status in `pending_dept_rep_approval`, `pending_manager_approval`, `pending_dept_rep_incident_review`

### 2. `fetchCorrectiveActionStats(tenantId, now)`
Query `corrective_actions` table grouped by `source_type` × status/overdue:
- For each source (`incident`, `observation`, `inspection`): count pending (assigned), in_progress, completed (verified/closed), overdue (due_date < now and not completed)

### 3. `fetchGatePassStats(tenantId, now)`
Query `material_gate_passes` table:
- `total`, `pending` (pending_dept_approval, pending_security_approval, pending_club_mgmt_ack), `active` (approved), `completed` (exit confirmed), `pendingApprovals` (same as pending), `todayActive` (approved with today's pass_date or active date range)

### 4. `fetchInspectionStats(tenantId)`
Query `inspection_sessions` table:
- `total`, `scheduled` (status=scheduled if exists), `pendingActions` (in_progress), `auditTotal`/`auditInProgress`/`auditCompleted` (by session_type=audit if exists), `openFindings`

### 5. `fetchContractorStats(tenantId)`
Query `contractor_companies` + `contractor_workers`:
- `total` companies, `pending`/`approved`, `pendingApprovals` (workers with approval_status=pending), `expiringCompliance`: 0 (no expiry column on companies)

### 6. `fetchInductionStats(tenantId)`
Query `worker_inductions`:
- `totalAssigned`: count all, `completed`: acknowledged, `pending`: sent/viewed, `overdue`: expired (expires_at < now and not acknowledged)

### 7. `fetchUserStats(tenantId)`
Query `profiles`:
- `total`: count all, `active`: is_active=true, `pendingInvites`: has_login=false or is_active=false

All queries use the Supabase JS client with `select('id', { count: 'exact', head: true })` pattern for efficient counting. Multiple counts per table use parallel queries via `Promise.all`.

## Files Modified
1. **`src/features/incidents/hooks/use-action-center-stats/stat-fetchers.ts`** — Replace all stubs with real Supabase queries

