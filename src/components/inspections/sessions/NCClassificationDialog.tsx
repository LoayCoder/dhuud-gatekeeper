import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, AlertOctagon, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

interface NCClassificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: 'minor' | 'major' | 'critical';
  onConfirm: (category: 'minor' | 'major' | 'critical', evidence: string) => void;
}

export function NCClassificationDialog({
  open,
  onOpenChange,
  defaultCategory = 'minor',
  onConfirm,
}: NCClassificationDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [category, setCategory] = useState<'minor' | 'major' | 'critical'>(defaultCategory);
  const [evidence, setEvidence] = useState('');
  
  const handleConfirm = () => {
    onConfirm(category, evidence);
    setEvidence('');
  };
  
  const handleCancel = () => {
    onOpenChange(false);
    setEvidence('');
  };
  
  const categories = [
    {
      value: 'minor' as const,
      label: t('audits.nc.minor'),
      description: t('audits.ncDescription.minor'),
      icon: AlertCircle,
      color: 'text-yellow-500 border-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      value: 'major' as const,
      label: t('audits.nc.major'),
      description: t('audits.ncDescription.major'),
      icon: AlertTriangle,
      color: 'text-orange-500 border-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      value: 'critical' as const,
      label: t('audits.nc.critical'),
      description: t('audits.ncDescription.critical'),
      icon: AlertOctagon,
      color: 'text-red-500 border-red-500',
      bgColor: 'bg-red-500/10',
    },
  ];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {t('audits.classifyNC')}
          </DialogTitle>
          <DialogDescription>
            {t('audits.classifyNCDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* NC Category Selection */}
          <div className="space-y-2">
            <Label>{t('audits.ncCategory')}</Label>
            <RadioGroup
              value={category}
              onValueChange={(v) => setCategory(v as 'minor' | 'major' | 'critical')}
              className="space-y-3"
            >
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.value}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                      category === cat.value ? cat.color : 'border-transparent',
                      cat.bgColor
                    )}
                    onClick={() => setCategory(cat.value)}
                  >
                    <RadioGroupItem value={cat.value} id={cat.value} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-4 w-4', cat.color.split(' ')[0])} />
                        <Label htmlFor={cat.value} className="font-medium cursor-pointer">
                          {cat.label}
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
          
          {/* Objective Evidence */}
          <div className="space-y-2">
            <Label>{t('audits.objectiveEvidence')} *</Label>
            <Textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder={t('audits.evidenceRequired')}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {t('audits.evidenceHint')}
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!evidence.trim()}>
            {t('audits.confirmNC')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
