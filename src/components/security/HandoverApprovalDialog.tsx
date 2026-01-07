import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Loader2, User, AlertCircle, Clock, MapPin, Briefcase, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ShiftHandover, parseOutstandingIssues, parseEquipmentChecklist } from '@/hooks/use-shift-handovers';

interface HandoverApprovalDialogProps {
  handover: ShiftHandover & { handover_type?: string; requires_approval?: boolean };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HandoverApprovalDialog({ handover, open, onOpenChange }: HandoverApprovalDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedGuardId, setSelectedGuardId] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Fetch available guards for follow-up assignment
  const { data: guards } = useQuery({
    queryKey: ['available-guards'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) return [];

      // Get guards in the same tenant
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['security_guard', 'security_supervisor']);

      if (!roles?.length) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('tenant_id', profile.tenant_id)
        .in('id', roles.map(r => r.user_id))
        .neq('id', handover.outgoing_guard_id) // Exclude the outgoing guard
        .eq('is_active', true)
        .is('deleted_at', null);

      return profiles || [];
    },
  });

  const approveHandover = useMutation({
    mutationFn: async () => {
      if (!selectedGuardId) throw new Error('Please select a guard for follow-up');

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('shift_handovers')
        .update({
          status: 'acknowledged',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          assigned_followup_guard_id: selectedGuardId,
          incoming_guard_id: selectedGuardId,
        })
        .eq('id', handover.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-handovers'] });
      toast({ title: t('security.handover.approved', 'Handover Approved') });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t('security.handover.approveFailed', 'Approval Failed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const rejectHandover = useMutation({
    mutationFn: async () => {
      if (!rejectionReason.trim()) throw new Error('Please provide a rejection reason');

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('shift_handovers')
        .update({
          status: 'cancelled',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', handover.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-handovers'] });
      toast({ title: t('security.handover.rejected', 'Handover Rejected') });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t('security.handover.rejectFailed', 'Rejection Failed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const issues = parseOutstandingIssues(handover.outstanding_issues);
  const equipment = parseEquipmentChecklist(handover.equipment_checklist);
  const damagedEquipment = equipment.filter(e => e.status !== 'ok');

  const getHandoverTypeBadge = () => {
    const type = (handover as any).handover_type;
    if (type === 'vacation') {
      return (
        <Badge className="bg-blue-500 gap-1">
          <Briefcase className="h-3 w-3" />
          {t('security.handover.vacation', 'Vacation')}
        </Badge>
      );
    }
    if (type === 'resignation') {
      return (
        <Badge className="bg-amber-500 gap-1">
          <LogOut className="h-3 w-3" />
          {t('security.handover.resignation', 'Resignation')}
        </Badge>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            {t('security.handover.reviewHandover', 'Review Handover')}
          </DialogTitle>
          <DialogDescription>
            {t('security.handover.reviewHandoverDesc', 'Review and approve or reject this handover request')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Header Info */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">{handover.outgoing_guard?.full_name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(handover.handover_time), 'PPp')}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {getHandoverTypeBadge()}
              {handover.zone?.zone_name && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {handover.zone.zone_name}
                </span>
              )}
            </div>
          </div>

          {/* Outstanding Issues */}
          {issues.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">{t('security.outstandingIssues', 'Outstanding Issues')}</h4>
              <div className="space-y-1">
                {issues.map((issue) => (
                  <div key={issue.id} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                    <Badge variant={issue.priority === 'high' ? 'destructive' : issue.priority === 'medium' ? 'secondary' : 'outline'}>
                      {issue.priority}
                    </Badge>
                    <span>{issue.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equipment Issues */}
          {damagedEquipment.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">{t('security.equipmentIssues', 'Equipment Issues')}</h4>
              <div className="space-y-1">
                {damagedEquipment.map((item) => (
                  <div key={item.item} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                    <Badge variant={item.status === 'missing' ? 'destructive' : 'secondary'}>{item.status}</Badge>
                    <span>{item.item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Observations */}
          {handover.key_observations && (
            <div className="space-y-1">
              <h4 className="font-medium">{t('security.keyObservations', 'Key Observations')}</h4>
              <p className="text-sm text-muted-foreground p-2 bg-muted rounded">{handover.key_observations}</p>
            </div>
          )}

          {/* Notes */}
          {handover.notes && (
            <div className="space-y-1">
              <h4 className="font-medium">{t('common.notes', 'Notes')}</h4>
              <p className="text-sm text-muted-foreground p-2 bg-muted rounded">{handover.notes}</p>
            </div>
          )}

          {/* Approval Form */}
          {!showRejectForm && (
            <div className="space-y-2 pt-4 border-t">
              <Label>{t('security.handover.assignFollowup', 'Assign Follow-up Guard')} *</Label>
              <Select value={selectedGuardId} onValueChange={setSelectedGuardId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('security.handover.selectGuard', 'Select a guard...')} />
                </SelectTrigger>
                <SelectContent>
                  {guards?.map((guard) => (
                    <SelectItem key={guard.id} value={guard.id}>
                      {guard.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Rejection Form */}
          {showRejectForm && (
            <div className="space-y-2 pt-4 border-t">
              <Label>{t('security.handover.rejectionReason', 'Rejection Reason')} *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('security.handover.rejectionReasonPlaceholder', 'Explain why this handover is being rejected...')}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!showRejectForm ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                className="text-destructive border-destructive hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4 me-2" />
                {t('security.handover.rejectHandover', 'Reject')}
              </Button>
              <Button
                onClick={() => approveHandover.mutate()}
                disabled={!selectedGuardId || approveHandover.isPending}
              >
                {approveHandover.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 me-2" />
                )}
                {t('security.handover.approveHandover', 'Approve & Assign')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowRejectForm(false)}>
                {t('common.back', 'Back')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectHandover.mutate()}
                disabled={!rejectionReason.trim() || rejectHandover.isPending}
              >
                {rejectHandover.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <XCircle className="h-4 w-4 me-2" />
                )}
                {t('security.handover.confirmReject', 'Confirm Rejection')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
