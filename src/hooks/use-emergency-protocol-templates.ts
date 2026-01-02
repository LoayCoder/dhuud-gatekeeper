import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { ProtocolStep } from './use-emergency-protocols';

export interface ProtocolTemplate {
  id: string;
  tenant_id: string;
  alert_type: string;
  protocol_name: string;
  protocol_name_ar?: string;
  steps: ProtocolStep[];
  sla_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateProtocolTemplateInput {
  alert_type: string;
  protocol_name: string;
  protocol_name_ar?: string;
  steps: ProtocolStep[];
  sla_minutes?: number;
  is_active?: boolean;
}

export interface UpdateProtocolTemplateInput extends Partial<CreateProtocolTemplateInput> {
  id: string;
}

// Default protocol templates for each alert type
export const DEFAULT_PROTOCOL_TEMPLATES: Record<string, { name: string; name_ar: string; steps: ProtocolStep[]; sla_minutes: number }> = {
  panic: {
    name: 'Panic Button Response Protocol',
    name_ar: 'بروتوكول الاستجابة لزر الذعر',
    sla_minutes: 5,
    steps: [
      { order: 1, title: 'Locate the person who triggered the alarm', title_ar: 'تحديد موقع الشخص الذي أطلق الإنذار', is_required: true },
      { order: 2, title: 'Assess immediate danger level and situation', title_ar: 'تقييم مستوى الخطر الفوري والموقف', is_required: true },
      { order: 3, title: 'Request backup if necessary', title_ar: 'طلب الدعم إذا لزم الأمر', is_required: false },
      { order: 4, title: 'Provide immediate assistance', title_ar: 'تقديم المساعدة الفورية', is_required: true },
      { order: 5, title: 'Secure the area and remove threats', title_ar: 'تأمين المنطقة وإزالة التهديدات', is_required: true },
      { order: 6, title: 'Document incident with photos', title_ar: 'توثيق الحادث بالصور', is_required: true, photo_required: true },
      { order: 7, title: 'Notify security supervisor', title_ar: 'إخطار مشرف الأمن', is_required: true },
      { order: 8, title: 'Complete incident report', title_ar: 'إكمال تقرير الحادث', is_required: true },
    ],
  },
  medical: {
    name: 'Medical Emergency Response Protocol',
    name_ar: 'بروتوكول الاستجابة للطوارئ الطبية',
    sla_minutes: 3,
    steps: [
      { order: 1, title: 'Call emergency medical services (997/911)', title_ar: 'الاتصال بخدمات الطوارئ الطبية (997/911)', is_required: true },
      { order: 2, title: 'Locate the injured person', title_ar: 'تحديد موقع الشخص المصاب', is_required: true },
      { order: 3, title: 'Assess vital signs if trained', title_ar: 'تقييم العلامات الحيوية إذا كنت مدربًا', is_required: true },
      { order: 4, title: 'Provide first aid within training limits', title_ar: 'تقديم الإسعافات الأولية ضمن حدود التدريب', is_required: true },
      { order: 5, title: 'Keep the person calm and comfortable', title_ar: 'إبقاء الشخص هادئًا ومرتاحًا', is_required: true },
      { order: 6, title: 'Clear path for emergency responders', title_ar: 'تمهيد الطريق للمسعفين', is_required: true },
      { order: 7, title: 'Document injuries with photos', title_ar: 'توثيق الإصابات بالصور', is_required: false, photo_required: true },
      { order: 8, title: 'Guide ambulance to exact location', title_ar: 'توجيه سيارة الإسعاف للموقع الدقيق', is_required: true },
      { order: 9, title: 'Notify management and HR', title_ar: 'إخطار الإدارة والموارد البشرية', is_required: true },
      { order: 10, title: 'Complete medical incident report', title_ar: 'إكمال تقرير الحادث الطبي', is_required: true },
    ],
  },
  fire: {
    name: 'Fire Emergency Response Protocol',
    name_ar: 'بروتوكول الاستجابة لطوارئ الحريق',
    sla_minutes: 2,
    steps: [
      { order: 1, title: 'Activate fire alarm if not already active', title_ar: 'تفعيل إنذار الحريق إذا لم يكن مفعلاً', is_required: true },
      { order: 2, title: 'Call fire department (997/911)', title_ar: 'الاتصال بالدفاع المدني (997/911)', is_required: true },
      { order: 3, title: 'Evacuate all personnel via nearest exit', title_ar: 'إخلاء جميع الأشخاص عبر أقرب مخرج', is_required: true },
      { order: 4, title: 'Account for all personnel at assembly point', title_ar: 'حصر جميع الأشخاص في نقطة التجمع', is_required: true },
      { order: 5, title: 'Only attempt fire suppression if safe', title_ar: 'محاولة إطفاء الحريق فقط إذا كان آمنًا', is_required: false },
      { order: 6, title: 'Shut off gas and electrical if accessible', title_ar: 'إغلاق الغاز والكهرباء إذا كان يمكن الوصول', is_required: false },
      { order: 7, title: 'Document fire location and spread', title_ar: 'توثيق موقع الحريق وانتشاره', is_required: true, photo_required: true },
      { order: 8, title: 'Guide fire department to location', title_ar: 'توجيه الدفاع المدني للموقع', is_required: true },
      { order: 9, title: 'Prevent re-entry until cleared', title_ar: 'منع الدخول حتى يتم التصريح', is_required: true },
      { order: 10, title: 'Complete fire incident report', title_ar: 'إكمال تقرير حادث الحريق', is_required: true },
    ],
  },
  security_breach: {
    name: 'Security Breach Response Protocol',
    name_ar: 'بروتوكول الاستجابة للاختراق الأمني',
    sla_minutes: 5,
    steps: [
      { order: 1, title: 'Alert all security personnel', title_ar: 'تنبيه جميع أفراد الأمن', is_required: true },
      { order: 2, title: 'Identify breach location and type', title_ar: 'تحديد موقع ونوع الاختراق', is_required: true },
      { order: 3, title: 'Lock down affected area', title_ar: 'إغلاق المنطقة المتأثرة', is_required: true },
      { order: 4, title: 'Track and identify intruder(s)', title_ar: 'تتبع وتحديد المتسللين', is_required: true },
      { order: 5, title: 'Request police assistance if needed', title_ar: 'طلب مساعدة الشرطة إذا لزم الأمر', is_required: false },
      { order: 6, title: 'Secure valuable assets and documents', title_ar: 'تأمين الأصول والوثائق القيمة', is_required: true },
      { order: 7, title: 'Document evidence with photos', title_ar: 'توثيق الأدلة بالصور', is_required: true, photo_required: true },
      { order: 8, title: 'Review CCTV footage', title_ar: 'مراجعة تسجيلات الكاميرات', is_required: true },
      { order: 9, title: 'Detain suspect if safe to do so', title_ar: 'احتجاز المشتبه به إذا كان آمنًا', is_required: false },
      { order: 10, title: 'Complete security breach report', title_ar: 'إكمال تقرير الاختراق الأمني', is_required: true },
    ],
  },
  general: {
    name: 'General Emergency Response Protocol',
    name_ar: 'بروتوكول الاستجابة للطوارئ العامة',
    sla_minutes: 10,
    steps: [
      { order: 1, title: 'Assess the situation', title_ar: 'تقييم الموقف', is_required: true },
      { order: 2, title: 'Secure the area', title_ar: 'تأمين المنطقة', is_required: true },
      { order: 3, title: 'Contact emergency services if needed', title_ar: 'الاتصال بخدمات الطوارئ إذا لزم الأمر', is_required: false },
      { order: 4, title: 'Document the incident with photos', title_ar: 'توثيق الحادث بالصور', is_required: true, photo_required: true },
      { order: 5, title: 'Notify management', title_ar: 'إخطار الإدارة', is_required: true },
      { order: 6, title: 'Complete incident report', title_ar: 'إكمال تقرير الحادث', is_required: true },
    ],
  },
};

export function useProtocolTemplates(alertType?: string) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['protocol-templates', tenantId, alertType],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('emergency_response_protocols')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('alert_type')
        .order('created_at', { ascending: false });

      if (alertType) {
        query = query.eq('alert_type', alertType);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(d => ({
        ...d,
        steps: (d.steps || []) as unknown as ProtocolStep[],
      })) as ProtocolTemplate[];
    },
    enabled: !!tenantId,
  });
}

export function useActiveProtocolForAlertType(alertType: string) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['active-protocol', tenantId, alertType],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('emergency_response_protocols')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('alert_type', alertType)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        steps: (data.steps || []) as unknown as ProtocolStep[],
      } as ProtocolTemplate;
    },
    enabled: !!tenantId && !!alertType,
  });
}

export function useCreateProtocolTemplate() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateProtocolTemplateInput) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('emergency_response_protocols')
        .insert({
          tenant_id: profile.tenant_id,
          alert_type: input.alert_type,
          protocol_name: input.protocol_name,
          protocol_name_ar: input.protocol_name_ar,
          steps: JSON.parse(JSON.stringify(input.steps)),
          sla_minutes: input.sla_minutes ?? 10,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocol-templates'] });
      queryClient.invalidateQueries({ queryKey: ['active-protocol'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-protocols'] });
      toast.success('Protocol template created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
}

export function useUpdateProtocolTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProtocolTemplateInput) => {
      const { id, ...updates } = input;
      
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.protocol_name !== undefined) updateData.protocol_name = updates.protocol_name;
      if (updates.protocol_name_ar !== undefined) updateData.protocol_name_ar = updates.protocol_name_ar;
      if (updates.alert_type !== undefined) updateData.alert_type = updates.alert_type;
      if (updates.sla_minutes !== undefined) updateData.sla_minutes = updates.sla_minutes;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.steps !== undefined) updateData.steps = JSON.parse(JSON.stringify(updates.steps));

      const { data, error } = await supabase
        .from('emergency_response_protocols')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocol-templates'] });
      queryClient.invalidateQueries({ queryKey: ['active-protocol'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-protocols'] });
      toast.success('Protocol template updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });
}

export function useDeleteProtocolTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('emergency_response_protocols')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocol-templates'] });
      queryClient.invalidateQueries({ queryKey: ['active-protocol'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-protocols'] });
      toast.success('Protocol template deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });
}

export function useSeedDefaultProtocols() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const alertTypes = Object.keys(DEFAULT_PROTOCOL_TEMPLATES);
      const inserts = alertTypes.map(alertType => {
        const template = DEFAULT_PROTOCOL_TEMPLATES[alertType];
        return {
          tenant_id: profile.tenant_id!,
          alert_type: alertType,
          protocol_name: template.name,
          protocol_name_ar: template.name_ar,
          steps: JSON.parse(JSON.stringify(template.steps)),
          sla_minutes: template.sla_minutes,
          is_active: true,
        };
      });

      const { error } = await supabase
        .from('emergency_response_protocols')
        .insert(inserts);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocol-templates'] });
      queryClient.invalidateQueries({ queryKey: ['active-protocol'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-protocols'] });
      toast.success('Default protocol templates created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to seed templates: ${error.message}`);
    },
  });
}
