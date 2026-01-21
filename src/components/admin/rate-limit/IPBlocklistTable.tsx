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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Trash2, 
  Shield, 
  ShieldCheck,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { 
  useBlockedIPs, 
  useUnblockIP, 
  useBlockIP,
  useWhitelistIP,
  maskIPAddress,
  type BlockedIP,
} from '@/hooks/admin/use-rate-limit-stats';

export function IPBlocklistTable() {
  const { t } = useTranslation();
  const { data: blockedIPs, isLoading } = useBlockedIPs();
  const unblockMutation = useUnblockIP();
  const blockMutation = useBlockIP();
  const whitelistMutation = useWhitelistIP();
  
  const [confirmAction, setConfirmAction] = useState<{
    type: 'unblock' | 'permanent' | 'whitelist';
    ip: BlockedIP;
  } | null>(null);

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    const { type, ip } = confirmAction;

    switch (type) {
      case 'unblock':
        await unblockMutation.mutateAsync(ip.ip_address);
        break;
      case 'permanent':
        await blockMutation.mutateAsync({
          ip_address: ip.ip_address,
          block_type: 'permanent',
          reason: `Upgraded from temporary block: ${ip.reason}`,
        });
        break;
      case 'whitelist':
        await whitelistMutation.mutateAsync({
          ip_address: ip.ip_address,
          reason: `Whitelisted after review (was blocked: ${ip.reason})`,
        });
        break;
    }

    setConfirmAction(null);
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

  if (!blockedIPs?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ShieldCheck className="h-12 w-12 mb-2" />
        <p>{t('admin.noBlockedIPs', 'No blocked IP addresses')}</p>
        <p className="text-sm">{t('admin.noBlockedIPsDesc', 'All clear! No suspicious IPs are currently blocked.')}</p>
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
              <TableHead>{t('admin.type', 'Type')}</TableHead>
              <TableHead>{t('admin.reason', 'Reason')}</TableHead>
              <TableHead>{t('admin.attempts', 'Attempts')}</TableHead>
              <TableHead>{t('admin.expires', 'Expires')}</TableHead>
              <TableHead>{t('admin.blockedAt', 'Blocked')}</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blockedIPs.map((ip) => (
              <TableRow key={ip.id}>
                <TableCell className="font-mono text-sm">
                  {maskIPAddress(ip.ip_address)}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={ip.block_type === 'permanent' ? 'destructive' : 'secondary'}
                    className="gap-1"
                  >
                    {ip.block_type === 'permanent' ? (
                      <Shield className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {ip.block_type === 'permanent' 
                      ? t('admin.permanent', 'Permanent') 
                      : t('admin.temporary', 'Temporary')}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={ip.reason}>
                  {ip.reason}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {ip.failed_attempts}
                  </Badge>
                </TableCell>
                <TableCell>
                  {ip.expires_at ? (
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(ip.expires_at), { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-sm text-destructive">{t('admin.never', 'Never')}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(ip.blocked_at), 'MMM d, HH:mm')}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setConfirmAction({ type: 'unblock', ip })}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 me-2" />
                        {t('admin.removeBlock', 'Remove Block')}
                      </DropdownMenuItem>
                      {ip.block_type === 'temporary' && (
                        <DropdownMenuItem
                          onClick={() => setConfirmAction({ type: 'permanent', ip })}
                        >
                          <Shield className="h-4 w-4 me-2" />
                          {t('admin.makePermanent', 'Make Permanent')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setConfirmAction({ type: 'whitelist', ip })}
                      >
                        <ShieldCheck className="h-4 w-4 me-2" />
                        {t('admin.addToWhitelist', 'Add to Whitelist')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {confirmAction?.type === 'unblock' && t('admin.confirmUnblock', 'Confirm Unblock')}
              {confirmAction?.type === 'permanent' && t('admin.confirmPermanent', 'Confirm Permanent Block')}
              {confirmAction?.type === 'whitelist' && t('admin.confirmWhitelist', 'Confirm Whitelist')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'unblock' && 
                t('admin.confirmUnblockDesc', 'This IP will be able to make registration requests again. Are you sure?')}
              {confirmAction?.type === 'permanent' && 
                t('admin.confirmPermanentDesc', 'This IP will be permanently blocked and will require manual review to unblock.')}
              {confirmAction?.type === 'whitelist' && 
                t('admin.confirmWhitelistDesc', 'This IP will bypass all rate limiting and blocking. Use with caution.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {t('common.confirm', 'Confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
