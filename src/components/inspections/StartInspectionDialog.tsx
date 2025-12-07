import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStartInspection, useTemplatesForAsset } from '@/hooks/use-inspections';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';

interface StartInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: {
    id: string;
    name: string;
    asset_code: string;
    category_id?: string;
    type_id?: string;
  };
}

export function StartInspectionDialog({
  open,
  onOpenChange,
  asset,
}: StartInspectionDialogProps) {
  const { t } = useTranslation();
  const direction = i18n.dir();
  const navigate = useNavigate();
  
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [inspectionDate, setInspectionDate] = useState<Date>(new Date());
  
  const { data: templates, isLoading: templatesLoading } = useTemplatesForAsset(
    asset.category_id,
    asset.type_id
  );
  
  const startInspection = useStartInspection();
  
  const handleStart = async () => {
    if (!selectedTemplateId) return;
    
    const result = await startInspection.mutateAsync({
      asset_id: asset.id,
      template_id: selectedTemplateId,
      inspection_date: format(inspectionDate, 'yyyy-MM-dd'),
    });
    
    onOpenChange(false);
    navigate(`/assets/inspections/${result.id}`);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('inspections.startInspection')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Asset Info (read-only) */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">{asset.name}</p>
            <p className="text-xs text-muted-foreground">{asset.asset_code}</p>
          </div>
          
          {/* Template Selection */}
          <div className="space-y-2">
            <Label>{t('inspections.selectTemplate')}</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              dir={direction}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('inspections.selectTemplatePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {templatesLoading ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    {t('common.loading')}
                  </div>
                ) : templates?.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    {t('inspections.noTemplates')}
                  </div>
                ) : (
                  templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <span>{direction === 'rtl' && template.name_ar ? template.name_ar : template.name}</span>
                        <span className="text-muted-foreground ms-2 text-xs">({template.code})</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Inspection Date */}
          <div className="space-y-2">
            <Label>{t('inspections.inspectionDate')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-start font-normal',
                    !inspectionDate && 'text-muted-foreground'
                  )}
                >
                  <Calendar className="me-2 h-4 w-4" />
                  {inspectionDate ? format(inspectionDate, 'PPP') : t('common.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={inspectionDate}
                  onSelect={(date) => date && setInspectionDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleStart}
            disabled={!selectedTemplateId || startInspection.isPending}
          >
            {startInspection.isPending ? t('common.loading') : t('inspections.startInspection')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
