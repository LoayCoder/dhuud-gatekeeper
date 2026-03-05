import { Step3IncidentDetails } from './Step3IncidentDetails';
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
export function Step3Details({ viewProps }: { viewProps: ReturnType<typeof useIncidentReport> }) {
  const { t, direction, form, isObservation, closedOnSpot, setClosedOnSpot, closedOnSpotPhotos, setClosedOnSpotPhotos, eventType, hasInjury, contractorCompanies, isAgainstContractor, isConfirmSubmitting, handleObservationSubmit, hasSubmitted, onSubmit } = viewProps;
  const { currentStep, i18n, hasDamage, uploadedPhotos, navigate, goToPreviousStep, goToNextStep, setShowConfirmation, createIncident, isUploading } = viewProps as any;
  return (<>
    {currentStep === 3 && (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Observation: Risk Rating (instead of Severity) */}
        {isObservation ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('incidents.riskRatingTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="risk_rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('incidents.riskRatingLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} dir={direction}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RISK_RATING_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${level.color}`} />
                              {t(level.labelKey)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t('incidents.riskRatingDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ClosedOnSpotSection
                enabled={closedOnSpot}
                onEnabledChange={setClosedOnSpot}
                photos={closedOnSpotPhotos}
                onPhotosChange={setClosedOnSpotPhotos}
                direction={direction}
              />
            </CardContent>
          </Card>
        ) : (
          <Step3IncidentDetails viewProps={viewProps} />
        )}
        {/* Report Against Contractor - For BOTH Incidents AND Observations */}
        <div className="space-y-4 p-4 bg-warning/5 border border-warning/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-warning" />
              <div>
                <span className="font-medium">{t('incidents.reportAgainstContractor')}</span>
                <p className="text-sm text-muted-foreground">
                  {isObservation
                    ? t('incidents.contractorObservationNote', 'This observation will be routed to the Contractor Consultant for screening')
                    : t('incidents.contractorViolationNote')}
                </p>
              </div>
            </div>
            <Switch
              checked={isAgainstContractor}
              onCheckedChange={(checked) => {
                form.setValue('is_against_contractor', checked);
                if (!checked) {
                  form.setValue('related_contractor_company_id', undefined);
                }
              }}
            />
          </div>

          {isAgainstContractor && (
            <FormField
              control={form.control}
              name="related_contractor_company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('incidents.contractorCompany')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} dir={direction}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('incidents.selectContractorCompany')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contractorCompanies.filter(c => c.status === 'active').map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {i18n.language === 'ar' && company.company_name_ar
                            ? company.company_name_ar
                            : company.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Injury Details - Only for Incidents */}
        {!isObservation && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                {t('incidents.injuryDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="has_injury"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t('incidents.hasInjury')}</FormLabel>
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

              {hasInjury && (
                <div className="space-y-4 ps-4 border-s-2 border-yellow-500">
                  <FormField
                    control={form.control}
                    name="injury_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.injuryCount')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="injury_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.injuryDescription')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Damage Details - Only for Incidents */}
        {!isObservation && (
          <Card>
            <CardHeader>
              <CardTitle>{t('incidents.damageDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="has_damage"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t('incidents.hasDamage')}</FormLabel>
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

              {hasDamage && (
                <div className="space-y-4 ps-4 border-s-2 border-orange-500">
                  <FormField
                    control={form.control}
                    name="damage_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.damageDescription')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="damage_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.estimatedCost')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notification Preview - Show for incidents with severity */}
        {!isObservation && form.watch('severity') && (
          <NotificationPreview
            severityLevel={form.watch('severity')}
            hasInjury={hasInjury}
            erpActivated={form.watch('erp_activated') || false}
            siteId={form.watch('site_id')}
            className="mt-4"
          />
        )}
      </div>
    )}

    {/* Photo Required Warning */}
    {uploadedPhotos.length === 0 && (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
        <Camera className="h-4 w-4 shrink-0" />
        {t('incidents.validation.photoRequired')}
      </div>
    )}

    {/* Navigation Buttons */}
    <div className="flex justify-between gap-4 pt-4 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={currentStep === 1 ? () => navigate('/incidents') : goToPreviousStep}
        className="gap-2"
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        {currentStep === 1 ? t('common.cancel') : t('incidents.wizard.previous')}
      </Button>

      {currentStep < 3 ? (
        <Button
          type="button"
          onClick={goToNextStep}
          className="gap-2"
        >
          {t('incidents.wizard.next')}
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </Button>
      ) : (
        !hasSubmitted ? (
          <Button
            type="button"
            onClick={() => setShowConfirmation(true)}
            disabled={createIncident.isPending || isUploading || uploadedPhotos.length === 0}
            className="min-w-[150px]"
          >
            {(createIncident.isPending || isUploading) ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t('common.submitting')}
              </>
            ) : (
              t('incidents.submitIncident')
            )}
          </Button>
        ) : (
          <Button disabled className="min-w-[150px]">
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            {t('common.submitting')}
          </Button>
        )
      )}
    </div>
  </>
  );
}

