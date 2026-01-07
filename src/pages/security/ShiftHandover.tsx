import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, History, Clock, CheckCircle, XCircle, AlertCircle, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ShiftHandoverForm } from '@/components/security/ShiftHandoverForm';
import { ShiftHandoversList } from '@/components/security/ShiftHandoversList';
import { VacationHandoverForm } from '@/components/security/VacationHandoverForm';
import { HandoverApprovalDialog } from '@/components/security/HandoverApprovalDialog';
import { usePendingApprovalHandovers, useVacationResignationHandovers } from '@/hooks/use-shift-handovers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

export default function ShiftHandover() {
  const { t } = useTranslation();
  const [standardDialogOpen, setStandardDialogOpen] = useState(false);
  const [vacationDialogOpen, setVacationDialogOpen] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState<string | null>(null);
  
  const { data: pendingApprovals } = usePendingApprovalHandovers();
  const { data: vacationHandovers } = useVacationResignationHandovers();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{t('security.handover.pending', 'Pending')}</Badge>;
      case 'acknowledged':
        return <Badge className="bg-blue-500 gap-1"><CheckCircle className="h-3 w-3" />{t('security.handover.acknowledged', 'Acknowledged')}</Badge>;
      case 'approved':
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" />{t('security.handover.approved', 'Approved')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{t('security.handover.rejected', 'Rejected')}</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" />{t('security.handover.completed', 'Completed')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'vacation':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Plane className="h-3 w-3 me-1" />{t('security.handover.vacation', 'Vacation')}</Badge>;
      case 'resignation':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="h-3 w-3 me-1" />{t('security.handover.resignation', 'Resignation')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('security.shiftHandover', 'Shift Handover')}
          </h1>
          <p className="text-muted-foreground">
            {t('security.handoverDescription', 'Manage shift transitions and handover documentation')}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Standard Handover Dialog */}
          <Dialog open={standardDialogOpen} onOpenChange={setStandardDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('security.newHandover', 'New Handover')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('security.createHandover', 'Create Shift Handover')}
                </DialogTitle>
                <DialogDescription>
                  {t('security.createHandoverDesc', 'Document important information for the incoming guard')}
                </DialogDescription>
              </DialogHeader>
              <ShiftHandoverForm onSuccess={() => setStandardDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          {/* Vacation/Resignation Handover Dialog */}
          <Dialog open={vacationDialogOpen} onOpenChange={setVacationDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plane className="h-4 w-4" />
                {t('security.handover.vacationHandover', 'Vacation/Resignation')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  {t('security.handover.vacationTitle', 'Vacation/Resignation Handover')}
                </DialogTitle>
                <DialogDescription>
                  {t('security.handover.vacationDesc', 'This handover requires manager approval before assignment')}
                </DialogDescription>
              </DialogHeader>
              <VacationHandoverForm onSuccess={() => setVacationDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {pendingApprovals && pendingApprovals.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              {t('security.handover.pendingApprovals', 'Pending Approvals')} ({pendingApprovals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingApprovals.slice(0, 3).map(handover => (
                <div key={handover.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <div className="font-medium text-sm">{handover.outgoing_guard?.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {getTypeBadge(handover.handover_type)} • {format(new Date(handover.shift_date), 'PP')}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setSelectedHandover(handover.id)}>
                    {t('security.handover.review', 'Review')}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <FileText className="h-4 w-4" />
            {t('security.pending', 'Pending')}
          </TabsTrigger>
          <TabsTrigger value="today" className="gap-2">
            <History className="h-4 w-4" />
            {t('security.todaysHandovers', "Today's Handovers")}
          </TabsTrigger>
          <TabsTrigger value="vacation" className="gap-2">
            <Plane className="h-4 w-4" />
            {t('security.handover.vacationResignation', 'Vacation/Resignation')}
            {vacationHandovers && vacationHandovers.length > 0 && (
              <Badge variant="secondary" className="ms-1">{vacationHandovers.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <ShiftHandoversList showPendingOnly />
        </TabsContent>

        <TabsContent value="today">
          <ShiftHandoversList />
        </TabsContent>

        <TabsContent value="vacation">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('security.handover.vacationResignationList', 'Vacation & Resignation Handovers')}</CardTitle>
            </CardHeader>
            <CardContent>
              {vacationHandovers?.length ? (
                <div className="space-y-3">
                  {vacationHandovers.map(handover => (
                    <div key={handover.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{handover.outgoing_guard?.full_name}</span>
                          {getTypeBadge(handover.handover_type)}
                          {getStatusBadge(handover.status)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {format(new Date(handover.shift_date), 'PPP')} • {handover.zone?.zone_name || 'No zone'}
                        </div>
                        {handover.rejection_reason && (
                          <div className="text-sm text-destructive mt-1 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            {handover.rejection_reason}
                          </div>
                        )}
                        {handover.followup_guard?.full_name && (
                          <div className="text-sm text-green-600 mt-1">
                            {t('security.handover.assignedTo', 'Assigned to')}: {handover.followup_guard.full_name}
                          </div>
                        )}
                      </div>
                      {handover.status === 'pending' && handover.requires_approval && (
                        <Button size="sm" onClick={() => setSelectedHandover(handover.id)}>
                          {t('security.handover.review', 'Review')}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-12">
                  <Plane className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('security.handover.noVacationHandovers', 'No vacation/resignation handovers')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      {selectedHandover && vacationHandovers && (
        <HandoverApprovalDialog
          handover={vacationHandovers.find(h => h.id === selectedHandover)!}
          open={!!selectedHandover}
          onOpenChange={(open) => !open && setSelectedHandover(null)}
        />
      )}
    </div>
  );
}
