import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, UserPlus, CalendarPlus, Bell, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SLABulkActionsPanelProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onExport: () => void;
  users?: { id: string; full_name: string }[];
}

export function SLABulkActionsPanel({
  selectedIds,
  onClearSelection,
  onExport,
  users = [],
}: SLABulkActionsPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [extensionDays, setExtensionDays] = useState<number>(7);

  const reassignMutation = useMutation({
    mutationFn: async ({ actionIds, newAssignee }: { actionIds: string[]; newAssignee: string }) => {
      const { error } = await supabase
        .from('corrective_actions')
        .update({ 
          assigned_to: newAssignee,
          updated_at: new Date().toISOString(),
        })
        .in('id', actionIds)
        .eq('tenant_id', profile?.tenant_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-dashboard-actions'] });
      toast.success(t('sla.actionsReassigned', '{{count}} actions reassigned', { count: selectedIds.length }));
      setReassignDialogOpen(false);
      onClearSelection();
    },
    onError: (error) => {
      console.error('Reassign error:', error);
      toast.error(t('common.error', 'An error occurred'));
    },
  });

  const extendMutation = useMutation({
    mutationFn: async ({ actionIds, days }: { actionIds: string[]; days: number }) => {
      // Get current due dates and extend them
      const { data: actions, error: fetchError } = await supabase
        .from('corrective_actions')
        .select('id, due_date')
        .in('id', actionIds);

      if (fetchError) throw fetchError;

      // Update each action with new due date
      const updates = (actions || []).map(action => {
        const currentDue = action.due_date ? new Date(action.due_date) : new Date();
        currentDue.setDate(currentDue.getDate() + days);
        return {
          id: action.id,
          due_date: currentDue.toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      for (const update of updates) {
        const { error } = await supabase
          .from('corrective_actions')
          .update({ due_date: update.due_date, updated_at: update.updated_at })
          .eq('id', update.id)
          .eq('tenant_id', profile?.tenant_id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-dashboard-actions'] });
      toast.success(t('sla.dueDatesExtended', 'Due dates extended by {{days}} days', { days: extensionDays }));
      setExtendDialogOpen(false);
      onClearSelection();
    },
    onError: (error) => {
      console.error('Extend error:', error);
      toast.error(t('common.error', 'An error occurred'));
    },
  });

  const handleReassign = () => {
    if (selectedUser) {
      reassignMutation.mutate({ actionIds: selectedIds, newAssignee: selectedUser });
    }
  };

  const handleExtend = () => {
    extendMutation.mutate({ actionIds: selectedIds, days: extensionDays });
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
        <span className="text-sm text-muted-foreground">
          {t('sla.selectedCount', '{{count}} selected', { count: selectedIds.length })}
        </span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {t('sla.bulkActions', 'Bulk Actions')}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setReassignDialogOpen(true)}>
              <UserPlus className="h-4 w-4 me-2" />
              {t('sla.reassign', 'Reassign')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExtendDialogOpen(true)}>
              <CalendarPlus className="h-4 w-4 me-2" />
              {t('sla.extendDueDate', 'Extend Due Date')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExport}>
              <Download className="h-4 w-4 me-2" />
              {t('sla.exportSelected', 'Export Selected')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          {t('common.clearSelection', 'Clear Selection')}
        </Button>
      </div>

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent dir={direction}>
          <DialogHeader>
            <DialogTitle>{t('sla.reassignActions', 'Reassign Actions')}</DialogTitle>
            <DialogDescription>
              {t('sla.reassignDescription', 'Reassign {{count}} selected actions to a new user', { count: selectedIds.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('sla.newAssignee', 'New Assignee')}</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser} dir={direction}>
                <SelectTrigger>
                  <SelectValue placeholder={t('sla.selectUser', 'Select user')} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleReassign} disabled={!selectedUser || reassignMutation.isPending}>
              {reassignMutation.isPending ? t('common.saving', 'Saving...') : t('sla.reassign', 'Reassign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Due Date Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent dir={direction}>
          <DialogHeader>
            <DialogTitle>{t('sla.extendDueDate', 'Extend Due Date')}</DialogTitle>
            <DialogDescription>
              {t('sla.extendDescription', 'Extend due dates for {{count}} selected actions', { count: selectedIds.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('sla.daysToExtend', 'Days to Extend')}</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={extensionDays}
                onChange={(e) => setExtensionDays(parseInt(e.target.value) || 7)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleExtend} disabled={extendMutation.isPending}>
              {extendMutation.isPending ? t('common.saving', 'Saving...') : t('sla.extend', 'Extend')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
