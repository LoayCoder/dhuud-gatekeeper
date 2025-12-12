import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCheck, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenantUsers } from '@/hooks/use-department-users';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DelegateVerifierDialogProps {
  actionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DelegateVerifierDialog({
  actionId,
  open,
  onOpenChange,
}: DelegateVerifierDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVerifier, setSelectedVerifier] = useState('');

  const { data: users, isLoading: usersLoading } = useTenantUsers();

  // Filter out current user and get potential verifiers
  const potentialVerifiers = users?.filter(u => u.id !== user?.id) || [];

  const delegateMutation = useMutation({
    mutationFn: async ({ actionId, verifierId }: { actionId: string; verifierId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('corrective_actions')
        .update({
          delegated_verifier_id: verifierId,
          delegated_at: new Date().toISOString(),
          delegated_by: user.id,
        })
        .eq('id', actionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-action-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      toast({
        title: t('common.success'),
        description: t('actions.verifierDelegated', 'Verifier successfully assigned'),
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDelegate = () => {
    if (!actionId || !selectedVerifier) return;
    delegateMutation.mutate({ actionId, verifierId: selectedVerifier });
  };

  const handleClose = () => {
    setSelectedVerifier('');
    onOpenChange(false);
  };

  useEffect(() => {
    if (open) {
      setSelectedVerifier('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            {t('actions.delegateVerifier', 'Delegate Verifier')}
          </DialogTitle>
          <DialogDescription>
            {t('actions.delegateVerifierDescription', 'Assign another user to verify this action (e.g., department supervisor or safety officer).')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verifier">
              {t('actions.selectVerifier', 'Select Verifier')} *
            </Label>
            <Select value={selectedVerifier} onValueChange={setSelectedVerifier}>
              <SelectTrigger id="verifier">
                <SelectValue placeholder={t('actions.selectVerifierPlaceholder', 'Choose a user...')} />
              </SelectTrigger>
              <SelectContent>
                {usersLoading ? (
                  <div className="p-2 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </div>
                ) : potentialVerifiers.length > 0 ? (
                  potentialVerifiers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name} {u.job_title ? `(${u.job_title})` : ''}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-center text-muted-foreground">
                    {t('common.noResults', 'No users found')}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleDelegate}
            disabled={!selectedVerifier || delegateMutation.isPending}
          >
            {delegateMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {t('actions.assignVerifier', 'Assign Verifier')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
