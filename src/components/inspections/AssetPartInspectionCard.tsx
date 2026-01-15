/**
 * Asset Part Inspection Card
 * 
 * Card component for inspecting individual parts of an asset during inspection.
 * Uses smart lookup to fetch parts from subtype if exists, otherwise from type.
 * Displays all defined parts with quick Pass/Fail/N/A toggles.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Cog, 
  Check, 
  X, 
  Minus, 
  AlertTriangle,
  MessageSquare,
  Package,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePartsForAsset, type AssetTypePart } from '@/hooks/use-asset-type-parts';
import { 
  useSavePartInspectionResult, 
  usePartInspectionResults,
  type PartInspectionResult 
} from '@/hooks/use-part-inspection-results';

interface AssetPartInspectionCardProps {
  inspectionId: string;
  assetTypeId: string;
  assetSubtypeId?: string | null;
  assetTypeName: string;
  assetTypeNameAr?: string | null;
  readOnly?: boolean;
}

interface PartRowProps {
  part: AssetTypePart;
  currentResult?: PartInspectionResult;
  currentNotes?: string | null;
  onResultChange: (partId: string, result: PartInspectionResult) => void;
  onNotesChange: (partId: string, notes: string) => void;
  readOnly?: boolean;
  isSaving?: boolean;
}

function PartRow({ 
  part, 
  currentResult, 
  currentNotes,
  onResultChange, 
  onNotesChange,
  readOnly,
  isSaving,
}: PartRowProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [showNotes, setShowNotes] = useState(!!currentNotes);
  const [notes, setNotes] = useState(currentNotes || '');

  const displayName = isRTL && part.name_ar ? part.name_ar : part.name;

  const handleNotesBlur = () => {
    if (notes !== currentNotes) {
      onNotesChange(part.id, notes);
    }
  };

  const getContentCountDisplay = () => {
    if (!part.content_count) return null;
    const label = part.content_count_label || t('assetParts.items', 'items');
    return `${part.content_count} ${label}`;
  };

  return (
    <div className={cn(
      "border rounded-lg p-3 space-y-2 transition-colors",
      currentResult === 'fail' && part.is_critical && "border-destructive bg-destructive/5",
      currentResult === 'pass' && "border-green-500/50 bg-green-500/5",
      currentResult === 'fail' && !part.is_critical && "border-orange-500/50 bg-orange-500/5",
    )}>
      {/* Part Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{displayName}</span>
          {part.is_critical && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              {t('assetParts.critical', 'Critical')}
            </Badge>
          )}
          {part.content_count && (
            <Badge variant="outline" className="text-xs gap-1">
              <Package className="h-3 w-3" />
              {getContentCountDisplay()}
            </Badge>
          )}
        </div>

        {/* Result Buttons */}
        <div className="flex items-center gap-1">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground me-2" />}
          
          <Button
            type="button"
            variant={currentResult === 'pass' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              "h-8 px-3 gap-1",
              currentResult === 'pass' && "bg-green-600 hover:bg-green-700"
            )}
            onClick={() => onResultChange(part.id, 'pass')}
            disabled={readOnly || isSaving}
          >
            <Check className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assetParts.pass', 'Pass')}</span>
          </Button>
          
          <Button
            type="button"
            variant={currentResult === 'fail' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              "h-8 px-3 gap-1",
              currentResult === 'fail' && "bg-destructive hover:bg-destructive/90"
            )}
            onClick={() => onResultChange(part.id, 'fail')}
            disabled={readOnly || isSaving}
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assetParts.fail', 'Fail')}</span>
          </Button>
          
          <Button
            type="button"
            variant={currentResult === 'na' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              "h-8 px-3 gap-1",
              currentResult === 'na' && "bg-muted-foreground hover:bg-muted-foreground/90"
            )}
            onClick={() => onResultChange(part.id, 'na')}
            disabled={readOnly || isSaving}
          >
            <Minus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assetParts.na', 'N/A')}</span>
          </Button>

          {/* Notes Toggle */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowNotes(!showNotes)}
            disabled={readOnly}
          >
            <MessageSquare className={cn("h-4 w-4", notes && "text-primary")} />
          </Button>
        </div>
      </div>

      {/* Notes Input */}
      {showNotes && (
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder={t('assetParts.addNotes', 'Add notes for this part...')}
          className="text-sm resize-none"
          rows={2}
          disabled={readOnly}
        />
      )}
    </div>
  );
}

export function AssetPartInspectionCard({
  inspectionId,
  assetTypeId,
  assetSubtypeId,
  assetTypeName,
  assetTypeNameAr,
  readOnly = false,
}: AssetPartInspectionCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [isExpanded, setIsExpanded] = useState(true);
  const [localResults, setLocalResults] = useState<Record<string, { result: PartInspectionResult; notes: string }>>({});
  const [savingPartId, setSavingPartId] = useState<string | null>(null);

  const displayTypeName = isRTL && assetTypeNameAr ? assetTypeNameAr : assetTypeName;

  // Smart lookup: fetch parts from subtype if exists, otherwise from type
  const { data: parts, isLoading: partsLoading } = usePartsForAsset(assetTypeId, assetSubtypeId || undefined);
  const { data: existingResults, isLoading: resultsLoading } = usePartInspectionResults(inspectionId);
  const saveResult = useSavePartInspectionResult();

  // Initialize local results from existing data
  useEffect(() => {
    if (existingResults) {
      const resultsMap: Record<string, { result: PartInspectionResult; notes: string }> = {};
      existingResults.forEach((r) => {
        resultsMap[r.part_id] = {
          result: r.result,
          notes: r.notes || '',
        };
      });
      setLocalResults(resultsMap);
    }
  }, [existingResults]);

  const handleResultChange = async (partId: string, result: PartInspectionResult) => {
    // Optimistic update
    setLocalResults((prev) => ({
      ...prev,
      [partId]: { ...prev[partId], result, notes: prev[partId]?.notes || '' },
    }));

    setSavingPartId(partId);
    try {
      await saveResult.mutateAsync({
        inspection_id: inspectionId,
        part_id: partId,
        result,
        notes: localResults[partId]?.notes || undefined,
      });
    } finally {
      setSavingPartId(null);
    }
  };

  const handleNotesChange = async (partId: string, notes: string) => {
    setLocalResults((prev) => ({
      ...prev,
      [partId]: { ...prev[partId], notes },
    }));

    const currentResult = localResults[partId]?.result;
    if (currentResult) {
      setSavingPartId(partId);
      try {
        await saveResult.mutateAsync({
          inspection_id: inspectionId,
          part_id: partId,
          result: currentResult,
          notes: notes || undefined,
        });
      } finally {
        setSavingPartId(null);
      }
    }
  };

  // Calculate summary
  const summary = {
    total: parts?.length || 0,
    passed: Object.values(localResults).filter((r) => r.result === 'pass').length,
    failed: Object.values(localResults).filter((r) => r.result === 'fail').length,
    na: Object.values(localResults).filter((r) => r.result === 'na').length,
  };
  const completed = summary.passed + summary.failed + summary.na;

  if (partsLoading || resultsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!parts || parts.length === 0) {
    return null; // No parts defined for this asset type/subtype
  }

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Cog className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">
                  {t('assetParts.inspectionTitle', 'Parts Inspection')}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {completed}/{summary.total}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {/* Summary Badges */}
                {summary.passed > 0 && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                    <Check className="h-3 w-3 me-1" />
                    {summary.passed}
                  </Badge>
                )}
                {summary.failed > 0 && (
                  <Badge variant="destructive">
                    <X className="h-3 w-3 me-1" />
                    {summary.failed}
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <p className="text-sm text-muted-foreground mt-1">
            {displayTypeName}
          </p>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-2 pt-0">
            {parts.map((part) => (
              <PartRow
                key={part.id}
                part={part}
                currentResult={localResults[part.id]?.result}
                currentNotes={localResults[part.id]?.notes}
                onResultChange={handleResultChange}
                onNotesChange={handleNotesChange}
                readOnly={readOnly}
                isSaving={savingPartId === part.id}
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
