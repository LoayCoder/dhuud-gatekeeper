/**
 * VisitorApprovalCard
 * 
 * Individual card for approvers to review and act on pending visitor approvals.
 * RTL-compliant with logical properties.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, X, User, Building, Calendar, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useApproveVisitStage, useRejectVisitStage, VisitorApproval, ApprovalStage } from '@/hooks/use-visitor-approvals';

interface VisitorApprovalCardProps {
  approval: VisitorApproval;
  visitorName?: string;
  visitorCompany?: string;
  visitPurpose?: string;
  visitDate?: string;
  hostName?: string;
  onApproved?: () => void;
  onRejected?: () => void;
}

const stageBadgeColors: Record<ApprovalStage, string> = {
  area_rep: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  hsse: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  security: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  site_client: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const stageLabels: Record<ApprovalStage, string> = {
  area_rep: 'Area Rep',
  hsse: 'HSSE',
  security: 'Security',
  site_client: 'Site Client',
};

export function VisitorApprovalCard({
  approval,
  visitorName,
  visitorCompany,
  visitPurpose,
  visitDate,
  hostName,
  onApproved,
  onRejected,
}: VisitorApprovalCardProps) {
  const { t } = useTranslation();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [showApproveNotes, setShowApproveNotes] = useState(false);

  const approveMutation = useApproveVisitStage();
  const rejectMutation = useRejectVisitStage();

  const isLoading = approveMutation.isPending || rejectMutation.isPending;
  const stage = approval.approval_stage as ApprovalStage;

  const handleApprove = async () => {
    await approveMutation.mutateAsync({ 
      approvalId: approval.id, 
      notes: approveNotes || undefined 
    });
    onApproved?.();
    setShowApproveNotes(false);
    setApproveNotes('');
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    
    await rejectMutation.mutateAsync({ 
      approvalId: approval.id, 
      reason: rejectReason 
    });
    onRejected?.();
    setShowRejectForm(false);
    setRejectReason('');
  };

  const handleCancelReject = () => {
    setShowRejectForm(false);
    setRejectReason('');
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-lg">
            {visitorName || t('visitors.approvals.unknownVisitor', 'Unknown Visitor')}
          </CardTitle>
          <Badge className={stageBadgeColors[stage]}>
            {t(`visitors.approvals.${stage}`, stageLabels[stage])}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Visitor Details */}
        <div className="grid gap-3 text-sm">
          {visitorCompany && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-4 w-4 shrink-0" />
              <span>{visitorCompany}</span>
            </div>
          )}
          
          {visitPurpose && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0" />
              <span>{visitPurpose}</span>
            </div>
          )}
          
          {visitDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{format(new Date(visitDate), 'PPP')}</span>
            </div>
          )}
          
          {hostName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4 shrink-0" />
              <span>{t('visitors.approvals.host', 'Host')}: {hostName}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Reject Form */}
        {showRejectForm ? (
          <div className="space-y-3">
            <Textarea
              placeholder={t('visitors.approvals.rejectReasonPlaceholder', 'Enter reason for rejection...')}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[80px]"
              disabled={isLoading}
            />
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancelReject}
                disabled={isLoading}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleReject}
                disabled={isLoading || !rejectReason.trim()}
              >
                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t('visitors.approvals.confirmReject', 'Confirm Reject')}
              </Button>
            </div>
          </div>
        ) : showApproveNotes ? (
          <div className="space-y-3">
            <Textarea
              placeholder={t('visitors.approvals.approveNotesPlaceholder', 'Optional notes...')}
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              className="min-h-[80px]"
              disabled={isLoading}
            />
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { setShowApproveNotes(false); setApproveNotes(''); }}
                disabled={isLoading}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button 
                size="sm" 
                onClick={handleApprove}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                <Check className="me-2 h-4 w-4" />
                {t('visitors.approvals.confirmApprove', 'Confirm Approve')}
              </Button>
            </div>
          </div>
        ) : (
          /* Action Buttons */
          <div className="flex gap-2 justify-end">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setShowRejectForm(true)}
              disabled={isLoading}
            >
              <X className="me-2 h-4 w-4" />
              {t('visitors.approvals.reject', 'Reject')}
            </Button>
            <Button 
              size="sm" 
              onClick={() => setShowApproveNotes(true)}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="me-2 h-4 w-4" />
              {t('visitors.approvals.approve', 'Approve')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
