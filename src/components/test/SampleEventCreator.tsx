/**
 * Sample Event Creator
 * Quick event creation with pre-filled data for testing
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  FileText, 
  Send, 
  Loader2,
  AlertTriangle,
  Zap,
  HeartPulse,
  Shield,
  Leaf,
  HardHat,
  Bell,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationPreview } from '@/hooks/use-notification-preview';
import type { SeverityLevelV2 } from '@/lib/hsse-severity-levels';

// Sample event template interface
interface SampleEvent {
  title: string;
  title_ar: string;
  description: string;
  event_type: string;
  event_subtype: string;
  severity: SeverityLevelV2;
  icon: any;
  color: string;
  has_injury?: boolean;
  erp_activated?: boolean;
}

// Sample event templates
const SAMPLE_EVENTS: Record<string, SampleEvent> = {
  observation: {
    title: 'Unsafe Condition Observed',
    title_ar: 'ملاحظة حالة غير آمنة',
    description: 'Employee observed loose cables in walkway area that could cause trip hazard.',
    event_type: 'safety',
    event_subtype: 'unsafe_condition',
    severity: 'level_1' as SeverityLevelV2,
    icon: Eye,
    color: 'text-blue-500',
  },
  near_miss: {
    title: 'Near Miss - Forklift Operation',
    title_ar: 'حادثة وشيكة - تشغيل الرافعة',
    description: 'Worker narrowly avoided collision with forklift in warehouse. No injuries.',
    event_type: 'safety',
    event_subtype: 'near_miss',
    severity: 'level_2' as SeverityLevelV2,
    icon: AlertTriangle,
    color: 'text-amber-500',
  },
  first_aid: {
    title: 'Minor First Aid Case',
    title_ar: 'حالة إسعافات أولية بسيطة',
    description: 'Employee received minor cut on hand requiring first aid treatment. Returned to work.',
    event_type: 'health',
    event_subtype: 'first_aid',
    severity: 'level_2' as SeverityLevelV2,
    has_injury: true,
    icon: HeartPulse,
    color: 'text-red-500',
  },
  level_3_incident: {
    title: 'Equipment Damage Incident',
    title_ar: 'حادث تلف المعدات',
    description: 'Crane arm struck building causing significant damage. Operations halted for inspection.',
    event_type: 'safety',
    event_subtype: 'property_damage',
    severity: 'level_3' as SeverityLevelV2,
    icon: HardHat,
    color: 'text-orange-500',
  },
  level_4_incident: {
    title: 'Serious Injury - Fall from Height',
    title_ar: 'إصابة خطيرة - سقوط من ارتفاع',
    description: 'Worker fell from scaffold (3m height). Transported to hospital. Fractures confirmed.',
    event_type: 'safety',
    event_subtype: 'fall',
    severity: 'level_4' as SeverityLevelV2,
    has_injury: true,
    icon: AlertTriangle,
    color: 'text-red-600',
  },
  level_5_crisis: {
    title: 'Major Fire Incident',
    title_ar: 'حريق كبير',
    description: 'Fire broke out in storage facility. Multiple injuries. ERP activated. Emergency services on scene.',
    event_type: 'safety',
    event_subtype: 'fire',
    severity: 'level_5' as SeverityLevelV2,
    has_injury: true,
    erp_activated: true,
    icon: Zap,
    color: 'text-red-700',
  },
  environmental: {
    title: 'Chemical Spill',
    title_ar: 'تسرب كيميائي',
    description: 'Minor chemical spill in laboratory. Contained and cleaned per protocol.',
    event_type: 'environment',
    event_subtype: 'spill',
    severity: 'level_3' as SeverityLevelV2,
    icon: Leaf,
    color: 'text-green-600',
  },
  security: {
    title: 'Unauthorized Access Attempt',
    title_ar: 'محاولة دخول غير مصرح',
    description: 'Individual attempted to enter restricted area without proper clearance.',
    event_type: 'security',
    event_subtype: 'unauthorized_access',
    severity: 'level_2' as SeverityLevelV2,
    icon: Shield,
    color: 'text-purple-600',
  },
};

type SampleEventKey = keyof typeof SAMPLE_EVENTS;

export function SampleEventCreator() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  
  const [selectedTemplate, setSelectedTemplate] = useState<SampleEventKey | null>(null);
  const [hasInjury, setHasInjury] = useState(false);
  const [erpActivated, setErpActivated] = useState(false);
  const [customDescription, setCustomDescription] = useState('');

  // Get current template
  const template = selectedTemplate ? SAMPLE_EVENTS[selectedTemplate] : null;

  // Get notification preview
  const { 
    effectiveSeverity, 
    previewRecipients, 
    whatsappRecipients,
    isHighPriority,
    isErpOverride,
    roleLabels 
  } = useNotificationPreview({
    severityLevel: template?.severity,
    hasInjury: hasInjury || template?.has_injury || false,
    erpActivated: erpActivated || template?.erp_activated || false,
  });

  // Create incident mutation
  const createIncidentMutation = useMutation({
    mutationFn: async () => {
      if (!template || !profile?.tenant_id) throw new Error('Missing data');

      const { data, error } = await supabase
        .from('incidents')
        .insert({
          tenant_id: profile.tenant_id,
          title: isRTL ? template.title_ar : template.title,
          description: customDescription || template.description,
          event_type: template.event_type,
          event_subtype: template.event_subtype,
          severity_level: effectiveSeverity,
          has_injury: hasInjury || template.has_injury || false,
          erp_activated: erpActivated || template.erp_activated || false,
          status: 'draft',
          reporter_id: profile.user_id,
          location: 'Test Location - Main Building',
        })
        .select('id, reference_id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        isRTL 
          ? `تم إنشاء الحدث: ${data.reference_id}` 
          : `Event created: ${data.reference_id}`
      );
      navigate(`/incidents/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || (isRTL ? 'فشل في إنشاء الحدث' : 'Failed to create event'));
    },
  });

  const handleSelectTemplate = (key: SampleEventKey) => {
    setSelectedTemplate(key);
    const tmpl = SAMPLE_EVENTS[key];
    setHasInjury(tmpl.has_injury || false);
    setErpActivated(tmpl.erp_activated || false);
    setCustomDescription('');
  };

  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isRTL ? 'اختر قالب الحدث' : 'Select Event Template'}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? 'انقر على قالب لملء البيانات تلقائياً'
              : 'Click a template to auto-fill event data'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.entries(SAMPLE_EVENTS) as [SampleEventKey, typeof SAMPLE_EVENTS.observation][]).map(([key, event]) => {
              const Icon = event.icon;
              const isSelected = selectedTemplate === key;
              
              return (
                <button
                  key={key}
                  onClick={() => handleSelectTemplate(key)}
                  className={`
                    p-4 rounded-lg border text-start transition-all
                    ${isSelected 
                      ? 'ring-2 ring-primary border-primary bg-primary/5' 
                      : 'hover:border-primary/50 hover:bg-muted/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-5 w-5 ${event.color}`} />
                    <Badge variant="outline" className="text-xs">
                      {event.severity.replace('level_', 'L')}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm line-clamp-2">
                    {isRTL ? event.title_ar : event.title}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event Configuration */}
      {template && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const Icon = template.icon;
                return <Icon className={`h-5 w-5 ${template.color}`} />;
              })()}
              {isRTL ? template.title_ar : template.title}
            </CardTitle>
            <CardDescription>
              {template.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggles */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-red-500" />
                  <Label htmlFor="injury-toggle">
                    {isRTL ? 'يوجد إصابة' : 'Has Injury'}
                  </Label>
                </div>
                <Switch
                  id="injury-toggle"
                  checked={hasInjury}
                  onCheckedChange={setHasInjury}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-600" />
                  <Label htmlFor="erp-toggle">
                    {isRTL ? 'تفعيل ERP' : 'ERP Activated'}
                  </Label>
                </div>
                <Switch
                  id="erp-toggle"
                  checked={erpActivated}
                  onCheckedChange={setErpActivated}
                />
              </div>
            </div>

            {/* Severity Override Alert */}
            {isErpOverride && (
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-700">
                  {isRTL ? 'تم رفع مستوى الخطورة' : 'Severity Upgraded'}
                </AlertTitle>
                <AlertDescription className="text-amber-600">
                  {isRTL 
                    ? `تفعيل ERP يرفع مستوى الخطورة إلى ${effectiveSeverity.replace('level_', 'المستوى ')}`
                    : `ERP activation upgrades severity to ${effectiveSeverity.replace('level_', 'Level ')}`
                  }
                </AlertDescription>
              </Alert>
            )}

            {/* Custom Description */}
            <div className="space-y-2">
              <Label>{isRTL ? 'الوصف (اختياري)' : 'Description (optional)'}</Label>
              <Textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder={template.description}
                rows={3}
              />
            </div>

            {/* Notification Preview */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {isRTL ? 'معاينة الإشعارات' : 'Notification Preview'}
                </span>
              </div>

              {previewRecipients.length > 0 ? (
                <div className="space-y-2">
                  {previewRecipients.map((recipient, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span>
                        {roleLabels[recipient.stakeholder_role]?.[isRTL ? 'ar' : 'en'] || recipient.stakeholder_role}
                      </span>
                      <div className="flex gap-1">
                        {recipient.channels.map((ch) => (
                          <Badge 
                            key={ch} 
                            variant="outline" 
                            className={`text-xs ${ch === 'whatsapp' ? 'bg-green-500/10 text-green-600 border-green-500/30' : ''}`}
                          >
                            {ch}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'لا توجد إشعارات مُعدة لهذا المستوى' : 'No notifications configured for this level'}
                </p>
              )}

              {whatsappRecipients.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-green-600 font-medium">
                    📱 {whatsappRecipients.length} {isRTL ? 'سيتلقون واتساب' : 'will receive WhatsApp'}
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              onClick={() => createIncidentMutation.mutate()}
              disabled={createIncidentMutation.isPending}
              className="w-full"
              size="lg"
            >
              {createIncidentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Send className="h-4 w-4 me-2" />
              )}
              {isRTL ? 'إنشاء الحدث وإرسال الإشعارات' : 'Create Event & Send Notifications'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
