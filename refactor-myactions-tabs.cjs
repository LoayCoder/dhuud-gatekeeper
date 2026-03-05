const fs = require('fs');
const path = require('path');

const srcFile = 'src/pages/incidents/MyActions/MyActionsLayout.tsx';
const tabsDir = 'src/pages/incidents/MyActions/tabs';

let content = fs.readFileSync(srcFile, 'utf8');
const tabIds = ['actions', 'investigations', 'inspections', 'witness', 'reported', 'approvals'];

const layoutMatch = content.match(/export function MyActionsLayout\(\{ viewProps \}: \{ viewProps: any \}\) \{[\s\S]*?const \{([\s\S]*?)\} = viewProps;[\s\S]*?return \(/);

const varsStr = "t, direction, searchQuery, setSearchQuery, priorityFilter, setPriorityFilter, activeTab, setActiveTab, activeFilter, setActiveFilter, kpiItems, isLoading, displayedActiveActions, displayedClosedActions, myInvestigations, myInspections, witnessStatements, myReportedIncidents, pendingApprovals, pendingSeverity, pendingPotentialSeverity, pendingIncidentApprovals, pendingClosures, pendingExtensions, pendingWorkers, pendingGatePasses, pendingCompanies, totalPendingApprovals, canAccessApprovals, canApproveSeverity, canVerifyActions, canApproveWorkers, canApproveGatePasses, isHSSEManager, canApproveClosures, selectedWitnessTask, setSelectedWitnessTask, handleWitnessStatementSubmit, selectedActionForVerification, setSelectedActionForVerification, actionDialogAction, setActionDialogAction, actionDialogMode, setActionDialogMode, actionDialogOpen, setActionDialogOpen, handleActionDialogConfirm, extensionRequestAction, setExtensionRequestAction, rejectingGatePass, setRejectingGatePass, rejectingCompany, setRejectingCompany, companyRejectionReason, setCompanyRejectionReason, rejectCompany, deletingCompany, setDeletingCompany, hardDeleteCompany, handleStartWork, handleMarkCompleted, handleFilterClick, allActions, approveCompany, updateStatus, uploadEvidence, submittingActionIds, getDaysInfo, updateInspectionStatus, approveGatePass";

function extractNamedTab(id, tabName) {
  const startTagStr = '<TabsContent value="' + id + '"';
  const startIdx = content.indexOf(startTagStr);
  if (startIdx === -1) return null;

  let depth = 0;
  let blockEnd = -1;
  const searchStr = content.substring(startIdx);

  for (let i = 0; i < searchStr.length; i++) {
    if (searchStr.substr(i, 12) === '<TabsContent') depth++;
    if (searchStr.substr(i, 13) === '</TabsContent') {
      depth--;
      if (depth === 0) {
        blockEnd = startIdx + i + 14;
        break;
      }
    }
  }

  if (blockEnd !== -1) {
    const blockBody = content.substring(startIdx, blockEnd);

    let fileContent = "import React from 'react';\n" +
      "import { TabsContent } from '@/components/ui/tabs';\n" +
      "import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';\n" +
      "import { Badge } from '@/components/ui/badge';\n" +
      "import { Button } from '@/components/ui/button';\n" +
      "import { Input } from '@/components/ui/input';\n" +
      "import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';\n" +
      "import { Skeleton } from '@/components/ui/skeleton';\n" +
      "import { getPriorityBadgeVariant, getStatusIcon } from '../helpers';\n" +
      "import { ActionWorkflowTimeline } from '@/components/actions';\n" +
      "import { InvestigationCard, ScheduledInspectionCard, WorkflowEmptyState } from '@/components/my-actions/WorkflowTaskCard';\n" +
      "import { WitnessDirectEntry } from '@/components/investigation/WitnessDirectEntry';\n" +
      "import { CheckCircle2, Clock, AlertCircle, ArrowRight, MessageSquare, Loader2, ShieldCheck, AlertTriangle, FileCheck, PlayCircle, RotateCcw, CalendarPlus, HardHat, Truck, ClipboardList, X, Search as SearchIcon, ChevronDown, FileText, Eye, Calendar, Shield, Users, Building2, Trash2, Check } from 'lucide-react';\n" +
      "import { SeverityApprovalCard } from '@/components/investigation/SeverityApprovalCard';\n" +
      "import { PotentialSeverityApprovalCard } from '@/components/investigation/PotentialSeverityApprovalCard';\n" +
      "import { formatDistanceToNow } from 'date-fns';\n" +
      "import { cn } from '@/lib/utils';\n" +
      "import { Link } from 'react-router-dom';\n\n" +
      "export function " + tabName + "({ viewProps }: { viewProps: any }) {\n" +
      "  const { " + varsStr + " } = viewProps;\n" +
      "  return (\n" + blockBody + "\n  );\n}\n";

    fs.writeFileSync(path.join(tabsDir, tabName + '.tsx'), fileContent);

    content = content.replace(blockBody, '<' + tabName + ' viewProps={viewProps} />');
    content = "import { " + tabName + " } from './tabs/" + tabName + "';\n" + content;
    return true;
  }
  return false;
}

const tabMapping = {
  'actions': 'ActionsTab',
  'investigations': 'InvestigationsTab',
  'inspections': 'InspectionsTab',
  'witness': 'WitnessTab',
  'reported': 'ReportedTab',
  'approvals': 'ApprovalsTab'
};

tabIds.forEach(id => {
  if (extractNamedTab(id, tabMapping[id])) {
    console.log('Extracted ' + tabMapping[id]);
  } else {
    console.log('Failed to extract ' + tabMapping[id]);
  }
});

fs.writeFileSync(srcFile, content);
