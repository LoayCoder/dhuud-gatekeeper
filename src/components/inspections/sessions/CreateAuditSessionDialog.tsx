import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Plus, X, Shield, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useAuditTemplates, useCreateAuditSession, useStartAuditSession } from '@/hooks/use-audit-sessions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  
  const [templateId, setTemplateId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [siteId, setSiteId] = useState<string>('');
  const [buildingId, setBuildingId] = useState<string>('');
  const [periodDate, setPeriodDate] = useState<Date>(new Date());
  const [scopeNotes, setScopeNotes] = useState<string>('');
  const [auditObjective, setAuditObjective] = useState<string>('');
  const [auditTeam, setAuditTeam] = useState<TeamMember[]>([]);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('');
  
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string; branch_id: string | null }[]>([]);
  const [buildings, setBuildings] = useState<{ id: string; name: string; site_id: string }[]>([]);
  
  const { data: templates = [] } = useAuditTemplates();
  const createSession = useCreateAuditSession();
  const startSession = useStartAuditSession();
  
  const selectedTemplate = templates.find(t => t.id === templateId);
  
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
  
  const filteredSites = branchId 
    ? sites.filter(s => s.branch_id === branchId)
    : sites;
  
  const filteredBuildings = siteId 
    ? buildings.filter(b => b.site_id === siteId)
    : buildings;
  
  useEffect(() => {
    if (branchId) {
      const validSite = sites.find(s => s.id === siteId && s.branch_id === branchId);
      if (!validSite) {
        setSiteId('');
        setBuildingId('');
      }
    }
  }, [branchId, sites, siteId]);
  
  useEffect(() => {
    if (siteId) {
      const validBuilding = buildings.find(b => b.id === buildingId && b.site_id === siteId);
      if (!validBuilding) {
        setBuildingId('');
      }
    }
  }, [siteId, buildings, buildingId]);
  
  const period = format(periodDate, 'MMMM yyyy');
  
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
  
  const handleCreate = async () => {
    if (!templateId) {
      toast({ title: t('common.error'), description: t('audits.selectTemplate'), variant: 'destructive' });
      return;
    }
    
    try {
      const session = await createSession.mutateAsync({
        template_id: templateId,
        period,
        site_id: siteId || null,
        building_id: buildingId || null,
        scope_notes: scopeNotes || null,
        audit_objective: auditObjective || null,
        audit_team: auditTeam.length > 0 ? auditTeam : undefined,
      });
      
      await startSession.mutateAsync(session.id);
      
      toast({ title: t('common.success'), description: t('audits.sessionCreated') });
      onOpenChange(false);
      navigate(`/inspections/audit/${session.id}`);
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
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
        
        <div className="space-y-4 py-4">
          {/* Audit Template */}
          <div className="space-y-2">
            <Label>{t('audits.selectTemplate')} *</Label>
            <Select value={templateId} onValueChange={setTemplateId} dir={direction}>
              <SelectTrigger>
                <SelectValue placeholder={t('audits.selectTemplate')} />
              </SelectTrigger>
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
          </div>
          
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
          <div className="space-y-2">
            <Label>{t('audits.auditPeriod')}</Label>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('orgStructure.branch')} ({t('common.optional')})</Label>
              <Select value={branchId || "__all__"} onValueChange={(v) => setBranchId(v === "__all__" ? "" : v)} dir={direction}>
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
              <Select value={siteId || "__all__"} onValueChange={(v) => setSiteId(v === "__all__" ? "" : v)} dir={direction}>
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
          
          {/* Audit Objective */}
          <div className="space-y-2">
            <Label>{t('audits.auditObjective')}</Label>
            <Textarea
              value={auditObjective}
              onChange={(e) => setAuditObjective(e.target.value)}
              placeholder={t('audits.objectivePlaceholder')}
              rows={2}
            />
          </div>
          
          {/* Audit Scope */}
          <div className="space-y-2">
            <Label>{t('audits.auditScope')} ({t('common.optional')})</Label>
            <Textarea
              value={scopeNotes}
              onChange={(e) => setScopeNotes(e.target.value)}
              placeholder={t('audits.scopePlaceholder')}
              rows={2}
            />
          </div>
          
          {/* Audit Team */}
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
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={isLoading || !templateId}>
            {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('audits.startAudit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
