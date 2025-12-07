import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, Users, Building2, TrendingUp, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { useTeamPerformance } from "@/hooks/use-team-performance";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function TeamPerformance() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const { data, isLoading } = useTeamPerformance(startDate, endDate);

  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getComplianceBadge = (rate: number) => {
    if (rate >= 90) return "default";
    if (rate >= 70) return "secondary";
    return "destructive";
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir={direction}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('teamPerformance.title')}</h1>
          <p className="text-muted-foreground">{t('teamPerformance.subtitle')}</p>
        </div>
        
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(startDate, 'PP')} - {format(endDate, 'PP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: startDate, to: endDate }}
                onSelect={(range) => {
                  if (range?.from) setStartDate(range.from);
                  if (range?.to) setEndDate(range.to);
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('teamPerformance.totalAssignees')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{data?.assignees?.length || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('teamPerformance.avgCompletionRate')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {data?.assignees?.length
                  ? Math.round(
                      data.assignees.reduce((sum, a) => sum + (a.completion_rate || 0), 0) /
                        data.assignees.length
                    )
                  : 0}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('teamPerformance.avgResolutionTime')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {data?.assignees?.length
                  ? (
                      data.assignees.reduce((sum, a) => sum + (a.avg_resolution_days || 0), 0) /
                      data.assignees.length
                    ).toFixed(1)
                  : 0} {t('common.days')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('teamPerformance.slaBreaches')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-destructive">
                {data?.assignees?.reduce((sum, a) => sum + (a.sla_breaches || 0), 0) || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('teamPerformance.completionRateByAssignee')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.assignees?.slice(0, 10) || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis 
                  dataKey="assignee_name" 
                  type="category" 
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, t('teamPerformance.completionRate')]}
                />
                <Legend />
                <Bar 
                  dataKey="completion_rate" 
                  name={t('teamPerformance.completionRate')} 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                />
                <Bar 
                  dataKey="sla_compliance_rate" 
                  name={t('teamPerformance.slaCompliance')} 
                  fill="hsl(var(--chart-2))" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Assignee Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('teamPerformance.assigneeMetrics')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('teamPerformance.assignee')}</TableHead>
                  <TableHead>{t('teamPerformance.department')}</TableHead>
                  <TableHead className="text-center">{t('teamPerformance.totalActions')}</TableHead>
                  <TableHead className="text-center">{t('teamPerformance.completed')}</TableHead>
                  <TableHead className="text-center">{t('teamPerformance.overdue')}</TableHead>
                  <TableHead>{t('teamPerformance.completionRate')}</TableHead>
                  <TableHead>{t('teamPerformance.slaCompliance')}</TableHead>
                  <TableHead className="text-center">{t('teamPerformance.avgResolution')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.assignees?.map((assignee) => (
                  <TableRow key={assignee.assigned_to || 'unassigned'}>
                    <TableCell className="font-medium">{assignee.assignee_name}</TableCell>
                    <TableCell>{assignee.department_name || '-'}</TableCell>
                    <TableCell className="text-center">{assignee.total_actions}</TableCell>
                    <TableCell className="text-center">{assignee.completed_actions}</TableCell>
                    <TableCell className="text-center">
                      {assignee.overdue_actions > 0 ? (
                        <Badge variant="destructive">{assignee.overdue_actions}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={assignee.completion_rate || 0} className="w-16" />
                        <span className={cn("text-sm font-medium", getComplianceColor(assignee.completion_rate || 0))}>
                          {assignee.completion_rate || 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getComplianceBadge(assignee.sla_compliance_rate || 0)}>
                        {assignee.sla_compliance_rate || 0}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{assignee.avg_resolution_days || 0} {t('common.days')}</TableCell>
                  </TableRow>
                ))}
                {(!data?.assignees || data.assignees.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t('teamPerformance.noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Department Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('teamPerformance.departmentMetrics')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {data?.departments?.map((dept) => (
                <Card key={dept.department_id} className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{dept.department_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('teamPerformance.totalActions')}:</span>
                      <span className="font-medium">{dept.total_actions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('teamPerformance.completionRate')}:</span>
                      <span className={cn("font-medium", getComplianceColor(dept.completion_rate || 0))}>
                        {dept.completion_rate || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('teamPerformance.slaCompliance')}:</span>
                      <Badge variant={getComplianceBadge(dept.sla_compliance_rate || 0)} className="text-xs">
                        {dept.sla_compliance_rate || 0}%
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('teamPerformance.avgResolution')}:</span>
                      <span className="font-medium">{dept.avg_resolution_days || 0} {t('common.days')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!data?.departments || data.departments.length === 0) && (
                <div className="col-span-3 text-center text-muted-foreground py-8">
                  {t('teamPerformance.noDepartmentData')}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
