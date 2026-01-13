import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, AlertTriangle } from 'lucide-react';
import { useSecurityTeams } from '@/hooks/use-security-teams';
import { useSecurityZones } from '@/hooks/use-security-zones';
import { useSecurityShifts } from '@/hooks/use-security-shifts';
import { useAssignTeamToShift } from '@/hooks/use-shift-roster';
import { RosterDateRangePicker } from './RosterDateRangePicker';

interface TeamShiftAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamShiftAssignmentDialog({ open, onOpenChange }: TeamShiftAssignmentDialogProps) {
  const { t } = useTranslation();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [formData, setFormData] = useState({
    team_id: '',
    zone_id: '',
    shift_id: '',
    start_date: today,
    end_date: today,
    excluded_days: [] as number[],
  });

  const { data: teams } = useSecurityTeams();
  const { data: zones } = useSecurityZones({ isActive: true });
  const { data: shifts } = useSecurityShifts();
  const assignTeam = useAssignTeamToShift();

  const selectedTeam = teams?.find(t => t.id === formData.team_id);
  const activeTeams = teams?.filter(t => t.is_active && t.member_count > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await assignTeam.mutateAsync(formData);
    onOpenChange(false);
    setFormData({
      team_id: '',
      zone_id: '',
      shift_id: '',
      start_date: today,
      end_date: today,
      excluded_days: [],
    });
  };

  const isValid = formData.team_id && formData.zone_id && formData.shift_id && formData.start_date && formData.end_date;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('security.roster.assignTeam', 'Assign Team to Shift')}
          </DialogTitle>
        </DialogHeader>

        {!activeTeams?.length ? (
          <div className="flex flex-col items-center py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t('security.roster.noTeamsAvailable', 'No teams available. Create a team first.')}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => onOpenChange(false)}>
              {t('common.close', 'Close')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Team Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {t('security.roster.selectTeam', 'Select Team')} *
              </Label>
              <Select value={formData.team_id} onValueChange={(v) => setFormData({ ...formData, team_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('security.roster.selectTeam', 'Select Team')} />
                </SelectTrigger>
                <SelectContent>
                  {activeTeams?.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        {team.name}
                        <Badge variant="secondary" className="text-xs">{team.member_count}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Preview */}
            {selectedTeam && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('security.roster.supervisor', 'Supervisor')}:</span>
                  <span className="font-medium">{selectedTeam.supervisor_name || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('security.roster.members', 'Members')}:</span>
                  <span className="font-medium">{selectedTeam.member_count} {t('security.guards', 'guards')}</span>
                </div>
              </div>
            )}

            {/* Zone Selection */}
            <div className="space-y-2">
              <Label>{t('security.roster.zone', 'Zone')} *</Label>
              <Select value={formData.zone_id} onValueChange={(v) => setFormData({ ...formData, zone_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select', 'Select')} />
                </SelectTrigger>
                <SelectContent>
                  {zones?.map(z => (
                    <SelectItem key={z.id} value={z.id}>{z.zone_code} - {z.zone_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shift Selection */}
            <div className="space-y-2">
              <Label>{t('security.roster.shift', 'Shift')} *</Label>
              <Select value={formData.shift_id} onValueChange={(v) => setFormData({ ...formData, shift_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select', 'Select')} />
                </SelectTrigger>
                <SelectContent>
                  {shifts?.filter(s => s.is_active).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.shift_name} ({s.start_time} - {s.end_time})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Picker */}
            <RosterDateRangePicker
              startDate={formData.start_date}
              endDate={formData.end_date}
              excludedDays={formData.excluded_days}
              onStartDateChange={(d) => setFormData({ ...formData, start_date: d })}
              onEndDateChange={(d) => setFormData({ ...formData, end_date: d })}
              onExcludedDaysChange={(d) => setFormData({ ...formData, excluded_days: d })}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={!isValid || assignTeam.isPending}>
                <Users className="h-4 w-4 me-2" />
                {t('security.roster.assignTeam', 'Assign Team')}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
