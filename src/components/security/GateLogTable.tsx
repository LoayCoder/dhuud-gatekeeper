import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGateEntries, useRecordExit, GateEntryFilters } from '@/hooks/use-gate-entries';
import { useSites } from '@/hooks/use-sites';
import { LogOut, Search, Filter, Clock, Car, Users, RefreshCw, Phone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const ENTRY_TYPE_COLORS: Record<string, string> = {
  visitor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  contractor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  delivery: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  vip: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  employee: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  worker: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

export function GateLogTable() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<GateEntryFilters>({
    onlyActive: true,
  });
  const { data: entries, isLoading, refetch } = useGateEntries(filters);
  const { data: sites } = useSites();
  const recordExit = useRecordExit();

  const handleRecordExit = async (entryId: string) => {
    await recordExit.mutateAsync(entryId);
  };

  const getSiteName = (siteId: string | null) => {
    if (!siteId) return '-';
    return sites?.find(s => s.id === siteId)?.name || '-';
  };

  // Mobile Card Component
  const MobileEntryCard = ({ entry }: { entry: NonNullable<typeof entries>[0] }) => (
    <div className="p-3 rounded-lg border bg-card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{entry.person_name}</p>
          {entry.mobile_number && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {entry.mobile_number}
            </p>
          )}
        </div>
        <Badge className={`${ENTRY_TYPE_COLORS[entry.entry_type] || ''} text-[10px] flex-shrink-0`} variant="secondary">
          {t(`security.entryTypes.${entry.entry_type}`, entry.entry_type)}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(entry.entry_time), 'HH:mm')} • {format(new Date(entry.entry_time), 'dd/MM')}
        </span>
        {entry.car_plate && (
          <span className="flex items-center gap-1">
            <Car className="h-3 w-3" />
            <span className="font-mono">{entry.car_plate}</span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          {entry.exit_time ? (
            <Badge variant="outline" className="bg-muted text-[10px]">
              {t('security.gate.exited', 'Exited')}
            </Badge>
          ) : (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]">
              <Users className="h-3 w-3 me-1" />
              {t('security.gate.onSite', 'On Site')}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(entry.entry_time), { addSuffix: !entry.exit_time })}
          </span>
        </div>
        
        {!entry.exit_time && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRecordExit(entry.id)}
            disabled={recordExit.isPending}
            className="h-7 px-2 text-xs"
          >
            <LogOut className="h-3 w-3 me-1" />
            {t('security.gate.exit', 'Exit')}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            {t('security.gate.entryLog', 'Gate Entry Log')}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 me-2" />
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 sm:gap-3 mt-3 sm:mt-4">
          <div className="relative sm:col-span-2 lg:flex-1 lg:min-w-[200px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('security.gate.searchPlaceholder', 'Search by name, plate, or phone...')}
              className="ps-9 text-sm"
              value={filters.search || ''}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>

          <Select 
            value={filters.entryType || 'all'} 
            onValueChange={(v) => setFilters(f => ({ ...f, entryType: v === 'all' ? undefined : v }))}
          >
            <SelectTrigger className="w-full sm:w-auto lg:w-[150px] text-sm">
              <Filter className="h-4 w-4 me-2 flex-shrink-0" />
              <SelectValue placeholder={t('security.gate.allTypes', 'All Types')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('security.gate.allTypes', 'All Types')}</SelectItem>
              <SelectItem value="visitor">{t('security.entryTypes.visitor', 'Visitor')}</SelectItem>
              <SelectItem value="worker">{t('security.entryTypes.worker', 'Worker')}</SelectItem>
              <SelectItem value="contractor">{t('security.entryTypes.contractor', 'Contractor')}</SelectItem>
              <SelectItem value="delivery">{t('security.entryTypes.delivery', 'Delivery')}</SelectItem>
              <SelectItem value="vip">{t('security.entryTypes.vip', 'VIP')}</SelectItem>
              <SelectItem value="employee">{t('security.entryTypes.employee', 'Employee')}</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.siteId || 'all'} 
            onValueChange={(v) => setFilters(f => ({ ...f, siteId: v === 'all' ? undefined : v }))}
          >
            <SelectTrigger className="w-full sm:w-auto lg:w-[180px] text-sm">
              <SelectValue placeholder={t('security.gate.allSites', 'All Sites')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('security.gate.allSites', 'All Sites')}</SelectItem>
              {sites?.map(site => (
                <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
            <Switch
              id="active-only"
              checked={filters.onlyActive}
              onCheckedChange={(checked) => setFilters(f => ({ ...f, onlyActive: checked }))}
            />
            <Label htmlFor="active-only" className="text-xs sm:text-sm whitespace-nowrap">
              {t('security.gate.activeOnly', 'Active Only')}
            </Label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-3 sm:px-6">
        {isLoading ? (
          <div className="space-y-2 sm:space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 sm:h-14 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-2">
              {entries?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t('security.gate.noEntries', 'No entries found')}
                </div>
              ) : (
                entries?.map((entry) => (
                  <MobileEntryCard key={entry.id} entry={entry} />
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto -mx-3 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('security.gate.name', 'Name')}</TableHead>
                    <TableHead>{t('security.gate.type', 'Type')}</TableHead>
                    <TableHead>{t('security.gate.plate', 'Plate')}</TableHead>
                    <TableHead>{t('security.gate.site', 'Site')}</TableHead>
                    <TableHead>{t('security.gate.entryTime', 'Entry')}</TableHead>
                    <TableHead>{t('security.gate.duration', 'Duration')}</TableHead>
                    <TableHead>{t('security.gate.status', 'Status')}</TableHead>
                    <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {t('security.gate.noEntries', 'No entries found')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries?.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{entry.person_name}</span>
                            {entry.mobile_number && (
                              <span className="text-xs text-muted-foreground">{entry.mobile_number}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={ENTRY_TYPE_COLORS[entry.entry_type] || ''} variant="secondary">
                            {t(`security.entryTypes.${entry.entry_type}`, entry.entry_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.car_plate ? (
                            <div className="flex items-center gap-1">
                              <Car className="h-3 w-3" />
                              <span className="font-mono text-sm">{entry.car_plate}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getSiteName(entry.site_id)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{format(new Date(entry.entry_time), 'HH:mm')}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.entry_time), 'dd/MM/yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.exit_time ? (
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(entry.entry_time), { addSuffix: false })}
                            </span>
                          ) : (
                            <span className="text-sm text-primary">
                              {formatDistanceToNow(new Date(entry.entry_time), { addSuffix: true })}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.exit_time ? (
                            <Badge variant="outline" className="bg-muted">
                              {t('security.gate.exited', 'Exited')}
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <Users className="h-3 w-3 me-1" />
                              {t('security.gate.onSite', 'On Site')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-end">
                          {!entry.exit_time && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRecordExit(entry.id)}
                              disabled={recordExit.isPending}
                            >
                              <LogOut className="h-4 w-4 me-1" />
                              {t('security.gate.recordExit', 'Exit')}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
