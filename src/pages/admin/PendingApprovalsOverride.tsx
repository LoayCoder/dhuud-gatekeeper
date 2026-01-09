import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Clock, Eye, Filter, AlertTriangle, 
  FileWarning, Truck, Users, Building2, UserCheck, Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAllPendingApprovals, useApprovalCounts, type UnifiedPendingApproval, type ApprovalCategory } from '@/hooks/use-all-pending-approvals';
import { useAdminOverrideApproval } from '@/hooks/use-admin-override-approval';
import { PageLoader } from '@/components/ui/page-loader';

const CATEGORY_CONFIG: Record<ApprovalCategory, { icon: React.ElementType; color: string; label: string }> = {
  incident: { icon: FileWarning, color: 'text-destructive', label: 'admin.approvals.categories.incident' },
  gate_pass: { icon: Truck, color: 'text-blue-600', label: 'admin.approvals.categories.gatePass' },
  worker: { icon: Users, color: 'text-green-600', label: 'admin.approvals.categories.worker' },
  contractor: { icon: Building2, color: 'text-purple-600', label: 'admin.approvals.categories.contractor' },
  visitor: { icon: UserCheck, color: 'text-amber-600', label: 'admin.approvals.categories.visitor' },
  asset: { icon: Package, color: 'text-cyan-600', label: 'admin.approvals.categories.asset' },
};

export default function PendingApprovalsOverride() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState<'all' | ApprovalCategory>('all');
  const [minDaysFilter, setMinDaysFilter] = useState(0);
  const [selectedApproval, setSelectedApproval] = useState<UnifiedPendingApproval | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [originalApprover, setOriginalApprover] = useState('');

  const { data: approvals, isLoading } = useAllPendingApprovals(minDaysFilter);
  const counts = useApprovalCounts();
  const override = useAdminOverrideApproval();

  const filteredApprovals = useMemo(() => {
    if (!approvals) return [];
    if (activeTab === 'all') return approvals;
    return approvals.filter(a => a.category === activeTab);
  }, [approvals, activeTab]);

  const handleOverride = async () => {
    if (!selectedApproval || overrideReason.length < 10) return;

    // Only incidents support the override RPC for now
    if (selectedApproval.category === 'incident') {
      await override.mutateAsync({
        incidentId: selectedApproval.id,
        overrideReason,
        originalApprover: originalApprover || 'Unknown',
      });
    }

    setSelectedApproval(null);
    setOverrideReason('');
    setOriginalApprover('');
  };

  const getDaysColor = (days: number) => {
    if (days >= 7) return 'text-destructive';
    if (days >= 3) return 'text-amber-600 dark:text-amber-400';
    return 'text-muted-foreground';
  };

  const getCategoryBadge = (category: ApprovalCategory, subType?: string) => {
    const config = CATEGORY_CONFIG[category];
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`gap-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
        {t(config.label)}
        {subType && <span className="opacity-70">({subType})</span>}
      </Badge>
    );
  };

  const getNavigationPath = (approval: UnifiedPendingApproval) => {
    switch (approval.category) {
      case 'incident':
        return `/incidents/${approval.id}`;
      case 'gate_pass':
        return `/contractors/gate-passes`;
      case 'worker':
        return `/contractors/workers`;
      case 'contractor':
        return `/contractors/companies`;
      case 'visitor':
        return `/visitors`;
      case 'asset':
        return `/assets`;
      default:
        return '#';
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            {t('admin.override.title', 'Pending Approvals Override')}
          </h1>
          <p className="text-muted-foreground">
            {t('admin.override.description', 'Review and override stuck approval workflows across all modules')}
          </p>
        </div>
        <Badge variant="outline" className="self-start text-lg px-4 py-2">
          {counts.total} {t('admin.override.pendingItems', 'pending items')}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {(Object.keys(CATEGORY_CONFIG) as ApprovalCategory[]).map((category) => {
          const config = CATEGORY_CONFIG[category];
          const Icon = config.icon;
          const count = counts[category];
          return (
            <Card 
              key={category} 
              className={`cursor-pointer transition-all hover:shadow-md ${activeTab === category ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setActiveTab(category)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Icon className={`h-8 w-8 ${config.color} mb-2`} />
                <span className="text-2xl font-bold">{count}</span>
                <span className="text-xs text-muted-foreground">{t(config.label)}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {t('common.filters', 'Filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full sm:w-48 space-y-2">
              <Label>{t('admin.override.minDaysStuck', 'Minimum Days Pending')}</Label>
              <Select value={minDaysFilter.toString()} onValueChange={(v) => setMinDaysFilter(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('common.all', 'All')}</SelectItem>
                  <SelectItem value="1">1+ {t('common.days', 'days')}</SelectItem>
                  <SelectItem value="3">3+ {t('common.days', 'days')}</SelectItem>
                  <SelectItem value="7">7+ {t('common.days', 'days')}</SelectItem>
                  <SelectItem value="14">14+ {t('common.days', 'days')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              onClick={() => { setActiveTab('all'); setMinDaysFilter(0); }}
            >
              {t('common.clearFilters', 'Clear Filters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs & Table */}
      <Card>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <CardHeader className="pb-0">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
              <TabsTrigger value="all" className="gap-1">
                {t('common.all', 'All')}
                <Badge variant="secondary" className="ms-1">{counts.total}</Badge>
              </TabsTrigger>
              {(Object.keys(CATEGORY_CONFIG) as ApprovalCategory[]).map((category) => {
                const config = CATEGORY_CONFIG[category];
                const Icon = config.icon;
                const count = counts[category];
                if (count === 0) return null;
                return (
                  <TabsTrigger key={category} value={category} className="gap-1">
                    <Icon className="h-4 w-4" />
                    {t(config.label)}
                    <Badge variant="secondary" className="ms-1">{count}</Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </CardHeader>

          <CardContent className="pt-4">
            {filteredApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <ShieldCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{t('admin.override.noItems', 'No pending approvals')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.reference', 'Reference')}</TableHead>
                      <TableHead>{t('common.category', 'Category')}</TableHead>
                      <TableHead>{t('common.title', 'Title')}</TableHead>
                      <TableHead>{t('common.status', 'Status')}</TableHead>
                      <TableHead>{t('common.organization', 'Organization')}</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {t('admin.override.stuckFor', 'Pending For')}
                        </div>
                      </TableHead>
                      <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApprovals.map((approval) => (
                      <TableRow key={`${approval.category}-${approval.id}`}>
                        <TableCell className="font-mono text-sm">{approval.reference_id}</TableCell>
                        <TableCell>{getCategoryBadge(approval.category, approval.sub_type)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{approval.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                            {t(`incident.statuses.${approval.status}`, approval.status.replace(/_/g, ' '))}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {approval.department_name || approval.company_name || '-'}
                        </TableCell>
                        <TableCell>
                          <span className={getDaysColor(approval.days_pending)}>
                            {approval.days_pending} {t('common.days', 'days')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(getNavigationPath(approval))}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {approval.category === 'incident' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-400"
                                onClick={() => {
                                  setSelectedApproval(approval);
                                  setOriginalApprover('');
                                }}
                              >
                                {t('admin.override.override', 'Override')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Tabs>
      </Card>

      {/* Override Dialog */}
      <Dialog open={!!selectedApproval} onOpenChange={(open) => !open && setSelectedApproval(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              {t('admin.override.modalTitle', 'Override Approval')}
            </DialogTitle>
            <DialogDescription>
              {t('admin.override.modalDescription', 'This action will bypass the normal approval workflow.')}
            </DialogDescription>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-4 py-4">
              <Alert>
                <AlertDescription>
                  <div className="space-y-1 text-sm">
                    <p><strong>{t('common.reference', 'Reference')}:</strong> {selectedApproval.reference_id}</p>
                    <p><strong>{t('common.title', 'Title')}:</strong> {selectedApproval.title}</p>
                    <p><strong>{t('admin.override.currentStatus', 'Current Status')}:</strong> {t(`incident.statuses.${selectedApproval.status}`, selectedApproval.status)}</p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="dialogOriginalApprover">{t('admin.override.originalApprover', 'Original Approver')}</Label>
                <Input
                  id="dialogOriginalApprover"
                  value={originalApprover}
                  onChange={(e) => setOriginalApprover(e.target.value)}
                  placeholder={t('admin.override.originalApproverPlaceholder', 'Name of the person who should have approved')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dialogOverrideReason">
                  {t('admin.override.reason', 'Override Reason')} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="dialogOverrideReason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder={t('admin.override.reasonPlaceholder', 'Explain why this approval is being overridden...')}
                  rows={4}
                  className={overrideReason.length > 0 && overrideReason.length < 10 ? 'border-destructive' : ''}
                />
                {overrideReason.length > 0 && overrideReason.length < 10 && (
                  <p className="text-xs text-destructive">{t('admin.override.reasonMinLength', 'Reason must be at least 10 characters')}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedApproval(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleOverride}
              disabled={overrideReason.length < 10 || override.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {override.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t('admin.override.confirm', 'Confirm Override')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
