import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { Label } from '@/components/ui/label';
import { Search, MoreHorizontal, UserPlus, QrCode, ShieldAlert, Eye, RefreshCw, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVisitors, useUpdateVisitor, useResetVisitorQR } from '@/hooks/use-visitors';
import { useResendVisitorInvitation } from '@/hooks/use-visit-requests';
import { useAddToBlacklist, useBlacklistNationalIds } from '@/hooks/use-security-blacklist';
import { format } from 'date-fns';
import { VisitorDetailDialog } from '@/components/visitors/VisitorDetailDialog';
import { cn } from '@/lib/utils';

export default function VisitorList() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [blacklistDialog, setBlacklistDialog] = useState<{
    open: boolean;
    visitor: { id: string; full_name: string; national_id: string } | null;
    reason: string;
  }>({ open: false, visitor: null, reason: '' });
  
  const { data: visitors, isLoading } = useVisitors({ search: search || undefined });
  const { data: blacklistedIds } = useBlacklistNationalIds();
  const updateVisitor = useUpdateVisitor();
  const addToBlacklist = useAddToBlacklist();
  const resetVisitorQR = useResetVisitorQR();
  const resendInvitation = useResendVisitorInvitation();

  const isBlacklisted = (nationalId: string | null) => {
    if (!nationalId || !blacklistedIds) return false;
    return blacklistedIds.has(nationalId);
  };

  const handleOpenBlacklistDialog = (visitor: { id: string; full_name: string; national_id: string | null }) => {
    if (!visitor.national_id) return;
    setBlacklistDialog({
      open: true,
      visitor: { id: visitor.id, full_name: visitor.full_name, national_id: visitor.national_id },
      reason: '',
    });
  };

  const handleConfirmBlacklist = async () => {
    if (!blacklistDialog.visitor || !blacklistDialog.reason) return;
    
    await addToBlacklist.mutateAsync({
      full_name: blacklistDialog.visitor.full_name,
      national_id: blacklistDialog.visitor.national_id,
      reason: blacklistDialog.reason,
      visitorId: blacklistDialog.visitor.id,
    });
    
    setBlacklistDialog({ open: false, visitor: null, reason: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('visitors.list.title')}</h1>
          <p className="text-muted-foreground">{t('visitors.list.description')}</p>
        </div>
        <Button asChild>
          <Link to="/visitors/register">
            <UserPlus className="me-2 h-4 w-4" />
            {t('visitors.register.title')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t('visitors.list.allVisitors')}</CardTitle>
              <CardDescription>{t('visitors.list.allVisitorsDescription')}</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('visitors.list.searchPlaceholder')}
                className="ps-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
          ) : visitors?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('visitors.list.noVisitors')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('visitors.fields.name')}</TableHead>
                    <TableHead>{t('visitors.fields.company')}</TableHead>
                    <TableHead>{t('visitors.fields.phone', 'Phone')}</TableHead>
                    <TableHead>{t('visitors.fields.nationalId')}</TableHead>
                    <TableHead>{t('visitors.fields.lastVisit')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitors?.map((visitor) => {
                    const blacklisted = isBlacklisted(visitor.national_id);
                    return (
                      <TableRow 
                        key={visitor.id}
                        className={cn(
                          blacklisted && "bg-destructive/10 border-s-4 border-s-destructive"
                        )}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {blacklisted && (
                              <ShieldAlert className="h-4 w-4 text-destructive flex-shrink-0" />
                            )}
                            <span className={cn(blacklisted && "text-destructive font-semibold")}>
                              {visitor.full_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{visitor.company_name || '-'}</TableCell>
                        <TableCell>{visitor.phone || '-'}</TableCell>
                        <TableCell>{visitor.national_id || '-'}</TableCell>
                        <TableCell>
                          {visitor.last_visit_at 
                            ? format(new Date(visitor.last_visit_at), 'PP')
                            : t('visitors.list.neverVisited')}
                        </TableCell>
                        <TableCell>
                          {blacklisted ? (
                            <Badge variant="destructive" className="gap-1">
                              <ShieldAlert className="h-3 w-3" />
                              {t('visitors.blacklist.warning', 'Blacklisted')}
                            </Badge>
                          ) : (
                            <Badge variant={visitor.is_active ? 'default' : 'secondary'}>
                              {visitor.is_active ? t('common.active') : t('common.inactive')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedVisitorId(visitor.id)}>
                                <Eye className="me-2 h-4 w-4" />
                                {t('common.view')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedVisitorId(visitor.id)}>
                                <QrCode className="me-2 h-4 w-4" />
                                {t('visitors.list.viewQR')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => resetVisitorQR.mutate(visitor.id)}>
                                <RefreshCw className="me-2 h-4 w-4" />
                                {t('visitors.list.resetQR')}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => resendInvitation.mutate({ visitorId: visitor.id })}
                                disabled={resendInvitation.isPending || !visitor.is_active}
                              >
                                <Send className="me-2 h-4 w-4" />
                                {t('visitors.list.resendInvitation', 'Resend Invitation')}
                              </DropdownMenuItem>
                              {/* Only show blacklist option if not already blacklisted */}
                              {visitor.national_id && visitor.is_active && !blacklisted && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleOpenBlacklistDialog(visitor)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <ShieldAlert className="me-2 h-4 w-4" />
                                    {t('visitors.blacklist.addTo')}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <VisitorDetailDialog 
        visitorId={selectedVisitorId}
        open={!!selectedVisitorId}
        onOpenChange={(open) => !open && setSelectedVisitorId(null)}
      />

      {/* Blacklist Confirmation Dialog */}
      <AlertDialog open={blacklistDialog.open} onOpenChange={(open) => !open && setBlacklistDialog({ open: false, visitor: null, reason: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              {t('visitors.blacklist.confirmTitle', 'Add to Security Blacklist')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('visitors.blacklist.confirmDesc', 'This will permanently blacklist this visitor. They will not be able to access any facility and all pending visit requests will be rejected.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <p className="text-sm font-medium">
              {t('visitors.fields.name')}: <span className="font-bold">{blacklistDialog.visitor?.full_name}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="blacklist-reason-list">{t('visitors.blacklist.reasonLabel', 'Reason for blacklisting')} *</Label>
              <Input
                id="blacklist-reason-list"
                value={blacklistDialog.reason}
                onChange={(e) => setBlacklistDialog(prev => ({ ...prev, reason: e.target.value }))}
                placeholder={t('visitors.blacklist.reasonPlaceholder', 'Enter the reason...')}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBlacklist}
              disabled={!blacklistDialog.reason || addToBlacklist.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {addToBlacklist.isPending ? t('common.loading') : t('visitors.blacklist.confirm', 'Add to Blacklist')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
