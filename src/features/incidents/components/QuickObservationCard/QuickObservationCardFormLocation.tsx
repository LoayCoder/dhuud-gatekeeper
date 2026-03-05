import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { MapPin, Building2, AlertTriangle, Loader2, RefreshCw, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEVERITY_OPTIONS } from './types';

export function QuickObservationCardFormLocation({ state, form }: unknown) {
  const { t } = useTranslation();
  const { sites, isGettingLocation, gpsDetectedSite, gpsError, handleGetLocation, isCrossBranchReport, selectedSite } = state;
  return (
    <>      {/* Severity Level (5-Level System) */}
              <FormField
                control={form.control}
                name="severity_v2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('severity.ratingLabel')}</FormLabel>
                    <div className="grid grid-cols-1 gap-2">
                      {SEVERITY_OPTIONS.map((level) => (
                        <Button
                          key={level.value}
                          type="button"
                          variant={field.value === level.value ? 'default' : 'outline'}
                          className={cn(
                            "w-full text-start justify-start text-xs sm:text-sm transition-all",
                            field.value === level.value && level.color
                          )}
                          onClick={() => field.onChange(level.value)}
                        >
                          {t(`severity.${level.value}.label`)}
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              
      {/* GPS Location - Enhanced with warning state */}
              <div className={cn(
                "p-3 rounded-lg space-y-3 border",
                gpsDetectedSite || form.watch('site_id')
                  ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                  : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
              )}>
                <div className="flex items-center gap-3">
                  <MapPin className={cn(
                    "h-5 w-5 shrink-0",
                    gpsDetectedSite || form.watch('site_id') ? "text-green-500" : "text-amber-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    {isGettingLocation ? (
                      <p className="text-sm font-medium">{t('quickObservation.detectingLocation')}</p>
                    ) : gpsDetectedSite ? (
                      <>
                        <p className="text-sm font-medium truncate text-green-700 dark:text-green-400">{gpsDetectedSite.site.name}</p>
                        {gpsDetectedSite.site.branch_name && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                            <span className="text-xs text-green-600 dark:text-green-400">{t('quickObservation.detectedBranch', { branch: gpsDetectedSite.site.branch_name })}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                            {t('incidents.withinMeters', { distance: Math.round(gpsDetectedSite.distanceMeters) })}
                          </Badge>
                          {form.watch('latitude') && form.watch('longitude') && (
                            <span className="text-xs text-muted-foreground">
                              {t('quickObservation.gpsCoordinates', { lat: Number(form.watch('latitude')).toFixed(4), lng: Number(form.watch('longitude')).toFixed(4) })}
                            </span>
                          )}
                        </div>
                      </>
                    ) : form.watch('site_id') ? (
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        {t('quickObservation.locationCaptured', 'Location selected')}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                          {gpsError === 'permission_denied' && t('incidents.gpsPermissionDenied')}
                          {gpsError === 'not_supported' && t('incidents.gpsNotSupported')}
                          {gpsError === 'unavailable' && t('incidents.gpsUnavailable')}
                          {gpsError === 'timeout' && t('incidents.gpsTimeout')}
                          {gpsError === 'no_nearby_site' && t('quickObservation.noSiteNearby')}
                          {gpsError === 'none' && t('quickObservation.locationNotDetected')}
                        </p>
                        <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                          {t('quickObservation.selectSiteManually', 'Please select a site manually below')}
                        </p>
                      </>
                    )}
                  </div>
                  
                  {/* Warning Badge when no location */}
                  {!gpsDetectedSite && !form.watch('site_id') && !isGettingLocation && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 gap-1 shrink-0">
                      <AlertTriangle className="h-3 w-3" />
                      {t('quickObservation.noLocationWarning', 'No Location')}
                    </Badge>
                  )}
                  
                  {isGettingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : gpsDetectedSite ? (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        form.setValue('site_id', '');
                      }}
                      className="shrink-0 text-xs text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50"
                    >
                      {t('quickObservation.changeSite', 'Change')}
                    </Button>
                  ) : !form.watch('site_id') && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGetLocation}
                      className="shrink-0 gap-1.5 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t('common.retry')}</span>
                    </Button>
                  )}
                </div>
                
                {/* Manual Site Selection Dropdown - Shows ALL tenant sites */}
                <FormField
                  control={form.control}
                  name="site_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        {t('quickObservation.manualSiteSelection')}
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={t('quickObservation.selectSitePlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {sites.map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.name}
                              {site.branch_name && (
                                <span className="text-muted-foreground ms-2">
                                  ({site.branch_name})
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Cross-Branch Reporting Notice */}
                {isCrossBranchReport && selectedSite?.branch_name && (
                  <Alert variant="default" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-xs">
                      {t('quickObservation.crossBranchNote', { 
                        branchName: selectedSite.branch_name 
                      })}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              
    </>
  );
}
