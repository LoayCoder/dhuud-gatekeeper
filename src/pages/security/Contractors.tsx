import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { useContractors, useUnbanContractor, Contractor } from '@/hooks/use-contractors';
import { ContractorFormDialog } from '@/components/security/ContractorFormDialog';
import { BanContractorDialog } from '@/components/security/BanContractorDialog';
import { Plus, Search, MoreVertical, Pencil, Ban, UserCheck, QrCode, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format, isPast, addDays, isWithinInterval } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Contractors() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned' | 'expired'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);

  const { data: contractors, isLoading } = useContractors({ search, status: statusFilter });
  const unbanContractor = useUnbanContractor();

  const today = new Date();
  const warningWindow = addDays(today, 7);

  const getComplianceStatus = (contractor: Contractor) => {
    const dates = [contractor.permit_expiry_date, contractor.safety_induction_expiry, contractor.medical_exam_expiry];
    for (const date of dates) {
      if (date && isPast(new Date(date))) return 'expired';
    }
    for (const date of dates) {
      if (date && isWithinInterval(new Date(date), { start: today, end: warningWindow })) return 'warning';
    }
    return 'valid';
  };

  const handleEdit = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setFormOpen(true);
  };

  const handleBan = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setBanOpen(true);
  };

  const handleUnban = async (contractor: Contractor) => {
    await unbanContractor.mutateAsync(contractor.id);
  };

  const handleShowQR = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setQrOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setSelectedContractor(null);
  };

  const handleBanClose = (open: boolean) => {
    setBanOpen(open);
    if (!open) setSelectedContractor(null);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('security.contractors.title')}</h1>
            <p className="text-muted-foreground">{t('security.contractors.description')}</p>
          </div>
          <Button onClick={() => { setSelectedContractor(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 me-2" />
            {t('security.contractors.addContractor')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('security.contractors.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('security.contractors.allStatus')}</SelectItem>
                  <SelectItem value="active">{t('security.contractors.active')}</SelectItem>
                  <SelectItem value="banned">{t('security.contractors.banned')}</SelectItem>
                  <SelectItem value="expired">{t('security.contractors.expired')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">{t('common.loading')}...</div>
            ) : contractors?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">{t('security.contractors.noContractors')}</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('security.contractors.contractor')}</TableHead>
                      <TableHead>{t('security.contractors.company')}</TableHead>
                      <TableHead>{t('security.contractors.compliance')}</TableHead>
                      <TableHead>{t('security.contractors.status')}</TableHead>
                      <TableHead className="text-end">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contractors?.map((contractor) => {
                      const compliance = getComplianceStatus(contractor);
                      return (
                        <TableRow key={contractor.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={contractor.photo_path || undefined} />
                                <AvatarFallback>{contractor.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{contractor.full_name}</p>
                                <p className="text-sm text-muted-foreground font-mono">{contractor.contractor_code}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{contractor.company_name || '—'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={compliance === 'valid' ? 'secondary' : compliance === 'warning' ? 'outline' : 'destructive'}
                              className="gap-1"
                            >
                              {compliance === 'valid' && <CheckCircle className="h-3 w-3" />}
                              {compliance === 'warning' && <AlertTriangle className="h-3 w-3" />}
                              {compliance === 'expired' && <XCircle className="h-3 w-3" />}
                              {t(`security.contractors.${compliance}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {contractor.is_banned ? (
                              <Badge variant="destructive">{t('security.contractors.banned')}</Badge>
                            ) : (
                              <Badge variant="secondary">{t('security.contractors.active')}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(contractor)}>
                                  <Pencil className="h-4 w-4 me-2" />
                                  {t('common.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleShowQR(contractor)}>
                                  <QrCode className="h-4 w-4 me-2" />
                                  {t('security.contractors.showQR')}
                                </DropdownMenuItem>
                                {contractor.is_banned ? (
                                  <DropdownMenuItem onClick={() => handleUnban(contractor)}>
                                    <UserCheck className="h-4 w-4 me-2" />
                                    {t('security.contractors.unban')}
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleBan(contractor)} className="text-destructive">
                                    <Ban className="h-4 w-4 me-2" />
                                    {t('security.contractors.ban')}
                                  </DropdownMenuItem>
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
      </div>

      <ContractorFormDialog open={formOpen} onOpenChange={handleFormClose} contractor={selectedContractor} />
      <BanContractorDialog open={banOpen} onOpenChange={handleBanClose} contractor={selectedContractor} />

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('security.contractors.qrCode')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {selectedContractor?.qr_code_data && (
              <QRCodeSVG value={selectedContractor.qr_code_data} size={200} />
            )}
            <p className="font-mono text-sm">{selectedContractor?.contractor_code}</p>
            <p className="font-medium">{selectedContractor?.full_name}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
