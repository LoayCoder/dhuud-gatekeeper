import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  MinusCircle, 
  MapPin, 
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Star,
  ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSaveAreaResponse, type AreaInspectionResponse } from '@/hooks/use-area-inspections';
import type { TemplateItem } from '@/hooks/use-inspections';
import { InspectionPhotoUpload } from './InspectionPhotoUpload';
import { cn } from '@/lib/utils';

interface AreaChecklistItemProps {
  item: TemplateItem;
  response?: AreaInspectionResponse;
  sessionId: string;
  tenantId: string;
  isLocked: boolean;
  requiresPhotos: boolean;
  requiresGps: boolean;
}

export function AreaChecklistItem({
  item,
  response,
  sessionId,
  tenantId,
  isLocked,
  requiresPhotos,
  requiresGps,
}: AreaChecklistItemProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  // Local state for response values
  const [result, setResult] = useState<'pass' | 'fail' | 'na' | null>(response?.result || null);
  const [responseValue, setResponseValue] = useState(response?.response_value || '');
  const [notes, setNotes] = useState(response?.notes || '');
  const [showNotes, setShowNotes] = useState(!!response?.notes);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(
    response?.gps_lat && response?.gps_lng 
      ? { lat: response.gps_lat, lng: response.gps_lng, accuracy: response.gps_accuracy || 0 }
      : null
  );
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [showPhotos, setShowPhotos] = useState(false);
  
  const saveResponse = useSaveAreaResponse();
  
  // Debounced save
  const saveDebounced = useCallback(
    async (data: { result?: 'pass' | 'fail' | 'na'; response_value?: string; notes?: string }) => {
      if (isLocked) return;
      
      setIsSaving(true);
      try {
        await saveResponse.mutateAsync({
          session_id: sessionId,
          template_item_id: item.id,
          result: data.result || result || undefined,
          response_value: data.response_value || responseValue || undefined,
          notes: data.notes || notes || undefined,
          gps_lat: gpsCoords?.lat,
          gps_lng: gpsCoords?.lng,
          gps_accuracy: gpsCoords?.accuracy,
        });
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setIsSaving(false);
      }
    },
    [sessionId, item.id, result, responseValue, notes, gpsCoords, isLocked, saveResponse]
  );
  
  // Auto-save on result change
  useEffect(() => {
    if (result && result !== response?.result) {
      const timer = setTimeout(() => saveDebounced({ result }), 500);
      return () => clearTimeout(timer);
    }
  }, [result]);
  
  // Auto-save notes with debounce
  useEffect(() => {
    if (notes !== (response?.notes || '')) {
      const timer = setTimeout(() => saveDebounced({ notes }), 2000);
      return () => clearTimeout(timer);
    }
  }, [notes]);
  
  // Auto-save response value with debounce (for numeric/text)
  useEffect(() => {
    if (responseValue !== (response?.response_value || '')) {
      const timer = setTimeout(() => saveDebounced({ response_value: responseValue }), 2000);
      return () => clearTimeout(timer);
    }
  }, [responseValue]);
  
  const handleResultClick = (newResult: 'pass' | 'fail' | 'na') => {
    if (isLocked) return;
    setResult(newResult);
    
    // Auto-show notes section when result is FAIL to prompt for comment
    if (newResult === 'fail' && !showNotes) {
      setShowNotes(true);
    }
  };
  
  const handleCaptureGps = async () => {
    if (isLocked || !navigator.geolocation) {
      toast.error(t('inspections.gpsNotSupported'));
      return;
    }
    
    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setGpsCoords(coords);
        setIsCapturingGps(false);
        // Save immediately with new GPS
        saveResponse.mutate({
          session_id: sessionId,
          template_item_id: item.id,
          result: result || undefined,
          response_value: responseValue || undefined,
          notes: notes || undefined,
          gps_lat: coords.lat,
          gps_lng: coords.lng,
          gps_accuracy: coords.accuracy,
        });
        toast.success(t('inspections.gpsCaptured'));
      },
      (error) => {
        setIsCapturingGps(false);
        toast.error(t('inspections.gpsError'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  
  // Get question text based on language
  const questionText = i18n.language === 'ar' && item.question_ar ? item.question_ar : item.question;
  const instructionsText = i18n.language === 'ar' && item.instructions_ar ? item.instructions_ar : item.instructions;
  
  // Determine card styling based on result
  const cardClass = cn(
    'transition-colors',
    result === 'pass' && 'border-green-500/50 bg-green-500/5',
    result === 'fail' && 'border-red-500/50 bg-red-500/5',
    result === 'na' && 'border-muted',
    isLocked && 'opacity-70'
  );
  
  return (
    <Card className={cardClass} dir={direction}>
      <CardContent className="py-4 space-y-4">
        {/* Question Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {item.is_critical && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 me-1" />
                  {t('inspections.critical')}
                </Badge>
              )}
              {item.is_required && (
                <Badge variant="secondary" className="text-xs">
                  {t('inspections.required')}
                </Badge>
              )}
            </div>
            <p className="font-medium">{questionText}</p>
            {instructionsText && (
              <p className="text-sm text-muted-foreground mt-1">{instructionsText}</p>
            )}
          </div>
          
          {/* Saving indicator */}
          {isSaving && (
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('inspections.autoSaving')}
            </div>
          )}
        </div>
        
        {/* Response Controls based on type */}
        <div className="space-y-3">
          {/* Pass/Fail/NA Buttons (for pass_fail and yes_no types) */}
          {(item.response_type === 'pass_fail' || item.response_type === 'yes_no') && (
            <div className="flex gap-2">
              <Button
                variant={result === 'pass' ? 'default' : 'outline'}
                className={cn(
                  'flex-1',
                  result === 'pass' && 'bg-green-600 hover:bg-green-700'
                )}
                onClick={() => handleResultClick('pass')}
                disabled={isLocked}
              >
                <CheckCircle className="h-4 w-4 me-2" />
                {item.response_type === 'yes_no' ? t('inspections.yes') : t('inspections.results.pass')}
              </Button>
              <Button
                variant={result === 'fail' ? 'default' : 'outline'}
                className={cn(
                  'flex-1',
                  result === 'fail' && 'bg-red-600 hover:bg-red-700'
                )}
                onClick={() => handleResultClick('fail')}
                disabled={isLocked}
              >
                <XCircle className="h-4 w-4 me-2" />
                {item.response_type === 'yes_no' ? t('inspections.no') : t('inspections.results.fail')}
              </Button>
              <Button
                variant={result === 'na' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => handleResultClick('na')}
                disabled={isLocked}
              >
                <MinusCircle className="h-4 w-4 me-2" />
                {t('inspections.results.na')}
              </Button>
            </div>
          )}
          
          {/* Rating Scale */}
          {item.response_type === 'rating' && (
            <div className="space-y-2">
              <div className="flex gap-1 justify-center">
                {Array.from({ length: item.rating_scale || 5 }, (_, i) => i + 1).map((star) => (
                  <Button
                    key={star}
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-10 w-10',
                      parseInt(responseValue || '0') >= star && 'text-yellow-500'
                    )}
                    onClick={() => {
                      if (isLocked) return;
                      setResponseValue(String(star));
                      setResult(star >= 3 ? 'pass' : 'fail');
                    }}
                    disabled={isLocked}
                  >
                    <Star 
                      className={cn(
                        'h-6 w-6',
                        parseInt(responseValue || '0') >= star && 'fill-current'
                      )} 
                    />
                  </Button>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {responseValue ? `${responseValue}/${item.rating_scale || 5}` : t('inspections.selectRating')}
              </p>
            </div>
          )}
          
          {/* Numeric Input */}
          {item.response_type === 'numeric' && (
            <div className="space-y-2">
              <Input
                type="number"
                value={responseValue}
                onChange={(e) => {
                  if (isLocked) return;
                  const val = e.target.value;
                  setResponseValue(val);
                  const numVal = parseFloat(val);
                  if (!isNaN(numVal)) {
                    const min = item.min_value ?? -Infinity;
                    const max = item.max_value ?? Infinity;
                    setResult(numVal >= min && numVal <= max ? 'pass' : 'fail');
                  }
                }}
                placeholder={t('inspections.enterValue')}
                min={item.min_value ?? undefined}
                max={item.max_value ?? undefined}
                disabled={isLocked}
              />
              {(item.min_value !== null || item.max_value !== null) && (
                <p className="text-xs text-muted-foreground">
                  {item.min_value !== null && item.max_value !== null
                    ? t('inspections.rangeHint', { min: item.min_value, max: item.max_value })
                    : item.min_value !== null
                      ? t('inspections.minHint', { min: item.min_value })
                      : t('inspections.maxHint', { max: item.max_value })
                  }
                </p>
              )}
            </div>
          )}
          
          {/* Text Input */}
          {item.response_type === 'text' && (
            <Textarea
              value={responseValue}
              onChange={(e) => {
                if (isLocked) return;
                setResponseValue(e.target.value);
                setResult(e.target.value.trim() ? 'pass' : null);
              }}
              placeholder={t('inspections.enterResponse')}
              disabled={isLocked}
              rows={3}
            />
          )}
        </div>
        
        {/* GPS & Notes Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          {/* GPS Button */}
          {requiresGps && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCaptureGps}
              disabled={isLocked || isCapturingGps}
            >
              {isCapturingGps ? (
                <Loader2 className="h-4 w-4 me-1 animate-spin" />
              ) : (
                <MapPin className={cn('h-4 w-4 me-1', gpsCoords && 'text-green-600')} />
              )}
              {gpsCoords 
                ? t('inspections.gpsRecorded')
                : t('inspections.captureGPS')
              }
            </Button>
          )}
          
          {/* Photo Button */}
          {requiresPhotos && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowPhotos(!showPhotos)}
            >
              <ImageIcon className={cn('h-4 w-4 me-1', photoCount > 0 && 'text-green-600')} />
              {t('inspections.photos.label')}
              {photoCount > 0 && (
                <Badge variant="secondary" className="ms-1 text-xs">{photoCount}</Badge>
              )}
            </Button>
          )}
          
          {/* Notes Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotes(!showNotes)}
          >
            {showNotes ? (
              <ChevronUp className="h-4 w-4 me-1" />
            ) : (
              <ChevronDown className="h-4 w-4 me-1" />
            )}
            {t('inspections.itemNotes')}
            {notes && <Badge variant="secondary" className="ms-1 text-xs">1</Badge>}
          </Button>
        </div>
        
        {/* Notes Section */}
        {showNotes && (
          <div className="space-y-2">
            <Label>{t('inspections.itemNotes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('inspections.notesPlaceholder')}
              disabled={isLocked}
              rows={2}
            />
          </div>
        )}
        
        {/* Photos Section */}
        {showPhotos && requiresPhotos && (
          <div className="space-y-2 pt-2 border-t">
            <Label>{t('inspections.photos.label')}</Label>
            <InspectionPhotoUpload
              responseId={response?.id || null}
              sessionId={sessionId}
              tenantId={tenantId}
              templateItemId={item.id}
              isLocked={isLocked}
              maxPhotos={5}
              onPhotoCountChange={setPhotoCount}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
