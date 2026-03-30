/**
 * Asset Part Inspection Card
 * 
 * Card component for inspecting individual parts of an asset during inspection.
 * Uses smart lookup to fetch parts from subtype if exists, otherwise from type.
 * Displays all defined parts with quick Pass/Fail/N/A toggles in stacked layout.
 * Auto-derives overall condition from part results via onConditionChange callback.
 * Reports completion status and critical fail flags on every change.
 */

import { useState, useEffect, useRef } from 'react';
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
import { usePartsForAsset, type AssetTypePart } from '@/features/assets';
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
  /** Called on every part change with derived condition, completion status, and critical fail flag */
  onConditionChange?: (condition: 'good' | 'not_good', allComplete: boolean, hasCriticalFail: boolean) => void;
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

  // Auto-expand notes when Fail is selected
  useEffect(() => {
    if (currentResult === 'fail' && !showNotes) {
      setShowNotes(true);
    }
  }, [currentResult]);

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

  // Color-coded left border based on result
  const borderClass = currentResult === 'pass'
    ? 'border-s-4 border-s-green-500 bg-green-500/5'
    : currentResult === 'fail' && part.is_critical
    ? 'border-2 border-destructive bg-destructive/5'
    : currentResult === 'fail'
    ? 'border-s-4 border-s-destructive bg-destructive/5'
    : currentResult === 'na'
    ? 'border-s-4 border-s-muted-foreground/40 bg-muted/30'
    : '';

  return (
    <div className={cn(
      "border rounded-lg p-3 space-y-3 transition-all duration-200",
      borderClass,
    )}>
      {/* Row 1: Part name + badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-medium text-sm">{displayName}</span>
          {part.is_critical && (
            <Badge variant="destructive" className="text-xs gap-1 shrink-0">
              <AlertTriangle className="h-3 w-3" />
              {t('assetParts.critical', 'Critical')}
            </Badge>
          )}
          {part.content_count && (
            <Badge variant="outline" className="text-xs gap-1 shrink-0">
              <Package className="h-3 w-3" />
              {getContentCountDisplay()}
            </Badge>
          )}
        </div>
        {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
      </div>

      {/* Row 2: Action buttons — stacked below name */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant={currentResult === 'pass' ? 'default' : 'outline'}
          size="sm"
          className={cn(
            "h-10 min-w-[60px] gap-1.5 transition-all duration-200",
            currentResult === 'pass'
              ? "bg-green-600 hover:bg-green-700 ring-2 ring-green-600/30"
              : "text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700"
          )}
          onClick={() => onResultChange(part.id, 'pass')}
          disabled={readOnly || isSaving}
        >
          <Check className="h-4 w-4" />
          <span>{t('assetParts.pass', 'Pass')}</span>
        </Button>
        
        <Button
          type="button"
          variant={currentResult === 'fail' ? 'default' : 'outline'}
          size="sm"
          className={cn(
            "h-10 min-w-[60px] gap-1.5 transition-all duration-200",
            currentResult === 'fail'
              ? "bg-destructive hover:bg-destructive/90 ring-2 ring-destructive/30"
              : "text-destructive border-destructive/30 hover:bg-destructive/5"
          )}
          onClick={() => onResultChange(part.id, 'fail')}
          disabled={readOnly || isSaving}
        >
          <X className="h-4 w-4" />
          <span>{t('assetParts.fail', 'Fail')}</span>
        </Button>
        
        <Button
          type="button"
          variant={currentResult === 'na' ? 'default' : 'outline'}
          size="sm"
          className={cn(
            "h-10 min-w-[60px] gap-1.5 transition-all duration-200",
            currentResult === 'na'
              ? "bg-muted-foreground hover:bg-muted-foreground/90 ring-2 ring-muted-foreground/30"
              : "text-muted-foreground border-muted-foreground/30 hover:bg-muted/50"
          )}
          onClick={() => onResultChange(part.id, 'na')}
          disabled={readOnly || isSaving}
        >
          <Minus className="h-4 w-4" />
          <span>{t('assetParts.na', 'N/A')}</span>
        </Button>

        {/* Notes Toggle — visually distinct */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-10 min-w-[44px] gap-1.5 ms-auto transition-all duration-200",
            notes ? "text-primary bg-primary/5" : "text-muted-foreground"
          )}
          onClick={() => setShowNotes(!showNotes)}
          disabled={readOnly}
        >
          <MessageSquare className={cn("h-4 w-4", notes && "fill-primary/20")} />
          {notes && <span className="text-xs">{t('assetParts.hasNotes', '•')}</span>}
        </Button>
      </div>

      {/* Notes Input — expandable */}
      {showNotes && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder={t('assetParts.addNotes', 'Add notes for this part...')}
            className="text-sm resize-none"
            rows={2}
            disabled={readOnly}
          />
        </div>
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
  onConditionChange,
}: AssetPartInspectionCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [isExpanded, setIsExpanded] = useState(true);
  const [localResults, setLocalResults] = useState<Record<string, { result: PartInspectionResult; notes: string }>>({});
  const [savingPartId, setSavingPartId] = useState<string | null>(null);
  // Track last derived condition to avoid duplicate callbacks
  const lastDerivedRef = useRef<string | null>(null);
  const lastCompleteRef = useRef<boolean | null>(null);
  const lastCriticalRef = useRef<boolean | null>(null);

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

  // Auto-derive overall condition on every part change — report to parent always
  const deriveCondition = (results: Record<string, { result: PartInspectionResult; notes: string }>) => {
    if (!parts || parts.length === 0 || !onConditionChange) return;
    
    const answeredParts = parts.filter(p => results[p.id]?.result);
    const allComplete = answeredParts.length === parts.length;
    const hasFail = answeredParts.some(p => results[p.id]?.result === 'fail');
    const hasCriticalFail = parts.some(p => p.is_critical && results[p.id]?.result === 'fail');
    const derived = hasFail ? 'not_good' : 'good';
    
    // Fire callback on every change (even incomplete) so parent knows status
    if (lastDerivedRef.current !== derived || lastCompleteRef.current !== allComplete || lastCriticalRef.current !== hasCriticalFail) {
      lastDerivedRef.current = derived;
      lastCompleteRef.current = allComplete;
      lastCriticalRef.current = hasCriticalFail;
      onConditionChange(derived, allComplete, hasCriticalFail);
    }
  };

  const handleResultChange = async (partId: string, result: PartInspectionResult) => {
    // Optimistic update
    const newResults = {
      ...localResults,
      [partId]: { ...localResults[partId], result, notes: localResults[partId]?.notes || '' },
    };
    setLocalResults(newResults);

    // Derive condition after update
    deriveCondition(newResults);

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
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
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
          <CardContent className="space-y-3 pt-0">
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
