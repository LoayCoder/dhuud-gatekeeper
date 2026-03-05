import React from 'react';
import { cn } from '@/lib/utils';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2, Sparkles, AlertTriangle, CheckCircle2, FileText, Info, Navigation, Camera, ChevronRight, ChevronLeft, Check, Trophy, Eye, Siren, Building2 } from 'lucide-react';
import { QuickObservationCard } from '@/features/incidents';
import { MediaUploadSection } from '@/features/incidents';
import { ClosedOnSpotSection, ClosedOnSpotConfirmDialog } from '@/features/incidents';
import { SubmissionSuccessDialog } from '@/features/incidents';
import { AssetSelectionSection } from '@/features/incidents';
import { AIIncidentAnalysisPanel } from '@/features/incidents';
import { AITagsSelector } from '@/components/ai/AITagsSelector';
import { GPSLocationConfirmCard } from '@/features/incidents';
import { ActiveEventBanner } from '@/features/incidents';
import { NotificationPreview } from '@/features/incidents';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HSSE_SEVERITY_LEVELS, calculateMinimumSeverity, isSeverityBelowMinimum } from '@/lib/hsse-severity-levels';
import { HSSE_EVENT_TYPES, getSubtypesForEventType } from '@/lib/hsse-event-types';
import { WIZARD_STEPS, RISK_RATING_LEVELS } from './helpers';
import { useIncidentReport } from './hooks/useIncidentReport';
export function Step2Location({ viewProps }: { viewProps: ReturnType<typeof useIncidentReport> }) {
  const { t, direction, form, coordinates, gpsDetectedSite, noSiteNearby, gpsAccuracy, handleGpsConfirm, handleGpsChangeLocation, gpsLocationConfirmed, locationAddress, isFetchingAddress, handleGetLocation, isGettingLocation, branchesLoading, branches, gpsDetectedBranch, autoDetectedBranch, sitesLoading, selectedBranchId, filteredSites, autoDetectedSite, departmentsLoading, selectedSiteId, filteredDepartments, departmentsUsingFallback, selectedAsset, handleAssetSelect, currentStep, setAutoDetectedBranch, setGpsDetectedBranch, setGpsDetectedSite, setGpsLocationConfirmed, setAutoDetectedSite } = viewProps as any;
  return (<>
    {currentStep === 2 && (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* GPS Location Confirmation Card */}
        {coordinates && (gpsDetectedSite || noSiteNearby) && (
          <GPSLocationConfirmCard
            userCoordinates={coordinates}
            gpsAccuracy={gpsAccuracy}
            nearestSiteResult={gpsDetectedSite}
            noSiteNearby={noSiteNearby}
            onConfirm={handleGpsConfirm}
            onChangeLocation={handleGpsChangeLocation}
            isConfirmed={gpsLocationConfirmed}
            locationAddress={locationAddress}
            isFetchingAddress={isFetchingAddress}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('incidents.wizard.stepLocation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Branch (FIRST) */}
            <FormField
              control={form.control}
              name="branch_id"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t('incidents.branch')}</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGetLocation}
                      disabled={isGettingLocation}
                      className="gap-2"
                    >
                      {isGettingLocation ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Navigation className="h-4 w-4" />
                      )}
                      {t('incidents.detectGPS')}
                    </Button>
                  </div>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Clear dependent fields when branch changes
                      form.setValue('site_id', '');
                      form.setValue('department_id', '');
                      setAutoDetectedBranch(false);
                      setGpsDetectedBranch(false);
                      setGpsDetectedSite(null);
                      setGpsLocationConfirmed(false);
                    }}
                    value={field.value}
                    dir={direction}
                    disabled={branchesLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={branchesLoading ? t('common.loading') : t('incidents.selectBranch')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {gpsDetectedBranch && field.value && (
                    <FormDescription className="flex items-center gap-1 text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      {t('incidents.gpsDetectedFromSite')}
                    </FormDescription>
                  )}
                  {autoDetectedBranch && !gpsDetectedBranch && field.value && (
                    <FormDescription className="flex items-center gap-1 text-info">
                      <Info className="h-3 w-3" />
                      {t('incidents.autoDetectedFromProfile')}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Site (filtered by selected branch) */}
            <FormField
              control={form.control}
              name="site_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('incidents.site')}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setAutoDetectedSite(false);
                      setGpsDetectedSite(null);
                      setGpsLocationConfirmed(false);
                    }}
                    value={field.value}
                    dir={direction}
                    disabled={sitesLoading || !selectedBranchId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          sitesLoading
                            ? t('common.loading')
                            : !selectedBranchId
                              ? t('incidents.selectBranchFirst')
                              : filteredSites.length === 0
                                ? t('incidents.noSitesForBranch')
                                : t('incidents.selectSite')
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredSites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {autoDetectedSite && !gpsDetectedSite && field.value && (
                    <FormDescription className="flex items-center gap-1 text-info">
                      <Info className="h-3 w-3" />
                      {t('incidents.autoDetectedFromProfile')}
                    </FormDescription>
                  )}

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Location Details */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('incidents.locationDetails')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('incidents.locationDetailsPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('incidents.locationDetailsDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Responsible Department (site-aware filtering with branch fallback) */}
            <FormField
              control={form.control}
              name="department_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('incidents.responsibleDepartment')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    dir={direction}
                    disabled={departmentsLoading || !selectedBranchId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          departmentsLoading
                            ? t('common.loading')
                            : !selectedBranchId
                              ? t('incidents.selectBranchFirst')
                              : !selectedSiteId
                                ? t('incidents.selectSiteFirst', 'Select a site first')
                                : filteredDepartments.length === 0
                                  ? t('incidents.noDepartmentsForSite', 'No departments for this site')
                                  : t('incidents.selectDepartment')
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                          {dept.division_name && ` (${dept.division_name})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Helper text indicating filtering mode */}
                  {selectedSiteId && !departmentsLoading && filteredDepartments.length > 0 && (
                    <FormDescription className="flex items-center gap-1 text-xs">
                      <Info className="h-3 w-3" />
                      {departmentsUsingFallback
                        ? t('incidents.showingBranchDepartments', 'Showing all branch departments')
                        : t('incidents.showingSiteDepartments', 'Showing departments assigned to this site')}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Asset Selection */}
        <AssetSelectionSection
          selectedAssetId={selectedAsset?.id || null}
          onAssetSelect={handleAssetSelect}
        />
      </div>
    )}
  </>
  );
}