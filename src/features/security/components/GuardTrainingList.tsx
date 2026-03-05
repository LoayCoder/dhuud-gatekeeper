import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  GraduationCap, 
  Plus, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { 
  useGuardTrainingRecords, 
  useDeleteTrainingRecord,
  GuardTrainingRecord,
  TRAINING_TYPES
} from '@/hooks/use-guard-training';
import { AddTrainingRecordDialog } from './AddTrainingRecordDialog';
import { cn } from '@/lib/utils';

interface GuardTrainingListProps {
  guardId?: string;
  guardName?: string;
  compact?: boolean;
}

export function GuardTrainingList({ guardId, guardName, compact }: GuardTrainingListProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: records, isLoading } = useGuardTrainingRecords(guardId);
  const deleteRecord = useDeleteTrainingRecord();

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return 'valid';
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return 'expired';
    if (daysUntil <= 30) return 'expiring';
    return 'valid';
  };

  const getExpiryBadge = (expiryDate: string | null) => {
    const status = getExpiryStatus(expiryDate);
    switch (status) {
      case 'expired':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{t('security.training.expired', 'Expired')}</Badge>;
      case 'expiring':
        return <Badge className="bg-yellow-500 gap-1"><Clock className="h-3 w-3" />{t('security.training.expiringSoon', 'Expiring Soon')}</Badge>;
      default:
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" />{t('security.training.valid', 'Valid')}</Badge>;
    }
  };

  const getTrainingTypeLabel = (type: string) => {
    return TRAINING_TYPES.find(t => t.value === type)?.label || type;
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            {t('security.training.title', 'Training Records')}
          </h4>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3 w-3 me-1" />
            {t('common.add', 'Add')}
          </Button>
        </div>
        {isLoading ? (
          <div className="space-y-1">{[1, 2].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}</div>
        ) : records?.length ? (
          <div className="space-y-1">
            {records.slice(0, 3).map(r => (
              <div key={r.id} className={cn(
                "flex items-center justify-between p-2 rounded text-sm",
                getExpiryStatus(r.expiry_date) === 'expired' && "bg-destructive/10",
                getExpiryStatus(r.expiry_date) === 'expiring' && "bg-yellow-500/10",
                getExpiryStatus(r.expiry_date) === 'valid' && "bg-muted"
              )}>
                <span>{getTrainingTypeLabel(r.training_type)}</span>
                {r.expiry_date && getExpiryBadge(r.expiry_date)}
              </div>
            ))}
            {records.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">+{records.length - 3} more</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('security.training.noRecords', 'No training records')}</p>
        )}
        <AddTrainingRecordDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen} 
          guardId={guardId}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {guardName 
              ? t('security.training.guardTraining', '{{name}} - Training Records', { name: guardName })
              : t('security.training.title', 'Training Records')
            }
          </CardTitle>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t('security.training.add', 'Add Training')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
        ) : records?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('security.training.type', 'Type')}</TableHead>
                <TableHead>{t('security.training.name', 'Name')}</TableHead>
                <TableHead>{t('security.training.provider', 'Provider')}</TableHead>
                <TableHead>{t('security.training.completed', 'Completed')}</TableHead>
                <TableHead>{t('security.training.expiry', 'Expiry')}</TableHead>
                <TableHead>{t('security.training.status', 'Status')}</TableHead>
                <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{getTrainingTypeLabel(r.training_type)}</TableCell>
                  <TableCell>{r.training_name}</TableCell>
                  <TableCell>{r.training_provider || '-'}</TableCell>
                  <TableCell>{format(new Date(r.completion_date), 'PP')}</TableCell>
                  <TableCell>{r.expiry_date ? format(new Date(r.expiry_date), 'PP') : '-'}</TableCell>
                  <TableCell>
                    {r.expiry_date ? getExpiryBadge(r.expiry_date) : (
                      <Badge variant="outline">{t('security.training.noExpiry', 'No Expiry')}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      {r.certificate_url && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={r.certificate_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('security.training.deleteConfirm', 'Delete this training record?')}</AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteRecord.mutate(r.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              {t('common.delete', 'Delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center py-12">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('security.training.noRecords', 'No training records')}</p>
          </div>
        )}
      </CardContent>
      <AddTrainingRecordDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        guardId={guardId}
      />
    </Card>
  );
}
