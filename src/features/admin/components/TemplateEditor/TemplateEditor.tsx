import React from 'react';
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
               placeholder="ðŸš¨ New {{event_type}}: {{title}}&#10;&#10;ðŸ“ Location: {{location}}&#10;âš ï¸ Risk: {{risk_level}}&#10;ðŸ‘¤ Reported by: {{reported_by}}"
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

