import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, X, Minus, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { TemplateItem, InspectionResponse } from '@/features/incidents';
import i18n from '@/i18n';

interface InspectionItemCardProps {
  item: TemplateItem;
  response?: InspectionResponse;
  onResponseChange: (data: {
    response_value?: string;
    result?: 'pass' | 'fail' | 'na';
    notes?: string;
  }) => void;
  disabled?: boolean;
}

export function InspectionItemCard({
  item,
  response,
  onResponseChange,
  disabled,
}: InspectionItemCardProps) {
  const { t } = useTranslation();
  const direction = i18n.dir();
  
  const [showNotes, setShowNotes] = useState(!!response?.notes);
  const [localNotes, setLocalNotes] = useState(response?.notes || '');
  const [localValue, setLocalValue] = useState(response?.response_value || '');
  
  useEffect(() => {
    setLocalNotes(response?.notes || '');
    setLocalValue(response?.response_value || '');
  }, [response]);
  
  const question = direction === 'rtl' && item.question_ar ? item.question_ar : item.question;
  const instructions = direction === 'rtl' && item.instructions_ar ? item.instructions_ar : item.instructions;
  
  const handleResultChange = (result: 'pass' | 'fail' | 'na') => {
    onResponseChange({ result, response_value: localValue, notes: localNotes });
    // Auto-show notes on fail to encourage documenting
    if (result === 'fail' && !showNotes) {
      setShowNotes(true);
    }
  };
  
  const handleNotesBlur = () => {
    if (localNotes !== response?.notes) {
      onResponseChange({ result: (response?.result as 'pass' | 'fail' | 'na') || undefined, response_value: localValue, notes: localNotes });
    }
  };
  
  const handleValueChange = (value: string) => {
    setLocalValue(value);
  };
  
  const handleValueBlur = () => {
    if (localValue !== response?.response_value) {
      let result = response?.result;
      if (item.response_type === 'numeric' && localValue) {
        const numVal = parseFloat(localValue);
        if (item.min_value !== null && numVal < item.min_value) {
          result = 'fail';
        } else if (item.max_value !== null && numVal > item.max_value) {
          result = 'fail';
        } else {
          result = 'pass';
        }
      }
      onResponseChange({ result: (result as 'pass' | 'fail' | 'na') || undefined, response_value: localValue, notes: localNotes });
    }
  };
  
  const renderResponseInput = () => {
    switch (item.response_type) {
      case 'pass_fail':
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant={response?.result === 'pass' ? 'default' : 'outline'}
              className={cn(
                'min-h-[40px] sm:min-h-[36px] flex-1 sm:flex-none',
                response?.result === 'pass' && 'bg-success hover:bg-success/90 text-success-foreground'
              )}
              onClick={() => handleResultChange('pass')}
              disabled={disabled}
            >
              <Check className="h-4 w-4 me-1" />
              {t('inspections.results.pass')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={response?.result === 'fail' ? 'default' : 'outline'}
              className={cn(
                'min-h-[40px] sm:min-h-[36px] flex-1 sm:flex-none',
                response?.result === 'fail' && 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              )}
              onClick={() => handleResultChange('fail')}
              disabled={disabled}
            >
              <X className="h-4 w-4 me-1" />
              {t('inspections.results.fail')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={response?.result === 'na' ? 'secondary' : 'outline'}
              className="min-h-[40px] sm:min-h-[36px] flex-1 sm:flex-none"
              onClick={() => handleResultChange('na')}
              disabled={disabled}
            >
              <Minus className="h-4 w-4 me-1" />
              {t('inspections.results.na')}
            </Button>
          </div>
        );
      
      case 'yes_no':
        return (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={response?.result === 'pass' ? 'default' : 'outline'}
              className={cn(
                'min-h-[40px] sm:min-h-[36px] flex-1',
                response?.result === 'pass' && 'bg-success hover:bg-success/90 text-success-foreground'
              )}
              onClick={() => handleResultChange('pass')}
              disabled={disabled}
            >
              {t('common.yes')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={response?.result === 'fail' ? 'default' : 'outline'}
              className={cn(
                'min-h-[40px] sm:min-h-[36px] flex-1',
                response?.result === 'fail' && 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              )}
              onClick={() => handleResultChange('fail')}
              disabled={disabled}
            >
              {t('common.no')}
            </Button>
          </div>
        );
      
      case 'rating': {
        const scale = item.rating_scale || 5;
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {Array.from({ length: scale }, (_, i) => i + 1).map((num) => (
              <Button
                key={num}
                type="button"
                size="icon"
                variant={parseInt(localValue) === num ? 'default' : 'outline'}
                className="h-9 w-9 sm:h-8 sm:w-8"
                onClick={() => {
                  setLocalValue(num.toString());
                  const result = num >= scale / 2 ? 'pass' : 'fail';
                  onResponseChange({ result, response_value: num.toString(), notes: localNotes });
                }}
                disabled={disabled}
              >
                <Star className={cn('h-4 w-4', parseInt(localValue) >= num && 'fill-current text-warning')} />
              </Button>
            ))}
            {localValue && (
              <span className="text-sm text-muted-foreground ms-2">
                {localValue}/{scale}
              </span>
            )}
          </div>
        );
      }
      case 'numeric':
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={localValue}
              onChange={(e) => handleValueChange(e.target.value)}
              onBlur={handleValueBlur}
              className="w-32"
              min={item.min_value ?? undefined}
              max={item.max_value ?? undefined}
              disabled={disabled}
            />
            {(item.min_value !== null || item.max_value !== null) && (
              <span className="text-xs text-muted-foreground">
                ({item.min_value ?? '–'} – {item.max_value ?? '–'})
              </span>
            )}
          </div>
        );
      
      case 'text':
        return (
          <Textarea
            value={localValue}
            onChange={(e) => handleValueChange(e.target.value)}
            onBlur={() => {
              if (localValue !== response?.response_value) {
                onResponseChange({ result: localValue ? 'pass' : undefined, response_value: localValue, notes: localNotes });
              }
            }}
            rows={2}
            disabled={disabled}
          />
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className={cn(
      'border rounded-lg p-3 sm:p-4 space-y-3 transition-colors',
      item.is_critical && !response?.result && 'border-destructive/50 bg-destructive/5',
      response?.result === 'pass' && 'border-success/50 bg-success/5',
      response?.result === 'fail' && 'border-destructive/50 bg-destructive/5',
      response?.result === 'na' && 'border-muted bg-muted/30',
    )}>
      {/* Question */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm sm:text-base">{question}</p>
          {instructions && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{instructions}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {item.is_critical && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 me-1" />
              {t('inspections.critical')}
            </Badge>
          )}
          {item.is_required && !item.is_critical && (
            <Badge variant="secondary" className="text-xs">{t('common.required')}</Badge>
          )}
        </div>
      </div>
      
      {/* Response Input */}
      <div>{renderResponseInput()}</div>
      
      {/* Notes Section */}
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-auto p-0 text-xs"
          onClick={() => setShowNotes(!showNotes)}
        >
          {showNotes ? <ChevronUp className="h-3.5 w-3.5 me-1" /> : <ChevronDown className="h-3.5 w-3.5 me-1" />}
          {t('inspections.itemNotes')}
          {localNotes && <Badge variant="secondary" className="ms-1.5 text-[10px] h-4">{t('common.filled')}</Badge>}
        </Button>
        
        {showNotes && (
          <Textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder={t('inspections.notesPlaceholder')}
            rows={2}
            className="mt-2"
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}
