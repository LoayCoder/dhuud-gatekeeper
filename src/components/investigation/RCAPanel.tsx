import { useEffect, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Save, Loader2, Wand2, Check, Pencil, Lock } from "lucide-react";
import { FiveWhysBuilder } from "./FiveWhysBuilder";
import { RootCausesBuilder, type RootCauseEntry } from "./RootCausesBuilder";
import { ContributingFactorsBuilder, type ContributingFactorEntry } from "./ContributingFactorsBuilder";
import { AISummaryPanel } from "./AISummaryPanel";
import { useInvestigation, useCreateInvestigation, useUpdateInvestigation, type FiveWhyEntry } from "@/hooks/use-investigation";
import { useRCAAI } from "@/hooks/use-rca-ai";
import type { Json } from "@/integrations/supabase/types";

const rcaSchema = z.object({
  immediate_cause: z.string().optional(),
  underlying_cause: z.string().optional(),
  root_cause: z.string().optional(),
  contributing_factors: z.string().optional(),
  findings_summary: z.string().optional(),
  five_whys: z.array(z.object({
    why: z.string(),
    answer: z.string(),
  })).default([]),
  root_causes: z.array(z.object({
    id: z.string(),
    text: z.string(),
    added_at: z.string().optional(),
    added_by: z.string().optional(),
  })).default([]),
  contributing_factors_list: z.array(z.object({
    id: z.string(),
    text: z.string(),
  })).default([]),
  ai_summary: z.string().optional(),
  ai_summary_generated_at: z.string().nullable().optional(),
  ai_summary_language: z.string().optional(),
});

type RCAFormValues = {
  immediate_cause?: string;
  underlying_cause?: string;
  root_cause?: string;
  contributing_factors?: string;
  findings_summary?: string;
  five_whys: FiveWhyEntry[];
  root_causes: RootCauseEntry[];
  contributing_factors_list: ContributingFactorEntry[];
  ai_summary?: string;
  ai_summary_generated_at?: string | null;
  ai_summary_language?: string;
};

interface RCAPanelProps {
  incidentId: string;
  incidentTitle?: string;
  incidentDescription?: string;
  incidentStatus?: string | null;
  canEdit?: boolean;
}

// Debounce delay for auto-save (2 seconds)
const AUTO_SAVE_DELAY = 2000;

export function RCAPanel({ incidentId, incidentTitle, incidentDescription, incidentStatus, canEdit: canEditProp }: RCAPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const { data: investigation, isLoading } = useInvestigation(incidentId);
  const createInvestigation = useCreateInvestigation();
  const updateInvestigation = useUpdateInvestigation();
  const { rewriteText, isLoading: isAILoading } = useRCAAI();
  const [rewritingField, setRewritingField] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isManuallyLocked, setIsManuallyLocked] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');

  // Read-only mode when incident is closed OR manually locked OR canEdit prop is explicitly false
  const isClosedLocked = incidentStatus === 'closed';
  const isLocked = isClosedLocked || isManuallyLocked || canEditProp === false;

  const form = useForm<RCAFormValues>({
    resolver: zodResolver(rcaSchema),
    defaultValues: {
      immediate_cause: '',
      underlying_cause: '',
      root_cause: '',
      contributing_factors: '',
      findings_summary: '',
      five_whys: [],
      root_causes: [],
      contributing_factors_list: [],
      ai_summary: '',
      ai_summary_generated_at: null,
      ai_summary_language: 'en',
    },
  });
  // Parse and set form data when investigation loads
  useEffect(() => {
    if (investigation) {
      // Use already-parsed data from the hook
      let parsedRootCauses: RootCauseEntry[] = investigation.root_causes || [];

      // Fallback: if root_causes is empty but root_cause text exists, migrate it
      if (parsedRootCauses.length === 0 && investigation.root_cause) {
        parsedRootCauses = [{
          id: crypto.randomUUID(),
          text: investigation.root_cause,
          added_at: investigation.created_at,
        }];
      }

      const parsedContributingFactors: ContributingFactorEntry[] = investigation.contributing_factors_list || [];

      const formData = {
        immediate_cause: investigation.immediate_cause || '',
        underlying_cause: investigation.underlying_cause || '',
        root_cause: investigation.root_cause || '',
        contributing_factors: investigation.contributing_factors || '',
        findings_summary: investigation.findings_summary || '',
        five_whys: investigation.five_whys || [],
        root_causes: parsedRootCauses,
        contributing_factors_list: parsedContributingFactors,
        ai_summary: investigation.ai_summary || '',
        ai_summary_generated_at: investigation.ai_summary_generated_at || null,
        ai_summary_language: investigation.ai_summary_language || 'en',
      };
      
      form.reset(formData);
      lastSavedDataRef.current = JSON.stringify(formData);
    }
  }, [investigation, form]);

  // Auto-save handler
  const performAutoSave = useCallback(async (data: RCAFormValues) => {
    if (!investigation?.id) return;
    
    const currentDataStr = JSON.stringify(data);
    if (currentDataStr === lastSavedDataRef.current) return;

    setAutoSaveStatus('saving');
    
    try {
      const updates: Record<string, unknown> = {
        immediate_cause: data.immediate_cause,
        underlying_cause: data.underlying_cause,
        contributing_factors: data.contributing_factors,
        findings_summary: data.findings_summary,
        five_whys: data.five_whys as unknown as Json,
        root_causes: data.root_causes as unknown as Json,
        contributing_factors_list: data.contributing_factors_list as unknown as Json,
        ai_summary: data.ai_summary,
        ai_summary_generated_at: data.ai_summary ? new Date().toISOString() : null,
        ai_summary_language: data.ai_summary_language,
      };

      if (data.root_causes.length > 0) {
        updates.root_cause = data.root_causes[0].text;
      }

      await updateInvestigation.mutateAsync({
        id: investigation.id,
        incidentId,
        updates: updates as Partial<typeof investigation>,
      });
      
      lastSavedDataRef.current = currentDataStr;
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('idle');
    }
  }, [investigation?.id, incidentId, updateInvestigation]);

  // Watch form values for auto-save (only when not locked)
  const formValues = form.watch();
  
  useEffect(() => {
    // Skip auto-save when locked
    if (!investigation?.id || isLocked) return;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave(formValues);
    }, AUTO_SAVE_DELAY);
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formValues, investigation?.id, performAutoSave, isLocked]);

  const onSubmit = async (data: RCAFormValues) => {
    if (!investigation) {
      await createInvestigation.mutateAsync(incidentId);
    }
    await performAutoSave(data);
    // Lock after saving (only if not permanently closed)
    if (!isClosedLocked) {
      setIsManuallyLocked(true);
    }
  };

  const handleUnlock = () => {
    // Cannot unlock if incident is closed
    if (isClosedLocked) return;
    setIsManuallyLocked(false);
  };
  const handleStartInvestigation = async () => {
    await createInvestigation.mutateAsync(incidentId);
  };

  const handleRewriteField = async (fieldName: 'immediate_cause' | 'underlying_cause') => {
    const currentValue = form.getValues(fieldName);
    if (!currentValue?.trim()) return;

    setRewritingField(fieldName);
    const context = fieldName === 'immediate_cause' 
      ? 'Immediate cause of an HSSE incident' 
      : 'Underlying cause of an HSSE incident';
    
    const result = await rewriteText(currentValue, context);
    
    if (result) {
      form.setValue(fieldName, result);
    }
    setRewritingField(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!investigation) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            {t('investigation.rca.noInvestigation', 'No investigation has been started for this incident.')}
          </p>
          <Button onClick={handleStartInvestigation} disabled={createInvestigation.isPending}>
            {createInvestigation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {t('investigation.startInvestigation', 'Start Investigation')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const fiveWhysValue = form.watch('five_whys');
  const immediateCauseValue = form.watch('immediate_cause');
  const underlyingCauseValue = form.watch('underlying_cause');
  const rootCausesValue = form.watch('root_causes');
  const contributingFactorsListValue = form.watch('contributing_factors_list');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" dir={direction}>
        {/* Locked Banner for Closed Incidents */}
        {isClosedLocked && (
          <Alert className="border-muted bg-muted/50">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              {t('investigation.rca.lockedClosed', 'This incident is closed. Root cause analysis cannot be modified.')}
            </AlertDescription>
          </Alert>
        )}

        {/* Read-Only Oversight Banner - For non-investigators */}
        {isLocked && !isClosedLocked && !isManuallyLocked && (
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
            <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              {t('investigation.readOnlyOversight', 'You are viewing this investigation in read-only mode. Only the assigned investigator can make changes.')}
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: 5-Whys Analysis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              {t('investigation.rca.fiveWhys', '5 Whys Analysis')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('investigation.rca.fiveWhysGuide', 'Start here. Ask "Why?" repeatedly to dig deeper into the root cause.')}
            </p>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="five_whys"
              render={({ field }) => (
              <FiveWhysBuilder
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isLocked}
                  incidentTitle={incidentTitle}
                  incidentDescription={incidentDescription}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Step 2: Immediate Cause */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
              {t('investigation.rca.immediateCause', 'Immediate Cause')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="immediate_cause"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-muted-foreground text-sm">
                      {t('investigation.rca.immediateCauseDesc', 'What directly caused the incident?')}
                    </FormLabel>
                    {!isLocked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleRewriteField('immediate_cause')}
                      disabled={isAILoading || !field.value?.trim()}
                    >
                      {rewritingField === 'immediate_cause' ? (
                        <Loader2 className="h-3 w-3 me-1 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3 me-1" />
                      )}
                      {t('investigation.rca.ai.rewrite', 'AI Rewrite')}
                    </Button>
                    )}
                  </div>
                  <FormControl>
                    <Textarea
                      {...field}
                      disabled={isLocked}
                      placeholder={t('investigation.rca.immediateCausePlaceholder', 'Describe the immediate cause that triggered the incident...')}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Step 3: Underlying Cause */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
              {t('investigation.rca.underlyingCause', 'Underlying Cause')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="underlying_cause"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-muted-foreground text-sm">
                      {t('investigation.rca.underlyingCauseDesc', 'What conditions or circumstances allowed this to happen?')}
                    </FormLabel>
                    {!isLocked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleRewriteField('underlying_cause')}
                      disabled={isAILoading || !field.value?.trim()}
                    >
                      {rewritingField === 'underlying_cause' ? (
                        <Loader2 className="h-3 w-3 me-1 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3 me-1" />
                      )}
                      {t('investigation.rca.ai.rewrite', 'AI Rewrite')}
                    </Button>
                    )}
                  </div>
                  <FormControl>
                    <Textarea
                      {...field}
                      disabled={isLocked}
                      placeholder={t('investigation.rca.underlyingCausePlaceholder', 'Describe the underlying conditions that enabled this incident...')}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Step 4: Root Causes (Multiple) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
              {t('investigation.rca.rootCauses', 'Root Causes')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="root_causes"
              render={({ field }) => (
              <RootCausesBuilder
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isLocked}
                  fiveWhys={fiveWhysValue}
                  immediateCause={immediateCauseValue}
                  underlyingCause={underlyingCauseValue}
                  incidentTitle={incidentTitle}
                  incidentDescription={incidentDescription}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Step 5: Contributing Factors - Now using multi-entry builder */}
        <FormField
          control={form.control}
          name="contributing_factors_list"
          render={({ field }) => (
            <ContributingFactorsBuilder
              value={field.value}
              onChange={field.onChange}
              disabled={isLocked}
              incidentTitle={incidentTitle}
              incidentDescription={incidentDescription}
              immediateCause={immediateCauseValue}
              underlyingCause={underlyingCauseValue}
              rootCauses={rootCausesValue}
            />
          )}
        />

        {/* Step 6: AI Summary */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">6</span>
            <span className="font-medium">{t('investigation.rca.summarySection', 'Summary of RCA')}</span>
          </div>
          <FormField
            control={form.control}
            name="ai_summary"
            render={({ field }) => (
              <AISummaryPanel
                value={field.value || ''}
                onChange={field.onChange}
                disabled={isLocked}
                fiveWhys={fiveWhysValue}
                immediateCause={immediateCauseValue}
                underlyingCause={underlyingCauseValue}
                rootCauses={rootCausesValue}
                contributingFactors={contributingFactorsListValue?.map(c => c.text).join(', ') || ''}
                incidentTitle={incidentTitle}
                incidentDescription={incidentDescription}
                generatedAt={form.watch('ai_summary_generated_at')}
                generatedLanguage={form.watch('ai_summary_language')}
              />
            )}
          />
        </div>

        {/* Save/Edit Button with Status */}
        <div className="flex items-center justify-between sticky bottom-0 bg-background py-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isLocked ? (
              <>
                <Lock className="h-4 w-4 text-amber-500" />
                <span>{t('investigation.rca.analysisLocked', 'Analysis is locked')}</span>
              </>
            ) : (
              <>
                {autoSaveStatus === 'saving' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('investigation.rca.autoSaving', 'Auto-saving...')}</span>
                  </>
                )}
                {autoSaveStatus === 'saved' && (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{t('investigation.rca.autoSaved', 'Auto-saved')}</span>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLocked ? (
              <Button type="button" variant="outline" size="lg" onClick={handleUnlock}>
                <Pencil className="h-4 w-4 me-2" />
                {t('investigation.rca.editAnalysis', 'Edit Analysis')}
              </Button>
            ) : (
              <Button type="submit" disabled={updateInvestigation.isPending} size="lg">
                {updateInvestigation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                <Save className="h-4 w-4 me-2" />
                {t('investigation.rca.saveAnalysis', 'Save RCA Analysis')}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
