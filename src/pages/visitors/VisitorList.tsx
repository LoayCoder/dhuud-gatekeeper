import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, UserPlus, QrCode, ShieldAlert, Eye, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVisitors, useUpdateVisitor, useResetVisitorQR } from '@/hooks/use-visitors';
import { useAddToBlacklist } from '@/hooks/use-security-blacklist';
import { format } from 'date-fns';
import { VisitorDetailDialog } from '@/components/visitors/VisitorDetailDialog';

export default function VisitorList() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  
  const { data: visitors, isLoading } = useVisitors({ search: search || undefined });
  const updateVisitor = useUpdateVisitor();
  const addToBlacklist = useAddToBlacklist();
  const resetVisitorQR = useResetVisitorQR();

  const handleDeactivate = async (id: string) => {
    await updateVisitor.mutateAsync({ id, is_active: false });
  };

  const handleAddToBlacklist = async (visitor: { id: string; full_name: string; national_id: string | null }) => {
    if (!visitor.national_id) return;
    await addToBlacklist.mutateAsync({
      full_name: visitor.full_name,
      national_id: visitor.national_id,
      reason: 'Added from visitor list',
    });
    await handleDeactivate(visitor.id);
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
                    <TableHead>{t('visitors.fields.email')}</TableHead>
                    <TableHead>{t('visitors.fields.nationalId')}</TableHead>
                    <TableHead>{t('visitors.fields.lastVisit')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitors?.map((visitor) => (
                    <TableRow key={visitor.id}>
                      <TableCell className="font-medium">{visitor.full_name}</TableCell>
                      <TableCell>{visitor.company_name || '-'}</TableCell>
                      <TableCell>{visitor.email || '-'}</TableCell>
                      <TableCell>{visitor.national_id || '-'}</TableCell>
                      <TableCell>
                        {visitor.last_visit_at 
                          ? format(new Date(visitor.last_visit_at), 'PP')
                          : t('visitors.list.neverVisited')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={visitor.is_active ? 'default' : 'secondary'}>
                          {visitor.is_active ? t('common.active') : t('common.inactive')}
                        </Badge>
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
                            {visitor.national_id && (
                              <DropdownMenuItem 
                                onClick={() => handleAddToBlacklist(visitor)}
                                className="text-destructive"
                              >
                                <ShieldAlert className="me-2 h-4 w-4" />
                                {t('visitors.blacklist.addTo')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
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
    </div>
  );
}
