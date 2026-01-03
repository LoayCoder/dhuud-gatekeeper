import { useTranslation } from 'react-i18next';
import { LogIn, LogOut, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';

export type GateActionType = 'entry' | 'exit' | 'verify';

interface GateActionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: GateActionType;
  personName: string;
  personType: 'worker' | 'visitor';
  onConfirm: () => void;
  isLoading?: boolean;
  entryTime?: string;
}

export function GateActionConfirmDialog({
  open,
  onOpenChange,
  action,
  personName,
  personType,
  onConfirm,
  isLoading = false,
  entryTime,
}: GateActionConfirmDialogProps) {
  const { t } = useTranslation();

  const getActionConfig = () => {
    switch (action) {
      case 'entry':
        return {
          icon: LogIn,
          title: t('security.gateAction.confirmEntry', 'Confirm Entry'),
          description: t('security.gateAction.confirmEntryDesc', 'Are you sure you want to log entry for {{name}}?', { name: personName }),
          confirmText: t('security.gateAction.logEntry', 'Log Entry'),
          iconColor: 'text-green-600',
          buttonClass: 'bg-green-600 hover:bg-green-700',
        };
      case 'exit':
        return {
          icon: LogOut,
          title: t('security.gateAction.confirmExit', 'Confirm Exit'),
          description: entryTime 
            ? t('security.gateAction.confirmExitDescWithTime', 'Record exit for {{name}}? They entered at {{time}}.', { name: personName, time: entryTime })
            : t('security.gateAction.confirmExitDesc', 'Are you sure you want to record exit for {{name}}?', { name: personName }),
          confirmText: t('security.gateAction.recordExit', 'Record Exit'),
          iconColor: 'text-amber-600',
          buttonClass: 'bg-amber-600 hover:bg-amber-700',
        };
      case 'verify':
        return {
          icon: ShieldCheck,
          title: t('security.gateAction.verifyIdentity', 'Verify Identity'),
          description: t('security.gateAction.verifyIdentityDesc', 'Confirm identity verification for {{name}}?', { name: personName }),
          confirmText: t('security.gateAction.confirmVerify', 'Verify'),
          iconColor: 'text-primary',
          buttonClass: 'bg-primary hover:bg-primary/90',
        };
    }
  };

  const config = getActionConfig();
  const Icon = config.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("p-2 rounded-lg bg-muted border border-border", config.iconColor)}>
              <Icon className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-start">{config.title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-start">
            {config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {action === 'exit' && entryTime && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span className="text-amber-800 dark:text-amber-200">
              {t('security.gateAction.workerOnSiteWarning', '{{type}} is currently on site', { type: personType === 'worker' ? 'Worker' : 'Visitor' })}
            </span>
          </div>
        )}

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isLoading}>
            {t('common.cancel', 'Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className={cn("gap-2", config.buttonClass)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            {config.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
