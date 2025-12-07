import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Camera, Check, X, Minus, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { TemplateItem, InspectionResponse } from '@/hooks/use-inspections';
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
  };
  
  const handleNotesBlur = () => {
    if (localNotes !== response?.notes) {
      onResponseChange({ result: response?.result || undefined, response_value: localValue, notes: localNotes });
    }
  };
  
  const handleValueChange = (value: string) => {
    setLocalValue(value);
  };
  
  const handleValueBlur = () => {
    if (localValue !== response?.response_value) {
      // Determine result based on value for numeric types
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
      onResponseChange({ result: result || undefined, response_value: localValue, notes: localNotes });
    }
  };
  
  const renderResponseInput = () => {
    switch (item.response_type) {
      case 'pass_fail':
        return (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={response?.result === 'pass' ? 'default' : 'outline'}
              className={cn(response?.result === 'pass' && 'bg-green-600 hover:bg-green-700')}
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
              className={cn(response?.result === 'fail' && 'bg-red-600 hover:bg-red-700')}
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
              className={cn(response?.result === 'pass' && 'bg-green-600 hover:bg-green-700')}
              onClick={() => handleResultChange('pass')}
              disabled={disabled}
            >
              {t('common.yes')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={response?.result === 'fail' ? 'default' : 'outline'}
              className={cn(response?.result === 'fail' && 'bg-red-600 hover:bg-red-700')}
              onClick={() => handleResultChange('fail')}
              disabled={disabled}
            >
              {t('common.no')}
            </Button>
          </div>
        );
      
      case 'rating':
        const scale = item.rating_scale || 5;
        return (
          <div className="flex items-center gap-1">
            {Array.from({ length: scale }, (_, i) => i + 1).map((num) => (
              <Button
                key={num}
                type="button"
                size="icon"
                variant={parseInt(localValue) === num ? 'default' : 'outline'}
                className="h-8 w-8"
                onClick={() => {
                  setLocalValue(num.toString());
                  const result = num >= scale / 2 ? 'pass' : 'fail';
                  onResponseChange({ result, response_value: num.toString(), notes: localNotes });
                }}
                disabled={disabled}
              >
                <Star className={cn('h-4 w-4', parseInt(localValue) >= num && 'fill-current')} />
              </Button>
            ))}
          </div>
        );
      
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
      'border rounded-lg p-4 space-y-3',
      item.is_critical && 'border-destructive/50 bg-destructive/5',
      response?.result === 'pass' && 'border-green-500/50 bg-green-500/5',
      response?.result === 'fail' && 'border-red-500/50 bg-red-500/5',
    )}>
      {/* Question */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="font-medium">{question}</p>
          {instructions && (
            <p className="text-sm text-muted-foreground mt-1">{instructions}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {item.is_critical && (
            <Badge variant="destructive" className="shrink-0">
              <AlertTriangle className="h-3 w-3 me-1" />
              {t('inspections.critical')}
            </Badge>
          )}
          {item.is_required && (
            <Badge variant="secondary" className="shrink-0">{t('common.required')}</Badge>
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
          className="text-muted-foreground h-auto p-0"
          onClick={() => setShowNotes(!showNotes)}
        >
          {showNotes ? <ChevronUp className="h-4 w-4 me-1" /> : <ChevronDown className="h-4 w-4 me-1" />}
          {t('inspections.itemNotes')}
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
