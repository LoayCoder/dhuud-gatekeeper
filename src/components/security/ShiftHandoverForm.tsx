import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Loader2, CheckCircle, AlertCircle, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCreateShiftHandover } from '@/hooks/use-shift-handovers';
import { useSecurityZones } from '@/hooks/use-security-zones';
import { cn } from '@/lib/utils';

interface OutstandingIssue {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  resolved: boolean;
}

interface EquipmentItem {
  item: string;
  status: 'ok' | 'damaged' | 'missing';
  notes?: string;
}

const defaultEquipment = [
  'Radio',
  'Flashlight',
  'Keys',
  'First Aid Kit',
  'Fire Extinguisher',
  'Logbook',
];

interface ShiftHandoverFormProps {
  onSuccess?: () => void;
}

export function ShiftHandoverForm({ onSuccess }: ShiftHandoverFormProps) {
  const { t } = useTranslation();
  const createHandover = useCreateShiftHandover();
  const { data: zones } = useSecurityZones();

  const [selectedZone, setSelectedZone] = useState<string>('');
  const [issues, setIssues] = useState<OutstandingIssue[]>([]);
  const [newIssue, setNewIssue] = useState('');
  const [newIssuePriority, setNewIssuePriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [equipment, setEquipment] = useState<EquipmentItem[]>(
    defaultEquipment.map(item => ({ item, status: 'ok' }))
  );
  const [keyObservations, setKeyObservations] = useState('');
  const [visitorInfo, setVisitorInfo] = useState('');
  const [priorities, setPriorities] = useState('');
  const [notes, setNotes] = useState('');

  const handleAddIssue = () => {
    if (!newIssue.trim()) return;
    setIssues([
      ...issues,
      {
        id: crypto.randomUUID(),
        description: newIssue.trim(),
        priority: newIssuePriority,
        resolved: false,
      },
    ]);
    setNewIssue('');
  };

  const handleRemoveIssue = (id: string) => {
    setIssues(issues.filter(i => i.id !== id));
  };

  const handleEquipmentStatusChange = (index: number, status: 'ok' | 'damaged' | 'missing') => {
    const updated = [...equipment];
    updated[index].status = status;
    setEquipment(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createHandover.mutateAsync({
      zone_id: selectedZone || undefined,
      outstanding_issues: issues,
      equipment_checklist: equipment,
      key_observations: keyObservations || undefined,
      visitor_info: visitorInfo || undefined,
      next_shift_priorities: priorities || undefined,
      notes: notes || undefined,
    });

    // Reset form
    setIssues([]);
    setEquipment(defaultEquipment.map(item => ({ item, status: 'ok' })));
    setKeyObservations('');
    setVisitorInfo('');
    setPriorities('');
    setNotes('');
    onSuccess?.();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'damaged': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'missing': return <MinusCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Zone Selection */}
      <div className="space-y-2">
        <Label>{t('security.zone', 'Zone')}</Label>
        <Select value={selectedZone} onValueChange={setSelectedZone}>
          <SelectTrigger>
            <SelectValue placeholder={t('security.selectZone', 'Select zone...')} />
          </SelectTrigger>
          <SelectContent>
            {zones?.map((zone) => (
              <SelectItem key={zone.id} value={zone.id}>
                {zone.zone_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Outstanding Issues */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t('security.outstandingIssues', 'Outstanding Issues')}
          </CardTitle>
          <CardDescription>
            {t('security.outstandingIssuesDesc', 'Issues that need attention in the next shift')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted"
            >
              <div className="flex items-center gap-2 flex-1">
                <Badge variant={getPriorityColor(issue.priority) as any}>
                  {issue.priority}
                </Badge>
                <span className="text-sm">{issue.description}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveIssue(issue.id)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              value={newIssue}
              onChange={(e) => setNewIssue(e.target.value)}
              placeholder={t('security.addIssue', 'Add an issue...')}
              className="flex-1"
            />
            <Select
              value={newIssuePriority}
              onValueChange={(v) => setNewIssuePriority(v as any)}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">{t('common.high', 'High')}</SelectItem>
                <SelectItem value="medium">{t('common.medium', 'Medium')}</SelectItem>
                <SelectItem value="low">{t('common.low', 'Low')}</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" onClick={handleAddIssue}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t('security.equipmentChecklist', 'Equipment Checklist')}
          </CardTitle>
          <CardDescription>
            {t('security.equipmentChecklistDesc', 'Status of equipment at handover')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {equipment.map((item, index) => (
              <div
                key={item.item}
                className="flex items-center justify-between gap-2 p-2 rounded-lg border"
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(item.status)}
                  <span className="text-sm">{item.item}</span>
                </div>
                <div className="flex gap-1">
                  {(['ok', 'damaged', 'missing'] as const).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      variant={item.status === status ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-7 px-2 text-xs',
                        item.status === status && status === 'ok' && 'bg-green-500 hover:bg-green-600',
                        item.status === status && status === 'damaged' && 'bg-amber-500 hover:bg-amber-600',
                        item.status === status && status === 'missing' && 'bg-destructive hover:bg-destructive/90'
                      )}
                      onClick={() => handleEquipmentStatusChange(index, status)}
                    >
                      {status === 'ok' ? t('common.ok', 'OK') : status === 'damaged' ? t('common.damaged', 'Damaged') : t('common.missing', 'Missing')}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Observations */}
      <div className="space-y-2">
        <Label>{t('security.keyObservations', 'Key Observations')}</Label>
        <Textarea
          value={keyObservations}
          onChange={(e) => setKeyObservations(e.target.value)}
          placeholder={t('security.keyObservationsPlaceholder', 'Notable events, suspicious activity, etc...')}
          rows={3}
        />
      </div>

      {/* Visitor Info */}
      <div className="space-y-2">
        <Label>{t('security.visitorInfo', 'Visitor/Contractor Information')}</Label>
        <Textarea
          value={visitorInfo}
          onChange={(e) => setVisitorInfo(e.target.value)}
          placeholder={t('security.visitorInfoPlaceholder', 'Expected visitors, ongoing contractor work, etc...')}
          rows={2}
        />
      </div>

      {/* Next Shift Priorities */}
      <div className="space-y-2">
        <Label>{t('security.nextShiftPriorities', 'Next Shift Priorities')}</Label>
        <Textarea
          value={priorities}
          onChange={(e) => setPriorities(e.target.value)}
          placeholder={t('security.prioritiesPlaceholder', 'Tasks that need immediate attention...')}
          rows={2}
        />
      </div>

      {/* Additional Notes */}
      <div className="space-y-2">
        <Label>{t('common.notes', 'Additional Notes')}</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('security.handoverNotesPlaceholder', 'Any other information for the incoming guard...')}
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full" disabled={createHandover.isPending}>
        {createHandover.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin me-2" />
            {t('common.submitting', 'Submitting...')}
          </>
        ) : (
          t('security.submitHandover', 'Submit Handover')
        )}
      </Button>
    </form>
  );
}
