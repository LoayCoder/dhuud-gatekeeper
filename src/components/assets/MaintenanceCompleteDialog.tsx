import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CalendarIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCompleteMaintenanceTask, MaintenanceSchedule } from '@/hooks/use-maintenance';

interface MaintenanceCompleteDialogProps {
  schedule: MaintenanceSchedule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaintenanceCompleteDialog({
  schedule,
  open,
  onOpenChange,
}: MaintenanceCompleteDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [completedDate, setCompletedDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');

  const completeMaintenance = useCompleteMaintenanceTask();

  const handleComplete = async () => {
    if (!schedule) return;

    try {
      await completeMaintenance.mutateAsync({
        id: schedule.id,
        completedDate: format(completedDate, 'yyyy-MM-dd'),
        notes,
      });
      setNotes('');
      setCompletedDate(new Date());
      onOpenChange(false);
    } catch (error) {
      console.error('Error completing maintenance:', error);
    }
  };

  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            {t('maintenance.recordCompletion')}
          </DialogTitle>
          <DialogDescription>
            {t('maintenance.completionDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Schedule Info */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
            <p className="font-medium">{t(`maintenance.types.${schedule.schedule_type}`)}</p>
            {schedule.description && (
              <p className="text-sm text-muted-foreground">{schedule.description}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {t('maintenance.frequency')}: {schedule.frequency_value}{' '}
              {t(`maintenance.frequencies.${schedule.frequency_type}`)}
            </p>
          </div>

          {/* Completion Date */}
          <div className="space-y-2">
            <Label>{t('maintenance.completionDate')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-start font-normal',
                    !completedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="me-2 h-4 w-4" />
                  {completedDate ? format(completedDate, 'PPP') : t('maintenance.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={completedDate}
                  onSelect={(date) => date && setCompletedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t('maintenance.completionNotes')}</Label>
            <Textarea
              placeholder={t('maintenance.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleComplete} disabled={completeMaintenance.isPending}>
            {completeMaintenance.isPending ? t('common.saving') : t('maintenance.markComplete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
