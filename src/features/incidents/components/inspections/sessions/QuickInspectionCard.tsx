import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Ban, MapPin, Clock, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type SessionAsset, useRecordAssetInspection, useCreateFinding } from '@/features/incidents';
import { FailureReasonDialog } from './FailureReasonDialog';
import { AssetPartInspectionCard } from '@/features/incidents';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuickInspectionCardProps {
  sessionAsset: SessionAsset;
  sessionId: string;
  onComplete?: () => void;
}

export function QuickInspectionCard({ sessionAsset, sessionId, onComplete }: QuickInspectionCardProps) {
  const { t, i18n } = useTranslation();
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  // Track parts inspection state from child
  const [partsAllComplete, setPartsAllComplete] = useState(false);
  const [hasCriticalFail, setHasCriticalFail] = useState(false);
  
  const [derivedCondition, setDerivedCondition] = useState<'good' | 'not_good' | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  
  const recordInspection = useRecordAssetInspection();
  const createFinding = useCreateFinding();
  
  // Auto-derive callback from parts checklist — receives completion + critical info
  const handleConditionChange = useCallback((condition: 'good' | 'not_good', allComplete: boolean, criticalFail: boolean) => {
    setDerivedCondition(condition);
    setPartsAllComplete(allComplete);
    setHasCriticalFail(criticalFail);
    setHasFails(condition === 'not_good');
  }, []);

  const asset = sessionAsset.asset;
  if (!asset) return null;

  // Not Accessible — keeps current direct-save behavior
  const handleNotAccessible = async () => {
    try {
      await recordInspection.mutateAsync({
        session_asset_id: sessionAsset.id,
        quick_result: 'not_accessible',
      });
      onComplete?.();
    } catch (error) {
      console.error('Failed to record inspection:', error);
    }
  };

  // Explicit confirm — accepts the final result to save
  const handleConfirm = async (result: 'good' | 'not_good' | 'partial') => {
    if (!partsAllComplete) {
      toast.warning(t('inspectionSessions.completeAllParts', 'Please complete all inspection parts before finalizing this asset.'));
      return;
    }
    try {
      await recordInspection.mutateAsync({
        session_asset_id: sessionAsset.id,
        quick_result: result,
      });
      setConfirmed(true);
      toast.success(t('inspectionSessions.inspectionConfirmed', 'Inspection confirmed successfully.'));
      onComplete?.();
    } catch (error) {
      console.error('Failed to confirm inspection:', error);
    }
  };
  
  const handleFailureSubmit = async (data: { 
    failure_reason: string; 
    notes: string; 
    gps_lat?: number; 
    gps_lng?: number;
    photo_paths?: string[];
  }) => {
    try {
      await recordInspection.mutateAsync({
        session_asset_id: sessionAsset.id,
        quick_result: 'not_good',
        failure_reason: data.failure_reason,
        notes: data.notes,
        gps_lat: data.gps_lat,
        gps_lng: data.gps_lng,
        photo_paths: data.photo_paths,
      });
      
      await createFinding.mutateAsync({
        session_id: sessionId,
        session_asset_id: sessionAsset.id,
        asset_id: asset.id,
        classification: 'observation',
        risk_level: 'medium',
        description: `${asset.asset_code}: ${data.failure_reason}${data.notes ? ` - ${data.notes}` : ''}`,
      });
      
      setShowFailureDialog(false);
    } catch (error) {
      console.error('Failed to record failure:', error);
    }
  };

  
  
  const isLoading = recordInspection.isPending || createFinding.isPending;
  const currentResult = sessionAsset.quick_result;
  const isNotAccessible = currentResult === 'not_accessible';


  const getResultBadge = () => {
    if (currentResult === 'good') {
      return (
        <Badge variant="default" className="w-full justify-center py-2.5 text-sm bg-green-600 border-green-600">
          <CheckCircle className="me-2 h-4 w-4" />
          {t('inspectionSessions.result_good')}
          <span className="ms-2 text-xs opacity-75">({t('common.auto', 'Auto')})</span>
        </Badge>
      );
    }
    if (currentResult === 'not_good') {
      return (
        <Badge variant="destructive" className="w-full justify-center py-2.5 text-sm">
          <XCircle className="me-2 h-4 w-4" />
          {t('inspectionSessions.result_not_good')}
          <span className="ms-2 text-xs opacity-75">({t('common.auto', 'Auto')})</span>
        </Badge>
      );
    }
    if (currentResult === 'partial') {
      return (
        <Badge variant="outline" className="w-full justify-center py-2.5 text-sm bg-amber-500/15 text-amber-700 border-amber-500/40">
          <AlertTriangle className="me-2 h-4 w-4" />
          {t('inspectionSessions.result_partial', 'Partial')}
          <span className="ms-2 text-xs opacity-75">({t('common.manual', 'Manual')})</span>
        </Badge>
      );
    }
    if (currentResult === 'not_accessible') {
      return (
        <Badge variant="secondary" className="w-full justify-center py-2.5 text-sm">
          <Ban className="me-2 h-4 w-4" />
          {t('inspectionSessions.result_not_accessible')}
        </Badge>
      );
    }
    return null;
  };

  // Condition indicator buttons — Good and Not Good are READ-ONLY, Not Accessible is action
  const conditionButtons = [
    {
      key: 'good' as const,
      icon: CheckCircle,
      label: t('inspectionSessions.quickGood'),
      onClick: undefined,
      isIndicator: true,
      selectedClasses: 'bg-green-600 text-white ring-2 ring-green-600 ring-offset-2 cursor-default',
      unselectedClasses: 'text-green-700/40 border-green-300/40 cursor-default opacity-50',
    },
    {
      key: 'not_good' as const,
      icon: XCircle,
      label: t('inspectionSessions.quickNotGood'),
      onClick: undefined,
      isIndicator: true,
      selectedClasses: 'bg-destructive text-destructive-foreground ring-2 ring-destructive ring-offset-2 cursor-default',
      unselectedClasses: 'text-destructive/40 border-destructive/20 cursor-default opacity-50',
    },
    {
      key: 'not_accessible' as const,
      icon: Ban,
      label: t('inspectionSessions.quickNotAccessible'),
      onClick: handleNotAccessible,
      isIndicator: false,
      selectedClasses: 'bg-muted-foreground hover:bg-muted-foreground/90 text-background ring-2 ring-muted-foreground ring-offset-2',
      unselectedClasses: 'text-muted-foreground border-muted-foreground/30 hover:bg-muted/50',
    },
  ];
  
  return (
    <>
      <Card className={cn(
        "border-2 transition-colors duration-300",
        confirmed ? "border-green-600 bg-green-50/30 dark:bg-green-950/20" : "border-primary"
      )}>
        {confirmed && (
          <div className="flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-t-lg">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-medium text-sm">{t('inspectionSessions.inspected', 'Inspected')} ✓</span>
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{asset.asset_code}</CardTitle>
              <p className="text-sm text-muted-foreground">{asset.name}</p>
            </div>
            <Badge variant="outline">{asset.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className={cn("space-y-4", confirmed && "pointer-events-none opacity-60")}>
          {/* Asset Info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="font-medium">{t('assets.type')}:</span>
              <span>{i18n.language === 'ar' && asset.type?.name_ar ? asset.type.name_ar : asset.type?.name}</span>
            </div>
            {asset.building && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{asset.building.name}</span>
                {asset.floor_zone && <span>/ {asset.floor_zone.name}</span>}
              </div>
            )}
            {asset.last_inspection_date && (
              <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                <Clock className="h-3 w-3" />
                <span>{t('assets.lastInspection')}: {format(new Date(asset.last_inspection_date), 'MMM dd, yyyy')}</span>
              </div>
            )}
          </div>

          {/* Result Badge — above buttons for immediate visibility */}
          {currentResult && (
            <div className="pt-1 animate-in fade-in duration-200">
              {getResultBadge()}
            </div>
          )}

          {/* Condition Buttons — Good/Not Good are indicators, Not Accessible is action */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {conditionButtons.map((btn) => {
              const isSelected = currentResult === btn.key;
              const Icon = btn.icon;
              const isDisabled = isLoading || confirmed || btn.isIndicator;
              return (
                <Button
                  key={btn.key}
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-16 min-h-[44px] flex-col gap-1 transition-all duration-200",
                    isSelected ? btn.selectedClasses : btn.unselectedClasses,
                    btn.isIndicator && !isSelected && "pointer-events-none",
                  )}
                  onClick={btn.onClick}
                  disabled={isDisabled}
                >
                  {isLoading && currentResult === btn.key ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : (
                    <>
                      <Icon className="h-7 w-7" />
                      <span className="text-xs leading-tight text-center">{btn.label}</span>
                    </>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Validation hint */}
          {!partsAllComplete && !isNotAccessible && !confirmed && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-warning" />
              {t('inspectionSessions.completeAllPartsHint', 'Complete all checklist parts to finalize this asset.')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Parts Inspection - only show if asset has a type */}
      {asset.type && sessionAsset.id && (
        <div className={cn(
          "mt-4 relative transition-opacity duration-200",
          (isNotAccessible || confirmed) && "opacity-50 pointer-events-none"
        )}>
          {isNotAccessible && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 rounded-lg">
              <Badge variant="secondary" className="py-2 px-4 text-sm">
                <Ban className="me-2 h-4 w-4" />
                {t('inspectionSessions.notAccessibleDisabled', 'Asset not accessible — checklist disabled')}
              </Badge>
            </div>
          )}
          <AssetPartInspectionCard
            inspectionId={sessionAsset.id}
            assetTypeId={asset.type?.id || ''}
            assetSubtypeId={asset.subtype_id || null}
            assetTypeName={asset.type?.name || ''}
            assetTypeNameAr={asset.type?.name_ar}
            readOnly={isNotAccessible || confirmed}
            onConditionChange={handleConditionChange}
          />
        </div>
      )}

      {/* Confirm Inspection Buttons — conditional based on derived condition */}
      {!isNotAccessible && !confirmed && (
        <div className="mt-4 space-y-2">
          {/* All parts pass → single green confirm */}
          {derivedCondition === 'good' && (
            <Button
              type="button"
              className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleConfirm('good')}
              disabled={!partsAllComplete || isLoading}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin me-2" /> : <ShieldCheck className="h-5 w-5 me-2" />}
              {t('inspectionSessions.confirmGood', 'Confirm — Good Condition')}
            </Button>
          )}

          {/* Failures exist, no critical → two options */}
          {derivedCondition === 'not_good' && !hasCriticalFail && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                className="h-12 text-sm font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                onClick={() => handleConfirm('not_good')}
                disabled={!partsAllComplete || isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin me-2" /> : <XCircle className="h-5 w-5 me-2" />}
                {t('inspectionSessions.confirmFail', 'Confirm — Fail')}
              </Button>
              <Button
                type="button"
                className="h-12 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => handleConfirm('partial')}
                disabled={!partsAllComplete || isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin me-2" /> : <AlertTriangle className="h-5 w-5 me-2" />}
                {t('inspectionSessions.confirmPartial', 'Confirm — Partial')}
              </Button>
            </div>
          )}

          {/* Critical failure → single red confirm only */}
          {derivedCondition === 'not_good' && hasCriticalFail && (
            <Button
              type="button"
              className="w-full h-12 text-base font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => handleConfirm('not_good')}
              disabled={!partsAllComplete || isLoading}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin me-2" /> : <XCircle className="h-5 w-5 me-2" />}
              {t('inspectionSessions.confirmNotGood', 'Confirm — Not Good')}
            </Button>
          )}

          {/* Parts not yet complete — disabled placeholder */}
          {!derivedCondition && (
            <Button
              type="button"
              className="w-full h-12 text-base font-semibold opacity-50"
              disabled
            >
              <ShieldCheck className="h-5 w-5 me-2" />
              {t('inspectionSessions.confirmInspection', 'Confirm Inspection')}
            </Button>
          )}
        </div>
      )}
      
      <FailureReasonDialog
        open={showFailureDialog}
        onOpenChange={setShowFailureDialog}
        onSubmit={handleFailureSubmit}
        isLoading={isLoading}
        assetCode={asset.asset_code}
      />
    </>
  );
}
