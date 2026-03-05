
// types and utils imported from local files but local declarations take precedence
import type {} from './types';
import {} from './utils';
import { RuleFormFields } from './components/RuleFormFields';
import { RulesTable } from './components/RulesTable';
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
} from '@/features/notifications';
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
  push_template_id: string | null;
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
  push_template_id: null,
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

export function NotificationMatrixManagement() {
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
  
  // Map event type to template category
  const getCategoryForEventType = (eventType: EventType): string => {
    return eventType === 'incident' ? 'incidents' : 'observations';
  };

  // Filter WhatsApp-compatible templates based on active event type
  const whatsappTemplates = useMemo(() => {
    const category = getCategoryForEventType(activeEventType);
    return templates?.filter(t => t.is_active && t.category === category) || [];
  }, [templates, activeEventType]);

  // Filter Email-compatible templates based on active event type
  const emailTemplates = useMemo(() => {
    const category = getCategoryForEventType(activeEventType);
    return templates?.filter(t => t.is_active && t.category === category) || [];
  }, [templates, activeEventType]);

  // Filter Push-compatible templates based on active event type
  const pushTemplates = useMemo(() => {
    const category = getCategoryForEventType(activeEventType);
    return templates?.filter(t => t.is_active && t.category === category) || [];
  }, [templates, activeEventType]);

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
              push_template_id: formState.channels.includes('push') ? formState.push_template_id : null,
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
      push_template_id: (firstRule as any).push_template_id || null,
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
          push_template_id: formState.channels.includes('push') ? formState.push_template_id : null,
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

          <RulesTable
            groupedRules={groupedRules}
            getUserName={getUserName}
            getRoleLabel={getRoleLabel}
            handleChannelToggle={handleChannelToggle}
            handleEditGroup={handleEditGroup}
            handleDeleteGroup={handleDeleteGroup}
            onAddFirstRule={() => {
              setFormState(getInitialFormState());
              setShowAddDialog(true);
            }}
          />
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
          
          <RuleFormFields
            formState={formState}
            setFormState={setFormState}
            users={users || []}
            getRoleLabel={getRoleLabel}
            getSeverityLabel={getSeverityLabel}
            emailTemplates={emailTemplates as any}
            whatsappTemplates={whatsappTemplates as any}
            pushTemplates={pushTemplates as any}
          />

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
          
          <RuleFormFields
            formState={formState}
            setFormState={setFormState}
            users={users || []}
            getRoleLabel={getRoleLabel}
            getSeverityLabel={getSeverityLabel}
            emailTemplates={emailTemplates as any}
            whatsappTemplates={whatsappTemplates as any}
            pushTemplates={pushTemplates as any}
          />

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


