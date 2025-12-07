import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, differenceInDays } from 'date-fns';
import { 
  Plus, Calendar, Filter, Search, MoreHorizontal,
  Pause, Play, Trash2, Pencil, Clock, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ScheduleFormDialog, 
  ScheduleCalendar 
} from '@/components/inspections/schedules';
import {
  useInspectionSchedules,
  useDeleteInspectionSchedule,
  useToggleScheduleActive,
  useOverdueSchedulesCount,
  InspectionSchedule,
} from '@/hooks/use-inspection-schedules';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';

export default function InspectionSchedules() {
  const { t } = useTranslation();
  const direction = i18n.dir();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [formOpen, setFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<InspectionSchedule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  
  const { data: schedules = [], isLoading } = useInspectionSchedules();
  const { data: overdueCount = 0 } = useOverdueSchedulesCount();
  const deleteSchedule = useDeleteInspectionSchedule();
  const toggleActive = useToggleScheduleActive();
  
  // Filter schedules based on tab and search
  const filteredSchedules = schedules.filter(schedule => {
    // Tab filter
    if (activeTab === 'active' && !schedule.is_active) return false;
    if (activeTab === 'paused' && schedule.is_active) return false;
    if (activeTab === 'overdue') {
      if (!schedule.next_due) return false;
      const daysUntil = differenceInDays(new Date(schedule.next_due), new Date());
      if (daysUntil >= 0) return false;
    }
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        schedule.name.toLowerCase().includes(searchLower) ||
        schedule.reference_id.toLowerCase().includes(searchLower) ||
        schedule.template?.name?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'area': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'audit': return 'bg-purple-500/10 text-purple-700 border-purple-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };
  
  const getStatusBadge = (schedule: InspectionSchedule) => {
    if (!schedule.is_active) {
      return <Badge variant="secondary">{t('schedules.status.paused')}</Badge>;
    }
    if (schedule.next_due) {
      const daysUntil = differenceInDays(new Date(schedule.next_due), new Date());
      if (daysUntil < 0) {
        return <Badge variant="destructive">{t('schedules.status.overdue')}</Badge>;
      }
      if (daysUntil <= 3) {
        return <Badge variant="default">{t('schedules.status.dueSoon')}</Badge>;
      }
    }
    return <Badge variant="outline" className="text-green-600">{t('schedules.status.active')}</Badge>;
  };
  
  const handleEdit = (schedule: InspectionSchedule) => {
    setEditingSchedule(schedule);
    setFormOpen(true);
  };
  
  const handleDelete = (id: string) => {
    setScheduleToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (scheduleToDelete) {
      await deleteSchedule.mutateAsync(scheduleToDelete);
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    }
  };
  
  const handleToggleActive = (id: string, currentActive: boolean) => {
    toggleActive.mutate({ id, isActive: !currentActive });
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('schedules.title')}</h1>
          <p className="text-muted-foreground">{t('schedules.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            {t('common.list')}
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <Calendar className="h-4 w-4 me-1" />
            {t('schedules.calendar')}
          </Button>
          <Button onClick={() => { setEditingSchedule(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 me-2" />
            {t('schedules.createSchedule')}
          </Button>
        </div>
      </div>
      
      {viewMode === 'calendar' ? (
        <ScheduleCalendar 
          schedules={filteredSchedules} 
          onScheduleClick={handleEdit}
        />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
                <TabsList>
                  <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
                  <TabsTrigger value="active">{t('schedules.status.active')}</TabsTrigger>
                  <TabsTrigger value="paused">{t('schedules.status.paused')}</TabsTrigger>
                  <TabsTrigger value="overdue" className="gap-1">
                    {t('schedules.status.overdue')}
                    {overdueCount > 0 && (
                      <Badge variant="destructive" className="ms-1 h-5 px-1.5">
                        {overdueCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('common.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-9 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredSchedules.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">{t('schedules.noSchedules')}</p>
                <p className="text-sm">{t('schedules.noSchedulesDescription')}</p>
                <Button 
                  className="mt-4" 
                  onClick={() => { setEditingSchedule(null); setFormOpen(true); }}
                >
                  <Plus className="h-4 w-4 me-2" />
                  {t('schedules.createFirst')}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('schedules.name')}</TableHead>
                    <TableHead>{t('schedules.type')}</TableHead>
                    <TableHead>{t('schedules.frequencyType')}</TableHead>
                    <TableHead>{t('schedules.nextDue')}</TableHead>
                    <TableHead>{t('schedules.assignedTo')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map(schedule => (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {i18n.language === 'ar' && schedule.name_ar ? schedule.name_ar : schedule.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{schedule.reference_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', getTypeColor(schedule.schedule_type))}>
                          {t(`inspections.types.${schedule.schedule_type}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {schedule.frequency_value > 1 && `${schedule.frequency_value}x `}
                          {t(`schedules.frequency.${schedule.frequency_type}`)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {schedule.next_due ? (
                          <div className="flex items-center gap-1">
                            {differenceInDays(new Date(schedule.next_due), new Date()) < 0 && (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                            <span className={cn(
                              'text-sm',
                              differenceInDays(new Date(schedule.next_due), new Date()) < 0 && 'text-destructive font-medium'
                            )}>
                              {format(new Date(schedule.next_due), 'MMM d, yyyy')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {schedule.assigned_inspector ? (
                          <span className="text-sm">{schedule.assigned_inspector.full_name}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">{t('schedules.unassigned')}</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(schedule)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(schedule)}>
                              <Pencil className="h-4 w-4 me-2" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(schedule.id, schedule.is_active)}>
                              {schedule.is_active ? (
                                <>
                                  <Pause className="h-4 w-4 me-2" />
                                  {t('schedules.pause')}
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 me-2" />
                                  {t('schedules.resume')}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(schedule.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 me-2" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Form Dialog */}
      <ScheduleFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingSchedule(null);
        }}
        schedule={editingSchedule}
      />
      
      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('schedules.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('schedules.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
