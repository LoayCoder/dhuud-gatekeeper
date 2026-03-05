import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Check, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImportAsset } from '@/lib/asset-import-utils';

interface FieldOption {
  value: string;
  label: string;
}

interface ImportFieldEditorProps {
  field: keyof ImportAsset;
  value: string | undefined;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  hasError: boolean;
  errorMessage?: string;
  options?: FieldOption[];
  autoFixSuggestion?: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  category_name: 'Category',
  type_name: 'Type',
  subtype_name: 'Subtype',
  serial_number: 'Serial Number',
  manufacturer: 'Manufacturer',
  model: 'Model',
  description: 'Description',
  branch_name: 'Branch',
  site_name: 'Site',
  building_name: 'Building',
  floor_zone_name: 'Floor/Zone',
  status: 'Status',
  condition_rating: 'Condition',
  criticality_level: 'Criticality',
  installation_date: 'Installation Date',
  commissioning_date: 'Commissioning Date',
  warranty_expiry_date: 'Warranty Expiry',
  inspection_interval_days: 'Inspection Interval',
  tags: 'Tags'
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'out_of_service', label: 'Out of Service' },
  { value: 'under_maintenance', label: 'Under Maintenance' },
  { value: 'retired', label: 'Retired' },
  { value: 'missing', label: 'Missing' },
];

const CONDITION_OPTIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'critical', label: 'Critical' },
];

const CRITICALITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function ImportFieldEditor({
  field,
  value,
  onChange,
  onSave,
  onCancel,
  hasError,
  errorMessage,
  options,
  autoFixSuggestion
}: ImportFieldEditorProps) {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleApplyAutoFix = () => {
    if (autoFixSuggestion) {
      handleChange(autoFixSuggestion);
    }
  };

  // Determine if this field should use a dropdown
  const getFieldOptions = (): FieldOption[] | null => {
    if (options && options.length > 0) return options;
    
    switch (field) {
      case 'status':
        return STATUS_OPTIONS;
      case 'condition_rating':
        return CONDITION_OPTIONS;
      case 'criticality_level':
        return CRITICALITY_OPTIONS;
      default:
        return null;
    }
  };

  const fieldOptions = getFieldOptions();

  return (
    <div className="space-y-2 p-3 border rounded-md bg-background">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {FIELD_LABELS[field] || field}
        </Label>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {fieldOptions ? (
        <Select value={localValue} onValueChange={handleChange}>
          <SelectTrigger className={cn(hasError && "border-destructive")}>
            <SelectValue placeholder={t('common.select')} />
          </SelectTrigger>
          <SelectContent>
            {fieldOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(hasError && "border-destructive")}
          placeholder={FIELD_LABELS[field]}
        />
      )}

      {hasError && errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}

      {autoFixSuggestion && autoFixSuggestion !== localValue && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleApplyAutoFix}
          className="w-full gap-2 text-xs"
        >
          <Sparkles className="h-3 w-3" />
          {t('assets.import.autoFix')}: "{autoFixSuggestion}"
        </Button>
      )}
    </div>
  );
}
