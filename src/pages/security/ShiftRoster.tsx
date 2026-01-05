import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addDays, startOfWeek, eachDayOfInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar as CalendarIcon, Users, ChevronLeft, ChevronRight, Trash2, ArrowLeftRight } from 'lucide-react';
import { useShiftRoster, useCreateRosterAssignment, useDeleteRosterAssignment } from '@/hooks/use-shift-roster';
import { useSecurityZones } from '@/hooks/use-security-zones';
import { useSecurityShifts } from '@/hooks/use-security-shifts';
import { ShiftSwapRequestsList } from '@/components/security/ShiftSwapRequestsList';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function ShiftRoster() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [formData, setFormData] = useState({ guard_id: '', zone_id: '', shift_id: '', roster_date: format(new Date(), 'yyyy-MM-dd') });

  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }), [weekStart]);

  const { data: roster, isLoading } = useShiftRoster();
  const { data: zones } = useSecurityZones({ isActive: true });
  const { data: shifts } = useSecurityShifts();
  const createAssignment = useCreateRosterAssignment();
  const deleteAssignment = useDeleteRosterAssignment();

  // Get tenant_id from current user's profile
  const { data: currentProfile } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      return data;
    },
  });

  const { data: guards } = useQuery({
    queryKey: ['security-guards', currentProfile?.tenant_id],
    queryFn: async () => {
      if (!currentProfile?.tenant_id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('tenant_id', currentProfile.tenant_id)
        .is('deleted_at', null);
      if (error) throw error;
      return data;
    },
    enabled: !!currentProfile?.tenant_id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAssignment.mutateAsync({ ...formData, status: 'scheduled' });
    setDialogOpen(false);
    setFormData({ guard_id: '', zone_id: '', shift_id: '', roster_date: format(new Date(), 'yyyy-MM-dd') });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in': return <Badge className="bg-green-500">{t('security.roster.status.checkedIn', 'Checked In')}</Badge>;
      case 'completed': return <Badge variant="secondary">{t('security.roster.status.completed', 'Completed')}</Badge>;
      default: return <Badge variant="outline">{t('security.roster.status.scheduled', 'Scheduled')}</Badge>;
    }
  };

  const getRosterForDay = (date: Date) => roster?.filter(r => r.roster_date === format(date, 'yyyy-MM-dd')) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('security.roster.title', 'Shift Roster')}</h1>
          <p className="text-muted-foreground">{t('security.roster.description', 'Manage guard assignments')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 me-2" />{t('security.roster.addAssignment', 'Add Assignment')}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('security.roster.addAssignment', 'Add Assignment')}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>{t('security.roster.guard', 'Guard')}</Label><Select value={formData.guard_id} onValueChange={(v) => setFormData({ ...formData, guard_id: v })}><SelectTrigger><SelectValue placeholder={t('common.select', 'Select')} /></SelectTrigger><SelectContent>{guards?.map(g => <SelectItem key={g.id} value={g.id}>{g.full_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>{t('security.roster.zone', 'Zone')}</Label><Select value={formData.zone_id} onValueChange={(v) => setFormData({ ...formData, zone_id: v })}><SelectTrigger><SelectValue placeholder={t('common.select', 'Select')} /></SelectTrigger><SelectContent>{zones?.map(z => <SelectItem key={z.id} value={z.id}>{z.zone_code} - {z.zone_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>{t('security.roster.shift', 'Shift')}</Label><Select value={formData.shift_id} onValueChange={(v) => setFormData({ ...formData, shift_id: v })}><SelectTrigger><SelectValue placeholder={t('common.select', 'Select')} /></SelectTrigger><SelectContent>{shifts?.filter(s => s.is_active).map(s => <SelectItem key={s.id} value={s.id}>{s.shift_name} ({s.start_time} - {s.end_time})</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>{t('security.roster.date', 'Date')}</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start"><CalendarIcon className="h-4 w-4 me-2" />{format(new Date(formData.roster_date), 'PPP')}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={new Date(formData.roster_date)} onSelect={(d) => d && setFormData({ ...formData, roster_date: format(d, 'yyyy-MM-dd') })} /></PopoverContent></Popover></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button><Button type="submit" disabled={createAssignment.isPending}>{t('common.create', 'Create')}</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            {t('security.roster.schedule', 'Schedule')}
          </TabsTrigger>
          <TabsTrigger value="swaps" className="gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            {t('security.shiftSwap.title', 'Shift Swaps')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5" />{t('security.roster.weeklyView', 'Weekly Schedule')}</CardTitle>
                <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm font-medium min-w-[180px] text-center">{format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}</span><Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map(day => {
                  const dayRoster = getRosterForDay(day);
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <div key={day.toISOString()} className={cn("min-h-[120px] border rounded-lg p-2", isToday && "border-primary bg-primary/5")}>
                      <div className={cn("text-sm font-medium mb-2", isToday && "text-primary")}>{format(day, 'EEE d')}</div>
                      <div className="space-y-1">
                        {dayRoster.slice(0, 3).map(a => <div key={a.id} className="text-xs p-1 bg-muted rounded truncate">{a.guard_id?.slice(0, 8)}...</div>)}
                        {dayRoster.length > 3 && <div className="text-xs text-muted-foreground text-center">+{dayRoster.length - 3}</div>}
                        {!dayRoster.length && <div className="text-xs text-muted-foreground text-center py-2">{t('security.roster.noAssignments', 'None')}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />{t('security.roster.allAssignments', 'All Assignments')}</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <div className="animate-pulse space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted rounded" />)}</div> : roster?.length ? (
                <div className="space-y-2">
                  {roster.slice(0, 20).map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div><div className="font-medium">{format(new Date(a.roster_date), 'PP')}</div><div className="text-sm text-muted-foreground">Guard: {a.guard_id?.slice(0, 8)}... | Zone: {a.zone_id?.slice(0, 8)}...</div></div>
                      <div className="flex items-center gap-2">{getStatusBadge(a.status || 'scheduled')}<AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('security.roster.deleteConfirm', 'Delete?')}</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteAssignment.mutate(a.id)} className="bg-destructive text-destructive-foreground">{t('common.delete', 'Delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
                    </div>
                  ))}
                </div>
              ) : <div className="flex flex-col items-center py-12"><Users className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">{t('security.roster.noAssignments', 'No assignments')}</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="swaps">
          <ShiftSwapRequestsList showSupervisorActions />
        </TabsContent>
      </Tabs>
    </div>
  );
}
