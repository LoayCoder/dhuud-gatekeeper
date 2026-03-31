import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ActionsTab } from './tabs/ActionsTab';
import { InvestigationsTab } from './tabs/InvestigationsTab';
import { InspectionsTab } from './tabs/InspectionsTab';
import { WitnessTab } from './tabs/WitnessTab';
import { ReportedTab } from './tabs/ReportedTab';
import { ApprovalsTab } from './tabs/ApprovalsTab';
import { ActionWorkflowDialog } from './ActionWorkflowDialog';
import { ExtensionRequestDialog } from './ExtensionRequestDialog';
import { ActionDetailSheet } from './ActionDetailSheet';
import type { MyActionsViewProps } from './types';

export function MyActionsLayout({ viewProps }: { viewProps: MyActionsViewProps }) {
  const {
    t, direction, searchQuery, setSearchQuery, priorityFilter, setPriorityFilter,
    activeTab, setActiveTab, activeFilter, setActiveFilter, kpiItems, isLoading,
    displayedActiveActions, displayedClosedActions, myInvestigations, myInspections,
    witnessStatements, myReportedIncidents, canAccessApprovals, totalPendingApprovals,
    selectedWitnessTask, setSelectedWitnessTask, handleWitnessStatementSubmit,
    actionDialogAction, actionDialogMode, actionDialogOpen, setActionDialogOpen,
    handleActionDialogConfirm, extensionRequestAction, setExtensionRequestAction,
    showClosedActions, setShowClosedActions, handleStartWork, handleMarkCompleted,
    handleFilterClick, getDaysInfo, submittingActionIds,
    // Approvals
    pendingApprovals, pendingSeverity, pendingPotentialSeverity, pendingIncidentApprovals,
    pendingClosures, pendingExtensions, pendingWorkers, pendingGatePasses, pendingCompanies,
    canApproveSeverity, canVerifyActions, canApproveWorkers, canApproveGatePasses,
    canApproveClosures, isHSSEManager, selectedActionForVerification, setSelectedActionForVerification,
    approveCompany, rejectCompany, hardDeleteCompany, rejectingCompany, setRejectingCompany,
    companyRejectionReason, setCompanyRejectionReason, deletingCompany, setDeletingCompany,
    handleApproveGatePass, gatePassApprovalNotes, setGatePassApprovalNotes,
    rejectingGatePass, setRejectingGatePass, approveGatePass,
  } = viewProps;

  const isRTL = direction === 'rtl';

  const statusColorMap: Record<string, string> = {
    critical: 'bg-destructive/10 text-destructive border-destructive/20',
    pending: 'bg-warning/10 text-warning border-warning/20',
    informational: 'bg-primary/10 text-primary border-primary/20',
    completed: 'bg-success/10 text-success border-success/20',
    neutral: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="container mx-auto py-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('investigation.myActions', 'My Actions')}</h1>
        <p className="text-muted-foreground text-sm">{t('investigation.myActionsDescription', 'View and manage your assigned tasks')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpiItems?.map((item: any) => {
          const Icon = item.icon;
          const isActive = activeFilter === item.key;
          return (
            <Card
              key={item.key}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md border',
                isActive ? 'ring-2 ring-primary' : '',
                statusColorMap[item.status] || statusColorMap.neutral
              )}
              onClick={item.onClick || (() => handleFilterClick(item.key))}
            >
              <CardContent className="p-3 text-center space-y-1">
                <Icon className="h-5 w-5 mx-auto" />
                <div className="text-2xl font-bold">{item.value}</div>
                <div className="text-xs truncate">{item.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active filter indicator */}
      {activeFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('investigation.filteringBy', 'Filtering by')}:</span>
          <Badge variant="secondary" className="gap-1">
            {activeFilter.replace(/_/g, ' ')}
            <X className="h-3 w-3 cursor-pointer" onClick={() => setActiveFilter(null)} />
          </Badge>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search', 'Search...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('investigation.actions.priority', 'Priority')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
            <SelectItem value="critical">{t('investigation.priority.critical', 'Critical')}</SelectItem>
            <SelectItem value="high">{t('investigation.priority.high', 'High')}</SelectItem>
            <SelectItem value="medium">{t('investigation.priority.medium', 'Medium')}</SelectItem>
            <SelectItem value="low">{t('investigation.priority.low', 'Low')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir={isRTL ? 'rtl' : 'ltr'}>
        <TabsList className="w-full flex-wrap h-auto gap-1 justify-start">
          <TabsTrigger value="actions" className="gap-1">
            {t('investigation.correctiveActions', 'Corrective Actions')}
            <Badge variant="secondary" className="text-xs">{displayedActiveActions?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="investigations" className="gap-1">
            {t('investigation.investigations', 'Investigations')}
            <Badge variant="secondary" className="text-xs">{myInvestigations?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="inspections" className="gap-1">
            {t('inspections.title', 'Inspections')}
            <Badge variant="secondary" className="text-xs">{myInspections?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="witness" className="gap-1">
            {t('investigation.witness', 'Witness')}
            <Badge variant="secondary" className="text-xs">{witnessStatements?.filter((w: any) => w.status !== 'completed')?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="reported" className="gap-1">
            {t('investigation.reported', 'Reported')}
            <Badge variant="secondary" className="text-xs">{myReportedIncidents?.length || 0}</Badge>
          </TabsTrigger>
          {canAccessApprovals && (
            <TabsTrigger value="approvals" className="gap-1">
              {t('investigation.approvals.approvals', 'Approvals')}
              {totalPendingApprovals > 0 && (
                <Badge variant="destructive" className="text-xs">{totalPendingApprovals}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="actions">
          <ActionsTab viewProps={viewProps} />
        </TabsContent>
        <TabsContent value="investigations">
          <InvestigationsTab viewProps={viewProps} />
        </TabsContent>
        <TabsContent value="inspections">
          <InspectionsTab viewProps={viewProps} />
        </TabsContent>
        <TabsContent value="witness">
          <WitnessTab viewProps={viewProps} />
        </TabsContent>
        <TabsContent value="reported">
          <ReportedTab viewProps={viewProps} />
        </TabsContent>
        {canAccessApprovals && (
          <TabsContent value="approvals">
            <ApprovalsTab viewProps={viewProps} />
          </TabsContent>
        )}
      </Tabs>

      {/* Action Workflow Dialog (Start Work / Submit for Verification) */}
      <ActionWorkflowDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        action={actionDialogAction}
        mode={actionDialogMode}
        onConfirm={handleActionDialogConfirm}
        isSubmitting={submittingActionIds.has(actionDialogAction?.id || '')}
      />

      {/* Extension Request Dialog */}
      <ExtensionRequestDialog
        action={extensionRequestAction}
        open={!!extensionRequestAction}
        onOpenChange={(open) => { if (!open) setExtensionRequestAction(null); }}
      />

      {/* Action Detail Sheet */}
      <ActionDetailSheet
        action={viewProps.selectedActionDetail}
        open={!!viewProps.selectedActionDetail}
        onOpenChange={(open) => { if (!open) viewProps.setSelectedActionDetail(null); }}
        onStartWork={handleStartWork}
        onSubmitForVerification={handleMarkCompleted}
        onRequestExtension={(a) => setExtensionRequestAction(a)}
      />
    </div>
  );
}
