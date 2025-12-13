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
import { LogOut, Search, Filter, Clock, Car, Users, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const ENTRY_TYPE_COLORS: Record<string, string> = {
  visitor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  contractor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  delivery: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  vip: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  employee: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('security.gate.entryLog', 'Gate Entry Log')}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 me-2" />
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('security.gate.searchPlaceholder', 'Search by name, plate, or phone...')}
              className="ps-9"
              value={filters.search || ''}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>

          <Select 
            value={filters.entryType || 'all'} 
            onValueChange={(v) => setFilters(f => ({ ...f, entryType: v === 'all' ? undefined : v }))}
          >
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 me-2" />
              <SelectValue placeholder={t('security.gate.allTypes', 'All Types')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('security.gate.allTypes', 'All Types')}</SelectItem>
              <SelectItem value="visitor">{t('security.entryTypes.visitor', 'Visitor')}</SelectItem>
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('security.gate.allSites', 'All Sites')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('security.gate.allSites', 'All Sites')}</SelectItem>
              {sites?.map(site => (
                <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch
              id="active-only"
              checked={filters.onlyActive}
              onCheckedChange={(checked) => setFilters(f => ({ ...f, onlyActive: checked }))}
            />
            <Label htmlFor="active-only" className="text-sm">
              {t('security.gate.activeOnly', 'Active Only')}
            </Label>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
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
        )}
      </CardContent>
    </Card>
  );
}
