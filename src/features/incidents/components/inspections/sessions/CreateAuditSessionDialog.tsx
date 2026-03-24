import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, Loader2, Plus, X, Shield, Users, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useAuditTemplates, useCreateAuditSession, useStartAuditSession } from '@/hooks/use-audit-sessions';
import { useTemplateItemCount } from '@/hooks/use-template-item-count';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { createAuditSessionSchema, type CreateAuditSessionFormValues } from './CreateAuditSessionSchema';

interface CreateAuditSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TeamMember {
  name: string;
  role?: string;
}

export function CreateAuditSessionDialog({ open, onOpenChange }: CreateAuditSessionDialogProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();
  const { profile } = useAuth();
  
  const form = useForm<CreateAuditSessionFormValues>({
    resolver: zodResolver(createAuditSessionSchema),
    defaultValues: {
      templateId: '',
      branchId: '',
      siteId: '',
      buildingId: '',
      periodDate: new Date(),
      scopeNotes: '',
      auditObjective: '',
    },
  });

  const watchedBranch = form.watch('branchId');
  const watchedSite = form.watch('siteId');
  const watchedTemplateId = form.watch('templateId');
  const watchedPeriodDate = form.watch('periodDate');

  // Audit team kept as useState (dynamic array with input buffer)
  const [auditTeam, setAuditTeam] = useState<TeamMember[]>([]);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('');
  
  // Lookup data
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string; branch_id: string | null }[]>([]);
  const [buildings, setBuildings] = useState<{ id: string; name: string; site_id: string }[]>([]);
  
  const { data: templates = [] } = useAuditTemplates();
  const createSession = useCreateAuditSession();
  const startSession = useStartAuditSession();
  
  const selectedTemplate = templates.find(t => t.id === watchedTemplateId);
  
  // Fetch location hierarchy
  useEffect(() => {
    if (!profile?.tenant_id) return;
    
    const fetchData = async () => {
      const [branchesRes, sitesRes, buildingsRes] = await Promise.all([
        supabase.from('branches').select('id, name').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
        supabase.from('sites').select('id, name, branch_id').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
        supabase.from('buildings').select('id, name, site_id').eq('tenant_id', profile.tenant_id).is('deleted_at', null).eq('is_active', true),
      ]);
      
      if (branchesRes.data) setBranches(branchesRes.data);
      if (sitesRes.data) setSites(sitesRes.data);
      if (buildingsRes.data) setBuildings(buildingsRes.data);
    };
    
    fetchData();
  }, [profile?.tenant_id]);
  
  const filteredSites = watchedBranch 
    ? sites.filter(s => s.branch_id === watchedBranch)
    : sites;
  
  const filteredBuildings = watchedSite 
    ? buildings.filter(b => b.site_id === watchedSite)
    : buildings;

  // Cascade handlers
  const handleBranchChange = (value: string) => {
    form.setValue('branchId', value === '__all__' ? '' : value);
    form.setValue('siteId', '');
    form.setValue('buildingId', '');
  };

  const handleSiteChange = (value: string) => {
    form.setValue('siteId', value === '__all__' ? '' : value);
    form.setValue('buildingId', '');
  };
  
  const period = format(watchedPeriodDate, 'MMMM yyyy');
  
  const handleAddMember = () => {
    if (newMemberName.trim()) {
      setAuditTeam([...auditTeam, { name: newMemberName.trim(), role: newMemberRole.trim() || undefined }]);
      setNewMemberName('');
      setNewMemberRole('');
    }
  };
  
  const handleRemoveMember = (index: number) => {
    setAuditTeam(auditTeam.filter((_, i) => i !== index));
  };
  
  const onSubmit = async (data: CreateAuditSessionFormValues) => {
    if (!data.templateId) {
      toast({ title: t('common.error'), description: t('audits.selectTemplate'), variant: 'destructive' });
      return;
    }
    
    try {
      const session = await createSession.mutateAsync({
        template_id: data.templateId,
        period,
        site_id: data.siteId || null,
        building_id: data.buildingId || null,
        scope_notes: data.scopeNotes || null,
        audit_objective: data.auditObjective || null,
        audit_team: auditTeam.length > 0 ? auditTeam : undefined,
      });
      
      await startSession.mutateAsync(session.id);
      
      toast({ title: t('common.success'), description: t('audits.sessionCreated') });
      onOpenChange(false);
      navigate(`/inspections/sessions/${session.id}/audit`);
    } catch (error: unknown) {
      toast({ title: t('common.error'), description: error instanceof Error ? error.message : 'Error', variant: 'destructive' });
    }
  };
  
  const isLoading = createSession.isPending || startSession.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('audits.createSession')}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Audit Template */}
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('audits.selectTemplate')} *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('audits.selectTemplate')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <span>{i18n.language === 'ar' && template.name_ar ? template.name_ar : template.name}</span>
                            {template.standard_reference && (
                              <Badge variant="outline" className="text-xs">{template.standard_reference}</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Standard Reference (read-only) */}
            {selectedTemplate?.standard_reference && (
              <div className="p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('audits.standardReference')}:</span>
                  <Badge>{selectedTemplate.standard_reference}</Badge>
                </div>
                {selectedTemplate.passing_score_percentage && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('audits.passingThreshold')}: {selectedTemplate.passing_score_percentage}%
                  </p>
                )}
              </div>
            )}
            
            {/* Period */}
            <FormField
              control={form.control}
              name="periodDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('audits.auditPeriod')}</FormLabel>
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
            
            {/* Location Hierarchy — 3-level cascade */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('orgStructure.branch')} ({t('common.optional')})</Label>
                <Select value={watchedBranch || "__all__"} onValueChange={handleBranchChange} dir={direction}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.all')} />
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
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('common.all')}</SelectItem>
                    {filteredSites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="buildingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspectionSessions.selectBuilding')} ({t('common.optional')})</FormLabel>
                  <Select value={field.value || "__all__"} onValueChange={(v) => field.onChange(v === "__all__" ? "" : v)} dir={direction} disabled={!watchedSite}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.all')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__all__">{t('common.all')}</SelectItem>
                      {filteredBuildings.map((building) => (
                        <SelectItem key={building.id} value={building.id}>{building.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Audit Objective */}
            <FormField
              control={form.control}
              name="auditObjective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('audits.auditObjective')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('audits.objectivePlaceholder')}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Audit Scope */}
            <FormField
              control={form.control}
              name="scopeNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('audits.auditScope')} ({t('common.optional')})</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('audits.scopePlaceholder')}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Audit Team (kept as useState — dynamic array with input buffer) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('audits.auditTeam')} ({t('common.optional')})
              </Label>
              
              {auditTeam.length > 0 && (
                <div className="space-y-2 mb-3">
                  {auditTeam.map((member, index) => (
                    <div key={index} className="flex items-center gap-2 bg-secondary/50 rounded-md px-3 py-2">
                      <span className="flex-1 text-sm">
                        {member.name}
                        {member.role && <span className="text-muted-foreground"> ({member.role})</span>}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveMember(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder={t('audits.memberName')}
                  className="flex-1"
                />
                <Input
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  placeholder={t('audits.memberRole')}
                  className="w-32"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddMember}
                  disabled={!newMemberName.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading || !watchedTemplateId}>
                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t('audits.startAudit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}