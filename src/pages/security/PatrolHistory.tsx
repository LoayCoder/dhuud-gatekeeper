import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle2, 
  Route,
  User,
  Calendar,
  Download,
  Eye
} from "lucide-react";
import { useSecurityPatrols } from "@/hooks/use-security-patrols";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function PatrolHistory() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  const { data: patrols, isLoading } = useSecurityPatrols({
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const filteredPatrols = patrols?.filter(patrol => {
    if (dateFilter) {
      const patrolDate = format(new Date(patrol.actual_start), 'yyyy-MM-dd');
      if (patrolDate !== dateFilter) return false;
    }
    return true;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">{t('security.patrols.completed', 'Completed')}</Badge>;
      case 'in_progress':
        return <Badge variant="default">{t('security.patrols.inProgress', 'In Progress')}</Badge>;
      case 'missed':
        return <Badge variant="destructive">{t('security.patrols.missed', 'Missed')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return '-';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMins = Math.round(diffMs / 60000);
    return `${diffMins} ${t('common.minutes', 'min')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('security.patrols.history', 'Patrol History')}
          </h1>
          <p className="text-muted-foreground">
            {t('security.patrols.historyDescription', 'View completed patrols and checkpoint logs')}
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          {t('common.export', 'Export')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('security.patrols.filterByStatus', 'Filter by status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                  <SelectItem value="completed">{t('security.patrols.completed', 'Completed')}</SelectItem>
                  <SelectItem value="in_progress">{t('security.patrols.inProgress', 'In Progress')}</SelectItem>
                  <SelectItem value="missed">{t('security.patrols.missed', 'Missed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder={t('security.patrols.filterByDate', 'Filter by date')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patrols Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('security.patrols.patrolRecords', 'Patrol Records')}</CardTitle>
          <CardDescription>
            {filteredPatrols.length} {t('security.patrols.recordsFound', 'records found')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPatrols.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('security.patrols.route', 'Route')}</TableHead>
                    <TableHead>{t('security.patrols.guard', 'Guard')}</TableHead>
                    <TableHead>{t('security.patrols.date', 'Date')}</TableHead>
                    <TableHead>{t('security.patrols.duration', 'Duration')}</TableHead>
                    <TableHead>{t('security.patrols.status', 'Status')}</TableHead>
                    <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatrols.map((patrol) => (
                    <TableRow key={patrol.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Route className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{patrol.route?.name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{(patrol.guard as unknown as { full_name: string } | null)?.full_name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(patrol.actual_start), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{calculateDuration(patrol.actual_start, patrol.actual_end)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(patrol.status)}</TableCell>
                      <TableCell className="text-end">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Eye className="h-4 w-4" />
                          {t('common.view', 'View')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">
                {t('security.patrols.noPatrolHistory', 'No patrol history')}
              </p>
              <p className="text-muted-foreground">
                {t('security.patrols.noPatrolHistoryDescription', 'Completed patrols will appear here')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
