import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Camera, ImagePlus, X, AlertTriangle, Loader2, WifiOff, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function QuickObservationCardFormFooter({ state, form }: any) {
  const { t } = useTranslation();
  const { allowCloseOnSpot, closedOnSpot, closedOnSpotPhotos, removePhoto, handlePhotoCapture, photos, createIncident, isUploading, isOnline, aiValidator } = state;
  return (
    <>      {/* Closed on Spot Toggle - Only for L1-L2 */}
              {allowCloseOnSpot && (
                <FormField
                  control={form.control}
                  name="closed_on_spot"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 border rounded-lg border-emerald-500/30 bg-emerald-500/5">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                          <CheckCircle2 className={cn(
                            "h-4 w-4",
                            field.value ? "text-emerald-500" : "text-muted-foreground"
                          )} />
                          {t('quickObservation.closedOnSpot')}
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          {t('quickObservation.closedOnSpotDescription')}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
              
              {/* Closed on Spot Photos - Only visible when close-on-spot is enabled AND allowed */}
              {allowCloseOnSpot && closedOnSpot && (
                <div className="space-y-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <label className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {t('quickObservation.addCorrectiveActionPhoto')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {closedOnSpotPhotos.map((photo, index) => (
                      <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index, true)}
                          className="absolute top-0.5 end-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {closedOnSpotPhotos.length < 3 && (
                      <>
                        {/* Camera Capture Button */}
                        <label className="w-16 h-16 border-2 border-dashed border-emerald-500/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors">
                          <Camera className="h-5 w-5 text-emerald-600" />
                          <span className="text-[10px] text-emerald-600 mt-0.5">{t('quickObservation.camera')}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handlePhotoCapture(e, true)}
                          />
                        </label>
                        
                        {/* Gallery Upload Button */}
                        <label className="w-16 h-16 border-2 border-dashed border-emerald-500/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors">
                          <ImagePlus className="h-5 w-5 text-emerald-600" />
                          <span className="text-[10px] text-emerald-600 mt-0.5">{t('quickObservation.gallery')}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
                            multiple
                            className="hidden"
                            onChange={(e) => handlePhotoCapture(e, true)}
                          />
                        </label>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Photo Required Warning */}
              {photos.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  <Camera className="h-4 w-4 shrink-0" />
                  {t('incidents.validation.photoRequired')}
                </div>
              )}
              
              {/* Location Warning Before Submit */}
              {!form.watch('latitude') && !form.watch('site_id') && (
                <Alert variant="default" className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
                    {t('quickObservation.submitWithoutLocationWarning', 
                      'You are about to submit without location. Consider retrying GPS or selecting a site manually.')}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Submit Button - Blocked until AI validation passes */}
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={
                  createIncident.isPending || 
                  isUploading || 
                  photos.length === 0 || 
                  (isOnline && (aiValidator.isBlocked || !aiValidator.canSubmit))
                }
              >
                {createIncident.isPending || isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin me-2" />
                    {t('quickObservation.submitting')}
                  </>
                ) : !isOnline ? (
                  <>
                    <WifiOff className="h-5 w-5 me-2" />
                    {t('offline.saveOffline', 'Save Offline')}
                  </>
                ) : aiValidator.isBlocked ? (
                  <>
                    <AlertTriangle className="h-5 w-5 me-2" />
                    {t('observations.ai.aiGatedSubmit', 'AI analysis required')}
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 me-2" />
                    {t('quickObservation.submitObservation')}
                  </>
                )}
              </Button>
            
    </>
  );
}
