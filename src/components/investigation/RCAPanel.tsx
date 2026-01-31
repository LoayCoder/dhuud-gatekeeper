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
import { Save, Loader2, Wand2, Check, Pencil, Lock, Sparkles, Unlock } from "lucide-react";
import { FiveWhysBuilder } from "./FiveWhysBuilder";
import { RootCausesBuilder } from "./RootCausesBuilder";
import type { RootCauseEntry } from "@/hooks/use-investigation";
import { ContributingFactorsBuilder, type ContributingFactorEntry } from "./ContributingFactorsBuilder";
import { AISummaryPanel } from "./AISummaryPanel";
import { useInvestigation, useCreateInvestigation, useUpdateInvestigation, useLockRCA, type FiveWhyEntry } from "@/hooks/use-investigation";
import { useRCAAI } from "@/hooks/use-rca-ai";
import { useWitnessStatements } from "@/hooks/use-witness-statements";
import { useEvidenceItems } from "@/hooks/use-evidence-items";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/use-user-roles";
import { toast } from "sonner";
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
    category: z.string().optional(),
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
  incidentSeverity?: string;
  incidentEventType?: string;
  incidentEventSubtype?: string;
  canEdit?: boolean;
}

// Debounce delay for auto-save (2 seconds)
const AUTO_SAVE_DELAY = 2000;

export function RCAPanel({ 
  incidentId, 
  incidentTitle, 
  incidentDescription, 
  incidentStatus, 
  incidentSeverity,
  incidentEventType,
  incidentEventSubtype,
  canEdit: canEditProp 
}: RCAPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { user } = useAuth();
  const { hasRole } = useUserRoles();

  const isHSSEManager = hasRole('hsse_manager');
  const isLeadInvestigator = hasRole('lead_investigator') || hasRole('hsse_expert');

  // Use hook directly
  const { data: investigation, isLoading: isInvestigationLoading } = useInvestigation(incidentId);
  const createInvestigation = useCreateInvestigation();
  const updateInvestigation = useUpdateInvestigation();
  const lockRCA = useLockRCA();

  // Pass incidentId to enable automatic context enrichment
  const { rewriteText, generateImmediateCause, generateUnderlyingCause, isLoading: isAILoading } = useRCAAI({ incidentId });
  
  const { statements: witnessStatements } = useWitnessStatements(incidentId);
  const { data: evidenceItems } = useEvidenceItems(incidentId);
  
  const witnessData = witnessStatements?.map(w => ({
    name: w.name || 'Unknown',
    statement: w.statement || '',
  })) || [];
  
  const evidenceDescriptions = evidenceItems
    ?.filter(e => e.description)
    .map(e => `${e.evidence_type}: ${e.description}`) || [];

  const [rewritingField, setRewritingField] = useState<string | null>(null);
  const [generatingField, setGeneratingField] = useState<'immediate' | 'underlying' | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');

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

  // Effect to populate form when investigation data loads
  useEffect(() => {
    if (investigation) {
      const formData = {
        five_whys: investigation.five_whys || [],
        root_causes: investigation.root_causes || [],
        contributing_factors_list: investigation.contributing_factors_list || [],
        immediate_cause: investigation.immediate_cause || '',
        underlying_cause: investigation.underlying_cause || '',
        root_cause: investigation.root_cause || '',
        contributing_factors: investigation.contributing_factors || '',
        findings_summary: investigation.findings_summary || '',
        ai_summary: investigation.ai_summary || '',
        ai_summary_generated_at: investigation.ai_summary_generated_at,
        ai_summary_language: investigation.ai_summary_language || 'en',
      };

      // Only reset if data changed significantly to avoid cursor jumps, or if first load
      const currentValues = form.getValues();
      if (JSON.stringify(formData) !== JSON.stringify(currentValues) && !autoSaveTimeoutRef.current) {
         form.reset(formData);
         lastSavedDataRef.current = JSON.stringify(formData);
      }
    }
  }, [investigation, form]);

  const isLocked = investigation?.is_rca_locked || false;
  const isClosed = incidentStatus === 'closed';
  const isReadOnly = isLocked || isClosed || canEditProp === false;

  // Auto-save handler
  const performAutoSave = useCallback(async (data: RCAFormValues) => {
    if (!investigation?.id && !incidentId) return;
    
    const currentDataStr = JSON.stringify(data);
    if (currentDataStr === lastSavedDataRef.current) return;

    setAutoSaveStatus('saving');
    
    try {
      // Use the unified update hook which handles both tables
      if (investigation?.id) {
        const updates: any = {
          immediate_cause: data.immediate_cause,
          underlying_cause: data.underlying_cause,
          contributing_factors: data.contributing_factors,
          findings_summary: data.findings_summary,
          five_whys: data.five_whys,
          root_causes: data.root_causes,
          contributing_factors_list: data.contributing_factors_list,
          ai_summary: data.ai_summary,
          ai_summary_generated_at: data.ai_summary ? new Date().toISOString() : null,
          ai_summary_language: data.ai_summary_language,
        };

        await updateInvestigation.mutateAsync({
          id: investigation.id,
          incidentId,
          updates: updates,
        });
      }
      
      lastSavedDataRef.current = currentDataStr;
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('idle');
    }
  }, [investigation?.id, incidentId, updateInvestigation]);

  // Watch form values for auto-save
  const formValues = form.watch();
  
  useEffect(() => {
    if (isReadOnly) return;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Skip auto-save on initial load
    if (lastSavedDataRef.current === '') {
       // do nothing
    } else {
      autoSaveTimeoutRef.current = setTimeout(() => {
        performAutoSave(formValues);
      }, AUTO_SAVE_DELAY);
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formValues, performAutoSave, isReadOnly]);

  const onSubmit = async (data: RCAFormValues) => {
    if (!investigation) {
      await createInvestigation.mutateAsync(incidentId);
    }
    await performAutoSave(data);
  };

  const handleLockAnalysis = async () => {
    try {
      await lockRCA.mutateAsync({ incidentId });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleUnlockAnalysis = async () => {
    try {
      const { error } = await (supabase.rpc as any)('unlock_rca', { p_incident_id: incidentId });
      if (error) throw error;

      // Invalidate to refresh UI
      updateInvestigation.reset(); // trigger re-fetch indirectly via query invalidation in hook
      toast.success(t('investigation.rca.unlockedSuccess', 'RCA Analysis has been unlocked.'));
      // We need to trigger a refetch of investigation
      // In a real app, we'd use queryClient from useQueryClient
      window.location.reload(); // Simple brute force for now to ensure state sync if invalidateQueries is tricky here
    } catch (error: any) {
      console.error('Error unlocking RCA:', error);
      toast.error(error.message || t('common.error', 'Failed to unlock RCA'));
    }
  };

  // AI Helpers (unchanged)
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

  const handleSuggestImmediateCause = async () => {
    setGeneratingField('immediate');
    const rcaPayload = {
      incident_title: incidentTitle,
      incident_description: incidentDescription,
      severity: incidentSeverity,
      event_type: incidentEventType,
      event_subtype: incidentEventSubtype,
      five_whys: fiveWhysValue.map(w => ({ question: w.why, answer: w.answer })),
      witness_statements: witnessData,
      evidence_descriptions: evidenceDescriptions,
    };
    const result = await generateImmediateCause(rcaPayload);
    if (result) form.setValue('immediate_cause', result);
    setGeneratingField(null);
  };

  const handleSuggestUnderlyingCause = async () => {
    setGeneratingField('underlying');
    const rcaPayload = {
      incident_title: incidentTitle,
      incident_description: incidentDescription,
      severity: incidentSeverity,
      event_type: incidentEventType,
      event_subtype: incidentEventSubtype,
      five_whys: fiveWhysValue.map(w => ({ question: w.why, answer: w.answer })),
      immediate_cause: immediateCauseValue,
      witness_statements: witnessData,
      evidence_descriptions: evidenceDescriptions,
    };
    const result = await generateUnderlyingCause(rcaPayload);
    if (result) form.setValue('underlying_cause', result);
    setGeneratingField(null);
  };

  const fiveWhysValue = form.watch('five_whys');
  const immediateCauseValue = form.watch('immediate_cause');
  const underlyingCauseValue = form.watch('underlying_cause');
  const rootCausesValue = form.watch('root_causes');
  const contributingFactorsListValue = form.watch('contributing_factors_list');

  if (isInvestigationLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Initial Start State
  if (!investigation) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            {t('investigation.rca.noInvestigation', 'No investigation has been started for this incident.')}
          </p>
          <Button onClick={() => createInvestigation.mutateAsync(incidentId)} disabled={createInvestigation.isPending}>
            {createInvestigation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {t('investigation.startInvestigation', 'Start Investigation')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 overflow-hidden" dir={direction}>
        {/* Locked Status Banner */}
        {isLocked && (
          <Alert className="border-warning/50 bg-warning/5">
            <Lock className="h-4 w-4 text-warning" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
              <div className="space-y-1">
                <span className="font-medium">
                  {isClosed
                    ? t('investigation.rca.lockedClosed', 'Incident closed. Analysis is read-only.')
                    : t('investigation.rca.lockedStatus', 'RCA is locked. Inputs are disabled.')}
                </span>
                {/* Show who locked and when */}
                {investigation.rca_locked_at && !isClosed && (
                  <p className="text-xs text-muted-foreground">
                    {t('investigation.rca.lockedBy', 'Locked on {{date}}', {
                      date: new Date(investigation.rca_locked_at).toLocaleString()
                    })}
                  </p>
                )}
              </div>
              {/* Unlock Button for HSSE Manager */}
              {!isClosed && isHSSEManager && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleUnlockAnalysis}
                  className="bg-warning text-warning-foreground hover:bg-warning/90 shrink-0"
                >
                  <Unlock className="h-4 w-4 me-2" />
                  {t('investigation.rca.unlock', 'Unlock RCA')}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Five Whys */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              {t('investigation.rca.fiveWhys', '5 Whys Analysis')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="five_whys"
              render={({ field }) => (
                <FiveWhysBuilder
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isReadOnly}
                  incidentTitle={incidentTitle}
                  incidentDescription={incidentDescription}
                  witnessStatements={witnessData}
                  evidenceDescriptions={evidenceDescriptions}
                  severity={incidentSeverity}
                  eventType={incidentEventType}
                  eventSubtype={incidentEventSubtype}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Immediate Cause */}
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
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <FormLabel className="text-muted-foreground text-sm">
                      {t('investigation.rca.immediateCauseDesc', 'What directly caused the incident?')}
                    </FormLabel>
                    {!isReadOnly && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={handleSuggestImmediateCause}
                          disabled={isAILoading || fiveWhysValue.length === 0}
                        >
                          {generatingField === 'immediate' ? <Loader2 className="h-3 w-3 me-1 animate-spin" /> : <Sparkles className="h-3 w-3 me-1" />}
                          {t('investigation.rca.ai.suggest', 'AI Suggest')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleRewriteField('immediate_cause')}
                          disabled={isAILoading || !field.value?.trim()}
                        >
                          {rewritingField === 'immediate_cause' ? <Loader2 className="h-3 w-3 me-1 animate-spin" /> : <Wand2 className="h-3 w-3 me-1" />}
                          {t('investigation.rca.ai.rewrite', 'AI Rewrite')}
                        </Button>
                      </div>
                    )}
                  </div>
                  <FormControl>
                    <Textarea
                      {...field}
                      disabled={isReadOnly}
                      placeholder={t('investigation.rca.immediateCausePlaceholder', 'Describe the immediate cause...')}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Underlying Cause */}
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
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <FormLabel className="text-muted-foreground text-sm">
                      {t('investigation.rca.underlyingCauseDesc', 'What conditions enabled this?')}
                    </FormLabel>
                    {!isReadOnly && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={handleSuggestUnderlyingCause}
                          disabled={isAILoading || !immediateCauseValue?.trim()}
                        >
                          {generatingField === 'underlying' ? <Loader2 className="h-3 w-3 me-1 animate-spin" /> : <Sparkles className="h-3 w-3 me-1" />}
                          {t('investigation.rca.ai.suggest', 'AI Suggest')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleRewriteField('underlying_cause')}
                          disabled={isAILoading || !field.value?.trim()}
                        >
                          {rewritingField === 'underlying_cause' ? <Loader2 className="h-3 w-3 me-1 animate-spin" /> : <Wand2 className="h-3 w-3 me-1" />}
                          {t('investigation.rca.ai.rewrite', 'AI Rewrite')}
                        </Button>
                      </div>
                    )}
                  </div>
                  <FormControl>
                    <Textarea
                      {...field}
                      disabled={isReadOnly}
                      placeholder={t('investigation.rca.underlyingCausePlaceholder', 'Describe underlying conditions...')}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Root Causes */}
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
                  disabled={isReadOnly}
                  fiveWhys={fiveWhysValue}
                  immediateCause={immediateCauseValue}
                  underlyingCause={underlyingCauseValue}
                  incidentTitle={incidentTitle}
                  incidentDescription={incidentDescription}
                  severity={incidentSeverity}
                  eventType={incidentEventType}
                  eventSubtype={incidentEventSubtype}
                  witnessStatements={witnessData}
                  evidenceDescriptions={evidenceDescriptions}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Contributing Factors */}
        <FormField
          control={form.control}
          name="contributing_factors_list"
          render={({ field }) => (
            <ContributingFactorsBuilder
              value={field.value}
              onChange={field.onChange}
              disabled={isReadOnly}
              incidentTitle={incidentTitle}
              incidentDescription={incidentDescription}
              immediateCause={immediateCauseValue}
              underlyingCause={underlyingCauseValue}
              rootCauses={rootCausesValue}
              fiveWhys={fiveWhysValue}
              severity={incidentSeverity}
              eventType={incidentEventType}
              eventSubtype={incidentEventSubtype}
              witnessStatements={witnessData}
              evidenceDescriptions={evidenceDescriptions}
            />
          )}
        />

        {/* AI Summary */}
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
                disabled={isReadOnly}
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

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky bottom-0 bg-background py-4 border-t z-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {!isLocked && (
              <>
                {autoSaveStatus === 'saving' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('investigation.rca.autoSaving', 'Auto-saving...')}</span>
                  </>
                )}
                {autoSaveStatus === 'saved' && (
                  <>
                    <Check className="h-4 w-4 text-success" />
                    <span>{t('investigation.rca.autoSaved', 'Auto-saved')}</span>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Lock Button (HSSE Manager or Lead Investigator) */}
            {!isLocked && (isHSSEManager || isLeadInvestigator) && !isClosed && (
              <Button type="button" variant="secondary" onClick={handleLockAnalysis} disabled={lockRCA.isPending}>
                {lockRCA.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Lock className="h-4 w-4 me-2" />}
                {t('investigation.rca.lockAnalysis', 'Lock Analysis')}
              </Button>
            )}

            {!isReadOnly && (
              <Button type="submit" disabled={updateInvestigation.isPending}>
                {updateInvestigation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
                {t('investigation.rca.saveAnalysis', 'Save Analysis')}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
