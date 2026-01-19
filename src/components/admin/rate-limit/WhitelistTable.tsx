import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Trash2, 
  ShieldCheck,
  Clock,
  Infinity,
} from 'lucide-react';
import { 
  useWhitelistedIPs, 
  useRemoveFromWhitelist,
  maskIPAddress,
  type WhitelistedIP,
} from '@/hooks/admin/use-rate-limit-stats';

export function WhitelistTable() {
  const { t } = useTranslation();
  const { data: whitelistedIPs, isLoading } = useWhitelistedIPs();
  const removeMutation = useRemoveFromWhitelist();
  
  const [confirmRemove, setConfirmRemove] = useState<WhitelistedIP | null>(null);

  const handleRemove = async () => {
    if (!confirmRemove) return;
    await removeMutation.mutateAsync(confirmRemove.id);
    setConfirmRemove(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!whitelistedIPs?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ShieldCheck className="h-12 w-12 mb-2" />
        <p>{t('admin.noWhitelistedIPs', 'No whitelisted IP addresses')}</p>
        <p className="text-sm">{t('admin.noWhitelistedIPsDesc', 'Add trusted IPs to bypass rate limiting.')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.ipAddress', 'IP Address')}</TableHead>
              <TableHead>{t('admin.reason', 'Reason')}</TableHead>
              <TableHead>{t('admin.expires', 'Expires')}</TableHead>
              <TableHead>{t('admin.addedAt', 'Added')}</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {whitelistedIPs.map((ip) => (
              <TableRow key={ip.id}>
                <TableCell className="font-mono text-sm">
                  {maskIPAddress(ip.ip_address)}
                </TableCell>
                <TableCell className="max-w-[250px] truncate" title={ip.reason}>
                  {ip.reason}
                </TableCell>
                <TableCell>
                  {ip.expires_at ? (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(ip.expires_at), { addSuffix: true })}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Infinity className="h-3 w-3" />
                      {t('admin.permanent', 'Permanent')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(ip.created_at), 'MMM d, yyyy HH:mm')}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmRemove(ip)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('admin.confirmRemoveWhitelist', 'Remove from Whitelist?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.confirmRemoveWhitelistDesc', 'This IP will no longer bypass rate limiting and may be subject to blocking if suspicious activity is detected.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.remove', 'Remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
