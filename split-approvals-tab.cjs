const fs = require('fs');
const path = require('path');

const srcFile = 'src/pages/incidents/MyActions/tabs/ApprovalsTab.tsx';
const targetDir = 'src/pages/incidents/MyActions/tabs';

let content = fs.readFileSync(srcFile, 'utf8');

// 1. Extract ContractorApprovalsList
const contractorStart = content.indexOf('{/* Contractor Worker Approvals Section');
const contractorEnd = content.indexOf('{/* Empty State */}');

if (contractorStart > -1 && contractorEnd > -1) {
    let contractorCode = content.substring(contractorStart, contractorEnd);
    const contractorImports = `import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HardHat, ArrowRight, Truck, Check, X, Building2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export function ContractorApprovalsList({ viewProps }: { viewProps: any }) {
  const { t, direction, pendingWorkers, pendingGatePasses, pendingCompanies, canApproveWorkers, canApproveGatePasses, isHSSEManager, gatePassApprovalNotes, setGatePassApprovalNotes, handleApproveGatePass, approveGatePass, setRejectingGatePass, approveCompany, setRejectingCompany, rejectCompany, setDeletingCompany, hardDeleteCompany } = viewProps;
  return (
    <>
      ${contractorCode.trim()}
    </>
  );
}
`;
    fs.writeFileSync(path.join(targetDir, 'ContractorApprovalsList.tsx'), contractorImports);

    content = content.replace(contractorCode, '<ContractorApprovalsList viewProps={viewProps} />\n                ');
}

// 2. Extract IncidentApprovalsList
const incidentStart = content.indexOf('{/* Pending Incident Approvals Section');
const incidentEnd = content.indexOf('<ContractorApprovalsList');

if (incidentStart > -1 && incidentEnd > -1) {
    let incidentCode = content.substring(incidentStart, incidentEnd);
    const incidentImports = `import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, FileCheck, AlertTriangle, ShieldCheck, CheckCircle2, CalendarPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { getPriorityBadgeVariant } from '../helpers';
import { SeverityApprovalCard } from '@/components/investigation/SeverityApprovalCard';
import { PotentialSeverityApprovalCard } from '@/components/investigation/PotentialSeverityApprovalCard';
import { ExtensionApprovalCard } from '@/components/actions';

export function IncidentApprovalsList({ viewProps }: { viewProps: any }) {
  const { t, pendingIncidentApprovals, canApproveClosures, pendingClosures, canApproveSeverity, pendingSeverity, pendingPotentialSeverity, canVerifyActions, pendingApprovals, pendingExtensions, setSelectedActionForVerification, getPriorityBadgeVariant } = viewProps;
  return (
    <>
      ${incidentCode.trim()}
    </>
  );
}
`;
    fs.writeFileSync(path.join(targetDir, 'IncidentApprovalsList.tsx'), incidentImports);

    content = content.replace(incidentCode, '<IncidentApprovalsList viewProps={viewProps} />\n                ');
}

const finalImports = `import { ContractorApprovalsList } from './ContractorApprovalsList';\nimport { IncidentApprovalsList } from './IncidentApprovalsList';\n`;
fs.writeFileSync(srcFile, finalImports + content);
console.log('ApprovalsTab split successfully');
