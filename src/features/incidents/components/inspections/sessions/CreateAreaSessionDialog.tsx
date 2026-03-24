import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, Loader2, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useAreaTemplates, useCreateAreaSession, useStartAreaSession } from '@/hooks/use-area-inspections';
import { useTemplateItemCount } from '@/hooks/use-template-item-count';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { createAreaSessionSchema, type CreateAreaSessionFormValues } from './CreateAreaSessionSchema';

interface CreateAreaSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Attendee {
  name: string;
  role?: string;
}

const WEATHER_OPTIONS = ['clear', 'cloudy', 'rainy', 'windy', 'hot', 'cold'] as const;

export function CreateAreaSessionDialog({ open, onOpenChange }: CreateAreaSessionDialogProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();
  const { profile } = useAuth();
  
  const form = useForm<CreateAreaSessionFormValues>({
    resolver: zodResolver(createAreaSessionSchema),
    defaultValues: {
      templateId: '',
      branchId: '',
      siteId: '',
      buildingId: '',
      floorZoneId: '',
      periodDate: new Date(),
      scopeNotes: '',
      weatherConditions: '',
    },
  });

  const watchedBranch = form.watch('branchId');
  const watchedSite = form.watch('siteId');
  const watchedBuilding = form.watch('buildingId');
  const watchedPeriodDate = form.watch('periodDate');

  // Attendees kept as useState (dynamic array with input buffer)
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [newAttendeeName, setNewAttendeeName] = useState<string>('');
  const [newAttendeeRole, setNewAttendeeRole] = useState<string>('');
  
  // Lookup data
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string; branch_id: string | null }[]>([]);
  const [buildings, setBuildings] = useState<{ id: string; name: string; site_id: string }[]>([]);
  const [floorsZones, setFloorsZones] = useState<{ id: string; name: string; building_id: string }[]>([]);
  
  const { data: templates = [] } = useAreaTemplates();
  const createSession = useCreateAreaSession();
  const startSession = useStartAreaSession();
  
  // Fetch location hierarchy
  useEffect(() => {
    if (!profile?.tenant_id) return;
    
    const fetchData = async () => {
      const [branchesRes, sitesRes, buildingsRes, floorsRes] = await Promise.all([
        supabase.from('branches').select('id, name').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
        supabase.from('sites').select('id, name, branch_id').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
        supabase.from('buildings').select('id, name, site_id').eq('tenant_id', profile.tenant_id).is('deleted_at', null).eq('is_active', true),
        supabase.from('floors_zones').select('id, name, building_id').eq('tenant_id', profile.tenant_id).is('deleted_at', null).eq('is_active', true),
      ]);
      
      if (branchesRes.data) setBranches(branchesRes.data);
      if (sitesRes.data) setSites(sitesRes.data);
      if (buildingsRes.data) setBuildings(buildingsRes.data);
      if (floorsRes.data) setFloorsZones(floorsRes.data);
    };
    
    fetchData();
  }, [profile?.tenant_id]);
  
  // Filter cascading dropdowns
  const filteredSites = watchedBranch 
    ? sites.filter(s => s.branch_id === watchedBranch)
    : sites;
  
  const filteredBuildings = watchedSite 
    ? buildings.filter(b => b.site_id === watchedSite)
    : buildings;
  
  const filteredFloorsZones = watchedBuilding 
    ? floorsZones.filter(f => f.building_id === watchedBuilding)
    : floorsZones;

  // Cascade handlers
  const handleBranchChange = (value: string) => {
    form.setValue('branchId', value === '__all__' ? '' : value);
    form.setValue('siteId', '');
    form.setValue('buildingId', '');
    form.setValue('floorZoneId', '');
  };

  const handleSiteChange = (value: string) => {
    form.setValue('siteId', value === '__all__' ? '' : value);
    form.setValue('buildingId', '');
    form.setValue('floorZoneId', '');
  };

  const handleBuildingChange = (value: string) => {
    form.setValue('buildingId', value === '__all__' ? '' : value);
    form.setValue('floorZoneId', '');
  };
  
  const period = format(watchedPeriodDate, 'MMMM yyyy');
  
  const handleAddAttendee = () => {
    if (newAttendeeName.trim()) {
      setAttendees([...attendees, { name: newAttendeeName.trim(), role: newAttendeeRole.trim() || undefined }]);
      setNewAttendeeName('');
      setNewAttendeeRole('');
    }
  };
  
  const handleRemoveAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index));
  };
  
  const onSubmit = async (data: CreateAreaSessionFormValues) => {
    if (!data.templateId) {
      toast({ title: t('common.error'), description: t('inspectionSessions.selectTemplate'), variant: 'destructive' });
      return;
    }
    
    try {
      const session = await createSession.mutateAsync({
        template_id: data.templateId,
        period,
        site_id: data.siteId || null,
        building_id: data.buildingId || null,
        floor_zone_id: data.floorZoneId || null,
        scope_notes: data.scopeNotes || null,
        weather_conditions: data.weatherConditions || null,
        attendees: attendees.length > 0 ? attendees : undefined,
      });
      
      await startSession.mutateAsync(session.id);
      
      toast({ title: t('common.success'), description: t('inspectionSessions.sessionCreated') });
      onOpenChange(false);
      navigate(`/inspections/sessions/${session.id}/area`);
    } catch (error: unknown) {
      toast({ title: t('common.error'), description: error instanceof Error ? error.message : 'Error', variant: 'destructive' });
    }
  };
  
  const isLoading = createSession.isPending || startSession.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('inspectionSessions.createAreaSession')}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Area Template */}
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspectionSessions.selectAreaTemplate')} *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('inspectionSessions.selectAreaTemplate')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {i18n.language === 'ar' && template.name_ar ? template.name_ar : template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Period */}
            <FormField
              control={form.control}
              name="periodDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspectionSessions.period')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-start font-normal", !field.value && "text-muted-foreground")}
                        >
                          <CalendarIcon className="me-2 h-4 w-4" />
                          {period}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => date && field.onChange(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Location Hierarchy — 4-level cascade */}
            <div className="space-y-2">
              <Label>{t('orgStructure.branch')} ({t('common.optional')})</Label>
              <Select value={watchedBranch || "__all__"} onValueChange={handleBranchChange} dir={direction}>
                <SelectTrigger>
                  <SelectValue placeholder={t('inspectionSessions.allSites')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('common.all')}</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>{t('inspectionSessions.selectSite')} ({t('common.optional')})</Label>
              <Select value={watchedSite || "__all__"} onValueChange={handleSiteChange} dir={direction}>
                <SelectTrigger>
                  <SelectValue placeholder={t('inspectionSessions.allSites')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('inspectionSessions.allSites')}</SelectItem>
                  {filteredSites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>{t('inspectionSessions.selectBuilding')} ({t('common.optional')})</Label>
              <Select value={watchedBuilding || "__all__"} onValueChange={handleBuildingChange} dir={direction} disabled={!watchedSite}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('common.all')}</SelectItem>
                  {filteredBuildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>{building.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <FormField
              control={form.control}
              name="floorZoneId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspectionSessions.selectFloor')} ({t('common.optional')})</FormLabel>
                  <Select value={field.value || "__all__"} onValueChange={(v) => field.onChange(v === "__all__" ? "" : v)} dir={direction} disabled={!watchedBuilding}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.all')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__all__">{t('common.all')}</SelectItem>
                      {filteredFloorsZones.map((floor) => (
                        <SelectItem key={floor.id} value={floor.id}>{floor.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Weather Conditions */}
            <FormField
              control={form.control}
              name="weatherConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspectionSessions.weatherConditions')} ({t('common.optional')})</FormLabel>
                  <Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} dir={direction}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">-</SelectItem>
                      {WEATHER_OPTIONS.map((weather) => (
                        <SelectItem key={weather} value={weather}>
                          {t(`inspectionSessions.weather.${weather}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Scope Notes */}
            <FormField
              control={form.control}
              name="scopeNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspectionSessions.scopeNotes')} ({t('common.optional')})</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('inspectionSessions.scopeNotesPlaceholder')}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Attendees (kept as useState — dynamic array with input buffer) */}
            <div className="space-y-2">
              <Label>{t('inspectionSessions.attendees')} ({t('common.optional')})</Label>
              
              {attendees.length > 0 && (
                <div className="space-y-2 mb-3">
                  {attendees.map((attendee, index) => (
                    <div key={index} className="flex items-center gap-2 bg-secondary/50 rounded-md px-3 py-2">
                      <span className="flex-1 text-sm">
                        {attendee.name}
                        {attendee.role && <span className="text-muted-foreground"> ({attendee.role})</span>}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveAttendee(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  value={newAttendeeName}
                  onChange={(e) => setNewAttendeeName(e.target.value)}
                  placeholder={t('inspectionSessions.attendeeName')}
                  className="flex-1"
                />
                <Input
                  value={newAttendeeRole}
                  onChange={(e) => setNewAttendeeRole(e.target.value)}
                  placeholder={t('inspectionSessions.attendeeRole')}
                  className="w-32"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddAttendee}
                  disabled={!newAttendeeName.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading || !form.watch('templateId')}>
                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t('inspectionSessions.startInspection')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}