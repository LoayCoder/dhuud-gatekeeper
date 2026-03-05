import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { StepIndicator } from './StepIndicator';
import { EventTypeSelector } from './EventTypeSelector';
import { Step1Capture } from './Step1Capture';
import { Step2Location } from './Step2Location';
import { Step3Details } from './Step3Details';
import { QuickObservationCard } from '@/features/incidents';
import { ClosedOnSpotConfirmDialog } from '@/features/incidents';
import { SubmissionSuccessDialog } from '@/features/incidents';

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

export function IncidentReportForm({ viewProps }: { viewProps: ReturnType<typeof useIncidentReport> }) {
  const { t, i18n, direction, reportMode, setReportMode, currentStep, setCurrentStep, isGettingLocation, coordinates, selectedAsset, setSelectedAsset, availableIncidentTags, selectedTags, setSelectedTags, isApplyingAISuggestions, pendingAISubtype, autoDetectedBranch, autoDetectedSite, gpsDetectedSite, gpsDetectedBranch, noSiteNearby, gpsLocationConfirmed, gpsAccuracy, locationAddress, uploadedPhotos, setUploadedPhotos, uploadedVideo, setUploadedVideo, isUploading, activeEventId, setActiveEventId, showConfirmation, setShowConfirmation, closedOnSpot, setClosedOnSpot, closedOnSpotPhotos, setClosedOnSpotPhotos, showClosedOnSpotConfirm, setShowClosedOnSpotConfirm, pendingSubmitData, isConfirmSubmitting, hasSubmitted, submittedIncident, form, hasInjury, hasDamage, eventType, incidentType, isAgainstContractor, selectedBranchId, selectedSiteId, isAutoTriggerEnabled, setAutoTriggerEnabled, isPendingAutoTrigger, aiValidator, isObservation, filteredSites, filteredDepartments, departmentsLoading, departmentsUsingFallback, dynamicSubtypes, subtypeOptions, getReferencePreview, goToNextStep, goToPreviousStep, goToStep, handleGetLocation, handleGpsConfirm, handleGpsChangeLocation, handleAnalyzeDescription, handleConfirmTranslation, handleConfirmAnalysis, handleObservationSubmit, handleClosedOnSpotConfirm, contractorCompanies, branches, sites, branchesLoading, sitesLoading, dynamicCategories, isFetchingAddress, handleAssetSelect, onSubmit, navigate, profile } = viewProps;

  // Step Indicator Component
  if (reportMode === null) {
    return <EventTypeSelector setReportMode={setReportMode} t={t} direction={direction} />;
  }

  // If observation mode selected, show the quick card
  if (reportMode === 'observation') {
    return <QuickObservationCard onCancel={() => setReportMode(null)} />;
  }

  // Otherwise show the full incident wizard
  return (
    <div className="container max-w-4xl py-6 space-y-6" dir={direction}>
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setReportMode(null)}>
            <ChevronLeft className="h-4 w-4 me-1 rtl:rotate-180" />
            {t('common.back')}
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('incidents.reportIncident')}
        </h1>
        <p className="text-muted-foreground">{t('incidents.reportDescription')}</p>
      </div>

      <StepIndicator currentStep={currentStep} goToStep={goToStep} t={t} />

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">

          <Step1Capture viewProps={viewProps} />
          <Step2Location viewProps={viewProps} />
          <Step3Details viewProps={viewProps} />
        </form>
      </Form>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={(open) => {
        // Only allow closing if not currently submitting
        if (!isConfirmSubmitting) setShowConfirmation(open);
      }}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('incidents.confirmSubmission')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('incidents.confirmSubmissionDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConfirmSubmitting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                if (hasSubmitted || isConfirmSubmitting || createIncident.isPending) return;
                setIsConfirmSubmitting(true);
                setShowConfirmation(false); // Close dialog immediately to prevent re-click

                // Validate first
                const isValid = await form.trigger();
                if (!isValid) {
                  // Validation failed - show errors and allow retry
                  const errors = form.formState.errors;
                  const firstError = Object.values(errors)[0];
                  toast.error(
                    t('incidents.validation.formIncomplete', 'Please complete all required fields'),
                    { description: firstError?.message as string || t('incidents.validation.checkFields', 'Check the form for errors') }
                  );
                  setIsConfirmSubmitting(false); // Only reset on validation failure
                  return;
                }

                // Validation passed - submit (don't reset isConfirmSubmitting - onError will handle)
                await onSubmit(form.getValues());
              }}
              disabled={hasSubmitted || isConfirmSubmitting || createIncident.isPending}
            >
              {(hasSubmitted || isConfirmSubmitting) ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t('common.submitting')}
                </>
              ) : (
                t('incidents.confirmAndSubmit')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Closed on the Spot Confirmation Dialog (Observation Only) */}
      <ClosedOnSpotConfirmDialog
        open={showClosedOnSpotConfirm}
        onOpenChange={setShowClosedOnSpotConfirm}
        onConfirm={handleClosedOnSpotConfirm}
        direction={direction}
      />

      {/* Submission Success Dialog */}
      <SubmissionSuccessDialog
        open={!!submittedIncident}
        referenceId={submittedIncident?.referenceId || ''}
        incidentId={submittedIncident?.id || ''}
        onViewIncident={() => submittedIncident && navigate(`/incidents/${submittedIncident.id}`)}
      />
    </div>
  );

}

