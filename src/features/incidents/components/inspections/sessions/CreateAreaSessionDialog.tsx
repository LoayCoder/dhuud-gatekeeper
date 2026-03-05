import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAreaTemplates, useCreateAreaSession, useStartAreaSession } from '@/hooks/use-area-inspections';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  
  const [templateId, setTemplateId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [siteId, setSiteId] = useState<string>('');
  const [buildingId, setBuildingId] = useState<string>('');
  const [floorZoneId, setFloorZoneId] = useState<string>('');
  const [periodDate, setPeriodDate] = useState<Date>(new Date());
  const [scopeNotes, setScopeNotes] = useState<string>('');
  const [weatherConditions, setWeatherConditions] = useState<string>('');
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [newAttendeeName, setNewAttendeeName] = useState<string>('');
  const [newAttendeeRole, setNewAttendeeRole] = useState<string>('');
  
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
  const filteredSites = branchId 
    ? sites.filter(s => s.branch_id === branchId)
    : sites;
  
  const filteredBuildings = siteId 
    ? buildings.filter(b => b.site_id === siteId)
    : buildings;
  
  const filteredFloorsZones = buildingId 
    ? floorsZones.filter(f => f.building_id === buildingId)
    : floorsZones;
  
  // Reset child selections when parent changes
  useEffect(() => {
    if (branchId) {
      const validSite = sites.find(s => s.id === siteId && s.branch_id === branchId);
      if (!validSite) {
        setSiteId('');
        setBuildingId('');
        setFloorZoneId('');
      }
    }
  }, [branchId, sites, siteId]);
  
  useEffect(() => {
    if (siteId) {
      const validBuilding = buildings.find(b => b.id === buildingId && b.site_id === siteId);
      if (!validBuilding) {
        setBuildingId('');
        setFloorZoneId('');
      }
    }
  }, [siteId, buildings, buildingId]);
  
  useEffect(() => {
    if (buildingId) {
      const validFloor = floorsZones.find(f => f.id === floorZoneId && f.building_id === buildingId);
      if (!validFloor) {
        setFloorZoneId('');
      }
    }
  }, [buildingId, floorsZones, floorZoneId]);
  
  const period = format(periodDate, 'MMMM yyyy');
  
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
  
  const handleCreate = async () => {
    if (!templateId) {
      toast({ title: t('common.error'), description: t('inspectionSessions.selectTemplate'), variant: 'destructive' });
      return;
    }
    
    try {
      const session = await createSession.mutateAsync({
        template_id: templateId,
        period,
        site_id: siteId || null,
        building_id: buildingId || null,
        floor_zone_id: floorZoneId || null,
        scope_notes: scopeNotes || null,
        weather_conditions: weatherConditions || null,
        attendees: attendees.length > 0 ? attendees : undefined,
      });
      
      await startSession.mutateAsync(session.id);
      
      toast({ title: t('common.success'), description: t('inspectionSessions.sessionCreated') });
      onOpenChange(false);
      navigate(`/inspections/sessions/${session.id}`);
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };
  
  const isLoading = createSession.isPending || startSession.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('inspectionSessions.createAreaSession')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Area Template */}
          <div className="space-y-2">
            <Label>{t('inspectionSessions.selectAreaTemplate')} *</Label>
            <Select value={templateId} onValueChange={setTemplateId} dir={direction}>
              <SelectTrigger>
                <SelectValue placeholder={t('inspectionSessions.selectAreaTemplate')} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {i18n.language === 'ar' && template.name_ar ? template.name_ar : template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Period */}
          <div className="space-y-2">
            <Label>{t('inspectionSessions.period')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-start font-normal", !periodDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="me-2 h-4 w-4" />
                  {period}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={periodDate}
                  onSelect={(date) => date && setPeriodDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Location Hierarchy */}
          <div className="space-y-2">
            <Label>{t('orgStructure.branch')} ({t('common.optional')})</Label>
            <Select value={branchId || "__all__"} onValueChange={(v) => setBranchId(v === "__all__" ? "" : v)} dir={direction}>
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
            <Select value={siteId || "__all__"} onValueChange={(v) => setSiteId(v === "__all__" ? "" : v)} dir={direction}>
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
            <Select value={buildingId || "__all__"} onValueChange={(v) => setBuildingId(v === "__all__" ? "" : v)} dir={direction} disabled={!siteId}>
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
          
          <div className="space-y-2">
            <Label>{t('inspectionSessions.selectFloor')} ({t('common.optional')})</Label>
            <Select value={floorZoneId || "__all__"} onValueChange={(v) => setFloorZoneId(v === "__all__" ? "" : v)} dir={direction} disabled={!buildingId}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('common.all')}</SelectItem>
                {filteredFloorsZones.map((floor) => (
                  <SelectItem key={floor.id} value={floor.id}>{floor.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Weather Conditions */}
          <div className="space-y-2">
            <Label>{t('inspectionSessions.weatherConditions')} ({t('common.optional')})</Label>
            <Select value={weatherConditions || "__none__"} onValueChange={(v) => setWeatherConditions(v === "__none__" ? "" : v)} dir={direction}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">-</SelectItem>
                {WEATHER_OPTIONS.map((weather) => (
                  <SelectItem key={weather} value={weather}>
                    {t(`inspectionSessions.weather.${weather}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Scope Notes */}
          <div className="space-y-2">
            <Label>{t('inspectionSessions.scopeNotes')} ({t('common.optional')})</Label>
            <Textarea
              value={scopeNotes}
              onChange={(e) => setScopeNotes(e.target.value)}
              placeholder={t('inspectionSessions.scopeNotesPlaceholder')}
              rows={3}
            />
          </div>
          
          {/* Attendees */}
          <div className="space-y-2">
            <Label>{t('inspectionSessions.attendees')} ({t('common.optional')})</Label>
            
            {/* Existing attendees */}
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
            
            {/* Add new attendee */}
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
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={isLoading || !templateId}>
            {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('inspectionSessions.startInspection')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
