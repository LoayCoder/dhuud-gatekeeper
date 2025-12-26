import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RotateCcw, Trash2, User, Users, Pencil, MessageSquare, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useNotificationMatrix,
  useCreateMatrixRule,
  useUpdateMatrixRule,
  useDeleteMatrixRule,
  useResetMatrixToDefaults,
  useNotificationMatrixUsers,
  STAKEHOLDER_ROLES,
  SEVERITY_LEVELS,
  CHANNELS,
  hasChannel,
  toggleChannel,
  type NotificationMatrixRule,
  type StakeholderRole,
} from '@/hooks/use-notification-matrix';
import { useNotificationTemplates } from '@/hooks/useNotificationTemplates';

interface RuleFormState {
  stakeholder_role: StakeholderRole | '';
  severity_from: typeof SEVERITY_LEVELS[number];
  severity_to: typeof SEVERITY_LEVELS[number];
  channels: string[];
  condition_type: string | null;
  user_id: string | null;
  isUserSpecific: boolean;
  whatsapp_template_id: string | null;
  email_template_id: string | null;
}

const getInitialFormState = (): RuleFormState => ({
  stakeholder_role: '',
  severity_from: 'level_1',
  severity_to: 'level_5',
  channels: [],
  condition_type: null,
  user_id: null,
  isUserSpecific: false,
  whatsapp_template_id: null,
  email_template_id: null,
});

export default function NotificationMatrixManagement() {
  const { t } = useTranslation();
  
  const { data: rules, isLoading } = useNotificationMatrix();
  const { data: users } = useNotificationMatrixUsers();
  const { data: templates } = useNotificationTemplates();
  const createMutation = useCreateMatrixRule();
  const updateMutation = useUpdateMatrixRule();
  const deleteMutation = useDeleteMatrixRule();
  const resetMutation = useResetMatrixToDefaults();
  
  // Filter WhatsApp-compatible templates
  const whatsappTemplates = useMemo(() => {
    return templates?.filter(t => t.is_active && t.category === 'incidents') || [];
  }, [templates]);

  // Filter Email-compatible templates
  const emailTemplates = useMemo(() => {
    return templates?.filter(t => t.is_active && t.category === 'incidents') || [];
  }, [templates]);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  
  // Form state for add/edit
  const [formState, setFormState] = useState<RuleFormState>(getInitialFormState());

  // Group rules by stakeholder role or user for display
  const groupedRules = useMemo(() => {
    if (!rules) return {};
    
    const grouped: Record<string, NotificationMatrixRule[]> = {};
    
    rules.forEach((rule) => {
      const key = rule.user_id 
        ? `user_${rule.user_id}` 
        : `role_${rule.stakeholder_role}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(rule);
    });
    
    return grouped;
  }, [rules]);

  const handleChannelToggle = (rule: NotificationMatrixRule, channel: string) => {
    const newChannels = toggleChannel(rule.channels, channel);
    updateMutation.mutate({
      id: rule.id,
      updates: { channels: newChannels },
    });
  };

  const getSeverityIndex = (level: string): number => {
    return SEVERITY_LEVELS.indexOf(level as typeof SEVERITY_LEVELS[number]);
  };

  const handleAddRules = () => {
    if (!formState.stakeholder_role && !formState.user_id) return;
    
    const fromIndex = getSeverityIndex(formState.severity_from);
    const toIndex = getSeverityIndex(formState.severity_to);
    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);
    
    // Create rules for each severity level in the range
    const createPromises: Promise<void>[] = [];
    
    for (let i = startIndex; i <= endIndex; i++) {
      const severityLevel = SEVERITY_LEVELS[i];
      createPromises.push(
        new Promise<void>((resolve, reject) => {
          createMutation.mutate({
            stakeholder_role: formState.stakeholder_role || 'area_owner',
            severity_level: severityLevel,
            channels: formState.channels,
            condition_type: formState.condition_type,
            user_id: formState.isUserSpecific ? formState.user_id : null,
            whatsapp_template_id: formState.channels.includes('whatsapp') ? formState.whatsapp_template_id : null,
            email_template_id: formState.channels.includes('email') ? formState.email_template_id : null,
          }, {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          });
        })
      );
    }
    
    // Close dialog and reset form after creating rules
    setShowAddDialog(false);
    setFormState(getInitialFormState());
  };

  const handleEditGroup = (groupKey: string) => {
    const groupRules = groupedRules[groupKey];
    if (!groupRules || groupRules.length === 0) return;
    
    const firstRule = groupRules[0];
    const isUserSpecific = groupKey.startsWith('user_');
    
    // Find the severity range from existing rules
    const severityLevels = groupRules.map(r => r.severity_level).sort();
    const minSeverity = severityLevels[0] || 'level_1';
    const maxSeverity = severityLevels[severityLevels.length - 1] || 'level_5';
    
    // Get channels from first rule (assuming all rules in group have same channels)
    const channels = firstRule.channels || [];
    
    setFormState({
      stakeholder_role: isUserSpecific ? '' : firstRule.stakeholder_role as StakeholderRole,
      severity_from: minSeverity as typeof SEVERITY_LEVELS[number],
      severity_to: maxSeverity as typeof SEVERITY_LEVELS[number],
      channels: [...channels],
      condition_type: firstRule.condition_type,
      user_id: isUserSpecific ? firstRule.user_id : null,
      isUserSpecific,
      whatsapp_template_id: (firstRule as any).whatsapp_template_id || null,
      email_template_id: (firstRule as any).email_template_id || null,
    });
    
    setEditingGroupKey(groupKey);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingGroupKey) return;
    
    const groupRules = groupedRules[editingGroupKey];
    if (!groupRules) return;
    
    // Delete existing rules in the group
    for (const rule of groupRules) {
      await new Promise<void>((resolve) => {
        deleteMutation.mutate(rule.id, { onSuccess: () => resolve(), onError: () => resolve() });
      });
    }
    
    // Create new rules with updated settings
    const fromIndex = getSeverityIndex(formState.severity_from);
    const toIndex = getSeverityIndex(formState.severity_to);
    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);
    
    for (let i = startIndex; i <= endIndex; i++) {
      const severityLevel = SEVERITY_LEVELS[i];
      await new Promise<void>((resolve) => {
        createMutation.mutate({
          stakeholder_role: formState.stakeholder_role || 'area_owner',
          severity_level: severityLevel,
          channels: formState.channels,
          condition_type: formState.condition_type,
          user_id: formState.isUserSpecific ? formState.user_id : null,
          whatsapp_template_id: formState.channels.includes('whatsapp') ? formState.whatsapp_template_id : null,
          email_template_id: formState.channels.includes('email') ? formState.email_template_id : null,
        }, {
          onSuccess: () => resolve(),
          onError: () => resolve(),
        });
      });
    }
    
    setShowEditDialog(false);
    setEditingGroupKey(null);
    setFormState(getInitialFormState());
  };

  const handleDeleteGroup = (groupKey: string) => {
    const groupRules = groupedRules[groupKey];
    if (!groupRules || groupRules.length === 0) return;
    setRuleToDelete(groupRules[0].id);
  };

  const handleDeleteAllGroupRules = async () => {
    if (!ruleToDelete) return;
    
    // Find which group this rule belongs to
    for (const [key, groupRules] of Object.entries(groupedRules)) {
      if (groupRules.some(r => r.id === ruleToDelete)) {
        // Delete all rules in the group
        for (const rule of groupRules) {
          await new Promise<void>((resolve) => {
            deleteMutation.mutate(rule.id, { onSuccess: () => resolve(), onError: () => resolve() });
          });
        }
        break;
      }
    }
    
    setRuleToDelete(null);
  };

  const getRoleLabel = (role: string) => {
    return t(`settings.notificationMatrix.roles.${role}`, role.replace(/_/g, ' '));
  };

  const getSeverityLabel = (level: string) => {
    const levelNum = level.replace('level_', '');
    return t(`settings.notificationMatrix.severity.level_${levelNum}`);
  };

  const getUserName = (userId: string | null) => {
    if (!userId || !users) return '';
    const user = users.find(u => u.id === userId);
    return user?.full_name || '';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderFormFields = () => (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="isUserSpecific"
          checked={formState.isUserSpecific}
          onCheckedChange={(checked) => setFormState(prev => ({
            ...prev,
            isUserSpecific: !!checked,
            user_id: null,
            stakeholder_role: '',
          }))}
        />
        <label htmlFor="isUserSpecific" className="text-sm">
          {t('settings.notificationMatrix.assignToUser')}
        </label>
      </div>

      {formState.isUserSpecific ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('settings.notificationMatrix.selectUser')}
          </label>
          <Select
            value={formState.user_id || ''}
            onValueChange={(value) => setFormState(prev => ({ ...prev, user_id: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('settings.notificationMatrix.selectUserPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name} {user.job_title && `(${user.job_title})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('settings.notificationMatrix.selectRole')}
          </label>
          <Select
            value={formState.stakeholder_role}
            onValueChange={(value) => setFormState(prev => ({ 
              ...prev, 
              stakeholder_role: value as StakeholderRole 
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('settings.notificationMatrix.selectRolePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {STAKEHOLDER_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {getRoleLabel(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Severity Range Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t('settings.notificationMatrix.severityRange', 'Severity Range')}
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">
              {t('common.from', 'From')}
            </label>
            <Select
              value={formState.severity_from}
              onValueChange={(value) => setFormState(prev => ({ 
                ...prev, 
                severity_from: value as typeof SEVERITY_LEVELS[number]
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {getSeverityLabel(level)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">
              {t('common.to', 'To')}
            </label>
            <Select
              value={formState.severity_to}
              onValueChange={(value) => setFormState(prev => ({ 
                ...prev, 
                severity_to: value as typeof SEVERITY_LEVELS[number]
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {getSeverityLabel(level)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t('settings.notificationMatrix.channelsLabel')}
        </label>
        <div className="flex gap-4 flex-wrap">
          {CHANNELS.map((channel) => (
            <div key={channel} className="flex items-center gap-2">
              <Checkbox
                id={`channel_${channel}`}
                checked={formState.channels.includes(channel)}
                onCheckedChange={(checked) => setFormState(prev => ({
                  ...prev,
                  channels: checked 
                    ? [...prev.channels, channel]
                    : prev.channels.filter(c => c !== channel)
                }))}
              />
              <label htmlFor={`channel_${channel}`} className="text-sm">
                {channel === 'push' && '📱'}
                {channel === 'email' && '✉️'}
                {channel === 'whatsapp' && '💬'}
                {' '}
                {t(`settings.notificationMatrix.channels.${channel}`)}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t('settings.notificationMatrix.conditionLabel')}
        </label>
        <Select
          value={formState.condition_type || 'none'}
          onValueChange={(value) => setFormState(prev => ({ 
            ...prev, 
            condition_type: value === 'none' ? null : value 
          }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              {t('settings.notificationMatrix.noCondition')}
            </SelectItem>
            <SelectItem value="injury">
              {t('settings.notificationMatrix.conditions.injury')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* WhatsApp Template Selector - show when WhatsApp channel is selected */}
      {formState.channels.includes('whatsapp') && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {t('settings.notificationMatrix.whatsappTemplate', 'WhatsApp Template')}
          </Label>
          <Select
            value={formState.whatsapp_template_id || 'default'}
            onValueChange={(value) => setFormState(prev => ({ 
              ...prev, 
              whatsapp_template_id: value === 'default' ? null : value 
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('settings.notificationMatrix.selectTemplate', 'Select template...')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">
                {t('settings.notificationMatrix.defaultTemplate', 'Default System Template')}
              </SelectItem>
              {whatsappTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.slug} ({template.language})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t('settings.notificationMatrix.templateHelp', 'Select a custom template or use the default system message')}
          </p>
        </div>
      )}

      {/* Email Template Selector - show when Email channel is selected */}
      {formState.channels.includes('email') && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {t('settings.notificationMatrix.emailTemplate', 'Email Template')}
          </Label>
          <Select
            value={formState.email_template_id || 'default'}
            onValueChange={(value) => setFormState(prev => ({ 
              ...prev, 
              email_template_id: value === 'default' ? null : value 
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('settings.notificationMatrix.selectTemplate', 'Select template...')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">
                {t('settings.notificationMatrix.defaultTemplate', 'Default System Template')}
              </SelectItem>
              {emailTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.slug} ({template.language})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t('settings.notificationMatrix.emailTemplateHelp', 'Select a custom email template or use the default system email')}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>{t('settings.notificationMatrix.title')}</CardTitle>
              <CardDescription>
                {t('settings.notificationMatrix.description')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetConfirm(true)}
                disabled={resetMutation.isPending}
              >
                <RotateCcw className="h-4 w-4 me-2" />
                {t('settings.notificationMatrix.resetDefaults')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setFormState(getInitialFormState());
                  setShowAddDialog(true);
                }}
              >
                <Plus className="h-4 w-4 me-2" />
                {t('settings.notificationMatrix.addRule')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">
                    {t('settings.notificationMatrix.stakeholder')}
                  </TableHead>
                  {SEVERITY_LEVELS.map((level) => (
                    <TableHead key={level} className="text-center min-w-[120px]">
                      {getSeverityLabel(level)}
                    </TableHead>
                  ))}
                  <TableHead className="w-[100px]">
                    {t('settings.notificationMatrix.condition')}
                  </TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedRules).map(([key, groupRules]) => {
                  const isUserSpecific = key.startsWith('user_');
                  const firstRule = groupRules[0];
                  const displayName = isUserSpecific 
                    ? getUserName(firstRule.user_id) 
                    : getRoleLabel(firstRule.stakeholder_role);
                  
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isUserSpecific ? (
                            <User className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Users className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{displayName}</span>
                          {isUserSpecific && (
                            <Badge variant="secondary" className="text-xs">
                              {t('settings.notificationMatrix.userSpecific')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {SEVERITY_LEVELS.map((level) => {
                        const rule = groupRules.find(r => r.severity_level === level);
                        if (!rule) {
                          return (
                            <TableCell key={level} className="text-center">
                              <span className="text-muted-foreground">—</span>
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={level} className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleChannelToggle(rule, 'push')}
                                className={`p-1 rounded text-lg transition-opacity ${hasChannel(rule.channels, 'push') ? 'opacity-100' : 'opacity-30 hover:opacity-50'}`}
                                title={t('settings.notificationMatrix.channels.push')}
                              >
                                📱
                              </button>
                              <button
                                onClick={() => handleChannelToggle(rule, 'email')}
                                className={`p-1 rounded text-lg transition-opacity ${hasChannel(rule.channels, 'email') ? 'opacity-100' : 'opacity-30 hover:opacity-50'}`}
                                title={t('settings.notificationMatrix.channels.email')}
                              >
                                ✉️
                              </button>
                              <button
                                onClick={() => handleChannelToggle(rule, 'whatsapp')}
                                className={`p-1 rounded text-lg transition-opacity ${hasChannel(rule.channels, 'whatsapp') ? 'opacity-100' : 'opacity-30 hover:opacity-50'}`}
                                title={t('settings.notificationMatrix.channels.whatsapp')}
                              >
                                💬
                              </button>
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        {firstRule.condition_type && (
                          <Badge variant="outline" className="text-xs">
                            {t(`settings.notificationMatrix.conditions.${firstRule.condition_type}`)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditGroup(key)}
                            title={t('common.edit')}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteGroup(key)}
                            title={t('common.delete')}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {Object.keys(groupedRules).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('settings.notificationMatrix.noRules')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">📱 = {t('settings.notificationMatrix.channels.push')}</span>
            <span className="flex items-center gap-1">✉️ = {t('settings.notificationMatrix.channels.email')}</span>
            <span className="flex items-center gap-1">💬 = {t('settings.notificationMatrix.channels.whatsapp')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Add Rule Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.notificationMatrix.addRule')}</DialogTitle>
            <DialogDescription>
              {t('settings.notificationMatrix.addRuleDesc')}
            </DialogDescription>
          </DialogHeader>
          
          {renderFormFields()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleAddRules} 
              disabled={createMutation.isPending || (!formState.stakeholder_role && !formState.user_id)}
            >
              {t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.notificationMatrix.editRule', 'Edit Rule')}</DialogTitle>
            <DialogDescription>
              {t('settings.notificationMatrix.editRuleDesc', 'Update the notification settings for this role or user.')}
            </DialogDescription>
          </DialogHeader>
          
          {renderFormFields()}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditingGroupKey(null);
              setFormState(getInitialFormState());
            }}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={createMutation.isPending || deleteMutation.isPending || (!formState.stakeholder_role && !formState.user_id)}
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.notificationMatrix.confirmReset')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.notificationMatrix.confirmResetDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetMutation.mutate();
                setShowResetConfirm(false);
              }}
            >
              {t('settings.notificationMatrix.resetDefaults')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!ruleToDelete} onOpenChange={() => setRuleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.notificationMatrix.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.notificationMatrix.confirmDeleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllGroupRules}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
