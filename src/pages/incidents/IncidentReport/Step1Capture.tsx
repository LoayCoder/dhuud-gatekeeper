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
export function Step1Capture({ viewProps }: { viewProps: ReturnType<typeof useIncidentReport> }) {
  const { t, direction, form, branches, sites, profile, activeEventId, setActiveEventId, uploadedPhotos, setUploadedPhotos, uploadedVideo, setUploadedVideo, isAutoTriggerEnabled, setAutoTriggerEnabled, isPendingAutoTrigger, handleAnalyzeDescription, aiValidator, handleConfirmTranslation, handleConfirmAnalysis, availableIncidentTags, selectedTags, setSelectedTags, eventType, incidentType, isApplyingAISuggestions, getReferencePreview, dynamicCategories, subtypeOptions } = viewProps;
  return (<>
    {currentStep === 1 && (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Active Event Banner */}
        <ActiveEventBanner onEventDetected={setActiveEventId} />

        {/* Reference Number Preview */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t('incidents.referenceNumber')}</p>
                <p className="text-lg font-mono text-muted-foreground">{getReferencePreview()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Capture - Media Upload */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                {t('incidents.quickCapture.title')}
              </CardTitle>
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                {t('incidents.quickCapture.aiComingSoon')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('incidents.quickCapture.description')}
            </p>
          </CardHeader>
          <CardContent>
            <MediaUploadSection
              photos={uploadedPhotos}
              video={uploadedVideo}
              onPhotosChange={setUploadedPhotos}
              onVideoChange={setUploadedVideo}
              branchName={branches.find(b => b.id === form.watch('branch_id'))?.name}
              siteName={sites.find(s => s.id === form.watch('site_id'))?.name}
              contractorName={profile?.contractor_company_name ?? undefined}
            />
          </CardContent>
        </Card>

        {/* Basic Information - Title, Description, Event Type, Date/Time */}
        <Card>
          <CardHeader>
            <CardTitle>{t('incidents.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('incidents.title')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('incidents.titlePlaceholder')}
                      maxLength={120}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{field.value.length}/120</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description with automatic AI trigger */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('incidents.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('incidents.descriptionPlaceholder')}
                      className="min-h-[150px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground items-center">
                    <div className="flex items-center gap-3">
                      <span>{field.value.length} / 5000</span>
                      {/* Auto-trigger status indicator */}
                      {isAutoTriggerEnabled && isPendingAutoTrigger && (
                        <span className="flex items-center gap-1 text-xs text-primary animate-pulse">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {t('incidents.ai.autoAnalyzing', 'Auto-analyzing...')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Auto-trigger toggle */}
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={isAutoTriggerEnabled}
                          onChange={(e) => setAutoTriggerEnabled(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-muted-foreground/30"
                        />
                        <span className="text-muted-foreground">{t('incidents.ai.autoTrigger', 'Auto')}</span>
                      </label>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2 text-primary hover:text-primary/80 hover:bg-primary/10"
                        onClick={handleAnalyzeDescription}
                        disabled={aiValidator.isAnalyzing || field.value.length < 20}
                      >
                        <Sparkles className={cn("h-4 w-4", aiValidator.isAnalyzing && "animate-spin")} />
                        {aiValidator.isAnalyzing
                          ? t('incidents.aiAnalyze', 'Analyzing...')
                          : t('incidents.analyzeWithAI', 'Analyze with AI')}
                      </Button>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* AI Analysis Panel */}
            <AIIncidentAnalysisPanel
              validationState={aiValidator.validationState}
              analysisResult={aiValidator.analysisResult}
              processingTime={aiValidator.processingTime}
              onConfirmTranslation={handleConfirmTranslation}
              onConfirmAnalysis={handleConfirmAnalysis}
              availableTags={availableIncidentTags}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />

            {/* Tags Section - Always visible for manual tag management */}
            {availableIncidentTags.length > 0 && (
              <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('admin.ai.incidentTags', 'Incident Tags')}</span>
                </div>
                <AITagsSelector
                  availableTags={availableIncidentTags}
                  selectedTags={selectedTags}
                  suggestedTags={aiValidator.analysisResult?.suggestedTags}
                  onTagsChange={setSelectedTags}
                />
              </div>
            )}

            {/* HSSE Event Type (Top-Level Category) - event_type is auto-set to 'incident' */}
            {eventType === 'incident' && (
              <FormField
                control={form.control}
                name="incident_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('incidents.incidentCategory')}</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Only clear subtype if user is manually changing (not AI)
                        if (!isApplyingAISuggestions) {
                          form.setValue('subtype', '');
                        }
                      }}
                      value={field.value}
                      dir={direction}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Use dynamic categories if available, fallback to static */}
                        {(dynamicCategories.length > 0
                          ? dynamicCategories.map((cat) => (
                            <SelectItem key={cat.code} value={cat.code}>
                              {t(cat.name_key)}
                            </SelectItem>
                          ))
                          : HSSE_EVENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {t(type.labelKey)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Subtype - based on selected incident_type */}
            <FormField
              control={form.control}
              name="subtype"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('incidents.incidentSubCategory')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    dir={direction}
                    disabled={!incidentType}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subtypeOptions.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {t(type.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!incidentType && (
                    <FormDescription className="text-muted-foreground">
                      {t('incidents.selectHsseEventTypeFirst')}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date/Time */}
            <FormField
              control={form.control}
              name="occurred_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('incidents.occurredAt')}</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </div>
    )}
  </>
  );
}