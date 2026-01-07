import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Loader2, CheckCircle, AlertCircle, MinusCircle, Briefcase, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SignaturePad, SignaturePadRef } from '@/components/ui/signature-pad';
import { useToast } from '@/hooks/use-toast';
import { useSecurityZones } from '@/hooks/use-security-zones';
import { supabase } from '@/integrations/supabase/client';
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

interface VacationHandoverFormProps {
  onSuccess?: () => void;
}

export function VacationHandoverForm({ onSuccess }: VacationHandoverFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: zones } = useSecurityZones();
  const signaturePadRef = useRef<SignaturePadRef>(null);

  const [handoverType, setHandoverType] = useState<'vacation' | 'resignation'>('vacation');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [issues, setIssues] = useState<OutstandingIssue[]>([]);
  const [newIssue, setNewIssue] = useState('');
  const [newIssuePriority, setNewIssuePriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [equipment, setEquipment] = useState<EquipmentItem[]>(
    defaultEquipment.map(item => ({ item, status: 'ok' }))
  );
  const [keyObservations, setKeyObservations] = useState('');
  const [priorities, setPriorities] = useState('');
  const [notes, setNotes] = useState('');
  const [signatureError, setSignatureError] = useState(false);

  const createVacationHandover = useMutation({
    mutationFn: async (params: {
      handover_type: 'vacation' | 'resignation';
      zone_id?: string;
      outstanding_issues: OutstandingIssue[];
      equipment_checklist: EquipmentItem[];
      key_observations?: string;
      next_shift_priorities?: string;
      notes?: string;
      outgoing_signature?: string;
    }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { data, error } = await supabase
        .from('shift_handovers')
        .insert({
          tenant_id: profile.tenant_id,
          outgoing_guard_id: profile.id,
          zone_id: params.zone_id || null,
          handover_type: params.handover_type,
          requires_approval: true,
          outstanding_issues: params.outstanding_issues as any,
          equipment_checklist: params.equipment_checklist as any,
          key_observations: params.key_observations || null,
          next_shift_priorities: params.next_shift_priorities || null,
          notes: params.notes || null,
          outgoing_signature: params.outgoing_signature || null,
          signature_timestamp: params.outgoing_signature ? new Date().toISOString() : null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-handovers'] });
      toast({
        title: t('security.handover.submitted', 'Handover Submitted'),
        description: t('security.handover.awaitingApproval', 'Awaiting manager approval'),
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: t('security.handover.submitFailed', 'Submission Failed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

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

    const signature = signaturePadRef.current?.getSignatureDataUrl();
    if (!signature) {
      setSignatureError(true);
      return;
    }
    setSignatureError(false);

    await createVacationHandover.mutateAsync({
      handover_type: handoverType,
      zone_id: selectedZone || undefined,
      outstanding_issues: issues,
      equipment_checklist: equipment,
      key_observations: keyObservations || undefined,
      next_shift_priorities: priorities || undefined,
      notes: notes || undefined,
      outgoing_signature: signature,
    });
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
      {/* Handover Type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t('security.handover.type', 'Handover Type')}
          </CardTitle>
          <CardDescription>
            {t('security.handover.typeDesc', 'Select the reason for this handover')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={handoverType}
            onValueChange={(v) => setHandoverType(v as 'vacation' | 'resignation')}
            className="grid grid-cols-2 gap-4"
          >
            <Label
              htmlFor="vacation"
              className={cn(
                'flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-colors',
                handoverType === 'vacation' && 'border-primary bg-primary/5'
              )}
            >
              <RadioGroupItem value="vacation" id="vacation" className="sr-only" />
              <Briefcase className={cn('h-8 w-8', handoverType === 'vacation' ? 'text-primary' : 'text-muted-foreground')} />
              <span className="font-medium">{t('security.handover.vacation', 'Vacation')}</span>
            </Label>
            <Label
              htmlFor="resignation"
              className={cn(
                'flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-colors',
                handoverType === 'resignation' && 'border-primary bg-primary/5'
              )}
            >
              <RadioGroupItem value="resignation" id="resignation" className="sr-only" />
              <LogOut className={cn('h-8 w-8', handoverType === 'resignation' ? 'text-primary' : 'text-muted-foreground')} />
              <span className="font-medium">{t('security.handover.resignation', 'Resignation')}</span>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Approval Notice */}
      <div className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
        <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />
        <div>
          <p className="font-medium text-amber-700 dark:text-amber-400">
            {t('security.handover.requiresApproval', 'This handover requires manager approval')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('security.handover.requiresApprovalDesc', 'Your handover will be reviewed by the Security Manager before assignment')}
          </p>
        </div>
      </div>

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
        </CardHeader>
        <CardContent className="space-y-3">
          {issues.map((issue) => (
            <div key={issue.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted">
              <div className="flex items-center gap-2 flex-1">
                <Badge variant={getPriorityColor(issue.priority) as any}>{issue.priority}</Badge>
                <span className="text-sm">{issue.description}</span>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveIssue(issue.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={newIssue} onChange={(e) => setNewIssue(e.target.value)} placeholder={t('security.addIssue', 'Add an issue...')} className="flex-1" />
            <Select value={newIssuePriority} onValueChange={(v) => setNewIssuePriority(v as any)}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">{t('common.high', 'High')}</SelectItem>
                <SelectItem value="medium">{t('common.medium', 'Medium')}</SelectItem>
                <SelectItem value="low">{t('common.low', 'Low')}</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" onClick={handleAddIssue}><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('security.equipmentChecklist', 'Equipment Checklist')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {equipment.map((item, index) => (
              <div key={item.item} className="flex items-center justify-between gap-2 p-2 rounded-lg border">
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

      {/* Key Observations */}
      <div className="space-y-2">
        <Label>{t('security.keyObservations', 'Key Observations')}</Label>
        <Textarea value={keyObservations} onChange={(e) => setKeyObservations(e.target.value)} rows={3} />
      </div>

      {/* Priorities */}
      <div className="space-y-2">
        <Label>{t('security.nextShiftPriorities', 'Handover Priorities')}</Label>
        <Textarea value={priorities} onChange={(e) => setPriorities(e.target.value)} rows={2} />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>{t('common.notes', 'Additional Notes')}</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      {/* Signature */}
      <Card className={cn(signatureError && 'border-destructive')}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('security.outgoingSignature', 'Your Signature')} *</CardTitle>
        </CardHeader>
        <CardContent>
          <SignaturePad ref={signaturePadRef} onSignatureChange={(isEmpty) => { if (!isEmpty) setSignatureError(false); }} />
          {signatureError && <p className="text-sm text-destructive mt-2">{t('security.signatureRequired', 'Signature is required')}</p>}
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={createVacationHandover.isPending}>
        {createVacationHandover.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin me-2" />
            {t('common.submitting', 'Submitting...')}
          </>
        ) : (
          t('security.handover.submitForApproval', 'Submit for Approval')
        )}
      </Button>
    </form>
  );
}
