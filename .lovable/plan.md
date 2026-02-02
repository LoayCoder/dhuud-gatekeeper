
# Remove Manual Approver Selection - Auto-Route Internal Gate Passes with Complete Workflow

## Problem Analysis

Currently, internal gate pass requests show a dropdown asking users to "Select who will approve this request" - but this is incorrect based on the documented workflow. The approver should be **automatically determined** based on the requester's organizational hierarchy.

---

## Complete Gate Pass Workflow Stages

### INTERNAL Workflow (Employee Requests)

| Stage | Status | Action Type | Approver | Description |
|:------|:-------|:------------|:---------|:------------|
| 1 | `pending_dept_approval` | **APPROVAL** | Department Rep OR Manager | Auto-routed to user's dept rep. Dept managers can also approve. |
| 2 | `pending_club_mgmt_ack` | **ACKNOWLEDGMENT** | Golf Club Management Rep | Mandatory site acknowledgment before security |
| 3 | `pending_security_approval` | **APPROVAL** | Security Supervisor | Final approval - generates QR code |
| 4 | `approved` | **READY** | - | Pass is active, QR can be scanned |
| 5 | `used` | **GATE SCANNING** | Security Guard | Entry recorded at gate |
| 6 | `completed` | **GATE SCANNING** | Security Guard | Exit recorded (for in_out passes) |

### EXTERNAL Workflow (Contractor Requests)

| Stage | Status | Action Type | Approver | Description |
|:------|:-------|:------------|:---------|:------------|
| 1 | `pending_contractor_approval` | **APPROVAL** | Contractor Consultant | Initial contractor validation |
| 2 | `pending_club_mgmt_ack` | **ACKNOWLEDGMENT** | Golf Club Management Rep | Mandatory site acknowledgment |
| 3 | `pending_security_approval` | **APPROVAL** | Security Supervisor | Final approval - generates QR code |
| 4 | `approved` | **READY** | - | Pass is active, QR can be scanned |
| 5 | `used` | **GATE SCANNING** | Security Guard | Entry recorded at gate |
| 6 | `completed` | **GATE SCANNING** | Security Guard | Exit recorded (for in_out passes) |

---

## Auto-Routing Logic (Internal Requests)

### Decision Tree

```text
+---------------------------------------------------------+
|             Is User a Dept Rep/Manager?                 |
+---------------------------------------------------------+
                          |
            +-------------+-------------+
            v                           v
         [YES]                        [NO]
            |                           |
            v                           v
+------------------------+   +----------------------------+
| Lookup manager_team    |   | Find dept_rep for user's   |
| -> return manager_id   |   | assigned_department_id     |
+------------------------+   +----------------------------+
            |                           |
            v                           v
+------------------------+   +----------------------------+
| Manager found?         |   | Dept Rep found?            |
| YES -> use as approver |   | YES -> use as approver     |
| NO -> show dropdown    |   | NO -> show dropdown        |
+------------------------+   +----------------------------+
```

---

## Implementation Steps

### Step 1: Create Auto-Resolve Hook

Create `src/hooks/contractor-management/use-auto-resolve-approver.ts`:
- Check if current user has `department_representative` or `department_manager` role
- If YES: Query `manager_team` table for user's manager
- If NO: Query for department representative in user's `assigned_department_id`
- Return `{ approver, isLoading, isAutoResolved, fallbackReason }`

### Step 2: Create Backend RPC

Create `get_auto_approver_for_gate_pass` RPC function:
- Accept `p_user_id UUID`
- Returns JSONB with `{ approver_id, approver_name, approver_role, auto_resolved: boolean, reason: text }`
- More reliable than client-side logic

### Step 3: Update GatePassCreateWizard

Modify `src/components/contractors/gate-pass-create/GatePassCreateWizard.tsx`:
- Call auto-resolve hook on mount
- If `isAutoResolved = true`: Hide dropdown, show approver info as read-only
- If `isAutoResolved = false`: Show dropdown with fallback reason

---

## UI Changes

### Before (Current)

```text
+------------------------------------------+
| Approver                                 |
| Select who will approve this request     |
| +--------------------------------------+ |
| | Select an approver                 v | |
| +--------------------------------------+ |
+------------------------------------------+
```

### After (Auto-Resolved)

```text
+------------------------------------------+
| Approver (Auto-assigned)                 |
| Your request will be sent to:            |
| +--------------------------------------+ |
| |  Mohammed Al Khammees                | |
| |  Department Representative           | |
| +--------------------------------------+ |
+------------------------------------------+
```

### After (Fallback - No Auto-resolver)

```text
+------------------------------------------+
| ! No department representative found     |
|   Please select an approver:             |
| +--------------------------------------+ |
| | Select an approver                 v | |
| +--------------------------------------+ |
+------------------------------------------+
```

---

## Files to Create/Modify

| File | Action | Purpose |
|:-----|:-------|:--------|
| `src/hooks/contractor-management/use-auto-resolve-approver.ts` | CREATE | Auto-resolve approver hook |
| `src/components/contractors/gate-pass-create/GatePassCreateWizard.tsx` | MODIFY | Hide dropdown when auto-resolved |
| `supabase/migrations/xxx_add_auto_approver_rpc.sql` | CREATE | Backend RPC function |

---

## Edge Cases

| Scenario | Resolution |
|:---------|:-----------|
| No Department Representative assigned | Show dropdown with Golf Club Mgmt approvers |
| User IS the Department Representative | Route to their manager from `manager_team` |
| No manager in `manager_team` | Show dropdown fallback |
| User has no assigned department | Show dropdown fallback |

---

## Technical Details

### Database Query for Auto-Resolution

```sql
-- For normal employee: find dept rep in same department
SELECT p.id, p.full_name, 'department_representative' as role
FROM profiles p
JOIN user_role_assignments ura ON ura.user_id = p.id
JOIN roles r ON r.id = ura.role_id
WHERE p.assigned_department_id = (SELECT assigned_department_id FROM profiles WHERE id = $user_id)
  AND r.code IN ('department_representative', 'department_manager')
  AND p.is_active = true
  AND p.id != $user_id
LIMIT 1;

-- For dept rep/manager: find their manager
SELECT mt.manager_id, p.full_name, 'manager' as role
FROM manager_team mt
JOIN profiles p ON p.id = mt.manager_id
WHERE mt.member_id = $user_id
  AND p.is_active = true
LIMIT 1;
```

### Hook Interface

```typescript
interface AutoResolvedApprover {
  id: string;
  full_name: string;
  job_title: string | null;
  role: 'department_representative' | 'department_manager' | 'manager';
}

interface UseAutoResolveApproverResult {
  approver: AutoResolvedApprover | null;
  isLoading: boolean;
  isAutoResolved: boolean;
  fallbackReason: string | null;
}
```

---

## Expected Behavior After Implementation

1. **LUAY** (Safety department employee) creates gate pass -> Auto-routes to **Safety Dept Rep**
2. If no Safety Dept Rep exists -> Shows dropdown to select from available approvers
3. **Mohammed Al Khammees** (Corporate Affairs dept rep) creates gate pass -> Auto-routes to **his manager**
4. Both Department Rep AND Manager can approve at stage 1
5. Stage 2 (Club Mgmt Ack) and Stage 3 (Security) remain unchanged
