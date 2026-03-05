import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Edit } from 'lucide-react';
import { useSecurityZones } from '@/features/security';
import { useSecurityShifts } from '@/features/security';
import { useSupervisors, useBulkUpdateRosterAssignments } from '@/hooks/use-shift-roster';

interface BulkRosterEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess?: () => void;
}

export function BulkRosterEditDialog({ open, onOpenChange, selectedIds, onSuccess }: BulkRosterEditDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    zone_id: '',
    shift_id: '',
    supervisor_id: '',
  });

  const { data: zones } = useSecurityZones({ isActive: true });
  const { data: shifts } = useSecurityShifts();
  const { data: supervisors } = useSupervisors();
  const bulkUpdate = useBulkUpdateRosterAssignments();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only include fields that have values
    const updates: { zone_id?: string; shift_id?: string; supervisor_id?: string } = {};
    if (formData.zone_id) updates.zone_id = formData.zone_id;
    if (formData.shift_id) updates.shift_id = formData.shift_id;
    if (formData.supervisor_id) updates.supervisor_id = formData.supervisor_id;

    if (Object.keys(updates).length === 0) return;

    await bulkUpdate.mutateAsync({ ids: selectedIds, updates });
    onOpenChange(false);
    setFormData({ zone_id: '', shift_id: '', supervisor_id: '' });
    onSuccess?.();
  };

  const hasChanges = formData.zone_id || formData.shift_id || formData.supervisor_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            {t('security.roster.bulkEdit', 'Edit Selected Assignments')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('security.roster.bulkEditWarning', 'This will update {{count}} roster entries. Only filled fields will be changed.', { count: selectedIds.length })}
            </AlertDescription>
          </Alert>

          {/* Zone Selection */}
          <div className="space-y-2">
            <Label>{t('security.roster.changeZone', 'Change Zone')}</Label>
            <Select value={formData.zone_id} onValueChange={(v) => setFormData({ ...formData, zone_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder={t('security.roster.noChange', 'No change')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('security.roster.noChange', 'No change')}</SelectItem>
                {zones?.map(z => (
                  <SelectItem key={z.id} value={z.id}>{z.zone_code} - {z.zone_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Shift Selection */}
          <div className="space-y-2">
            <Label>{t('security.roster.changeShift', 'Change Shift')}</Label>
            <Select value={formData.shift_id} onValueChange={(v) => setFormData({ ...formData, shift_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder={t('security.roster.noChange', 'No change')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('security.roster.noChange', 'No change')}</SelectItem>
                {shifts?.filter(s => s.is_active).map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.shift_name} ({s.start_time} - {s.end_time})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Supervisor Selection */}
          <div className="space-y-2">
            <Label>{t('security.roster.changeSupervisor', 'Change Supervisor')}</Label>
            <Select value={formData.supervisor_id} onValueChange={(v) => setFormData({ ...formData, supervisor_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder={t('security.roster.noChange', 'No change')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('security.roster.noChange', 'No change')}</SelectItem>
                {supervisors?.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={!hasChanges || bulkUpdate.isPending}>
              {bulkUpdate.isPending 
                ? t('common.saving', 'Saving...') 
                : t('security.roster.applyChanges', 'Apply Changes')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

