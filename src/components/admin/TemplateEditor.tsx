import { useState, useEffect } from 'react';
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
import { X, Plus, Eye } from 'lucide-react';
import { NotificationTemplate, CreateTemplateInput } from '@/hooks/useNotificationTemplates';

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: NotificationTemplate | null;
  onSave: (data: CreateTemplateInput) => void;
  isLoading?: boolean;
}

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
  const { t } = useTranslation();
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
      // Initialize preview data
      const preview: Record<string, string> = {};
      (template.variable_keys || []).forEach((key) => {
        preview[key] = `[${key}]`;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="ltr">
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

          <div className="space-y-2">
            <Label htmlFor="content_pattern">
              Message Content (use {"{"}{"{"}{"}1"}{"}"}{"}"}, {"{"}{"{"}{"}2"}{"}"}{"}"}, etc. for variables)
            </Label>
            <Textarea
              id="content_pattern"
              value={formData.content_pattern}
              onChange={(e) =>
                setFormData({ ...formData, content_pattern: e.target.value })
              }
              placeholder="Hello {{1}}, your order {{2}} is ready for pickup."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Variable Keys (in order)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.variable_keys.map((key, index) => (
                <Badge key={key} variant="secondary" className="gap-1">
                  {`{{${index + 1}}}`} = {key}
                  <button
                    type="button"
                    onClick={() => removeVariable(key)}
                    className="ms-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newVariable}
                onChange={(e) => setNewVariable(e.target.value.replace(/\s+/g, '_'))}
                placeholder="variable_name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addVariable();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addVariable}>
                <Plus className="h-4 w-4 me-1" />
                Add
              </Button>
            </div>
          </div>

          <Card className="bg-muted/50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              <div className="bg-background p-3 rounded-md border whitespace-pre-wrap">
                {getPreviewMessage() || 'Enter message content to see preview...'}
              </div>
              {formData.variable_keys.length > 0 && (
                <div className="mt-3 space-y-2">
                  <Label className="text-xs text-muted-foreground">Test Values:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {formData.variable_keys.map((key) => (
                      <Input
                        key={key}
                        placeholder={key}
                        value={previewData[key] || ''}
                        onChange={(e) =>
                          setPreviewData({ ...previewData, [key]: e.target.value })
                        }
                        className="h-8 text-sm"
                      />
                    ))}
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
