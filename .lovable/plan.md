
# Enhance Gate Passes Tab in Access Control Dashboard

## Problem

Currently, the **Gate Passes** tab (`/security/access-control`) only shows the `GatePassApprovalQueue` component (pending approvals). The user wants this tab to have a complete sub-tab structure similar to the Gate Guard Dashboard (`/security/gate-dashboard`), including:

1. **Pending Approvals** - Gate passes waiting for security approval
2. **Approval History** - Gate passes the user has previously approved/rejected

## Current vs Proposed Structure

| Current | Proposed |
|---------|----------|
| Gate Passes Tab → Shows only `GatePassApprovalQueue` | Gate Passes Tab → Sub-tabs: Pending Approvals + Approval History |

## Solution

Update the **Gate Passes** tab content in `AccessControlDashboard.tsx` to include nested sub-tabs:

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Gate Passes Tab                              │
│  ┌───────────────────┐ ┌───────────────────┐                    │
│  │ Pending Approvals │ │ Approval History  │                    │
│  └───────────────────┘ └───────────────────┘                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │   (Content: GatePassApprovalQueue OR ApprovalHistoryTab)    ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## File to Modify

**`src/pages/security/AccessControlDashboard.tsx`**

## Changes

### 1. Add Import for GatePassApprovalHistoryTab

```typescript
import { GatePassApprovalHistoryTab } from '@/components/contractors/GatePassApprovalHistoryTab';
```

### 2. Add State for Gate Pass Sub-Tab

```typescript
const [gatePassSubTab, setGatePassSubTab] = useState('pending');
```

### 3. Update Gate Passes Tab Content

Replace the simple Card with a nested Tabs structure:

```typescript
{/* Gate Passes Tab - Dedicated tab for Security Supervisor */}
<TabsContent value="gatepasses" className="space-y-4 mt-4">
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Package className="h-5 w-5 text-green-600" />
        {t('security.accessControl.gatePassApprovals', 'Gate Pass Approvals')}
      </CardTitle>
      <CardDescription>
        {t('security.accessControl.gatePassDescription', 'Material gate passes pending your security approval')}
      </CardDescription>
    </CardHeader>
    <CardContent className="pt-0">
      {/* Sub-tabs for Pending and History */}
      <Tabs value={gatePassSubTab} onValueChange={setGatePassSubTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            {t('contractors.gatePasses.pendingApprovals', 'Pending Approvals')}
            {pendingGatePassApprovals.length > 0 && (
              <Badge variant="destructive" className="ms-1">
                {pendingGatePassApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            {t('contractors.gatePasses.tabs.approvalHistory', 'Approval History')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <GatePassApprovalQueue passes={pendingGatePassApprovals} />
        </TabsContent>

        <TabsContent value="history">
          <GatePassApprovalHistoryTab />
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
</TabsContent>
```

## Visual Result

After this change, the Gate Passes tab will display:

1. **Header**: "Gate Pass Approvals" with description
2. **Sub-tabs**:
   - **Pending Approvals** (default): Shows gate passes at `pending_security_approval` status with approval/reject buttons
   - **Approval History**: Shows gate passes the user has previously approved or rejected, with search and filter capabilities

## Benefits

- **Complete workflow visibility**: Security guards can see both pending work AND their past actions
- **Consistency**: Matches the structure in Gate Guard Dashboard
- **Auditability**: Easy to review what has been approved/rejected and by whom
- **Mobile-friendly**: Sub-tabs are scrollable and touch-friendly

## Additional Consideration

The existing `GatePassApprovalHistoryTab` component already:
- Fetches the user's approval history via `useGatePassApprovalHistory` hook
- Shows approved/rejected counts with badges
- Has search and filter functionality
- Opens detail dialog on row click

No changes needed to the history component itself - it's already production-ready.
