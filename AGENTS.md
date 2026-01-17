# AI Agent Context & Guidelines

> **IMPORTANT**: Read this file completely before making any changes to the codebase.

## 1. Project Overview
* **Name:** Dhuud Gatekeeper
* **Purpose:** HSSE (Health, Safety, Security, Environment) management system with offline capabilities.
* **Core Features:** Gate passes, incident reporting, asset management, inspections, and offline synchronization.
* **Target Audience:** Arabic (Primary) & English users.
* **Criticality:** High. Data leakage or loss is unacceptable.

## 2. Tech Stack
* **Frontend:** React (Vite), TypeScript 5.x
* **Styling:** Tailwind CSS, Shadcn UI (components/ui)
* **Backend:** Supabase (PostgreSQL, Edge Functions)
* **State/Cache:** React Query (TanStack), Context API (for auth/session)
* **Offline:** Service Workers (PWA), Local Storage/IndexedDB for offline queue.
* **Testing:** Vitest

## 3. Architecture & Patterns
* **Supabase Integration:** All database interactions must go through `src/integrations/supabase/client.ts`. Use the generated types in `database.types.ts`.
* **Offline Strategy:** Critical features (Inspections, Incidents) must work offline. Mutations are queued in `src/lib/offline-mutation-queue.ts`. **Do not write direct fetch calls; use the offline hooks.**
* **Component Structure:**
    * `src/components/ui`: Reusable primitives (do not modify logic here).
    * `src/components/[feature]`: Feature-specific logic (e.g., `src/components/assets`).
* **Route Protection:** Use `ProtectedRoute.tsx` and Role-based gates (`RoleBasedActionGrid.tsx`).

## 4. Constraints (DO NOT DO)
* Do not use standard `fetch` for API calls; use the Supabase client.
* Do not modify `src/components/ui/*` unless styling is broken globally.
* Do not remove `console.log` from `src/lib/logger.ts` (preserve audit trails).

---

## 5. Database Schema Patterns

### 5.1 Core Entity Types
| Type File | Key Types |
|-----------|-----------|
| `src/types/incident.types.ts` | `IncidentSeverity`, `IncidentStatus`, `Investigation`, `CorrectiveAction` |
| `src/types/contractor.types.ts` | `ContractorCompany`, `ContractorWorker`, `GatePass`, `ComplianceStatus` |
| `src/types/security.types.ts` | `SecurityShift`, `PatrolSession`, `CheckpointVisit`, `Visitor` |
| `src/types/audit.types.ts` | `AuditLogEntry`, `AuditActionType`, `AuditEntityType` |
| `src/types/auth.types.ts` | `UserRole`, `PermissionAction`, `ModuleName` |

### 5.2 Multi-Tenancy Rules
```
❌ NEVER: SELECT * FROM table
✅ ALWAYS: SELECT specific_columns FROM table WHERE tenant_id = get_auth_tenant_id_bypass()
```

* Every table (except `users`) **MUST** have a `tenant_id` column.
* All queries **MUST** filter by `tenant_id`.
* RLS policies use: `tenant_id = auth.jwt() ->> 'app_metadata' ->> 'tenant_id'`

### 5.3 Soft Deletes
```
❌ NEVER: DELETE FROM table WHERE id = 'xxx'
✅ ALWAYS: UPDATE table SET deleted_at = now() WHERE id = 'xxx'
```

* All queries must filter: `WHERE deleted_at IS NULL`
* This preserves audit trails and enables data recovery.

### 5.4 Data Minimization (PII Protection)
* Never use `SELECT *` on tables containing PII.
* Explicitly select only required columns.
* Sensitive columns: `email`, `phone`, `national_id`, `full_name`, `address`.

---

## 6. Role-Based Access Control (RBAC)

### 6.1 Role Hierarchy
```
super_admin
    └── tenant_admin
            └── hsse_manager
                    └── hsse_officer
                            └── department_head
                                    └── employee
                                            └── contractor_worker / visitor
```

### 6.2 User Roles (from `src/types/auth.types.ts`)
| Role | Description |
|------|-------------|
| `super_admin` | System-wide access |
| `tenant_admin` | Full tenant access |
| `hsse_manager` | HSSE module management |
| `hsse_officer` | HSSE operations |
| `security_manager` | Security module management |
| `security_officer` | Gate/patrol operations |
| `contractor_manager` | Contractor oversight |
| `department_head` | Department-level approvals |
| `employee` | Basic user access |
| `visitor` | Limited temporary access |
| `contractor_worker` | Contractor field access |

### 6.3 Key RPC Functions
```sql
-- Check if user has a specific app role
has_role(_user_id uuid, _role app_role) → boolean

-- Check role by code string
has_role_by_code(_user_id uuid, 'hsse_manager') → boolean

-- Branch-aware RBAC (critical for multi-branch tenants)
has_contractor_consultant_access_for_branch(_branch_id uuid) → boolean

-- Workflow authorization
can_approve_investigation(_incident_id uuid) → boolean

-- HSSE access check
has_hsse_incident_access(_incident_id uuid) → boolean
```

### 6.4 Permission Patterns
```typescript
// ❌ NEVER: Check role by job title or department
if (user.job_title === 'Manager') { ... }

// ✅ ALWAYS: Use RPC functions for role verification
const { data: hasAccess } = await supabase.rpc('has_role', {
  _user_id: userId,
  _role: 'hsse_manager'
});
```

### 6.5 Security Rules
* **NEVER** store roles on the `profiles` table directly.
* Roles **MUST** be in a separate `user_roles` table.
* Use `SECURITY DEFINER` functions to check roles (prevents RLS recursion).
* Branch-aware permissions use `_for_branch` suffix in RPC names.

---

## 7. Workflow Documentation

### 7.1 Observation Workflow
```
submitted
    ↓
pending_dept_rep_approval
    ↓
[Severity Routing]
    │
    ├── L1-L2 (Low): → closed (Close on Spot)
    │
    ├── L3-L4 (Medium): 
    │       ↓
    │   observation_actions_pending
    │       ↓
    │   pending_hsse_validation
    │       ↓
    │   pending_final_closure
    │       ↓
    │   closed
    │
    └── L5 (High):
            ↓
        pending_hsse_manager_closure
            ↓
        closed
```

### 7.2 Incident Workflow
```
submitted
    ↓
pending_dept_rep_incident_review
    ↓
pending_expert_screening
    ↓
pending_manager_approval
    ↓
[Investigation Phase]
    ↓
pending_closure
    ↓
closed
```

### 7.3 Contractor Observation Workflow
```
submitted
    ↓
expert_screening (or pending_consultant_screening)
    ↓
[Contractor Consultant Review]
    │
    ├── L1-L2: site_client_approval → closed
    │
    └── L3+: pending_hsse_validation → investigation
```

### 7.4 Workflow Definition File
**Location:** `src/lib/workflow-definitions.ts`

Key types:
```typescript
interface WorkflowStep {
  dbStatus: string;           // Database status value
  label: string;              // UI display label
  notificationAction?: string; // Trigger for notifications
  routeTo?: string;           // Next responsible role
}

interface WorkflowDefinition {
  type: 'observation' | 'incident' | 'contractor_observation';
  steps: WorkflowStep[];
}
```

---

## 8. RTL & Localization Guidelines

### 8.1 CSS Logical Properties (MANDATORY)
```
❌ NEVER use these:
  margin-left, margin-right
  padding-left, padding-right
  left:, right:
  text-left, text-right

✅ ALWAYS use these:
  ms- (margin-inline-start), me- (margin-inline-end)
  ps- (padding-inline-start), pe- (padding-inline-end)
  start:, end:
  text-start, text-end
```

### 8.2 Tailwind RTL Class Mapping
| ❌ Old (Never Use) | ✅ New (Always Use) |
|-------------------|---------------------|
| `ml-4` | `ms-4` |
| `mr-4` | `me-4` |
| `pl-4` | `ps-4` |
| `pr-4` | `pe-4` |
| `text-left` | `text-start` |
| `text-right` | `text-end` |
| `left-0` | `start-0` |
| `right-0` | `end-0` |

### 8.3 Icon Direction Handling
```tsx
// Directional icons must flip for RTL
<ChevronRight className="h-4 w-4 rtl:rotate-180" />
<ArrowLeft className="h-4 w-4 rtl:rotate-180" />
<ArrowRight className="h-4 w-4 rtl:rotate-180" />
```

### 8.4 Dynamic Direction Detection
```tsx
import { useTranslation } from 'react-i18next';

const { i18n } = useTranslation();
const direction = i18n.dir(); // 'rtl' or 'ltr'
const isRTL = direction === 'rtl';
```

### 8.5 Bilingual Content Pattern
```tsx
// Display Arabic name when in RTL mode, fallback to English
const displayName = direction === 'rtl' && item.name_ar 
  ? item.name_ar 
  : item.name;
```

### 8.6 Portal/Dialog Awareness
Portals (Dialogs, Dropdowns, Popovers) escape the main DOM tree. Always pass `dir`:
```tsx
<AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
  {/* content */}
</AlertDialogContent>

<DialogContent dir={direction}>
  {/* content */}
</DialogContent>
```

### 8.7 Font Configuration
* Arabic: `'IBM Plex Sans Arabic'` or `'Cairo'`
* English: System fonts or project-specific
* Set dynamically on `<html>` tag: `<html dir="rtl" lang="ar">`

---

## 9. Offline Capabilities

### 9.1 Queue System
**Location:** `src/lib/offline-mutation-queue.ts`

```typescript
interface QueuedMutation {
  id: string;
  timestamp: number;
  mutationKey: string;
  variables: unknown;
  endpoint?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}
```

### 9.2 Key Methods
```typescript
import { offlineMutationQueue } from '@/lib/offline-mutation-queue';

// Queue a mutation for later sync
await offlineMutationQueue.add('createInspection', inspectionData, {
  endpoint: '/api/inspections',
  method: 'POST',
  body: inspectionData
});

// Get all pending mutations
const pending = offlineMutationQueue.getAll();

// Trigger sync when online
await offlineMutationQueue.triggerSync();

// Subscribe to queue changes
const unsubscribe = offlineMutationQueue.subscribe(() => {
  console.log('Queue updated');
});
```

### 9.3 Offline-Enabled Features
| Feature | Hook Location |
|---------|---------------|
| Area Inspections | `src/hooks/use-offline-area-inspection.ts` |
| Assets | `src/hooks/use-offline-assets.ts` |
| Patrol Sessions | `src/hooks/use-offline-patrol-queue.ts` |

### 9.4 Offline Rules
```
❌ NEVER: Use direct fetch() calls
✅ ALWAYS: Use Supabase client with offline hooks

❌ NEVER: Assume network availability
✅ ALWAYS: Cache critical data for offline read

❌ NEVER: Block UI on network failure
✅ ALWAYS: Queue mutations and show pending state
```

---

## 10. Audit & Compliance

### 10.1 Audit Logger
**Location:** `src/lib/audit-logger.ts`

### 10.2 Required Audit Entry Fields
```typescript
interface AuditLogEntry {
  who_id: string;                           // User performing action (UUID)
  action_type: AuditActionType;             // CREATE, UPDATE, DELETE, etc.
  entity_type: AuditEntityType;             // incident, inspection, asset, etc.
  entity_id: string;                        // UUID of affected entity
  old_value: Record<string, unknown> | null; // Previous state (null for CREATE)
  new_value: Record<string, unknown> | null; // New state (null for DELETE)
  timestamp: string;                        // ISO timestamp
  ip_address: string | null;                // Client IP if available
  tenant_id: string;                        // Multi-tenancy isolation
  description?: string;                     // Human-readable description
  metadata?: Record<string, unknown>;       // Additional context
}
```

### 10.3 Audit Action Types
```typescript
type AuditActionType = 
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'EXPORT'
  | 'APPROVE' | 'REJECT' | 'SUBMIT' | 'CLOSE' | 'REOPEN'
  | 'ASSIGN' | 'TRANSFER' | 'ESCALATE';
```

### 10.4 Audit Entity Types
```typescript
type AuditEntityType = 
  | 'incident' | 'investigation' | 'corrective_action'
  | 'inspection' | 'inspection_session'
  | 'asset' | 'asset_maintenance'
  | 'user' | 'profile'
  | 'visitor' | 'contractor_worker' | 'contractor_company'
  | 'gate_pass' | 'permit'
  | 'security_shift' | 'patrol'
  | 'risk_assessment';
```

### 10.5 Diff Helper for Updates
```typescript
import { createDiffAuditEntry } from '@/types/audit.types';

// Only log changed fields, not entire objects
const { old_value, new_value } = createDiffAuditEntry(originalRecord, updatedRecord);
```

### 10.6 Report Access Levels
| Level | Roles | Access |
|-------|-------|--------|
| `hsse_full` | Admin, HSSE Expert, HSSE Manager | Full investigation report |
| `manager` | Regular managers | Restricted summary only |

---

## 11. Route & Menu Configuration

### 11.1 Route Registry Types
**Location:** `src/config/route-registry-types.ts`

### 11.2 Protection Levels
| Level | Description | Example Routes |
|-------|-------------|----------------|
| `public` | No authentication required | `/login`, `/signup`, `/forgot-password` |
| `protected` | Requires authentication | `/dashboard`, `/profile` |
| `admin` | Admin role only | `/admin/*`, `/settings/system` |
| `hsse` | HSSE role required | `/incidents/*`, `/inspections/*` |
| `security` | Security role required | `/security/*`, `/patrols/*` |
| `menu-based` | Uses `menuCode` for access control | Most feature routes |

### 11.3 Route Definition Structure
```typescript
interface RouteDefinition {
  path: string;                    // URL path
  menuCode: string;                // Menu permission code
  title: { en: string; ar: string }; // Bilingual title
  icon: LucideIcon;                // Lucide icon component
  component: LazyExoticComponent;  // Lazy-loaded component
  protection: RouteProtection;     // Access level
  children?: RouteDefinition[];    // Nested routes
}
```

### 11.4 Menu Code Pattern
```typescript
// Menu codes follow: module_action pattern
const menuCodes = {
  incidents_view: 'View incidents list',
  incidents_create: 'Create new incident',
  incidents_approve: 'Approve incident reports',
  assets_manage: 'Manage assets',
  users_admin: 'User administration',
};
```

---

## 12. HSSE Color Standards

Use standard HSSE colors for safety-related UI:

| Color | Usage | Tailwind Token |
|-------|-------|----------------|
| 🔴 Red | Danger, Prohibition, Critical | `destructive` |
| 🟡 Yellow/Amber | Warning, Caution | `warning` |
| 🔵 Blue | Mandatory Action, Information | `primary` |
| 🟢 Green | Safe Condition, Success | `success` |

---

## 13. Quick Reference

### 13.1 Key Files
| Purpose | File Location |
|---------|---------------|
| Supabase Client | `src/integrations/supabase/client.ts` |
| Database Types | `src/integrations/supabase/types.ts` |
| Offline Queue | `src/lib/offline-mutation-queue.ts` |
| Workflow Definitions | `src/lib/workflow-definitions.ts` |
| Audit Logger | `src/lib/audit-logger.ts` |
| Route Registry | `src/config/route-registry-types.ts` |
| Auth Types | `src/types/auth.types.ts` |
| Incident Types | `src/types/incident.types.ts` |

### 13.2 Common Patterns
```typescript
// 1. Get current user's tenant
const tenantId = await supabase.rpc('get_auth_tenant_id_bypass');

// 2. Check user role
const hasRole = await supabase.rpc('has_role', { 
  _user_id: userId, 
  _role: 'hsse_manager' 
});

// 3. Soft delete
await supabase
  .from('incidents')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', incidentId);

// 4. Query with tenant isolation
const { data } = await supabase
  .from('incidents')
  .select('id, title, status')
  .is('deleted_at', null)
  .eq('tenant_id', tenantId);
```

---

## 14. DO's and DON'Ts Summary

### ✅ DO
- Use Supabase client for all database operations
- Apply `tenant_id` filtering on all queries
- Use soft deletes (`deleted_at`)
- Use CSS logical properties for RTL
- Queue mutations for offline support
- Log all critical actions to audit trail
- Check roles via RPC functions
- Pass `dir` prop to portal components

### ❌ DON'T
- Use direct `fetch()` for API calls
- Use `SELECT *` on PII tables
- Hard-delete any operational data
- Use `ml-`, `mr-`, `pl-`, `pr-` classes
- Store roles on the profiles table
- Check access via job titles
- Block UI on network failures
- Modify `src/components/ui/*` unless necessary
