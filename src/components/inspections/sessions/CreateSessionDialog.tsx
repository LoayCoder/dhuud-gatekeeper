import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useInspectionTemplates } from '@/hooks/use-inspections';
import { useCreateSession, useStartSession } from '@/hooks/use-inspection-sessions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSessionDialog({ open, onOpenChange }: CreateSessionDialogProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();
  const { profile } = useAuth();
  
  const [sessionType, setSessionType] = useState<'asset' | 'area' | 'audit'>('asset');
  const [templateId, setTemplateId] = useState<string>('');
  const [siteId, setSiteId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [typeId, setTypeId] = useState<string>('');
  const [periodDate, setPeriodDate] = useState<Date>(new Date());
  
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; name_ar: string | null }[]>([]);
  const [types, setTypes] = useState<{ id: string; name: string; name_ar: string | null; category_id: string }[]>([]);
  
  const { data: templates = [] } = useInspectionTemplates();
  const createSession = useCreateSession();
  const startSession = useStartSession();
  
  // Fetch sites and categories
  useEffect(() => {
    if (!profile?.tenant_id) return;
    
    const fetchData = async () => {
      const [sitesRes, categoriesRes, typesRes] = await Promise.all([
        supabase.from('sites').select('id, name').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
        supabase.from('asset_categories').select('id, name, name_ar').or(`tenant_id.is.null,tenant_id.eq.${profile.tenant_id}`).is('deleted_at', null),
        supabase.from('asset_types').select('id, name, name_ar, category_id').or(`tenant_id.is.null,tenant_id.eq.${profile.tenant_id}`).is('deleted_at', null),
      ]);
      
      if (sitesRes.data) setSites(sitesRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (typesRes.data) setTypes(typesRes.data);
    };
    
    fetchData();
  }, [profile?.tenant_id]);
  
  const filteredTypes = categoryId 
    ? types.filter(t => t.category_id === categoryId)
    : types;
  
  const period = format(periodDate, 'MMMM yyyy');
  
  const handleCreate = async () => {
    if (!templateId) {
      toast({ title: t('common.error'), description: t('inspectionSessions.selectTemplate'), variant: 'destructive' });
      return;
    }
    
    try {
      // Create the session
      const session = await createSession.mutateAsync({
        session_type: sessionType,
        template_id: templateId,
        period,
        site_id: siteId || null,
        category_id: categoryId || null,
        type_id: typeId || null,
      });
      
      // Start the session (populates assets and sets to in_progress)
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
      <DialogContent className="sm:max-w-[500px]" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('inspectionSessions.createSession')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Session Type */}
          <div className="space-y-2">
            <Label>{t('inspectionSessions.sessionType')}</Label>
            <Select value={sessionType} onValueChange={(v) => setSessionType(v as 'asset' | 'area' | 'audit')} dir={direction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asset">{t('inspectionSessions.bulkAsset')}</SelectItem>
                <SelectItem value="area">{t('inspectionSessions.areaInspection')}</SelectItem>
                <SelectItem value="audit">{t('inspectionSessions.hsseAudit')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Template */}
          <div className="space-y-2">
            <Label>{t('inspectionSessions.selectTemplate')} *</Label>
            <Select value={templateId} onValueChange={setTemplateId} dir={direction}>
              <SelectTrigger>
                <SelectValue placeholder={t('inspectionSessions.selectTemplate')} />
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
          
          {/* Site Filter (optional) */}
          <div className="space-y-2">
            <Label>{t('inspectionSessions.selectSite')} ({t('common.optional')})</Label>
            <Select value={siteId} onValueChange={setSiteId} dir={direction}>
              <SelectTrigger>
                <SelectValue placeholder={t('inspectionSessions.allSites')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('inspectionSessions.allSites')}</SelectItem>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Category Filter (optional) */}
          <div className="space-y-2">
            <Label>{t('assets.category')} ({t('common.optional')})</Label>
            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setTypeId(''); }} dir={direction}>
              <SelectTrigger>
                <SelectValue placeholder={t('inspectionSessions.allCategories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('inspectionSessions.allCategories')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {i18n.language === 'ar' && cat.name_ar ? cat.name_ar : cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Type Filter (optional) */}
          <div className="space-y-2">
            <Label>{t('assets.type')} ({t('common.optional')})</Label>
            <Select value={typeId} onValueChange={setTypeId} dir={direction} disabled={!categoryId}>
              <SelectTrigger>
                <SelectValue placeholder={t('inspectionSessions.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('inspectionSessions.allTypes')}</SelectItem>
                {filteredTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {i18n.language === 'ar' && type.name_ar ? type.name_ar : type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
