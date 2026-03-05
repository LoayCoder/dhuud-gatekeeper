import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Edit3,
  Copy,
  AlertTriangle,
  Heart,
  Flame,
  Shield,
  HelpCircle,
  GripVertical,
  Camera,
  Star,
  Loader2,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useProtocolTemplates,
  useCreateProtocolTemplate,
  useUpdateProtocolTemplate,
  useDeleteProtocolTemplate,
  useSeedDefaultProtocols,
  DEFAULT_PROTOCOL_TEMPLATES,
  type ProtocolTemplate,
  type CreateProtocolTemplateInput,
} from '@/hooks/use-emergency-protocol-templates';
import type { ProtocolStep } from '@/hooks/use-emergency-protocols';

const ALERT_TYPES = [
  { value: 'panic', label: 'Panic', labelAr: 'ذعر', icon: AlertTriangle, color: 'text-red-500' },
  { value: 'medical', label: 'Medical', labelAr: 'طبي', icon: Heart, color: 'text-pink-500' },
  { value: 'fire', label: 'Fire', labelAr: 'حريق', icon: Flame, color: 'text-orange-500' },
  { value: 'security_breach', label: 'Security Breach', labelAr: 'اختراق أمني', icon: Shield, color: 'text-blue-500' },
  { value: 'general', label: 'General', labelAr: 'عام', icon: HelpCircle, color: 'text-gray-500' },
];

interface ProtocolTemplatesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProtocolTemplatesManager({ open, onOpenChange }: ProtocolTemplatesManagerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const [selectedType, setSelectedType] = useState<string>('panic');
  const [editingTemplate, setEditingTemplate] = useState<ProtocolTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: templates = [], isLoading } = useProtocolTemplates();
  const createTemplate = useCreateProtocolTemplate();
  const updateTemplate = useUpdateProtocolTemplate();
  const deleteTemplate = useDeleteProtocolTemplate();
  const seedDefaults = useSeedDefaultProtocols();

  const templatesForType = templates.filter(t => t.alert_type === selectedType);
  const hasTemplates = templates.length > 0;

  const getAlertTypeInfo = (type: string) => ALERT_TYPES.find(t => t.value === type) || ALERT_TYPES[4];

  const handleSeedDefaults = async () => {
    await seedDefaults.mutateAsync();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا البروتوكول؟' : 'Are you sure you want to delete this protocol?')) {
      await deleteTemplate.mutateAsync(id);
    }
  };

  const handleToggleActive = async (template: ProtocolTemplate) => {
    await updateTemplate.mutateAsync({
      id: template.id,
      is_active: !template.is_active,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isRTL ? 'إدارة بروتوكولات الطوارئ' : 'Emergency Protocol Templates'}
          </DialogTitle>
          <DialogDescription>
            {isRTL
              ? 'إنشاء وتخصيص بروتوكولات الاستجابة لكل نوع من أنواع الطوارئ'
              : 'Create and customize response protocols for each emergency type'}
          </DialogDescription>
        </DialogHeader>

        {!hasTemplates && !isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Download className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {isRTL ? 'لا توجد بروتوكولات' : 'No Protocol Templates'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {isRTL
                ? 'ابدأ بإنشاء بروتوكولات افتراضية لجميع أنواع الطوارئ أو أنشئ بروتوكولاً مخصصًا'
                : 'Start by loading default protocols for all emergency types or create a custom one'}
            </p>
            <div className="flex gap-3">
              <Button onClick={handleSeedDefaults} disabled={seedDefaults.isPending}>
                {seedDefaults.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <Download className="h-4 w-4 me-2" />
                )}
                {isRTL ? 'تحميل البروتوكولات الافتراضية' : 'Load Default Protocols'}
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 me-2" />
                {isRTL ? 'إنشاء مخصص' : 'Create Custom'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Alert Type Tabs */}
            <Tabs value={selectedType} onValueChange={setSelectedType} className="flex-1 flex flex-col">
              <div className="px-6 border-b">
                <TabsList className="h-auto flex-wrap justify-start bg-transparent p-0 gap-1">
                  {ALERT_TYPES.map(type => {
                    const Icon = type.icon;
                    const count = templates.filter(t => t.alert_type === type.value).length;
                    return (
                      <TabsTrigger
                        key={type.value}
                        value={type.value}
                        className="data-[state=active]:bg-muted rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary gap-2"
                      >
                        <Icon className={cn('h-4 w-4', type.color)} />
                        <span>{isRTL ? type.labelAr : type.label}</span>
                        {count > 0 && (
                          <Badge variant="secondary" className="text-xs h-5 px-1.5">
                            {count}
                          </Badge>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              <ScrollArea className="flex-1 px-6 py-4">
                <TabsContent value={selectedType} className="mt-0 space-y-4">
                  {templatesForType.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="mb-4">
                        {isRTL
                          ? `لا توجد بروتوكولات لنوع "${getAlertTypeInfo(selectedType).labelAr}"`
                          : `No protocols for "${getAlertTypeInfo(selectedType).label}" type`}
                      </p>
                      <Button variant="outline" onClick={() => setIsCreating(true)}>
                        <Plus className="h-4 w-4 me-2" />
                        {isRTL ? 'إنشاء بروتوكول' : 'Create Protocol'}
                      </Button>
                    </div>
                  ) : (
                    templatesForType.map(template => (
                      <ProtocolTemplateCard
                        key={template.id}
                        template={template}
                        isRTL={isRTL}
                        onEdit={() => setEditingTemplate(template)}
                        onDelete={() => handleDelete(template.id)}
                        onToggleActive={() => handleToggleActive(template)}
                      />
                    ))
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <Separator />

            <DialogFooter className="px-6 py-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {isRTL ? 'إغلاق' : 'Close'}
              </Button>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 me-2" />
                {isRTL ? 'إنشاء بروتوكول جديد' : 'New Protocol'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Edit/Create Dialog */}
        {(editingTemplate || isCreating) && (
          <ProtocolTemplateEditor
            template={editingTemplate}
            defaultAlertType={selectedType}
            isRTL={isRTL}
            onClose={() => {
              setEditingTemplate(null);
              setIsCreating(false);
            }}
            onSave={async (data) => {
              if (editingTemplate) {
                await updateTemplate.mutateAsync({ id: editingTemplate.id, ...data });
              } else {
                await createTemplate.mutateAsync(data);
              }
              setEditingTemplate(null);
              setIsCreating(false);
            }}
            isSaving={createTemplate.isPending || updateTemplate.isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ProtocolTemplateCardProps {
  template: ProtocolTemplate;
  isRTL: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

function ProtocolTemplateCard({ template, isRTL, onEdit, onDelete, onToggleActive }: ProtocolTemplateCardProps) {
  const alertType = ALERT_TYPES.find(t => t.value === template.alert_type);
  const Icon = alertType?.icon || HelpCircle;
  const requiredSteps = template.steps.filter(s => s.is_required).length;
  const photoSteps = template.steps.filter(s => s.photo_required).length;

  return (
    <Card className={cn(!template.is_active && 'opacity-60')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg bg-muted', alertType?.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {isRTL ? template.protocol_name_ar || template.protocol_name : template.protocol_name}
                {template.is_active && (
                  <Badge variant="default" className="text-xs">
                    <Star className="h-3 w-3 me-1" />
                    {isRTL ? 'نشط' : 'Active'}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isRTL ? template.protocol_name : template.protocol_name_ar}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={template.is_active} onCheckedChange={onToggleActive} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            {template.steps.length} {isRTL ? 'خطوات' : 'steps'}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 text-amber-500" />
            {requiredSteps} {isRTL ? 'مطلوب' : 'required'}
          </span>
          {photoSteps > 0 && (
            <span className="flex items-center gap-1">
              <Camera className="h-4 w-4" />
              {photoSteps} {isRTL ? 'صور' : 'photos'}
            </span>
          )}
          <span>SLA: {template.sla_minutes} {isRTL ? 'دقيقة' : 'min'}</span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit3 className="h-4 w-4 me-1" />
            {isRTL ? 'تعديل' : 'Edit'}
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 me-1" />
            {isRTL ? 'حذف' : 'Delete'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProtocolTemplateEditorProps {
  template: ProtocolTemplate | null;
  defaultAlertType: string;
  isRTL: boolean;
  onClose: () => void;
  onSave: (data: CreateProtocolTemplateInput) => Promise<void>;
  isSaving: boolean;
}

function ProtocolTemplateEditor({ template, defaultAlertType, isRTL, onClose, onSave, isSaving }: ProtocolTemplateEditorProps) {
  const [alertType, setAlertType] = useState(template?.alert_type || defaultAlertType);
  const [name, setName] = useState(template?.protocol_name || '');
  const [nameAr, setNameAr] = useState(template?.protocol_name_ar || '');
  const [slaMinutes, setSlaMinutes] = useState(template?.sla_minutes || 10);
  const [steps, setSteps] = useState<ProtocolStep[]>(template?.steps || []);

  const handleLoadDefault = () => {
    const defaultTemplate = DEFAULT_PROTOCOL_TEMPLATES[alertType];
    if (defaultTemplate) {
      setName(defaultTemplate.name);
      setNameAr(defaultTemplate.name_ar);
      setSlaMinutes(defaultTemplate.sla_minutes);
      setSteps(defaultTemplate.steps);
    }
  };

  const handleAddStep = () => {
    const newOrder = steps.length + 1;
    setSteps([...steps, { order: newOrder, title: '', title_ar: '', is_required: true }]);
  };

  const handleRemoveStep = (order: number) => {
    setSteps(
      steps
        .filter(s => s.order !== order)
        .map((s, i) => ({ ...s, order: i + 1 }))
    );
  };

  const handleUpdateStep = (order: number, field: keyof ProtocolStep, value: unknown) => {
    setSteps(steps.map(s => (s.order === order ? { ...s, [field]: value } : s)));
  };

  const handleSubmit = async () => {
    if (!name.trim() || steps.length === 0) return;
    await onSave({
      alert_type: alertType,
      protocol_name: name,
      protocol_name_ar: nameAr || undefined,
      steps,
      sla_minutes: slaMinutes,
      is_active: true,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>
            {template
              ? isRTL ? 'تعديل البروتوكول' : 'Edit Protocol'
              : isRTL ? 'إنشاء بروتوكول جديد' : 'Create New Protocol'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pe-4">
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{isRTL ? 'نوع التنبيه' : 'Alert Type'}</Label>
                <Select value={alertType} onValueChange={setAlertType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALERT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {isRTL ? type.labelAr : type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'وقت الاستجابة (دقائق)' : 'SLA (minutes)'}</Label>
                <Input
                  type="number"
                  min={1}
                  value={slaMinutes}
                  onChange={e => setSlaMinutes(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{isRTL ? 'اسم البروتوكول (إنجليزي)' : 'Protocol Name (English)'}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Panic Response Protocol" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'اسم البروتوكول (عربي)' : 'Protocol Name (Arabic)'}</Label>
                <Input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="مثال: بروتوكول الاستجابة للذعر" dir="rtl" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleLoadDefault}>
                <Copy className="h-4 w-4 me-2" />
                {isRTL ? 'تحميل الخطوات الافتراضية' : 'Load Default Steps'}
              </Button>
            </div>

            <Separator />

            {/* Steps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">{isRTL ? 'خطوات الاستجابة' : 'Response Steps'}</Label>
                <Button variant="outline" size="sm" onClick={handleAddStep}>
                  <Plus className="h-4 w-4 me-1" />
                  {isRTL ? 'إضافة خطوة' : 'Add Step'}
                </Button>
              </div>

              {steps.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg">
                  {isRTL ? 'لا توجد خطوات. أضف خطوة أو حمّل الافتراضية.' : 'No steps. Add a step or load defaults.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {steps.map(step => (
                    <div key={step.order} className="flex gap-2 items-start p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-1 text-muted-foreground pt-2">
                        <GripVertical className="h-4 w-4" />
                        <span className="text-sm font-medium w-4">{step.order}</span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder={isRTL ? 'العنوان (إنجليزي)' : 'Step title (English)'}
                          value={step.title}
                          onChange={e => handleUpdateStep(step.order, 'title', e.target.value)}
                        />
                        <Input
                          placeholder={isRTL ? 'العنوان (عربي)' : 'Step title (Arabic)'}
                          value={step.title_ar || ''}
                          onChange={e => handleUpdateStep(step.order, 'title_ar', e.target.value)}
                          dir="rtl"
                        />
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={step.is_required}
                              onChange={e => handleUpdateStep(step.order, 'is_required', e.target.checked)}
                              className="rounded"
                            />
                            {isRTL ? 'مطلوب' : 'Required'}
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={step.photo_required || false}
                              onChange={e => handleUpdateStep(step.order, 'photo_required', e.target.checked)}
                              className="rounded"
                            />
                            <Camera className="h-4 w-4" />
                            {isRTL ? 'صورة مطلوبة' : 'Photo required'}
                          </label>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveStep(step.order)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !name.trim() || steps.length === 0}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {template
              ? isRTL ? 'حفظ التغييرات' : 'Save Changes'
              : isRTL ? 'إنشاء البروتوكول' : 'Create Protocol'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
