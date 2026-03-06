import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { geofenceEscalationSchema, GeofenceEscalationValues } from './GeofenceEscalationSchema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Plus, Trash2, Edit, Shield } from 'lucide-react';
import {
  useGeofenceEscalationRules,
  useCreateEscalationRule,
  useUpdateEscalationRule,
  useDeleteEscalationRule
} from '@/hooks/use-geofence-escalation';
import { useSecurityZones } from '@/features/security';

const NOTIFY_ROLES = [
  { value: 'security_shift_leader', label: 'Security Shift Leader' },
  { value: 'security_supervisor', label: 'Security Supervisor' },
  { value: 'security_manager', label: 'Security Manager' },
  { value: 'hsse_manager', label: 'HSSE Manager' },
  { value: 'admin', label: 'Admin' },
];

export function GeofenceEscalationSettings() {
  const { t } = useTranslation();
  const { data: rules, isLoading } = useGeofenceEscalationRules();
  const { data: zones } = useSecurityZones();
  const createRule = useCreateEscalationRule();
  const updateRule = useUpdateEscalationRule();
  const deleteRule = useDeleteEscalationRule();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);

  const form = useForm<GeofenceEscalationValues>({
    resolver: zodResolver(geofenceEscalationSchema),
    defaultValues: {
      rule_name: '',
      zone_id: '',
      breach_count_threshold: 3,
      time_window_minutes: 60,
      escalation_level: 1,
      notify_roles: ['security_supervisor'],
      auto_escalate: true,
      escalation_delay_minutes: 5,
    }
  });

  const handleSubmit = async () => {
    const formData = form.getValues();
    const payload = {
      rule_name: formData.rule_name!,
      breach_count_threshold: formData.breach_count_threshold!,
      time_window_minutes: formData.time_window_minutes!,
      escalation_level: formData.escalation_level!,
      notify_roles: formData.notify_roles!,
      auto_escalate: formData.auto_escalate,
      escalation_delay_minutes: formData.escalation_delay_minutes,
      zone_id: formData.zone_id || undefined,
    };
    if (editingRule) {
      await updateRule.mutateAsync({ id: editingRule, ...payload });
    } else {
      await createRule.mutateAsync(payload);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    form.reset({
      rule_name: '',
      zone_id: '',
      breach_count_threshold: 3,
      time_window_minutes: 60,
      escalation_level: 1,
      notify_roles: ['security_supervisor'],
      auto_escalate: true,
      escalation_delay_minutes: 5,
    });
    setEditingRule(null);
  };

  const handleEdit = (rule: typeof rules extends (infer T)[] ? T : never) => {
    form.reset({
      rule_name: rule.rule_name,
      zone_id: rule.zone_id || '',
      breach_count_threshold: rule.breach_count_threshold,
      time_window_minutes: rule.time_window_minutes,
      escalation_level: rule.escalation_level,
      notify_roles: rule.notify_roles || ['security_supervisor'],
      auto_escalate: rule.auto_escalate,
      escalation_delay_minutes: rule.escalation_delay_minutes,
    });
    setEditingRule(rule.id);
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (rule: typeof rules extends (infer T)[] ? T : never) => {
    await updateRule.mutateAsync({
      id: rule.id,
      is_active: !rule.is_active,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {t('security.settings.geofenceEscalation', 'Geofence Escalation Rules')}
            </CardTitle>
            <CardDescription>
              {t('security.settings.geofenceEscalationDesc', 'Configure automatic escalation for geofence breaches')}
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 me-2" />
                {t('common.addRule', 'Add Rule')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingRule
                    ? t('security.settings.editRule', 'Edit Escalation Rule')
                    : t('security.settings.addRule', 'Add Escalation Rule')
                  }
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('security.settings.ruleName', 'Rule Name')}</Label>
                  <Input
                    {...form.register('rule_name')}
                    placeholder={t('security.settings.ruleNamePlaceholder', 'e.g., Critical Zone Breach')}
                  />
                </div>

                <div>
                  <Label>{t('security.settings.zone', 'Zone (Optional)')}</Label>
                  <Controller
                    name="zone_id"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('security.settings.allZones', 'All Zones')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">{t('security.settings.allZones', 'All Zones')}</SelectItem>
                          {zones?.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.zone_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('security.settings.breachThreshold', 'Breach Threshold')}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.watch('breach_count_threshold')}
                      onChange={(e) => form.setValue('breach_count_threshold', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label>{t('security.settings.timeWindow', 'Time Window (min)')}</Label>
                    <Input
                      type="number"
                      min={5}
                      value={form.watch('time_window_minutes')}
                      onChange={(e) => form.setValue('time_window_minutes', parseInt(e.target.value) || 60)}
                    />
                  </div>
                </div>

                <div>
                  <Label>{t('security.settings.escalationLevel', 'Escalation Level')}</Label>
                  <Controller
                    name="escalation_level"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value.toString()}
                        onValueChange={(v) => field.onChange(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Level 1 - Supervisor</SelectItem>
                          <SelectItem value="2">Level 2 - Manager</SelectItem>
                          <SelectItem value="3">Level 3 - HSSE Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label>{t('security.settings.notifyRoles', 'Notify Roles')}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {NOTIFY_ROLES.map((role) => {
                      const currentRoles = form.watch('notify_roles');
                      return (
                        <Badge
                          key={role.value}
                          variant={currentRoles.includes(role.value) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            const updated = currentRoles.includes(role.value)
                              ? currentRoles.filter((r) => r !== role.value)
                              : [...currentRoles, role.value];
                            form.setValue('notify_roles', updated);
                          }}
                        >
                          {role.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>{t('security.settings.autoEscalate', 'Auto Escalate')}</Label>
                  <Controller
                    name="auto_escalate"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <Button onClick={handleSubmit} className="w-full" disabled={!form.watch('rule_name')}>
                  {editingRule ? t('common.save', 'Save') : t('common.create', 'Create')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">{t('common.loading', 'Loading...')}</p>
        ) : rules?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('security.settings.noRules', 'No escalation rules configured')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name', 'Name')}</TableHead>
                <TableHead>{t('security.settings.zone', 'Zone')}</TableHead>
                <TableHead>{t('security.settings.threshold', 'Threshold')}</TableHead>
                <TableHead>{t('security.settings.level', 'Level')}</TableHead>
                <TableHead>{t('common.status', 'Status')}</TableHead>
                <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules?.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.rule_name}</TableCell>
                  <TableCell>{rule.zone?.zone_name || t('security.settings.allZones', 'All Zones')}</TableCell>
                  <TableCell>{rule.breach_count_threshold} in {rule.time_window_minutes}min</TableCell>
                  <TableCell>
                    <Badge variant="outline">Level {rule.escalation_level}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => handleToggleActive(rule)}
                    />
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRule.mutate(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

