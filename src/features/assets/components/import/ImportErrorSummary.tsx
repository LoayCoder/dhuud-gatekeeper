import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronUp, 
  Download, 
  AlertTriangle,
  XCircle,
  FileWarning,
  Link2Off,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetValidationError, AssetValidationWarning } from '@/lib/asset-import-utils';

interface ImportErrorSummaryProps {
  errors: AssetValidationError[];
  warnings: AssetValidationWarning[];
  onJumpToRow: (row: number) => void;
  onDownloadErrors: () => void;
}

interface GroupedError {
  type: string;
  icon: React.ReactNode;
  label: string;
  items: { row: number; field: string; message: string }[];
}

export function ImportErrorSummary({ 
  errors, 
  warnings, 
  onJumpToRow,
  onDownloadErrors 
}: ImportErrorSummaryProps) {
  const { t } = useTranslation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['required']));

  // Group errors by type
  const groupedErrors: GroupedError[] = [
    {
      type: 'required',
      icon: <XCircle className="h-4 w-4 text-destructive" />,
      label: t('assets.import.requiredField'),
      items: errors.filter(e => 
        e.message.includes('required') || e.message.includes('مطلوب')
      )
    },
    {
      type: 'invalid',
      icon: <FileWarning className="h-4 w-4 text-amber-600" />,
      label: t('assets.import.invalidFormat'),
      items: errors.filter(e => 
        e.message.includes('invalid') || e.message.includes('غير صالح') ||
        e.message.includes('format') || e.message.includes('تنسيق')
      )
    },
    {
      type: 'duplicate',
      icon: <Copy className="h-4 w-4 text-orange-600" />,
      label: t('assets.import.duplicateEntry'),
      items: errors.filter(e => 
        e.message.includes('duplicate') || e.message.includes('مكرر') ||
        e.message.includes('exists') || e.message.includes('موجود')
      )
    },
    {
      type: 'hierarchy',
      icon: <Link2Off className="h-4 w-4 text-purple-600" />,
      label: t('assets.import.hierarchyError'),
      items: errors.filter(e => 
        e.message.includes('hierarchy') || e.message.includes('parent') ||
        e.message.includes('تسلسل') || e.message.includes('لا ينتمي')
      )
    }
  ].filter(group => group.items.length > 0);

  // Catch-all for uncategorized errors
  const categorizedRows = groupedErrors.flatMap(g => g.items.map(i => `${i.row}-${i.field}`));
  const otherErrors = errors.filter(e => !categorizedRows.includes(`${e.row}-${e.field}`));
  
  if (otherErrors.length > 0) {
    groupedErrors.push({
      type: 'other',
      icon: <AlertTriangle className="h-4 w-4 text-muted-foreground" />,
      label: t('common.other'),
      items: otherErrors
    });
  }

  const toggleGroup = (type: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedGroups(newExpanded);
  };

  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          {t('assets.import.errorSummary')}
        </h4>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onDownloadErrors}
          className="gap-2"
        >
          <Download className="h-3 w-3" />
          {t('assets.import.downloadErrors')}
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {t('assets.import.errorsCount', { count: errors.length })}
        </Badge>
        {warnings.length > 0 && (
          <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            {t('assets.import.warningsCount', { count: warnings.length })}
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {groupedErrors.map(group => (
          <div key={group.type} className="border rounded-md overflow-hidden">
            <button
              onClick={() => toggleGroup(group.type)}
              className="w-full flex items-center justify-between p-3 bg-background hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {group.icon}
                <span className="font-medium text-sm">{group.label}</span>
                <Badge variant="outline" className="text-xs">
                  {group.items.length}
                </Badge>
              </div>
              {expandedGroups.has(group.type) ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            
            {expandedGroups.has(group.type) && (
              <div className="border-t divide-y bg-muted/20">
                {group.items.slice(0, 10).map((item, idx) => (
                  <div 
                    key={`${item.row}-${item.field}-${idx}`}
                    className="flex items-center justify-between p-2 px-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        {t('assets.import.row')} {item.row}
                      </Badge>
                      <span className="text-muted-foreground">{item.field}:</span>
                      <span className="text-destructive">{t(`assets.import.${item.message}`)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onJumpToRow(item.row)}
                      className="text-xs h-6 px-2"
                    >
                      {t('assets.import.jumpToRow')}
                    </Button>
                  </div>
                ))}
                {group.items.length > 10 && (
                  <div className="p-2 text-center text-xs text-muted-foreground">
                    {t('assets.import.andMoreErrors', { count: group.items.length - 10 })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {warnings.length > 0 && (
        <div className="border rounded-md overflow-hidden border-amber-200 dark:border-amber-900">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium text-sm">{t('assets.import.warnings')}</span>
            </div>
          </div>
          <div className="divide-y bg-amber-50/50 dark:bg-amber-900/10">
            {warnings.slice(0, 5).map((warning, idx) => (
              <div 
                key={`warning-${warning.row}-${idx}`}
                className="flex items-center justify-between p-2 px-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">
                    {t('assets.import.row')} {warning.row}
                  </Badge>
                  <span className="text-amber-700 dark:text-amber-400">
                    {t(`assets.import.${warning.message}`)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onJumpToRow(warning.row)}
                  className="text-xs h-6 px-2"
                >
                  {t('assets.import.jumpToRow')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
