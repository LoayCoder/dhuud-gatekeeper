import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, LockOpen, ShieldAlert, Calendar, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ConfidentialityLevel } from '@/hooks/use-incident-confidentiality';

interface ConfidentialitySelectorProps {
  value: ConfidentialityLevel;
  onChange: (level: ConfidentialityLevel) => void;
  expiry?: Date | null;
  onExpiryChange?: (date: Date | null) => void;
  autoDeclassifyTo?: 'public' | 'restricted' | null;
  onAutoDeclassifyChange?: (target: 'public' | 'restricted' | null) => void;
  expiryReason?: string;
  onExpiryReasonChange?: (reason: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ConfidentialitySelector({
  value,
  onChange,
  expiry,
  onExpiryChange,
  autoDeclassifyTo,
  onAutoDeclassifyChange,
  expiryReason = '',
  onExpiryReasonChange,
  disabled = false,
  compact = false
}: ConfidentialitySelectorProps) {
  const { t } = useTranslation();
  const [noExpiry, setNoExpiry] = useState(!expiry);
  const [autoEnabled, setAutoEnabled] = useState(!!autoDeclassifyTo);
  
  useEffect(() => {
    if (noExpiry && expiry) {
      onExpiryChange?.(null);
    }
  }, [noExpiry, expiry, onExpiryChange]);
  
  useEffect(() => {
    if (!autoEnabled && autoDeclassifyTo) {
      onAutoDeclassifyChange?.(null);
    }
  }, [autoEnabled, autoDeclassifyTo, onAutoDeclassifyChange]);
  
  const levels = [
    {
      value: 'public' as const,
      icon: LockOpen,
      label: t('confidentiality.levels.public', 'Public'),
      description: t('confidentiality.descriptions.public', 'Any authorized system user can view and print the incident report.'),
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      selectedBg: 'bg-green-100 border-green-400'
    },
    {
      value: 'restricted' as const,
      icon: Lock,
      label: t('confidentiality.levels.restricted', 'Restricted'),
      description: t('confidentiality.descriptions.restricted', 'Limited to Department Owner, Representative, and HSSE team.'),
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-200',
      selectedBg: 'bg-amber-100 border-amber-400'
    },
    {
      value: 'confidential' as const,
      icon: ShieldAlert,
      label: t('confidentiality.levels.confidential', 'Confidential'),
      description: t('confidentiality.descriptions.confidential', 'HSSE Manager only, plus users explicitly granted access.'),
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
      selectedBg: 'bg-red-100 border-red-400'
    }
  ];
  
  const showExpirySettings = value !== 'public';
  
  if (compact) {
    return (
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          {t('confidentiality.label', 'Confidentiality Level')}
        </Label>
        <Select 
          value={value} 
          onValueChange={(v) => onChange(v as ConfidentialityLevel)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {levels.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                <div className="flex items-center gap-2">
                  <level.icon className={cn("h-4 w-4", level.color)} />
                  <span>{level.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4" />
          {t('confidentiality.title', 'Confidentiality Level')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup 
          value={value} 
          onValueChange={(v) => onChange(v as ConfidentialityLevel)}
          disabled={disabled}
          className="space-y-3"
        >
          {levels.map((level) => {
            const isSelected = value === level.value;
            return (
              <label 
                key={level.value}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  isSelected ? level.selectedBg : level.bgColor,
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <RadioGroupItem value={level.value} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <level.icon className={cn("h-4 w-4", level.color)} />
                    <span className="font-medium">{level.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{level.description}</p>
                </div>
              </label>
            );
          })}
        </RadioGroup>
        
        {showExpirySettings && (
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                {t('confidentiality.expiry.title', 'Confidentiality Expiry')}
              </Label>
            </div>
            
            <div className="space-y-3 ps-1">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="no-expiry"
                  checked={noExpiry}
                  onCheckedChange={(checked) => setNoExpiry(!!checked)}
                  disabled={disabled}
                />
                <Label htmlFor="no-expiry" className="text-sm font-normal cursor-pointer">
                  {t('confidentiality.expiry.noExpiry', 'No expiry (Manual release)')}
                </Label>
              </div>
              
              {!noExpiry && (
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-[200px] justify-start text-start font-normal"
                        disabled={disabled}
                      >
                        <Calendar className="me-2 h-4 w-4" />
                        {expiry ? format(expiry, 'PPP') : t('confidentiality.expiry.selectDate', 'Select date')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={expiry || undefined}
                        onSelect={(date) => onExpiryChange?.(date || null)}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              
              {!noExpiry && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="auto-declassify"
                      checked={autoEnabled}
                      onCheckedChange={(checked) => {
                        setAutoEnabled(!!checked);
                        if (checked && !autoDeclassifyTo) {
                          onAutoDeclassifyChange?.('public');
                        }
                      }}
                      disabled={disabled}
                    />
                    <Label htmlFor="auto-declassify" className="text-sm font-normal cursor-pointer">
                      {t('confidentiality.expiry.autoDeclassify', 'Auto-declassify when expired')}
                    </Label>
                  </div>
                  
                  {autoEnabled && (
                    <Select 
                      value={autoDeclassifyTo || 'public'}
                      onValueChange={(v) => onAutoDeclassifyChange?.(v as 'public' | 'restricted')}
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-[200px] ms-6">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <LockOpen className="h-4 w-4 text-green-600" />
                            {t('confidentiality.expiry.declassifyToPublic', 'Set to Public')}
                          </div>
                        </SelectItem>
                        {value === 'confidential' && (
                          <SelectItem value="restricted">
                            <div className="flex items-center gap-2">
                              <Lock className="h-4 w-4 text-amber-600" />
                              {t('confidentiality.expiry.declassifyToRestricted', 'Set to Restricted')}
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {!autoEnabled && (
                    <p className="text-xs text-muted-foreground ms-6 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {t('confidentiality.expiry.manualReminder', 'HSSE Manager will receive a reminder when expired')}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="expiry-reason" className="text-sm">
                {t('confidentiality.expiry.reason', 'Reason for classification')}
                <span className="text-destructive ms-1">*</span>
              </Label>
              <Textarea
                id="expiry-reason"
                placeholder={t('confidentiality.expiry.reasonPlaceholder', 'Explain why this confidentiality level is required...')}
                value={expiryReason}
                onChange={(e) => onExpiryReasonChange?.(e.target.value)}
                disabled={disabled}
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
