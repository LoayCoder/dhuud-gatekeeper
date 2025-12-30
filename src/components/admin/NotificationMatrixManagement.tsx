import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  RotateCcw, 
  Trash2, 
  User, 
  Users, 
  Pencil, 
  MessageCircle, 
  Mail, 
  Smartphone,
  BellOff,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
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
  EVENT_TYPES,
  hasChannel,
  toggleChannel,
  type NotificationMatrixRule,
  type StakeholderRole,
  type EventType,
} from '@/hooks/use-notification-matrix';
import { useNotificationTemplates } from '@/hooks/useNotificationTemplates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  event_type: EventType;
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
  event_type: 'incident',
});

// Severity level colors following HSSA standards
const SEVERITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  level_1: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Low' },
  level_2: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Moderate' },
  level_3: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'Serious' },
  level_4: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Major' },
  level_5: { bg: 'bg-red-200 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300', label: 'Catastrophic' },
};

// Channel icon component
const ChannelIcon = ({ channel, active, size = 'sm' }: { channel: string; active: boolean; size?: 'sm' | 'md' }) => {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const iconClass = cn(iconSize, active ? 'text-primary' : 'text-muted-foreground/30');
  
  switch (channel) {
    case 'push':
      return <Smartphone className={iconClass} />;
    case 'email':
      return <Mail className={iconClass} />;
    case 'whatsapp':
      return <MessageCircle className={iconClass} />;
    default:
      return null;
  }
};

export default function NotificationMatrixManagement() {
  const { t } = useTranslation();
  
  // Active event type tab
  const [activeEventType, setActiveEventType] = useState<EventType>('incident');
  
  const { data: rules, isLoading } = useNotificationMatrix(activeEventType);
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
              event_type: activeEventType, // Use active tab's event type
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
      event_type: activeEventType,
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
          event_type: activeEventType, // Use active tab's event type
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
      <Card className="border-border/50">
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
    <div className="space-y-6 py-4">
      {/* Section 1: Recipient Type */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-primary rounded-full" />
          <h4 className="text-sm font-semibold text-foreground">
            {t('settings.notificationMatrix.recipientType', 'Recipient Type')}
          </h4>
        </div>
        
        <div className="flex gap-4 ps-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="recipientType"
              checked={!formState.isUserSpecific}
              onChange={() => setFormState(prev => ({
                ...prev,
                isUserSpecific: false,
                user_id: null,
              }))}
              className="h-4 w-4 text-primary"
            />
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{t('settings.notificationMatrix.roleBased', 'Role-based')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="recipientType"
              checked={formState.isUserSpecific}
              onChange={() => setFormState(prev => ({
                ...prev,
                isUserSpecific: true,
                stakeholder_role: '',
              }))}
              className="h-4 w-4 text-primary"
            />
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{t('settings.notificationMatrix.userSpecific', 'User-specific')}</span>
          </label>
        </div>

        <div className="ps-3">
          {formState.isUserSpecific ? (
            <Select
              value={formState.user_id || ''}
              onValueChange={(value) => setFormState(prev => ({ ...prev, user_id: value }))}
            >
              <SelectTrigger className="bg-background">
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
          ) : (
            <Select
              value={formState.stakeholder_role}
              onValueChange={(value) => setFormState(prev => ({ 
                ...prev, 
                stakeholder_role: value as StakeholderRole 
              }))}
            >
              <SelectTrigger className="bg-background">
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
          )}
        </div>
      </div>

      <Separator />

      {/* Section 2: Severity Range */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-primary rounded-full" />
          <h4 className="text-sm font-semibold text-foreground">
            {t('settings.notificationMatrix.severityRange', 'Severity Range')}
          </h4>
        </div>
        
        <div className="flex items-center gap-3 ps-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              {t('common.from', 'From')}
            </Label>
            <Select
              value={formState.severity_from}
              onValueChange={(value) => setFormState(prev => ({ 
                ...prev, 
                severity_from: value as typeof SEVERITY_LEVELS[number]
              }))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_LEVELS.map((level) => {
                  const colors = SEVERITY_COLORS[level];
                  return (
                    <SelectItem key={level} value={level}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', colors.bg, colors.text)} />
                        {getSeverityLabel(level)}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground mt-5" />
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              {t('common.to', 'To')}
            </Label>
            <Select
              value={formState.severity_to}
              onValueChange={(value) => setFormState(prev => ({ 
                ...prev, 
                severity_to: value as typeof SEVERITY_LEVELS[number]
              }))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_LEVELS.map((level) => {
                  const colors = SEVERITY_COLORS[level];
                  return (
                    <SelectItem key={level} value={level}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', colors.bg, colors.text)} />
                        {getSeverityLabel(level)}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Section 3: Notification Channels */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-primary rounded-full" />
          <h4 className="text-sm font-semibold text-foreground">
            {t('settings.notificationMatrix.channelsLabel', 'Notification Channels')}
          </h4>
        </div>
        
        <div className="flex gap-6 ps-3 flex-wrap">
          {CHANNELS.map((channel) => (
            <label key={channel} className="flex items-center gap-2.5 cursor-pointer group">
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
              <ChannelIcon channel={channel} active={formState.channels.includes(channel)} size="md" />
              <span className={cn(
                "text-sm transition-colors",
                formState.channels.includes(channel) ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {t(`settings.notificationMatrix.channels.${channel}`)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Section 4: Templates (conditional) */}
      {(formState.channels.includes('whatsapp') || formState.channels.includes('email')) && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 bg-primary rounded-full" />
              <h4 className="text-sm font-semibold text-foreground">
                {t('settings.notificationMatrix.templates', 'Message Templates')}
              </h4>
            </div>
            
            <div className="space-y-4 ps-3">
              {formState.channels.includes('email') && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {t('settings.notificationMatrix.emailTemplate', 'Email Template')}
                  </Label>
                  <Select
                    value={formState.email_template_id || 'default'}
                    onValueChange={(value) => setFormState(prev => ({ 
                      ...prev, 
                      email_template_id: value === 'default' ? null : value 
                    }))}
                  >
                    <SelectTrigger className="bg-background">
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
                </div>
              )}

              {formState.channels.includes('whatsapp') && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    {t('settings.notificationMatrix.whatsappTemplate', 'WhatsApp Template')}
                  </Label>
                  <Select
                    value={formState.whatsapp_template_id || 'default'}
                    onValueChange={(value) => setFormState(prev => ({ 
                      ...prev, 
                      whatsapp_template_id: value === 'default' ? null : value 
                    }))}
                  >
                    <SelectTrigger className="bg-background">
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
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Section 5: Conditions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-primary rounded-full" />
          <h4 className="text-sm font-semibold text-foreground">
            {t('settings.notificationMatrix.conditionLabel', 'Conditions')}
          </h4>
        </div>
        
        <div className="ps-3">
          <Select
            value={formState.condition_type || 'none'}
            onValueChange={(value) => setFormState(prev => ({ 
              ...prev, 
              condition_type: value === 'none' ? null : value 
            }))}
          >
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                {t('settings.notificationMatrix.noCondition', 'No condition (always notify)')}
              </SelectItem>
              <SelectItem value="injury">
                {t('settings.notificationMatrix.conditions.injury', 'Only when injury reported')}
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1.5">
            {t('settings.notificationMatrix.conditionHelp', 'Conditions filter when notifications are sent')}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">
                {t('settings.notificationMatrix.title')}
              </CardTitle>
              <CardDescription className="text-sm">
                {t('settings.notificationMatrix.description')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetConfirm(true)}
                disabled={resetMutation.isPending}
                className="h-9"
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
                className="h-9"
              >
                <Plus className="h-4 w-4 me-2" />
                {t('settings.notificationMatrix.addRule')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Event Type Tabs */}
          <Tabs value={activeEventType} onValueChange={(v) => setActiveEventType(v as EventType)} className="mb-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="incident" className="gap-2">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                {t('settings.notificationMatrix.eventTypes.incident', 'Incidents')}
              </TabsTrigger>
              <TabsTrigger value="observation" className="gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {t('settings.notificationMatrix.eventTypes.observation', 'Observations')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Legend */}
          <div className="flex items-center gap-6 text-xs text-muted-foreground mb-4 pb-3 border-b border-border/50">
            <span className="flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5" />
              {t('settings.notificationMatrix.channels.push')}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {t('settings.notificationMatrix.channels.email')}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" />
              {t('settings.notificationMatrix.channels.whatsapp')}
            </span>
          </div>

          {Object.keys(groupedRules).length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 px-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <BellOff className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground mb-2">
                {t('settings.notificationMatrix.noRules', 'No notification rules configured')}
              </p>
              <p className="text-sm text-muted-foreground/70 mb-6 max-w-sm mx-auto">
                {t('settings.notificationMatrix.noRulesDesc', 'Add rules to define who gets notified for each incident severity level')}
              </p>
              <Button 
                onClick={() => {
                  setFormState(getInitialFormState());
                  setShowAddDialog(true);
                }}
              >
                <Plus className="h-4 w-4 me-2" />
                {t('settings.notificationMatrix.addFirstRule', 'Add Your First Rule')}
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[200px] font-semibold">
                      {t('settings.notificationMatrix.stakeholder')}
                    </TableHead>
                    {SEVERITY_LEVELS.map((level) => {
                      const colors = SEVERITY_COLORS[level];
                      const levelNum = level.replace('level_', '');
                      return (
                        <TableHead key={level} className="text-center min-w-[100px] p-2">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              'font-medium text-xs px-2 py-0.5',
                              colors.bg, 
                              colors.text,
                              'border-0'
                            )}
                          >
                            L{levelNum}
                          </Badge>
                        </TableHead>
                      );
                    })}
                    <TableHead className="w-[80px] text-center">
                      {t('settings.notificationMatrix.condition', 'Cond.')}
                    </TableHead>
                    <TableHead className="w-[80px]"></TableHead>
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
                      <TableRow key={key} className="hover:bg-muted/20">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-1.5 rounded-md",
                              isUserSpecific ? "bg-blue-100 dark:bg-blue-900/30" : "bg-muted"
                            )}>
                              {isUserSpecific ? (
                                <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </div>
                            <span className="text-sm">{displayName}</span>
                          </div>
                        </TableCell>
                        {SEVERITY_LEVELS.map((level) => {
                          const rule = groupRules.find(r => r.severity_level === level);
                          if (!rule) {
                            return (
                              <TableCell key={level} className="text-center p-2">
                                <span className="text-muted-foreground/30">—</span>
                              </TableCell>
                            );
                          }
                          return (
                            <TableCell key={level} className="text-center p-2">
                              <div className="inline-flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
                                {CHANNELS.map((channel) => {
                                  const isActive = hasChannel(rule.channels, channel);
                                  return (
                                    <button
                                      key={channel}
                                      onClick={() => handleChannelToggle(rule, channel)}
                                      className={cn(
                                        "p-1.5 rounded transition-all",
                                        isActive && "bg-background shadow-sm"
                                      )}
                                      title={t(`settings.notificationMatrix.channels.${channel}`)}
                                    >
                                      <ChannelIcon channel={channel} active={isActive} />
                                    </button>
                                  );
                                })}
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center p-2">
                          {firstRule.condition_type ? (
                            <Badge variant="outline" className="text-xs font-normal">
                              {t(`settings.notificationMatrix.conditions.${firstRule.condition_type}`)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </TableCell>
                        <TableCell className="p-2">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditGroup(key)}
                              title={t('common.edit')}
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteGroup(key)}
                              title={t('common.delete')}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Rule Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settings.notificationMatrix.addRule')}</DialogTitle>
            <DialogDescription>
              {t('settings.notificationMatrix.addRuleDesc')}
            </DialogDescription>
          </DialogHeader>
          
          {renderFormFields()}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleAddRules} 
              disabled={createMutation.isPending || (!formState.stakeholder_role && !formState.user_id) || formState.channels.length === 0}
            >
              {t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settings.notificationMatrix.editRule', 'Edit Rule')}</DialogTitle>
            <DialogDescription>
              {t('settings.notificationMatrix.editRuleDesc', 'Update the notification settings for this role or user.')}
            </DialogDescription>
          </DialogHeader>
          
          {renderFormFields()}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditingGroupKey(null);
              setFormState(getInitialFormState());
            }}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={createMutation.isPending || deleteMutation.isPending || (!formState.stakeholder_role && !formState.user_id) || formState.channels.length === 0}
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
