import React from 'react';
import { useTranslation } from 'react-i18next';
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

export function TemplateEditor(props: TemplateEditorProps) {
  const { open, onOpenChange, template, isLoading } = props;
  const { t } = useTranslation();
  const state = useTemplateEditor(props);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="ltr">
        <DialogHeader>
          <DialogTitle>
            {template ? t('templates.editTemplate') : t('templates.createTemplate')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={state.handleSubmit} className="space-y-4">
          <TemplateFormFields state={state} />

          <div className="grid grid-cols-[220px_1fr] gap-4">
             <div className="col-span-2">
                <TemplateVariablesSidebar state={state} />
             </div>
          </div>
          
          <div className="space-y-2 mt-4">
             <Label htmlFor="content_pattern">{t('templates.messageContent')}</Label>
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
               className={`font-mono text-sm transition-all ${state.activeDropTarget === 'content' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
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
            <Label htmlFor="is_active">{t('templates.active')}</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('templates.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('templates.saving') : t('templates.saveTemplate')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
