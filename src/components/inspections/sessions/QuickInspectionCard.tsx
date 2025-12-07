import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Ban, MapPin, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type SessionAsset, useRecordAssetInspection, useCreateFinding } from '@/hooks/use-inspection-sessions';
import { FailureReasonDialog } from './FailureReasonDialog';

interface QuickInspectionCardProps {
  sessionAsset: SessionAsset;
  sessionId: string;
  onComplete?: () => void;
}

export function QuickInspectionCard({ sessionAsset, sessionId, onComplete }: QuickInspectionCardProps) {
  const { t, i18n } = useTranslation();
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  
  const recordInspection = useRecordAssetInspection();
  const createFinding = useCreateFinding();
  
  const asset = sessionAsset.asset;
  if (!asset) return null;
  
  const handleGood = async () => {
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
  
  const handleFailureSubmit = async (data: { 
    failure_reason: string; 
    notes: string; 
    gps_lat?: number; 
    gps_lng?: number;
    photo_paths?: string[];
  }) => {
    try {
      // Record the inspection result
      await recordInspection.mutateAsync({
        session_asset_id: sessionAsset.id,
        quick_result: 'not_good',
        failure_reason: data.failure_reason,
        notes: data.notes,
        gps_lat: data.gps_lat,
        gps_lng: data.gps_lng,
        photo_paths: data.photo_paths,
      });
      
      // Create a finding
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
  
  const isLoading = recordInspection.isPending || createFinding.isPending;
  const isAlreadyInspected = sessionAsset.quick_result !== null;
  
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
          
          {/* Already Inspected */}
          {isAlreadyInspected ? (
            <div className="pt-2">
              <Badge 
                variant={sessionAsset.quick_result === 'good' ? 'default' : sessionAsset.quick_result === 'not_good' ? 'destructive' : 'secondary'}
                className="w-full justify-center py-2"
              >
                {sessionAsset.quick_result === 'good' && <CheckCircle className="me-2 h-4 w-4" />}
                {sessionAsset.quick_result === 'not_good' && <XCircle className="me-2 h-4 w-4" />}
                {sessionAsset.quick_result === 'not_accessible' && <Ban className="me-2 h-4 w-4" />}
                {t(`inspectionSessions.result_${sessionAsset.quick_result}`)}
              </Badge>
            </div>
          ) : (
            /* Quick Action Buttons */
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button 
                size="lg" 
                className="h-16 flex-col gap-1 bg-green-600 hover:bg-green-700"
                onClick={handleGood}
                disabled={isLoading}
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
                variant="destructive"
                className="h-16 flex-col gap-1"
                onClick={() => setShowFailureDialog(true)}
                disabled={isLoading}
              >
                <XCircle className="h-6 w-6" />
                <span className="text-xs">{t('inspectionSessions.quickNotGood')}</span>
              </Button>
              
              <Button 
                size="lg" 
                variant="secondary"
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
          )}
        </CardContent>
      </Card>
      
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
