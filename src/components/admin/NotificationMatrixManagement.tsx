import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RotateCcw, Trash2, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function NotificationMatrixManagement() {
  const { t } = useTranslation();
  
  const { data: rules, isLoading } = useNotificationMatrix();
  const { data: users } = useNotificationMatrixUsers();
  const createMutation = useCreateMatrixRule();
  const updateMutation = useUpdateMatrixRule();
  const deleteMutation = useDeleteMatrixRule();
  const resetMutation = useResetMatrixToDefaults();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  
  // New rule form state
  const [newRule, setNewRule] = useState({
    stakeholder_role: '' as StakeholderRole | '',
    severity_level: '1' as typeof SEVERITY_LEVELS[number],
    channels: [] as string[],
    condition_type: null as string | null,
    user_id: null as string | null,
    isUserSpecific: false,
  });

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

  const handleAddRule = () => {
    if (!newRule.stakeholder_role && !newRule.user_id) return;
    
    createMutation.mutate({
      stakeholder_role: newRule.stakeholder_role || 'area_owner',
      severity_level: newRule.severity_level,
      channels: newRule.channels,
      condition_type: newRule.condition_type,
      user_id: newRule.isUserSpecific ? newRule.user_id : null,
    }, {
      onSuccess: () => {
        setShowAddDialog(false);
        setNewRule({
          stakeholder_role: '',
          severity_level: '1',
          channels: [],
          condition_type: null,
          user_id: null,
          isUserSpecific: false,
        });
      },
    });
  };

  const handleDeleteRule = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => setRuleToDelete(null),
    });
  };

  const getRoleLabel = (role: string) => {
    return t(`settings.notificationMatrix.roles.${role}`, role.replace(/_/g, ' '));
  };

  const getSeverityLabel = (level: string) => {
    return t(`settings.notificationMatrix.severity.level_${level}`);
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
                onClick={() => setShowAddDialog(true)}
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
                        {isUserSpecific && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRuleToDelete(firstRule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
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
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isUserSpecific"
                checked={newRule.isUserSpecific}
                onCheckedChange={(checked) => setNewRule(prev => ({
                  ...prev,
                  isUserSpecific: !!checked,
                  user_id: null,
                }))}
              />
              <label htmlFor="isUserSpecific" className="text-sm">
                {t('settings.notificationMatrix.assignToUser')}
              </label>
            </div>

            {newRule.isUserSpecific ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('settings.notificationMatrix.selectUser')}
                </label>
                <Select
                  value={newRule.user_id || ''}
                  onValueChange={(value) => setNewRule(prev => ({ ...prev, user_id: value }))}
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
                  value={newRule.stakeholder_role}
                  onValueChange={(value) => setNewRule(prev => ({ 
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

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('settings.notificationMatrix.severityLevel')}
              </label>
              <Select
                value={newRule.severity_level}
                onValueChange={(value) => setNewRule(prev => ({ 
                  ...prev, 
                  severity_level: value as typeof SEVERITY_LEVELS[number]
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

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('settings.notificationMatrix.channelsLabel')}
              </label>
              <div className="flex gap-4 flex-wrap">
                {CHANNELS.map((channel) => (
                  <div key={channel} className="flex items-center gap-2">
                    <Checkbox
                      id={`channel_${channel}`}
                      checked={newRule.channels.includes(channel)}
                      onCheckedChange={(checked) => setNewRule(prev => ({
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
                value={newRule.condition_type || 'none'}
                onValueChange={(value) => setNewRule(prev => ({ 
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleAddRule} 
              disabled={createMutation.isPending || (!newRule.stakeholder_role && !newRule.user_id)}
            >
              {t('common.add')}
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
              onClick={() => ruleToDelete && handleDeleteRule(ruleToDelete)}
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
