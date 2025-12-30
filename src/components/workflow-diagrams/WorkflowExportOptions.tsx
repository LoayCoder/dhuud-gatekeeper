import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Download, FileDown, Loader2, Users, FileText, Info } from 'lucide-react';

interface WorkflowExportOptionsProps {
  includeActors: boolean;
  setIncludeActors: (value: boolean) => void;
  includeDescription: boolean;
  setIncludeDescription: (value: boolean) => void;
  showLegend: boolean;
  setShowLegend: (value: boolean) => void;
  onExportSingle: () => void;
  onExportSelected: () => void;
  selectedCount: number;
  hasSelectedWorkflow: boolean;
  isExporting: boolean;
  className?: string;
}

export function WorkflowExportOptions({
  includeActors,
  setIncludeActors,
  includeDescription,
  setIncludeDescription,
  showLegend,
  setShowLegend,
  onExportSingle,
  onExportSelected,
  selectedCount,
  hasSelectedWorkflow,
  isExporting,
  className,
}: WorkflowExportOptionsProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('space-y-4', className)}>
      <Separator />
      
      <div className="space-y-4">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t('workflowDiagrams.exportOptions', 'Export Options')}
        </h4>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox
              id="includeActors"
              checked={includeActors}
              onCheckedChange={(c) => setIncludeActors(!!c)}
            />
            <Label 
              htmlFor="includeActors" 
              className="flex-1 cursor-pointer flex items-center gap-2 text-sm"
            >
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              {t('workflowDiagrams.includeActors', 'Include Actors')}
            </Label>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox
              id="includeDescription"
              checked={includeDescription}
              onCheckedChange={(c) => setIncludeDescription(!!c)}
            />
            <Label 
              htmlFor="includeDescription" 
              className="flex-1 cursor-pointer flex items-center gap-2 text-sm"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              {t('workflowDiagrams.includeDescription', 'Include Description')}
            </Label>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox
              id="showLegend"
              checked={showLegend}
              onCheckedChange={(c) => setShowLegend(!!c)}
            />
            <Label 
              htmlFor="showLegend" 
              className="flex-1 cursor-pointer flex items-center gap-2 text-sm"
            >
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              {t('workflowDiagrams.showLegend', 'Show Legend')}
            </Label>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Button
          onClick={onExportSingle}
          disabled={!hasSelectedWorkflow || isExporting}
          className="w-full gap-2"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {t('workflowDiagrams.exportPdf', 'Export PDF')}
        </Button>

        <Button
          variant="outline"
          onClick={onExportSelected}
          disabled={selectedCount === 0 || isExporting}
          className="w-full gap-2"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {t('workflowDiagrams.exportSelected', 'Export Selected')} ({selectedCount})
        </Button>
      </div>
    </div>
  );
}
