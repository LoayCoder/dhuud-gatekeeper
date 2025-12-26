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
import { X, Plus, Eye, GripVertical } from 'lucide-react';
import { NotificationTemplate, CreateTemplateInput } from '@/hooks/useNotificationTemplates';

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: NotificationTemplate | null;
  onSave: (data: CreateTemplateInput) => void;
  isLoading?: boolean;
}

// System variables available for HSSE templates
const SYSTEM_VARIABLES = [
  { key: 'incident_id', label: 'Incident ID', labelAr: 'رقم الحادث', example: 'INC-2024-0042' },
  { key: 'reference_id', label: 'Reference', labelAr: 'المرجع', example: 'INC-2024-0042' },
  { key: 'location', label: 'Location', labelAr: 'الموقع', example: 'Site A - Building 2' },
  { key: 'risk_level', label: 'Risk Level', labelAr: 'مستوى الخطورة', example: 'Level 3 (Serious)' },
  { key: 'reported_by', label: 'Reported By', labelAr: 'أبلغ عنه', example: 'Ahmed Hassan' },
  { key: 'incident_time', label: 'Time', labelAr: 'الوقت', example: '2024-12-26 14:30' },
  { key: 'action_link', label: 'Action Link', labelAr: 'رابط الإجراء', example: 'https://app.dhuud.com/incidents/...' },
  { key: 'event_type', label: 'Event Type', labelAr: 'نوع الحدث', example: 'Observation' },
  { key: 'title', label: 'Title', labelAr: 'العنوان', example: 'Fire hazard near storage' },
  { key: 'description', label: 'Description', labelAr: 'الوصف', example: 'Flammable materials found...' },
  { key: 'site_name', label: 'Site Name', labelAr: 'اسم الموقع', example: 'Main Factory' },
  { key: 'department', label: 'Department', labelAr: 'القسم', example: 'Operations' },
];

const CATEGORIES = [
  'general',
  'incidents',
  'inspections',
  'actions',
  'contractors',
  'assets',
  'alerts',
];

export function TemplateEditor({
  open,
  onOpenChange,
  template,
  onSave,
  isLoading,
}: TemplateEditorProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [formData, setFormData] = useState<CreateTemplateInput>({
    slug: '',
    meta_template_name: '',
    content_pattern: '',
    variable_keys: [],
    default_gateway: 'wasender',
    category: 'general',
    language: 'en',
    is_active: true,
  });
  const [newVariable, setNewVariable] = useState('');
  const [previewData, setPreviewData] = useState<Record<string, string>>({});

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
      });
      setPreviewData({});
    }
  }, [template, open]);

  // Insert variable at cursor position
  const insertVariable = (key: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = formData.content_pattern;
    
    // Determine the placeholder number (index + 1)
    let placeholderNum: number;
    const existingIndex = formData.variable_keys.indexOf(key);
    
    if (existingIndex >= 0) {
      // Variable already exists, use its index
      placeholderNum = existingIndex + 1;
    } else {
      // New variable, add to list
      placeholderNum = formData.variable_keys.length + 1;
      const newVariables = [...formData.variable_keys, key];
      const sysVar = SYSTEM_VARIABLES.find(v => v.key === key);
      setFormData({ ...formData, variable_keys: newVariables });
      setPreviewData({ ...previewData, [key]: sysVar?.example || `[${key}]` });
    }
    
    const placeholder = `{{${placeholderNum}}}`;
    const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
    
    setFormData(prev => ({ ...prev, content_pattern: newValue }));
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Handle drag start for variable chips
  const handleDragStart = (e: React.DragEvent, key: string) => {
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Handle drop on textarea
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const key = e.dataTransfer.getData('text/plain');
    if (key) {
      insertVariable(key);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="ltr">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="gateway">Default Gateway</Label>
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

          {formData.default_gateway === 'official' && (
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

          {/* Variable Chips + Message Editor Side by Side */}
          <div className="grid grid-cols-[200px_1fr] gap-4">
            {/* Variables Sidebar */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                System Variables
              </Label>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="flex flex-col gap-1.5">
                  {SYSTEM_VARIABLES.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      draggable
                      onDragStart={(e) => handleDragStart(e, variable.key)}
                      onClick={() => insertVariable(variable.key)}
                      className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md border bg-muted/50 hover:bg-muted cursor-pointer transition-colors text-start"
                      title={`Click to insert {{${variable.key}}}`}
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-mono text-primary">
                        {`{{${variable.key}}}`}
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Click or drag variables into the message
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
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                placeholder="🚨 New {{event_type}}: {{title}}&#10;&#10;📍 Location: {{location}}&#10;⚠️ Risk: {{risk_level}}&#10;👤 Reported by: {{reported_by}}"
                rows={6}
                required
                className="font-mono text-sm"
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
              <div className="bg-background p-3 rounded-md border whitespace-pre-wrap font-mono text-sm">
                {getPreviewMessage() || 'Enter message content to see preview...'}
              </div>
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
