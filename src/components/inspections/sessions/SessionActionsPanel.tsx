import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  User
} from 'lucide-react';
import { useSessionActions, InspectionAction } from '@/hooks/use-inspection-actions';
import { ActionVerificationDialog } from './ActionVerificationDialog';

interface SessionActionsPanelProps {
  sessionId: string;
  canVerify?: boolean;
}

export function SessionActionsPanel({ sessionId, canVerify = false }: SessionActionsPanelProps) {
  const { t } = useTranslation();
  const { data: actions, isLoading } = useSessionActions(sessionId);
  const [selectedAction, setSelectedAction] = useState<InspectionAction | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
      case 'closed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'completed':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <ClipboardCheck className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'verified':
      case 'closed':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'completed':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleVerifyClick = (action: InspectionAction) => {
    setSelectedAction(action);
    setVerifyDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('actions.sessionActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingVerification = actions?.filter(a => a.status === 'completed') || [];
  const openActions = actions?.filter(a => !['verified', 'closed', 'rejected'].includes(a.status)) || [];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              {t('actions.sessionActions')}
            </CardTitle>
            {openActions.length > 0 && (
              <Badge variant="secondary">
                {openActions.length} {t('actions.open')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!actions || actions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('actions.noActions')}
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {actions.map((action) => (
                  <div 
                    key={action.id}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getStatusIcon(action.status)}
                        <span className="font-medium truncate">{action.title}</span>
                      </div>
                      <Badge variant={getStatusVariant(action.status)} className="shrink-0">
                        {t(`actions.statusLabels.${action.status}`)}
                      </Badge>
                    </div>
                    
                    {action.assigned_user && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        {action.assigned_user.full_name}
                      </div>
                    )}

                    {action.due_date && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(action.due_date).toLocaleDateString()}
                      </div>
                    )}

                    {/* Verify button for completed actions */}
                    {action.status === 'completed' && canVerify && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleVerifyClick(action)}
                        className="w-full mt-2"
                      >
                        <AlertTriangle className="h-4 w-4 me-2" />
                        {t('actions.verifyAction')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {pendingVerification.length > 0 && (
            <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {t('actions.pendingVerificationCount', { count: pendingVerification.length })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ActionVerificationDialog
        open={verifyDialogOpen}
        onOpenChange={setVerifyDialogOpen}
        action={selectedAction}
      />
    </>
  );
}
