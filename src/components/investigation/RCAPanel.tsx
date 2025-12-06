import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Save, Loader2, Wand2 } from "lucide-react";
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
  root_cause: z.string().optional(), // Legacy single root cause
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
}

export function RCAPanel({ incidentId, incidentTitle, incidentDescription }: RCAPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const { data: investigation, isLoading } = useInvestigation(incidentId);
  const createInvestigation = useCreateInvestigation();
  const updateInvestigation = useUpdateInvestigation();
  const { rewriteText, isLoading: isAILoading } = useRCAAI();
  const [rewritingField, setRewritingField] = useState<string | null>(null);

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

  useEffect(() => {
    if (investigation) {
      // Parse root_causes from investigation
      let parsedRootCauses: RootCauseEntry[] = [];
      const rawRootCauses = (investigation as unknown as Record<string, unknown>).root_causes;
      if (Array.isArray(rawRootCauses)) {
        parsedRootCauses = rawRootCauses.filter(
          (item): item is RootCauseEntry => 
            typeof item === 'object' && item !== null && 'id' in item && 'text' in item
        );
      }

      // If no root_causes array but has legacy root_cause string, convert it
      if (parsedRootCauses.length === 0 && investigation.root_cause) {
        parsedRootCauses = [{
          id: crypto.randomUUID(),
          text: investigation.root_cause,
          added_at: investigation.created_at,
        }];
      }

      // Parse contributing_factors_list if stored
      let parsedContributingFactors: ContributingFactorEntry[] = [];
      // For now, if there's a contributing_factors string, we'll keep it as text
      // The list is optional and will be empty initially

      form.reset({
        immediate_cause: investigation.immediate_cause || '',
        underlying_cause: investigation.underlying_cause || '',
        root_cause: investigation.root_cause || '',
        contributing_factors: investigation.contributing_factors || '',
        findings_summary: investigation.findings_summary || '',
        five_whys: investigation.five_whys || [],
        root_causes: parsedRootCauses,
        contributing_factors_list: parsedContributingFactors,
        ai_summary: (investigation as unknown as Record<string, unknown>).ai_summary as string || '',
        ai_summary_generated_at: (investigation as unknown as Record<string, unknown>).ai_summary_generated_at as string || null,
        ai_summary_language: (investigation as unknown as Record<string, unknown>).ai_summary_language as string || 'en',
      });
    }
  }, [investigation, form]);

  const onSubmit = async (data: RCAFormValues) => {
    if (!investigation) {
      await createInvestigation.mutateAsync(incidentId);
    }
    
    if (investigation?.id) {
      // Prepare data for update
      const updates: Record<string, unknown> = {
        immediate_cause: data.immediate_cause,
        underlying_cause: data.underlying_cause,
        contributing_factors: data.contributing_factors,
        findings_summary: data.findings_summary,
        five_whys: data.five_whys as unknown as Json,
        root_causes: data.root_causes as unknown as Json,
        ai_summary: data.ai_summary,
        ai_summary_generated_at: data.ai_summary ? new Date().toISOString() : null,
        ai_summary_language: data.ai_summary_language,
      };

      // Also update legacy root_cause field with first root cause for backwards compatibility
      if (data.root_causes.length > 0) {
        updates.root_cause = data.root_causes[0].text;
      }

      await updateInvestigation.mutateAsync({
        id: investigation.id,
        incidentId,
        updates: updates as Partial<typeof investigation>,
      });
    }
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
  const contributingFactorsValue = form.watch('contributing_factors');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" dir={direction}>
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
                  </div>
                  <FormControl>
                    <Textarea
                      {...field}
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
                  </div>
                  <FormControl>
                    <Textarea
                      {...field}
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

        {/* Step 5: Contributing Factors */}
        <FormField
          control={form.control}
          name="contributing_factors"
          render={({ field }) => (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">5</span>
                  {t('investigation.rca.contributingFactors', 'Contributing Factors')}
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {t('common.optional', 'Optional')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('investigation.rca.contributingFactorsPlaceholder', 'List other factors that contributed to the incident...')}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </CardContent>
            </Card>
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
                fiveWhys={fiveWhysValue}
                immediateCause={immediateCauseValue}
                underlyingCause={underlyingCauseValue}
                rootCauses={rootCausesValue}
                contributingFactors={contributingFactorsValue}
                incidentTitle={incidentTitle}
                incidentDescription={incidentDescription}
                generatedAt={form.watch('ai_summary_generated_at')}
                generatedLanguage={form.watch('ai_summary_language')}
              />
            )}
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end sticky bottom-0 bg-background py-4 border-t">
          <Button type="submit" disabled={updateInvestigation.isPending} size="lg">
            {updateInvestigation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            <Save className="h-4 w-4 me-2" />
            {t('investigation.rca.saveAnalysis', 'Save RCA Analysis')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
