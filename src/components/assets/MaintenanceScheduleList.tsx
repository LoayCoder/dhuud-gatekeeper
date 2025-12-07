import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isPast, isFuture, addDays } from 'date-fns';
import { Plus, Edit, Trash2, CheckCircle, AlertTriangle, Clock, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useAssetMaintenanceSchedules, useDeleteMaintenanceSchedule, type MaintenanceSchedule } from '@/hooks/use-maintenance';
import { MaintenanceScheduleForm } from './MaintenanceScheduleForm';
import { MaintenanceCompleteDialog } from './MaintenanceCompleteDialog';

interface MaintenanceScheduleListProps {
  assetId: string;
  canManage: boolean;
}

export function MaintenanceScheduleList({ assetId, canManage }: MaintenanceScheduleListProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const { data: schedules, isLoading } = useAssetMaintenanceSchedules(assetId);
  const deleteSchedule = useDeleteMaintenanceSchedule();

  const [formOpen, setFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | null>(null);
  const [completingSchedule, setCompletingSchedule] = useState<MaintenanceSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<MaintenanceSchedule | null>(null);

  const handleEdit = (schedule: MaintenanceSchedule) => {
    setEditingSchedule(schedule);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingSchedule) return;
    await deleteSchedule.mutateAsync({ id: deletingSchedule.id, assetId });
    setDeletingSchedule(null);
  };

  const getStatusBadge = (schedule: MaintenanceSchedule) => {
    if (!schedule.is_active) {
      return <Badge variant="secondary">{t('common.inactive')}</Badge>;
    }
    
    if (!schedule.next_due) {
      return <Badge variant="outline">{t('maintenance.notScheduled')}</Badge>;
    }

    const nextDue = new Date(schedule.next_due);
    const today = new Date();
    const weekFromNow = addDays(today, 7);

    if (isPast(nextDue)) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {t('maintenance.overdue')}
        </Badge>
      );
    }

    if (nextDue <= weekFromNow) {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20 gap-1">
          <Clock className="h-3 w-3" />
          {t('maintenance.dueSoon')}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 gap-1">
        <CheckCircle className="h-3 w-3" />
        {t('maintenance.scheduled')}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Button */}
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => { setEditingSchedule(null); setFormOpen(true); }} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t('maintenance.addSchedule')}
          </Button>
        </div>
      )}

      {/* Schedule List */}
      {schedules?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('maintenance.noSchedules')}</p>
          {canManage && (
            <Button variant="link" onClick={() => setFormOpen(true)}>
              {t('maintenance.createFirst')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {schedules?.map((schedule) => (
            <Card key={schedule.id} className={cn(!schedule.is_active && 'opacity-60')}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{t(`maintenance.types.${schedule.schedule_type}`)}</span>
                      {getStatusBadge(schedule)}
                    </div>
                    
                    {schedule.description && (
                      <p className="text-sm text-muted-foreground">{schedule.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('maintenance.frequency')}: </span>
                        <span>{schedule.frequency_value} {t(`maintenance.frequencies.${schedule.frequency_type}`)}</span>
                      </div>
                      
                      {schedule.next_due && (
                        <div>
                          <span className="text-muted-foreground">{t('maintenance.nextDue')}: </span>
                          <span className={cn(isPast(new Date(schedule.next_due)) && 'text-destructive font-medium')}>
                            {format(new Date(schedule.next_due), 'PP')}
                          </span>
                        </div>
                      )}

                      {schedule.last_performed && (
                        <div>
                          <span className="text-muted-foreground">{t('maintenance.lastPerformed')}: </span>
                          <span>{format(new Date(schedule.last_performed), 'PP')}</span>
                        </div>
                      )}

                      {schedule.vendor_name && (
                        <div>
                          <span className="text-muted-foreground">{t('maintenance.vendor')}: </span>
                          <span>{schedule.vendor_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {schedule.is_active && (
                          <DropdownMenuItem onClick={() => setCompletingSchedule(schedule)}>
                            <CheckCircle className="me-2 h-4 w-4 text-green-500" />
                            {t('maintenance.markComplete')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleEdit(schedule)}>
                          <Edit className="me-2 h-4 w-4" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeletingSchedule(schedule)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="me-2 h-4 w-4" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <MaintenanceScheduleForm
        assetId={assetId}
        schedule={editingSchedule}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingSchedule(null);
        }}
      />

      {/* Complete Dialog */}
      <MaintenanceCompleteDialog
        schedule={completingSchedule}
        open={!!completingSchedule}
        onOpenChange={(open) => !open && setCompletingSchedule(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSchedule} onOpenChange={(open) => !open && setDeletingSchedule(null)}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('maintenance.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('maintenance.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
