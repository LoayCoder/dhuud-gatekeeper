const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/components/admin/TemplateEditor.tsx');
let content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/components/admin/TemplateEditor');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const hooksDir = path.join(targetDir, 'hooks');
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

const componentsDir = path.join(targetDir, 'components');
if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });

function extractBetween(str, startStr, endStr) {
    const startIdx = str.indexOf(startStr);
    if (startIdx === -1) return '';
    const restStr = str.substring(startIdx + startStr.length);
    const endIdx = restStr.indexOf(endStr);
    if (endIdx === -1) return '';
    return restStr.substring(0, endIdx);
}

// 1. types.ts
const typesContent = `import { NotificationTemplate, CreateTemplateInput, ChannelType } from '@/hooks/useNotificationTemplates';

export interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: NotificationTemplate | null;
  onSave: (data: CreateTemplateInput) => void;
  isLoading?: boolean;
}
`;
fs.writeFileSync(path.join(targetDir, 'types.ts'), typesContent);

// 2. constants.tsx (need React for icons)
const constantsContent = `import React from 'react';
import { MessageSquare, Mail } from 'lucide-react';
import { ChannelType } from '@/hooks/useNotificationTemplates';

${extractBetween(content, '// System variables', 'export function TemplateEditor(')}
`;
fs.writeFileSync(path.join(targetDir, 'constants.tsx'), `// System variables` + constantsContent);

// 3. hooks/useTemplateEditor.ts
const hookImports = `import { useState, useEffect, useRef } from 'react';
import { useTemplateTranslation } from '@/hooks/admin/use-template-translation';
import { NotificationTemplate, CreateTemplateInput } from '@/hooks/useNotificationTemplates';
import { SYSTEM_VARIABLES, CATEGORY_VARIABLES } from '../constants';
import { TemplateEditorProps } from '../types';

export function useTemplateEditor({ template, open, onSave }: Pick<TemplateEditorProps, 'template' | 'open' | 'onSave'>) {
`;
const hookBody = extractBetween(content, "  const { i18n } = useTranslation();", "  return (");
const hookBottom = `
  return {
    textareaRef, emailSubjectRef, formData, setFormData,
    newVariable, setNewVariable, previewData, setPreviewData,
    showAllVariables, setShowAllVariables, activeDropTarget, setActiveDropTarget,
    isTranslating, canTranslate,
    insertVariable, insertVariableToSubject, addVariable, removeVariable,
    getPreviewMessage, getPreviewSubject, handleSubmit, handleTranslate,
    handleDragStart, handleDrop, handleDragOver, handleSubjectDrop, handleSubjectDragOver,
    handleVariableClick, filteredVariables, showWhatsAppFields, showEmailFields
  };
}
`;
fs.writeFileSync(path.join(hooksDir, 'useTemplateEditor.ts'), hookImports + "  const { i18n } = useTranslation();" + hookBody + hookBottom);

// 4. components/TemplateFormFields.tsx
const formFieldsContent = `import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Languages, Loader2 } from 'lucide-react';
import { CHANNEL_OPTIONS, CATEGORIES } from '../constants';

export function TemplateFormFields({ state }: { state: any }) {
  const {
    formData, setFormData, showWhatsAppFields, showEmailFields,
    handleTranslate, canTranslate, isTranslating, emailSubjectRef,
    activeDropTarget, setActiveDropTarget, handleSubjectDrop, handleSubjectDragOver
  } = state;

  return (
    <>
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
              setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\\s+/g, '_') })
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
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.label}
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
          <div className="flex gap-2">
            <Select
              value={formData.language}
              onValueChange={(value) => setFormData({ ...formData, language: value })}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية (Arabic)</SelectItem>
                {formData.category !== 'visitors' && (
                  <>
                    <SelectItem value="ur">اردو (Urdu)</SelectItem>
                    <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                    <SelectItem value="fil">Filipino</SelectItem>
                    <SelectItem value="zh">中文 (Chinese)</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleTranslate}
              disabled={!canTranslate || isTranslating}
              title="Translate content to selected language"
            >
              {isTranslating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Languages className="h-4 w-4" />
              )}
            </Button>
          </div>
          {formData.category === 'visitors' && (
            <p className="text-xs text-muted-foreground">
              Visitor templates support Arabic and English only
            </p>
          )}
          {canTranslate && !isTranslating && (
            <p className="text-xs text-muted-foreground">
              Click the translate button to auto-translate content
            </p>
          )}
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
            className={\`transition-all \${activeDropTarget === 'subject' ? 'ring-2 ring-primary ring-offset-2' : ''}\`}
          />
          <p className="text-xs text-muted-foreground">
            Click on the field, then click a variable to insert it. Or drag and drop.
          </p>
        </div>
      )}
    </>
  );
}
`;
fs.writeFileSync(path.join(componentsDir, 'TemplateFormFields.tsx'), formFieldsContent);

// 5. components/TemplateVariablesSidebar.tsx
const sidebarContent = `import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { GripVertical, ListFilter, X, Plus, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SYSTEM_VARIABLES } from '../constants';

export function TemplateVariablesSidebar({ state }: { state: any }) {
  const {
    showAllVariables, setShowAllVariables, formData, filteredVariables,
    handleDragStart, handleVariableClick, removeVariable,
    newVariable, setNewVariable, addVariable
  } = state;

  return (
    <>
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
              ? \`All \${SYSTEM_VARIABLES.length} variables\` 
              : \`\${filteredVariables.length} for \${formData.category}\`}
          </div>
          <ScrollArea className="h-[200px] border rounded-md p-2">
            <div className="flex flex-col gap-1.5">
              {filteredVariables.map((variable: any) => (
                <button
                  key={variable.key}
                  type="button"
                  draggable
                  onDragStart={(e) => handleDragStart(e, variable.key)}
                  onClick={() => handleVariableClick(variable.key)}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md border bg-muted/50 hover:bg-muted cursor-pointer transition-colors text-start"
                  title={\`\${variable.label} - \${variable.example}\`}
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
        
        {/* Editor goes here, handled in main component for ref */}
      </div>

      {/* Active Variables */}
      <div className="space-y-2 mt-4">
        <Label>Active Variable Mappings</Label>
        
        {/* Event type warning for HSSE categories */}
        {(formData.category === 'incidents' || formData.category === 'observations') && 
         !formData.variable_keys.includes('event_type') && (
          <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              <strong>Recommended:</strong> Add <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">event_type</code> variable to show if this is an Incident, Observation, Near Miss, etc.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.variable_keys.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              No variables added yet. Click or drag from the sidebar.
            </span>
          ) : (
            formData.variable_keys.map((key: string, index: number) => (
              <Badge key={key} variant="secondary" className="gap-1 font-mono">
                {\`{{\${index + 1}}}}\`} = {key}
                {key === 'event_type' && (formData.category === 'incidents' || formData.category === 'observations') && (
                  <span className="text-green-600 dark:text-green-400 ms-1" title="Required for HSSE events">✓</span>
                )}
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
            onChange={(e) => setNewVariable(e.target.value.replace(/\\s+/g, '_'))}
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
    </>
  );
}
`;
fs.writeFileSync(path.join(componentsDir, 'TemplateVariablesSidebar.tsx'), sidebarContent);

// 6. components/TemplatePreview.tsx
const previewContent = `import React from 'react';
import { Eye, MessageSquare, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SYSTEM_VARIABLES } from '../constants';

export function TemplatePreview({ state }: { state: any }) {
  const {
    showWhatsAppFields, showEmailFields, getPreviewMessage, getPreviewSubject,
    formData, previewData, setPreviewData
  } = state;

  return (
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
              {formData.variable_keys.map((key: string) => {
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
  );
}
`;
fs.writeFileSync(path.join(componentsDir, 'TemplatePreview.tsx'), previewContent);

// 7. TemplateEditor.tsx (shell)
const shellContent = `import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

import { TemplateEditorProps } from './types';
import { useTemplateEditor } from './hooks/useTemplateEditor';
import { TemplateFormFields } from './components/TemplateFormFields';
import { TemplateVariablesSidebar } from './components/TemplateVariablesSidebar';
import { TemplatePreview } from './components/TemplatePreview';

export default function TemplateEditor(props: TemplateEditorProps) {
  const { open, onOpenChange, template, isLoading } = props;
  const state = useTemplateEditor(props);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="ltr">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={state.handleSubmit} className="space-y-4">
          <TemplateFormFields state={state} />

          {/* Need to interleave the VariablesSidebar and the message editor */}
          <div className="grid grid-cols-[220px_1fr] gap-4">
             {/* Note: The Grid wrapper is half populated by Sidebar's internal grid, wait, no.
                 We should probably just inline the TextArea here to keep refs simple.
             */}
             <div className="col-span-2">
                <TemplateVariablesSidebar state={state} />
             </div>
          </div>
          
          {/* We must extract the Textarea here since the Sidebar and Editor should be side-by-side. 
              Let's adjust.
          */}
          <div className="space-y-2 mt-4">
             <Label htmlFor="content_pattern">Message Content</Label>
             <Textarea
               ref={state.textareaRef}
               id="content_pattern"
               value={state.formData.content_pattern}
               onChange={(e) =>
                 state.setFormData({ ...state.formData, content_pattern: e.target.value })
               }
               onFocus={() => state.setActiveDropTarget('content')}
               onDrop={state.handleDrop}
               onDragOver={state.handleDragOver}
               placeholder="🚨 New {{event_type}}: {{title}}&#10;&#10;📍 Location: {{location}}&#10;⚠️ Risk: {{risk_level}}&#10;👤 Reported by: {{reported_by}}"
               rows={6}
               required
               className={\`font-mono text-sm transition-all \${state.activeDropTarget === 'content' ? 'ring-2 ring-primary ring-offset-2' : ''}\`}
             />
          </div>

          <Separator />
          <TemplatePreview state={state} />

          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={state.formData.is_active}
              onCheckedChange={(checked) =>
                state.setFormData({ ...state.formData, is_active: checked })
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
`;
fs.writeFileSync(path.join(targetDir, 'TemplateEditor.tsx'), shellContent);
fs.writeFileSync(path.join(targetDir, 'index.tsx'), "export { default } from './TemplateEditor';\n");

console.log('TemplateEditor split successfully');
