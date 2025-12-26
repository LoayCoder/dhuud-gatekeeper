import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Plus, Eye, GripVertical, MessageSquare, Mail, ListFilter } from 'lucide-react';
import { NotificationTemplate, CreateTemplateInput, ChannelType } from '@/hooks/useNotificationTemplates';

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: NotificationTemplate | null;
  onSave: (data: CreateTemplateInput) => void;
  isLoading?: boolean;
}

// System variables available for HSSE templates - expanded with category-specific variables
const SYSTEM_VARIABLES = [
  // General / Common
  { key: 'title', label: 'Title', labelAr: 'العنوان', example: 'Fire hazard near storage' },
  { key: 'description', label: 'Description', labelAr: 'الوصف', example: 'Flammable materials found...' },
  { key: 'site_name', label: 'Site Name', labelAr: 'اسم الموقع', example: 'Main Factory' },
  { key: 'department', label: 'Department', labelAr: 'القسم', example: 'Operations' },
  { key: 'action_link', label: 'Action Link', labelAr: 'رابط الإجراء', example: 'https://app.dhuud.com/...' },
  { key: 'reference_id', label: 'Reference ID', labelAr: 'رقم المرجع', example: 'REF-2024-0042' },
  
  // Incidents
  { key: 'incident_id', label: 'Incident ID', labelAr: 'رقم الحادث', example: 'INC-2024-0042' },
  { key: 'location', label: 'Location', labelAr: 'الموقع', example: 'Site A - Building 2' },
  { key: 'risk_level', label: 'Risk Level', labelAr: 'مستوى الخطورة', example: 'Level 3 (Serious)' },
  { key: 'reported_by', label: 'Reported By', labelAr: 'أبلغ عنه', example: 'Ahmed Hassan' },
  { key: 'incident_time', label: 'Incident Time', labelAr: 'وقت الحادث', example: '2024-12-26 14:30' },
  { key: 'event_type', label: 'Event Type', labelAr: 'نوع الحدث', example: 'Observation' },
  
  // Inspections
  { key: 'inspection_date', label: 'Inspection Date', labelAr: 'تاريخ التفتيش', example: '2024-12-26' },
  { key: 'inspector_name', label: 'Inspector Name', labelAr: 'اسم المفتش', example: 'Mohammed Ali' },
  { key: 'inspection_type', label: 'Inspection Type', labelAr: 'نوع التفتيش', example: 'Safety Audit' },
  { key: 'findings_count', label: 'Findings Count', labelAr: 'عدد الملاحظات', example: '5' },
  
  // Actions
  { key: 'due_date', label: 'Due Date', labelAr: 'تاريخ الاستحقاق', example: '2024-12-31' },
  { key: 'assigned_to', label: 'Assigned To', labelAr: 'مُسند إلى', example: 'Khalid Saeed' },
  { key: 'priority', label: 'Priority', labelAr: 'الأولوية', example: 'High' },
  { key: 'action_status', label: 'Action Status', labelAr: 'حالة الإجراء', example: 'In Progress' },
  
  // Contractors
  { key: 'contractor_name', label: 'Contractor Name', labelAr: 'اسم المقاول', example: 'ABC Construction' },
  { key: 'permit_type', label: 'Permit Type', labelAr: 'نوع التصريح', example: 'Hot Work Permit' },
  { key: 'valid_until', label: 'Valid Until', labelAr: 'صالح حتى', example: '2024-12-31' },
  { key: 'worker_name', label: 'Worker Name', labelAr: 'اسم العامل', example: 'John Smith' },
  
  // Assets
  { key: 'asset_name', label: 'Asset Name', labelAr: 'اسم الأصل', example: 'Fire Extinguisher #42' },
  { key: 'asset_type', label: 'Asset Type', labelAr: 'نوع الأصل', example: 'Fire Safety Equipment' },
  { key: 'asset_code', label: 'Asset Code', labelAr: 'رمز الأصل', example: 'FE-2024-042' },
  { key: 'next_maintenance', label: 'Next Maintenance', labelAr: 'الصيانة القادمة', example: '2025-01-15' },
  
  // Alerts
  { key: 'alert_time', label: 'Alert Time', labelAr: 'وقت التنبيه', example: '2024-12-26 09:00' },
  { key: 'alert_type', label: 'Alert Type', labelAr: 'نوع التنبيه', example: 'Expiry Warning' },
  { key: 'days_remaining', label: 'Days Remaining', labelAr: 'الأيام المتبقية', example: '7' },
];

// Category to variable keys mapping
const CATEGORY_VARIABLES: Record<string, string[]> = {
  general: ['title', 'description', 'site_name', 'department', 'action_link', 'reference_id'],
  incidents: ['incident_id', 'reference_id', 'location', 'risk_level', 'reported_by', 'incident_time', 'action_link', 'event_type', 'title', 'description', 'site_name', 'department'],
  inspections: ['reference_id', 'location', 'site_name', 'department', 'action_link', 'title', 'description', 'inspection_date', 'inspector_name', 'inspection_type', 'findings_count'],
  actions: ['reference_id', 'title', 'description', 'due_date', 'assigned_to', 'action_link', 'priority', 'action_status', 'site_name', 'department'],
  contractors: ['reference_id', 'contractor_name', 'permit_type', 'site_name', 'valid_until', 'action_link', 'worker_name', 'department'],
  assets: ['reference_id', 'asset_name', 'asset_type', 'asset_code', 'location', 'site_name', 'action_link', 'next_maintenance'],
  alerts: ['title', 'description', 'risk_level', 'site_name', 'action_link', 'alert_time', 'alert_type', 'days_remaining'],
};

const CATEGORIES = [
  'general',
  'incidents',
  'inspections',
  'actions',
  'contractors',
  'assets',
  'alerts',
];

const CHANNEL_OPTIONS: { value: ChannelType; label: string; icon: React.ReactNode }[] = [
  { value: 'whatsapp', label: 'WhatsApp Only', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'email', label: 'Email Only', icon: <Mail className="h-4 w-4" /> },
  { value: 'both', label: 'Both Channels', icon: null },
];

export function TemplateEditor({
  open,
  onOpenChange,
  template,
  onSave,
  isLoading,
}: TemplateEditorProps) {
  const { i18n } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<CreateTemplateInput>({
    slug: '',
    meta_template_name: '',
    content_pattern: '',
    variable_keys: [],
    default_gateway: 'wasender',
    category: 'general',
    language: 'en',
    is_active: true,
    channel_type: 'whatsapp',
    email_subject: '',
  });
  const [newVariable, setNewVariable] = useState('');
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [showAllVariables, setShowAllVariables] = useState(false);
  const [activeDropTarget, setActiveDropTarget] = useState<'content' | 'subject'>('content');

  useEffect(() => {
    if (template) {
      setFormData({
        slug: template.slug,
        meta_template_name: template.meta_template_name || '',
        content_pattern: template.content_pattern,
        variable_keys: template.variable_keys || [],
        default_gateway: template.default_gateway,
        category: template.category || 'general',
        language: template.language || 'en',
        is_active: template.is_active,
        channel_type: template.channel_type || 'whatsapp',
        email_subject: template.email_subject || '',
      });
      // Initialize preview data with examples
      const preview: Record<string, string> = {};
      (template.variable_keys || []).forEach((key) => {
        const sysVar = SYSTEM_VARIABLES.find(v => v.key === key);
        preview[key] = sysVar?.example || `[${key}]`;
      });
      setPreviewData(preview);
    } else {
      setFormData({
        slug: '',
        meta_template_name: '',
        content_pattern: '',
        variable_keys: [],
        default_gateway: 'wasender',
        category: 'general',
        language: 'en',
        is_active: true,
        channel_type: 'whatsapp',
        email_subject: '',
      });
      setPreviewData({});
    }
  }, [template, open]);

  // Insert variable at cursor position in content
  const insertVariable = (key: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = formData.content_pattern;
    
    let placeholderNum: number;
    const existingIndex = formData.variable_keys.indexOf(key);
    
    if (existingIndex >= 0) {
      placeholderNum = existingIndex + 1;
    } else {
      placeholderNum = formData.variable_keys.length + 1;
      const newVariables = [...formData.variable_keys, key];
      const sysVar = SYSTEM_VARIABLES.find(v => v.key === key);
      setFormData(prev => ({ ...prev, variable_keys: newVariables }));
      setPreviewData(prev => ({ ...prev, [key]: sysVar?.example || `[${key}]` }));
    }
    
    const placeholder = `{{${placeholderNum}}}`;
    const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
    
    setFormData(prev => ({ ...prev, content_pattern: newValue }));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  // Insert variable at email subject cursor position
  const insertVariableToSubject = (key: string) => {
    const input = emailSubjectRef.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue = formData.email_subject || '';
    
    let placeholderNum: number;
    const existingIndex = formData.variable_keys.indexOf(key);
    
    if (existingIndex >= 0) {
      placeholderNum = existingIndex + 1;
    } else {
      placeholderNum = formData.variable_keys.length + 1;
      const newVariables = [...formData.variable_keys, key];
      const sysVar = SYSTEM_VARIABLES.find(v => v.key === key);
      setFormData(prev => ({ ...prev, variable_keys: newVariables }));
      setPreviewData(prev => ({ ...prev, [key]: sysVar?.example || `[${key}]` }));
    }
    
    const placeholder = `{{${placeholderNum}}}`;
    const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
    
    setFormData(prev => ({ ...prev, email_subject: newValue }));
    
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  const addVariable = () => {
    if (newVariable && !formData.variable_keys.includes(newVariable)) {
      const updated = [...formData.variable_keys, newVariable];
      setFormData({ ...formData, variable_keys: updated });
      setPreviewData({ ...previewData, [newVariable]: `[${newVariable}]` });
      setNewVariable('');
    }
  };

  const removeVariable = (key: string) => {
    setFormData({
      ...formData,
      variable_keys: formData.variable_keys.filter((k) => k !== key),
    });
    const { [key]: removed, ...rest } = previewData;
    setPreviewData(rest);
  };

  const getPreviewMessage = () => {
    let result = formData.content_pattern;
    formData.variable_keys.forEach((key, index) => {
      const placeholder = `{{${index + 1}}}`;
      const value = previewData[key] || `[${key}]`;
      result = result.split(placeholder).join(value);
    });
    return result;
  };

  const getPreviewSubject = () => {
    let result = formData.email_subject || '';
    formData.variable_keys.forEach((key, index) => {
      const placeholder = `{{${index + 1}}}`;
      const value = previewData[key] || `[${key}]`;
      result = result.split(placeholder).join(value);
    });
    return result;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Handle drag start for variable chips
  const handleDragStart = (e: React.DragEvent, key: string) => {
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Handle drop on content textarea
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setActiveDropTarget('content');
    const key = e.dataTransfer.getData('text/plain');
    if (key) {
      insertVariable(key);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setActiveDropTarget('content');
  };

  // Handle drop on email subject
  const handleSubjectDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setActiveDropTarget('subject');
    const key = e.dataTransfer.getData('text/plain');
    if (key) {
      insertVariableToSubject(key);
    }
  };

  const handleSubjectDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setActiveDropTarget('subject');
  };

  // Handle variable click - insert to active target
  const handleVariableClick = (key: string) => {
    if (activeDropTarget === 'subject' && showEmailFields) {
      insertVariableToSubject(key);
    } else {
      insertVariable(key);
    }
  };

  // Get filtered variables based on category
  const getFilteredVariables = () => {
    if (showAllVariables) {
      return SYSTEM_VARIABLES;
    }
    const allowedKeys = CATEGORY_VARIABLES[formData.category] || CATEGORY_VARIABLES.general;
    return SYSTEM_VARIABLES.filter(v => allowedKeys.includes(v.key));
  };

  const filteredVariables = getFilteredVariables();

  const showWhatsAppFields = formData.channel_type === 'whatsapp' || formData.channel_type === 'both';
  const showEmailFields = formData.channel_type === 'email' || formData.channel_type === 'both';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="ltr">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel Type Selector */}
          <div className="space-y-2">
            <Label>Channel Type</Label>
            <div className="flex gap-2">
              {CHANNEL_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={formData.channel_type === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, channel_type: option.value })}
                  className="flex items-center gap-2"
                >
                  {option.icon}
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (Unique ID)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') })
                }
                placeholder="order_confirmation"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {showWhatsAppFields && (
              <div className="space-y-2">
                <Label htmlFor="gateway">WhatsApp Gateway</Label>
                <Select
                  value={formData.default_gateway}
                  onValueChange={(value: 'official' | 'wasender') =>
                    setFormData({ ...formData, default_gateway: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wasender">WaSender</SelectItem>
                    <SelectItem value="official">Official (Meta)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => setFormData({ ...formData, language: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {showWhatsAppFields && formData.default_gateway === 'official' && (
            <div className="space-y-2">
              <Label htmlFor="meta_template_name">Meta Template Name</Label>
              <Input
                id="meta_template_name"
                value={formData.meta_template_name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, meta_template_name: e.target.value })
                }
                placeholder="Template name from Meta Business Manager"
              />
            </div>
          )}

          {showEmailFields && (
            <div className="space-y-2">
              <Label htmlFor="email_subject">Email Subject</Label>
              <Input
                ref={emailSubjectRef}
                id="email_subject"
                value={formData.email_subject || ''}
                onChange={(e) =>
                  setFormData({ ...formData, email_subject: e.target.value })
                }
                onFocus={() => setActiveDropTarget('subject')}
                onDrop={handleSubjectDrop}
                onDragOver={handleSubjectDragOver}
                placeholder="🚨 New {{1}}: {{2}}"
                className={`transition-all ${activeDropTarget === 'subject' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              />
              <p className="text-xs text-muted-foreground">
                Click on the field, then click a variable to insert it. Or drag and drop.
              </p>
            </div>
          )}

          {/* Variable Chips + Message Editor Side by Side */}
          <div className="grid grid-cols-[220px_1fr] gap-4">
            {/* Variables Sidebar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  Variables
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllVariables(!showAllVariables)}
                  className="h-6 px-2 text-xs"
                >
                  <ListFilter className="h-3 w-3 me-1" />
                  {showAllVariables ? 'Filter' : 'All'}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mb-1">
                {showAllVariables 
                  ? `All ${SYSTEM_VARIABLES.length} variables` 
                  : `${filteredVariables.length} for ${formData.category}`}
              </div>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="flex flex-col gap-1.5">
                  {filteredVariables.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      draggable
                      onDragStart={(e) => handleDragStart(e, variable.key)}
                      onClick={() => handleVariableClick(variable.key)}
                      className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md border bg-muted/50 hover:bg-muted cursor-pointer transition-colors text-start"
                      title={`${variable.label} - ${variable.example}`}
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-mono text-primary truncate">
                        {variable.key}
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Click or drag to insert
              </p>
            </div>

            {/* Message Editor */}
            <div className="space-y-2">
              <Label htmlFor="content_pattern">
                Message Content
              </Label>
              <Textarea
                ref={textareaRef}
                id="content_pattern"
                value={formData.content_pattern}
                onChange={(e) =>
                  setFormData({ ...formData, content_pattern: e.target.value })
                }
                onFocus={() => setActiveDropTarget('content')}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                placeholder="🚨 New {{event_type}}: {{title}}&#10;&#10;📍 Location: {{location}}&#10;⚠️ Risk: {{risk_level}}&#10;👤 Reported by: {{reported_by}}"
                rows={6}
                required
                className={`font-mono text-sm transition-all ${activeDropTarget === 'content' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              />
            </div>
          </div>

          {/* Active Variables */}
          <div className="space-y-2">
            <Label>Active Variable Mappings</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.variable_keys.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  No variables added yet. Click or drag from the sidebar.
                </span>
              ) : (
                formData.variable_keys.map((key, index) => (
                  <Badge key={key} variant="secondary" className="gap-1 font-mono">
                    {`{{${index + 1}}}`} = {key}
                    <button
                      type="button"
                      onClick={() => removeVariable(key)}
                      className="ms-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newVariable}
                onChange={(e) => setNewVariable(e.target.value.replace(/\s+/g, '_'))}
                placeholder="custom_variable_name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addVariable();
                  }
                }}
                className="font-mono"
              />
              <Button type="button" variant="outline" onClick={addVariable}>
                <Plus className="h-4 w-4 me-1" />
                Add Custom
              </Button>
            </div>
          </div>

          <Separator />

          {/* Live Preview */}
          <Card className="bg-muted/50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              <Tabs defaultValue={showWhatsAppFields ? 'whatsapp' : 'email'}>
                <TabsList className="mb-3">
                  {showWhatsAppFields && (
                    <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp
                    </TabsTrigger>
                  )}
                  {showEmailFields && (
                    <TabsTrigger value="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </TabsTrigger>
                  )}
                </TabsList>

                {showWhatsAppFields && (
                  <TabsContent value="whatsapp">
                    <div className="bg-[#e5ddd5] p-4 rounded-md">
                      <div className="bg-[#dcf8c6] p-3 rounded-lg max-w-sm ms-auto shadow-sm whitespace-pre-wrap text-sm">
                        {getPreviewMessage() || 'Enter message content to see preview...'}
                      </div>
                    </div>
                  </TabsContent>
                )}

                {showEmailFields && (
                  <TabsContent value="email">
                    <div className="bg-background border rounded-md overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 border-b">
                        <p className="text-xs text-muted-foreground">Subject:</p>
                        <p className="font-medium text-sm">
                          {getPreviewSubject() || 'No subject set'}
                        </p>
                      </div>
                      <div className="p-4 whitespace-pre-wrap text-sm">
                        {getPreviewMessage() || 'Enter message content to see preview...'}
                      </div>
                    </div>
                  </TabsContent>
                )}
              </Tabs>

              {formData.variable_keys.length > 0 && (
                <div className="mt-3 space-y-2">
                  <Label className="text-xs text-muted-foreground">Test Values:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {formData.variable_keys.map((key) => {
                      const sysVar = SYSTEM_VARIABLES.find(v => v.key === key);
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <Label className="text-xs w-24 truncate font-mono">{key}:</Label>
                          <Input
                            placeholder={sysVar?.example || key}
                            value={previewData[key] || ''}
                            onChange={(e) =>
                              setPreviewData({ ...previewData, [key]: e.target.value })
                            }
                            className="h-8 text-sm flex-1"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
