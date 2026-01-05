import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Calendar as CalendarIcon,
  Trash2,
  Star,
  RefreshCw
} from 'lucide-react';
import { 
  useGuardSiteAssignments, 
  useCreateSiteAssignment, 
  useUpdateSiteAssignment,
  useDeleteSiteAssignment 
} from '@/hooks/use-guard-site-assignments';
import { useSites } from '@/hooks/use-sites';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export function GuardSiteAssignments() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    guard_id: '',
    site_id: '',
    is_primary: false,
    can_float: true,
    assignment_type: 'permanent' as 'permanent' | 'temporary' | 'floating',
    effective_from: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: assignments, isLoading } = useGuardSiteAssignments();
  const { data: sites } = useSites();
  const createAssignment = useCreateSiteAssignment();
  const updateAssignment = useUpdateSiteAssignment();
  const deleteAssignment = useDeleteSiteAssignment();

  // Get guards
  const { data: currentProfile } = useQuery({
    queryKey: ['current-user-profile-for-assignments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      return data;
    },
  });

  const { data: guards } = useQuery({
    queryKey: ['guards-list', currentProfile?.tenant_id],
    queryFn: async () => {
      if (!currentProfile?.tenant_id) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('tenant_id', currentProfile.tenant_id)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: !!currentProfile?.tenant_id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAssignment.mutateAsync(formData);
    setDialogOpen(false);
    setFormData({
      guard_id: '',
      site_id: '',
      is_primary: false,
      can_float: true,
      assignment_type: 'permanent',
      effective_from: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const getAssignmentTypeBadge = (type: string) => {
    switch (type) {
      case 'permanent':
        return <Badge className="bg-green-500">{t('security.siteAssignment.permanent', 'Permanent')}</Badge>;
      case 'temporary':
        return <Badge className="bg-amber-500">{t('security.siteAssignment.temporary', 'Temporary')}</Badge>;
      case 'floating':
        return <Badge variant="outline">{t('security.siteAssignment.floating', 'Floating')}</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  // Group assignments by guard
  const assignmentsByGuard = assignments?.reduce((acc, a) => {
    const guardId = a.guard_id;
    if (!acc[guardId]) {
      acc[guardId] = {
        guard: a.guard,
        assignments: []
      };
    }
    acc[guardId].assignments.push(a);
    return acc;
  }, {} as Record<string, { guard: any; assignments: typeof assignments }>) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('security.siteAssignment.title', 'Guard Site Assignments')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('security.siteAssignment.description', 'Manage which guards can work at which sites')}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 me-2" />
              {t('security.siteAssignment.addAssignment', 'Add Assignment')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('security.siteAssignment.addAssignment', 'Add Site Assignment')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('security.siteAssignment.guard', 'Guard')}</Label>
                <Select 
                  value={formData.guard_id} 
                  onValueChange={(v) => setFormData({ ...formData, guard_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.select', 'Select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {guards?.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('security.siteAssignment.site', 'Site')}</Label>
                <Select 
                  value={formData.site_id} 
                  onValueChange={(v) => setFormData({ ...formData, site_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.select', 'Select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {sites?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('security.siteAssignment.type', 'Assignment Type')}</Label>
                <Select 
                  value={formData.assignment_type} 
                  onValueChange={(v) => setFormData({ ...formData, assignment_type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">{t('security.siteAssignment.permanent', 'Permanent')}</SelectItem>
                    <SelectItem value="temporary">{t('security.siteAssignment.temporary', 'Temporary')}</SelectItem>
                    <SelectItem value="floating">{t('security.siteAssignment.floating', 'Floating')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('security.siteAssignment.effectiveFrom', 'Effective From')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="h-4 w-4 me-2" />
                      {format(new Date(formData.effective_from), 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar 
                      mode="single" 
                      selected={new Date(formData.effective_from)} 
                      onSelect={(d) => d && setFormData({ ...formData, effective_from: format(d, 'yyyy-MM-dd') })} 
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>{t('security.siteAssignment.isPrimary', 'Primary Site')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('security.siteAssignment.primaryHint', 'This is the guard\'s main assigned site')}
                  </p>
                </div>
                <Switch 
                  checked={formData.is_primary} 
                  onCheckedChange={(v) => setFormData({ ...formData, is_primary: v })} 
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>{t('security.siteAssignment.canFloat', 'Can Float')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('security.siteAssignment.floatHint', 'Can be assigned to shifts at other sites')}
                  </p>
                </div>
                <Switch 
                  checked={formData.can_float} 
                  onCheckedChange={(v) => setFormData({ ...formData, can_float: v })} 
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="submit" disabled={createAssignment.isPending}>
                  {t('common.create', 'Create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : Object.keys(assignmentsByGuard).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(assignmentsByGuard).map(([guardId, { guard, assignments: guardAssignments }]) => (
            <Card key={guardId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {guard?.full_name || 'Unknown Guard'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {guardAssignments.map(assignment => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{assignment.site?.name || 'Unknown Site'}</span>
                            {assignment.is_primary && (
                              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('security.siteAssignment.since', 'Since')}: {format(new Date(assignment.effective_from), 'PP')}
                            {assignment.can_float && (
                              <span className="ms-2">
                                <RefreshCw className="h-3 w-3 inline" /> {t('security.siteAssignment.canFloat', 'Can Float')}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getAssignmentTypeBadge(assignment.assignment_type)}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('security.siteAssignment.deleteConfirm', 'Delete assignment?')}</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteAssignment.mutate(assignment.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                {t('common.delete', 'Delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t('security.siteAssignment.noAssignments', 'No site assignments configured')}
            </p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 me-2" />
              {t('security.siteAssignment.addFirst', 'Add First Assignment')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
