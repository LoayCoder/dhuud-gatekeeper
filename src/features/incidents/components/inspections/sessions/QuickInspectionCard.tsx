import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Ban, MapPin, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type SessionAsset, useRecordAssetInspection, useCreateFinding } from '@/features/incidents';
import { FailureReasonDialog } from './FailureReasonDialog';
import { AssetPartInspectionCard } from '@/features/incidents';
import { cn } from '@/lib/utils';

interface QuickInspectionCardProps {
  sessionAsset: SessionAsset;
  sessionId: string;
  onComplete?: () => void;
}

export function QuickInspectionCard({ sessionAsset, sessionId, onComplete }: QuickInspectionCardProps) {
  const { t, i18n } = useTranslation();
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);
  
  const recordInspection = useRecordAssetInspection();
  const createFinding = useCreateFinding();
  
  const asset = sessionAsset.asset;
  if (!asset) return null;
  
  const handleGood = async () => {
    setManualOverride(false);
    try {
      await recordInspection.mutateAsync({
        session_asset_id: sessionAsset.id,
        quick_result: 'good',
      });
      onComplete?.();
    } catch (error) {
      console.error('Failed to record inspection:', error);
    }
  };

  const handlePartial = async () => {
    setManualOverride(true);
    try {
      await recordInspection.mutateAsync({
        session_asset_id: sessionAsset.id,
        quick_result: 'partial',
      });
      onComplete?.();
    } catch (error) {
      console.error('Failed to record inspection:', error);
    }
  };
  
  const handleNotAccessible = async () => {
    setManualOverride(true);
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
  
  const handleFailureSubmit = async (data: { 
    failure_reason: string; 
    notes: string; 
    gps_lat?: number; 
    gps_lng?: number;
    photo_paths?: string[];
  }) => {
    setManualOverride(false);
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
      onComplete?.();
    } catch (error) {
      console.error('Failed to record failure:', error);
    }
  };

  // Auto-derive callback from parts checklist
  const handleConditionChange = useCallback(async (condition: 'good' | 'not_good') => {
    // Don't override if user manually selected a result
    if (manualOverride) return;
    
    try {
      await recordInspection.mutateAsync({
        session_asset_id: sessionAsset.id,
        quick_result: condition,
      });
    } catch (error) {
      console.error('Failed to auto-set condition:', error);
    }
  }, [manualOverride, sessionAsset.id, recordInspection]);
  
  const isLoading = recordInspection.isPending || createFinding.isPending;
  const currentResult = sessionAsset.quick_result;
  const isNotAccessible = currentResult === 'not_accessible';

  const getResultBadge = () => {
    if (currentResult === 'good') {
      return (
        <Badge variant="default" className="w-full justify-center py-2.5 text-sm bg-green-600 border-green-600">
          <CheckCircle className="me-2 h-4 w-4" />
          {t('inspectionSessions.result_good')}
          {!manualOverride && <span className="ms-2 text-xs opacity-75">({t('common.auto', 'Auto')})</span>}
        </Badge>
      );
    }
    if (currentResult === 'not_good') {
      return (
        <Badge variant="destructive" className="w-full justify-center py-2.5 text-sm">
          <XCircle className="me-2 h-4 w-4" />
          {t('inspectionSessions.result_not_good')}
          {!manualOverride && <span className="ms-2 text-xs opacity-75">({t('common.auto', 'Auto')})</span>}
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

  const conditionButtons = [
    {
      key: 'good' as const,
      icon: CheckCircle,
      label: t('inspectionSessions.quickGood'),
      onClick: handleGood,
      selectedClasses: 'bg-green-600 hover:bg-green-700 text-white ring-2 ring-green-600 ring-offset-2',
      unselectedClasses: 'text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-950',
    },
    {
      key: 'not_good' as const,
      icon: XCircle,
      label: t('inspectionSessions.quickNotGood'),
      onClick: () => setShowFailureDialog(true),
      selectedClasses: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground ring-2 ring-destructive ring-offset-2',
      unselectedClasses: 'text-destructive border-destructive/30 hover:bg-destructive/5',
    },
    {
      key: 'partial' as const,
      icon: AlertTriangle,
      label: t('inspectionSessions.quickPartial', 'Partial'),
      onClick: handlePartial,
      selectedClasses: 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-500 ring-offset-2',
      unselectedClasses: 'text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950',
    },
    {
      key: 'not_accessible' as const,
      icon: Ban,
      label: t('inspectionSessions.quickNotAccessible'),
      onClick: handleNotAccessible,
      selectedClasses: 'bg-muted-foreground hover:bg-muted-foreground/90 text-background ring-2 ring-muted-foreground ring-offset-2',
      unselectedClasses: 'text-muted-foreground border-muted-foreground/30 hover:bg-muted/50',
    },
  ];
  
  return (
    <>
      <Card className="border-2 border-primary">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{asset.asset_code}</CardTitle>
              <p className="text-sm text-muted-foreground">{asset.name}</p>
            </div>
            <Badge variant="outline">{asset.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {conditionButtons.map((btn) => {
              const isSelected = currentResult === btn.key;
              const Icon = btn.icon;
              return (
                <Button
                  key={btn.key}
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-16 min-h-[44px] flex-col gap-1 transition-all duration-200",
                    isSelected ? btn.selectedClasses : btn.unselectedClasses,
                  )}
                  onClick={btn.onClick}
                  disabled={isLoading}
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
        </CardContent>
      </Card>

      {/* Parts Inspection - only show if asset has a type */}
      {asset.type && sessionAsset.id && (
        <div className={cn(
          "mt-4 relative transition-opacity duration-200",
          isNotAccessible && "opacity-50 pointer-events-none"
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
            readOnly={isNotAccessible}
            onConditionChange={handleConditionChange}
          />
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
