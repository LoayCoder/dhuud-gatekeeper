import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnvironmentalContaminationFormProps } from './types';
import { useEnvironmentalContaminationForm } from './hooks/useEnvironmentalContaminationForm';
import { SectionA } from './components/SectionA';
import { SectionB } from './components/SectionB';
import { SectionC } from './components/SectionC';
import { SectionD } from './components/SectionD';
import { SectionE } from './components/SectionE';
import { SectionF } from './components/SectionF';

export function EnvironmentalContaminationForm({
  open,
  onOpenChange,
  entry,
  onSubmit,
  isLoading,
}: EnvironmentalContaminationFormProps) {
  const state = useEnvironmentalContaminationForm({ open, onOpenChange, entry, onSubmit });
  const { t, form, expandedSections, setExpandedSections, handleSubmit } = state;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            {entry 
              ? t('investigation.environmentalImpact.editEntry', 'Edit Contamination Entry')
              : t('investigation.environmentalImpact.addEntry', 'Add Contamination Entry')
            }
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pb-6">
              <Accordion 
                type="multiple" 
                value={expandedSections} 
                onValueChange={setExpandedSections}
                className="space-y-2"
              >
                <SectionA state={state} />
                <SectionB state={state} />
                <SectionC state={state} />
                <SectionD state={state} />
                <SectionE state={state} />
                <SectionF state={state} />
              </Accordion>

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  {entry ? t('common.update', 'Update') : t('common.add', 'Add')}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

