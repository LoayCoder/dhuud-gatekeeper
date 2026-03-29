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
  const isAlreadyInspected = sessionAsset.quick_result !== null;

  const getResultBadge = () => {
    const result = sessionAsset.quick_result;
    if (result === 'good') {
      return (
        <Badge variant="default" className="w-full justify-center py-2 bg-green-600">
          <CheckCircle className="me-2 h-4 w-4" />
          {t('inspectionSessions.result_good')}
        </Badge>
      );
    }
    if (result === 'not_good') {
      return (
        <Badge variant="destructive" className="w-full justify-center py-2">
          <XCircle className="me-2 h-4 w-4" />
          {t('inspectionSessions.result_not_good')}
        </Badge>
      );
    }
    if (result === 'partial') {
      return (
        <Badge variant="outline" className="w-full justify-center py-2 bg-amber-500/15 text-amber-700 border-amber-500/40">
          <AlertTriangle className="me-2 h-4 w-4" />
          {t('inspectionSessions.result_partial', 'Partial')}
        </Badge>
      );
    }
    if (result === 'not_accessible') {
      return (
        <Badge variant="secondary" className="w-full justify-center py-2">
          <Ban className="me-2 h-4 w-4" />
          {t('inspectionSessions.result_not_accessible')}
        </Badge>
      );
    }
    return null;
  };
  
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
          
          {/* Result Badge (when already inspected) */}
          {isAlreadyInspected && (
            <div className="pt-2">
              {getResultBadge()}
            </div>
          )}

          {/* Quick Action Buttons — always visible so user can override */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            <Button 
              size="lg" 
              className="h-16 flex-col gap-1 bg-green-600 hover:bg-green-700"
              onClick={handleGood}
              disabled={isLoading}
              variant={sessionAsset.quick_result === 'good' ? 'default' : 'outline'}
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-6 w-6" />
                  <span className="text-xs">{t('inspectionSessions.quickGood')}</span>
                </>
              )}
            </Button>
            
            <Button 
              size="lg" 
              variant={sessionAsset.quick_result === 'not_good' ? 'destructive' : 'outline'}
              className="h-16 flex-col gap-1"
              onClick={() => setShowFailureDialog(true)}
              disabled={isLoading}
            >
              <XCircle className="h-6 w-6" />
              <span className="text-xs">{t('inspectionSessions.quickNotGood')}</span>
            </Button>

            <Button 
              size="lg" 
              variant={sessionAsset.quick_result === 'partial' ? 'default' : 'outline'}
              className={`h-16 flex-col gap-1 ${sessionAsset.quick_result === 'partial' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'text-amber-700 border-amber-300 hover:bg-amber-50'}`}
              onClick={handlePartial}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <AlertTriangle className="h-6 w-6" />
                  <span className="text-xs">{t('inspectionSessions.quickPartial', 'Partial')}</span>
                </>
              )}
            </Button>
            
            <Button 
              size="lg" 
              variant={sessionAsset.quick_result === 'not_accessible' ? 'secondary' : 'outline'}
              className="h-16 flex-col gap-1"
              onClick={handleNotAccessible}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <Ban className="h-6 w-6" />
                  <span className="text-xs">{t('inspectionSessions.quickNotAccessible')}</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Parts Inspection - only show if asset has a type */}
      {asset.type && sessionAsset.id && (
        <div className="mt-4">
          <AssetPartInspectionCard
            inspectionId={sessionAsset.id}
            assetTypeId={asset.type?.id || ''}
            assetSubtypeId={asset.subtype_id || null}
            assetTypeName={asset.type?.name || ''}
            assetTypeNameAr={asset.type?.name_ar}
            readOnly={false}
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
