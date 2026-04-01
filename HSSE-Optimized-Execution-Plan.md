# HSSE Events Module - Optimized Execution Plan (Best Practices)

**Project:** Dhuud Gatekeeper  
**Module:** HSSE Events (Incident, Observation, Investigation)  
**Date:** April 1, 2026

---

## 🎯 Recommended Architecture & Best Practices

Based on codebase analysis, here are the **optimized recommendations**:

---

## 1. 🏗️ Technical Stack & Architecture

### Current Stack (Verified)
| Component | Technology | Status |
|-----------|------------|--------|
| **Frontend** | React + TypeScript + TanStack Query | ✅ Modern |
| **State Management** | React Query + Zustand | ✅ Optimistic updates |
| **Backend** | Supabase (PostgreSQL) | ✅ Solid |
| **Authentication** | Supabase Auth + RLS | ✅ Secure |
| **Real-time** | Supabase Realtime | ✅ Implemented |
| **Offline** | IndexedDB + Service Worker | ✅ PWA Ready |

### Recommendations
```typescript
// ✅ Best Practice: Use React Query for data fetching
const { data } = useIncidents();

// ✅ Best Practice: Optimistic updates for better UX
const mutation = useMutation({
  mutationFn: createIncident,
  onMutate: async (newIncident) => {
    await queryClient.cancelQueries(['incidents']);
    const previousIncidents = queryClient.getQueryData(['incidents']);
    queryClient.setQueryData(['incidents'], old => [...old, newIncident]);
    return { previousIncidents };
  }
});
```

---

## 2. 📊 Database Schema (Supabase)

### Verified Tables
```sql
-- Core HSSE Tables
incidents          -- Main incident/observation store
investigations     -- Investigation records
incident_rca        -- Root Cause Analysis (V1.1)
investigation_teams
investigation_evidence
incident_injuries
incident_property_damages
corrective_actions
witness_statements
hsse_notifications -- Notification system
```

### Best Practices Applied
- ✅ Tenant isolation via `tenant_id` column
- ✅ Soft deletes (`deleted_at`)
- ✅ UUID primary keys
- ✅ timestamps (`created_at`, `updated_at`)
- ✅ RLS policies enforced

### Recommended Optimizations
```sql
-- ✅ Add indexes for common queries
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_tenant ON incidents(tenant_id, created_at);
CREATE INDEX idx_investigations_incident ON investigations(incident_id);

-- ✅ Use partitioning for large tables (if >1M rows)
-- incidents partition by created_at monthly
```

---

## 3. 🔄 Workflow State Machine

### Current Implementation
| State | Handler | Status |
|-------|---------|--------|
| Draft | UI (User) | ✅ |
| Submitted | Database Trigger | ✅ |
| pending_dept_rep | Auto-route | ✅ |
| pending_expert | UI (Dept Rep) | ✅ |
| pending_assignment | UI (HSSE Manager) | ✅ |
| under_investigation | UI (Investigator) | ✅ |
| pending_action | Auto/UI | ✅ |
| closed | Approval chain | ✅ |

### Recommended Improvements
```typescript
// ✅ Use State Machine pattern for complex flows
const INCIDENT_WORKFLOW = {
  states: ['draft', 'submitted', 'pending_dept_rep', 'pending_expert', 
           'under_investigation', 'pending_action', 'closed'],
  transitions: {
    'submitted': ['pending_dept_rep'],
    'pending_dept_rep': ['pending_expert', 'rejected'],
    // ...
  }
} as const;

// ✅ Enforce transitions in code
function transitionState(current: State, action: Action): State {
  const allowed = INCIDENT_WORKFLOW.transitions[current];
  if (!allowed.includes(action)) {
    throw new Error(`Invalid transition: ${action} from ${current}`);
  }
  return allowed;
}
```

---

## 4. 🔔 Notification System

### Current Implementation
- ✅ Matrix-based notifications (`dispatch-incident-notification`)
- ✅ Supabase functions for triggers
- ✅ Push notifications support

### Best Practice Implementation
```typescript
// ✅ Use event-driven notifications
const NOTIFICATION_EVENTS = {
  INCIDENT_CREATED: 'incident_created',
  INCIDENT_ASSIGNED: 'incident_assigned',
  INVESTIGATION_STARTED: 'investigation_started',
  CORRECTIVE_ACTION_DUE: 'corrective_action_due',
  SLA_BREACH: 'sla_breach'
} as const;

// ✅ Central notification service
class NotificationService {
  async dispatch(event: keyof typeof NOTIFICATION_EVENTS, data: IncidentEventData) {
    // 1. Log to database
    // 2. Send real-time notification
    // 3. Queue push notification
    // 4. Send email if critical
  }
}
```

---

## 5. 📱 Offline Support

### Current Implementation
```typescript
// ✅ Offline hooks available
useOfflineReportQueue()    // Queue pending reports
useOfflineReporting()      // Offline reporting
useOfflineAssets()         // Asset data for offline
useOfflineAreaInspection() // Inspections offline
```

### Best Practices
```typescript
// ✅ Implement with proper sync strategy
interface SyncStrategy {
  onQueue: (data: OfflineAction) => Promise<void>;
  onSync: async () => {
    const pending = await getPendingActions();
    for (const action of pending) {
      try {
        await syncAction(action);
        await markSynced(action.id);
      } catch (error) {
        await incrementRetry(action.id);
        if (action.retryCount > MAX_RETRIES) {
          await notifyAdmin(action);
        }
      }
    }
  };
}
```

---

## 6. 🔒 Security & Permissions

### Current RLS Policies
- ✅ Tenant isolation
- ✅ Role-based access
- ✅ Row-level security

### Recommended Enhancements
```sql
-- ✅ Add RLS for sensitive data
CREATE POLICY "investigation_data_access"
ON investigations FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM investigation_team_members
    WHERE investigation_id = id
  )
  OR
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'hsse_admin'
  )
);
```

---

## 📋 Optimized Execution Timeline

### Phase 1: Discovery (Completed ✅)
- [x] Repository structure analyzed
- [x] Key hooks identified (18+ incident-related hooks)
- [x] Database schema mapped (30+ tables)
- [x] Workflow documented

### Phase 2: Audit - HIGH PRIORITY (3 Days)

| Check | Tool/Method | Priority |
|-------|-------------|----------|
| Code review: use-incidents.ts | Manual + ESLint | 🔴 HIGH |
| Code review: use-investigation.ts | Manual + ESLint | 🔴 HIGH |
| Database RLS verification | PostgreSQL analysis | 🔴 HIGH |
| API endpoint testing | Postman/curl | 🔴 HIGH |
| UI flow testing | Playwright | 🔴 HIGH |

### Phase 3: Testing - HIGH PRIORITY (3 Days)

| Test | Coverage | Priority |
|------|----------|----------|
| E2E: Incident lifecycle | All roles | 🔴 HIGH |
| E2E: Investigation flow | All roles | 🔴 HIGH |
| Offline: Create & sync | Edge cases | 🟡 MEDIUM |
| Performance: Load test | 100 concurrent | 🟡 MEDIUM |
| Security: RLS bypass | Manual | 🔴 HIGH |

### Phase 4: Fixes - Prioritized (7 Days)

| Priority | Issue | Fix Approach | Owner |
|----------|-------|--------------|-------|
| 🔴 HIGH | Dept Rep review route missing | Add route guard | Frontend |
| 🔴 HIGH | Notification trigger failures | Fix dispatch function | Backend |
| 🔴 HIGH | RLS gaps in investigation | Add policies | Backend |
| 🟡 MED | Offline sync race conditions | Add optimistic locks | Frontend |
| 🟡 MED | Form validation gaps | Add Zod schemas | Frontend |
| 🟢 LOW | UI polish | Tailwind fixes | Frontend |

### Phase 5: Validation (2 Days)

- [ ] All HIGH tests pass
- [ ] Security audit complete
- [ ] Performance targets met
- [ ] Stakeholder sign-off

---

## 🛠️ Recommended Tools & Scripts

### Code Quality
```bash
# Run ESLint with strict rules
npm run lint -- --max-warnings=0

# TypeScript strict mode check
npx tsc --noEmit --strict

# Run tests with coverage
npm run test -- --coverage
```

### Database
```sql
-- Check for orphan records
SELECT * FROM incidents i
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = i.reporter_id);

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('incidents', 'investigations');
```

### API Testing
```bash
# Test incident creation
curl -X POST https://[project].supabase.co/rest/v1/incidents \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## 📦 Deliverables Checklist

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Audit Report | 📝 In Progress | Based on existing docs |
| Code Fixes | ⏳ Pending | After audit |
| Test Results | ⏳ Pending | Playwright tests |
| Documentation | 📝 Available | 15+ existing MD files |
| Runbook | ⏳ To Create | After fixes |

---

## 🚀 Immediate Next Steps

1. **Run ESLint** on incident-related hooks
2. **Verify RLS policies** in Supabase
3. **Test API endpoints** with actual user roles
4. **Document findings** in audit report
5. **Create fix tickets** for HIGH priority issues

---

*Optimized Plan Generated: April 1, 2026*  
*Based on: Codebase analysis + Industry best practices*