import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { 
  LabelSettings, 
  LabelSizeKey, 
  LABEL_SIZES, 
  DEFAULT_LABEL_SETTINGS,
  loadLabelSettings,
  saveLabelSettings 
} from './label-settings-types';

interface LabelSettingsDialogProps {
  settings: LabelSettings;
  onSettingsChange: (settings: LabelSettings) => void;
}

export function LabelSettingsDialog({ settings, onSettingsChange }: LabelSettingsDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [open, setOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<LabelSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSizeChange = (size: LabelSizeKey) => {
    setLocalSettings(prev => ({ ...prev, size }));
  };

  const handleCustomDimensionChange = (dimension: 'width' | 'height', value: number) => {
    const clampedValue = dimension === 'width' 
      ? Math.min(200, Math.max(20, value || 20))
      : Math.min(150, Math.max(15, value || 15));
    
    setLocalSettings(prev => ({
      ...prev,
      [dimension === 'width' ? 'customWidthMM' : 'customHeightMM']: clampedValue
    }));
  };

  const handleContentToggle = (key: keyof LabelSettings['content']) => {
    if (key === 'customText') return;
    setLocalSettings(prev => ({
      ...prev,
      content: { ...prev.content, [key]: !prev.content[key] }
    }));
  };

  const handleCustomTextChange = (customText: string) => {
    setLocalSettings(prev => ({
      ...prev,
      content: { ...prev.content, customText }
    }));
  };

  const handleApply = () => {
    saveLabelSettings(localSettings);
    onSettingsChange(localSettings);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_LABEL_SETTINGS);
  };

  const contentOptions = [
    { key: 'showAssetName', label: t('assets.labelSettings.showAssetName') },
    { key: 'showZone', label: t('assets.labelSettings.showZone') },
    { key: 'showCategory', label: t('assets.labelSettings.showCategory') },
    { key: 'showSerialNumber', label: t('assets.labelSettings.showSerialNumber') },
    { key: 'showDepartment', label: t('assets.labelSettings.showDepartment') },
  ] as const;

  // Separate predefined sizes from custom
  const predefinedSizes = LABEL_SIZES.filter(s => s.key !== 'custom');
  const customSize = LABEL_SIZES.find(s => s.key === 'custom')!;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('assets.labelSettings.title')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Size Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t('assets.labelSettings.labelSize')}</Label>
            <RadioGroup 
              value={localSettings.size} 
              onValueChange={(v) => handleSizeChange(v as LabelSizeKey)}
              className="space-y-2"
            >
              {/* Predefined sizes in 2x2 grid */}
              <div className="grid grid-cols-2 gap-2">
                {predefinedSizes.map((size) => (
                  <div key={size.key} className="relative">
                    <RadioGroupItem
                      value={size.key}
                      id={`size-${size.key}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`size-${size.key}`}
                      className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                    >
                      <span className="text-sm font-medium">{size.label}</span>
                      <span className="text-xs text-muted-foreground">{t(size.description)}</span>
                    </Label>
                  </div>
                ))}
              </div>
              
              {/* Custom size option - full width */}
              <div className="relative">
                <RadioGroupItem
                  value="custom"
                  id="size-custom"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="size-custom"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                >
                  <span className="text-sm font-medium">{t(customSize.label)}</span>
                  <span className="text-xs text-muted-foreground">{t(customSize.description)}</span>
                </Label>
              </div>
              
              {/* Custom dimension inputs */}
              {localSettings.size === 'custom' && (
                <div className="grid grid-cols-2 gap-3 p-3 border rounded-md bg-muted/50">
                  <div className="space-y-1">
                    <Label htmlFor="custom-width" className="text-xs">{t('assets.labelSettings.widthMM')}</Label>
                    <Input
                      id="custom-width"
                      type="number"
                      min={20}
                      max={200}
                      value={localSettings.customWidthMM}
                      onChange={(e) => handleCustomDimensionChange('width', parseInt(e.target.value))}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="custom-height" className="text-xs">{t('assets.labelSettings.heightMM')}</Label>
                    <Input
                      id="custom-height"
                      type="number"
                      min={15}
                      max={150}
                      value={localSettings.customHeightMM}
                      onChange={(e) => handleCustomDimensionChange('height', parseInt(e.target.value))}
                      className="h-8"
                    />
                  </div>
                  <p className="col-span-2 text-xs text-muted-foreground">
                    {t('assets.labelSettings.customSizeHint')}
                  </p>
                </div>
              )}
            </RadioGroup>
          </div>

          <Separator />

          {/* Content Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t('assets.labelSettings.labelContent')}</Label>
            <div className="space-y-2">
              {contentOptions.map((option) => (
                <div key={option.key} className="flex items-center gap-2">
                  <Checkbox
                    id={option.key}
                    checked={localSettings.content[option.key]}
                    onCheckedChange={() => handleContentToggle(option.key)}
                  />
                  <Label htmlFor={option.key} className="text-sm cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Custom Text */}
          <div className="space-y-2">
            <Label htmlFor="custom-text" className="text-sm font-medium">
              {t('assets.labelSettings.customText')}
            </Label>
            <Input
              id="custom-text"
              value={localSettings.content.customText}
              onChange={(e) => handleCustomTextChange(e.target.value)}
              placeholder={t('assets.labelSettings.customTextPlaceholder')}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              {t('assets.labelSettings.customTextHint')}
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReset}>
            {t('common.reset')}
          </Button>
          <Button onClick={handleApply}>
            <Check className="h-4 w-4 me-2" />
            {t('common.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
