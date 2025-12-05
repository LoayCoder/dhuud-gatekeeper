import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useManagerTeam } from '@/hooks/use-manager-team';

interface TeamAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentManagerId?: string | null;
  onAssigned?: () => void;
}

interface ManagerOption {
  id: string;
  full_name: string | null;
}

export function TeamAssignmentDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentManagerId,
  onAssigned,
}: TeamAssignmentDialogProps) {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const { assignToTeam, removeFromTeam } = useManagerTeam();
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(currentManagerId || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const direction = i18n.dir();

  // Fetch users who have the manager role - with proper role verification
  useEffect(() => {
    async function fetchManagers() {
      if (!profile?.tenant_id) return;
      
      setIsFetching(true);
      try {
        // Get users with manager role from new system using has_role_by_code for security
        const { data: managerRoleAssignments } = await supabase
          .from('user_role_assignments')
          .select(`
            user_id,
            roles!inner(code)
          `)
          .eq('tenant_id', profile.tenant_id)
          .eq('roles.code', 'manager');

        const managerUserIds = (managerRoleAssignments || []).map((a: any) => a.user_id);
        
        if (managerUserIds.length === 0) {
          setManagers([]);
          return;
        }

        // Verify each user actually has manager role using server-side function
        const verifiedManagerIds: string[] = [];
        for (const managerId of managerUserIds) {
          const { data: hasManagerRole } = await supabase
            .rpc('has_role_by_code', { p_user_id: managerId, p_role_code: 'manager' });
          if (hasManagerRole) {
            verifiedManagerIds.push(managerId);
          }
        }

        if (verifiedManagerIds.length === 0) {
          setManagers([]);
          return;
        }

        // Fetch profile details for verified managers
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', verifiedManagerIds)
          .neq('id', userId) // Exclude current user
          .eq('is_active', true);

        setManagers(profiles || []);
      } catch (error) {
        console.error('Error fetching managers:', error);
      } finally {
        setIsFetching(false);
      }
    }

    if (open) {
      fetchManagers();
      setSelectedManagerId(currentManagerId || null);
    }
  }, [open, profile?.tenant_id, userId, currentManagerId]);

  const handleAssign = async () => {
    setIsLoading(true);
    try {
      // Remove from current manager if exists
      if (currentManagerId && currentManagerId !== selectedManagerId) {
        await removeFromTeam(userId, currentManagerId);
      }

      // Assign to new manager
      if (selectedManagerId) {
        await assignToTeam(userId, selectedManagerId);
        toast({
          title: t('hierarchy.userAssigned'),
          description: t('hierarchy.userAssignedDescription', { name: userName }),
        });
      } else if (currentManagerId) {
        // Just removing from team
        toast({
          title: t('hierarchy.userRemoved'),
          description: t('hierarchy.userRemovedDescription', { name: userName }),
        });
      }

      onAssigned?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={direction}>
        <DialogHeader>
          <DialogTitle className="text-start">
            {t('hierarchy.assignToTeam')}
          </DialogTitle>
          <DialogDescription className="text-start">
            {t('hierarchy.assignToTeamDescription', { name: userName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2 text-start">
            <Label>{t('hierarchy.selectManager')}</Label>
            {isFetching ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : managers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                {t('hierarchy.noManagersFound')}
              </p>
            ) : (
              <Select
                value={selectedManagerId || 'none'}
                onValueChange={(v) => setSelectedManagerId(v === 'none' ? null : v)}
                dir={direction}
              >
                <SelectTrigger className="text-start">
                  <SelectValue placeholder={t('hierarchy.selectManagerPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="bg-background" dir={direction}>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">{t('hierarchy.noManager')}</span>
                  </SelectItem>
                  {managers.map(manager => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.full_name || t('common.unknown')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {currentManagerId && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">
                {t('hierarchy.currentManager')}:
              </span>
              <Badge variant="outline">
                {managers.find(m => m.id === currentManagerId)?.full_name || t('common.unknown')}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ms-auto"
                onClick={() => setSelectedManagerId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isLoading || (selectedManagerId === currentManagerId)}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {selectedManagerId ? t('hierarchy.assign') : t('hierarchy.removeFromTeam')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
