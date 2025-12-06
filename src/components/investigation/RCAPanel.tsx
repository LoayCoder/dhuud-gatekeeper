import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Save, Loader2 } from "lucide-react";
import { FiveWhysBuilder } from "./FiveWhysBuilder";
import { useInvestigation, useCreateInvestigation, useUpdateInvestigation, type FiveWhyEntry } from "@/hooks/use-investigation";

const rcaSchema = z.object({
  immediate_cause: z.string().optional(),
  underlying_cause: z.string().optional(),
  root_cause: z.string().optional(),
  contributing_factors: z.string().optional(),
  findings_summary: z.string().optional(),
  five_whys: z.array(z.object({
    why: z.string().min(1),
    answer: z.string().min(1),
  })).default([]),
});

type RCAFormValues = {
  immediate_cause?: string;
  underlying_cause?: string;
  root_cause?: string;
  contributing_factors?: string;
  findings_summary?: string;
  five_whys: FiveWhyEntry[];
};

interface RCAPanelProps {
  incidentId: string;
}

export function RCAPanel({ incidentId }: RCAPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const { data: investigation, isLoading } = useInvestigation(incidentId);
  const createInvestigation = useCreateInvestigation();
  const updateInvestigation = useUpdateInvestigation();

  const form = useForm<RCAFormValues>({
    resolver: zodResolver(rcaSchema),
    defaultValues: {
      immediate_cause: '',
      underlying_cause: '',
      root_cause: '',
      contributing_factors: '',
      findings_summary: '',
      five_whys: [],
    },
  });

  useEffect(() => {
    if (investigation) {
      form.reset({
        immediate_cause: investigation.immediate_cause || '',
        underlying_cause: investigation.underlying_cause || '',
        root_cause: investigation.root_cause || '',
        contributing_factors: investigation.contributing_factors || '',
        findings_summary: investigation.findings_summary || '',
        five_whys: investigation.five_whys || [],
      });
    }
  }, [investigation, form]);

  const onSubmit = async (data: RCAFormValues) => {
    if (!investigation) {
      // Create new investigation first
      await createInvestigation.mutateAsync(incidentId);
    }
    
    if (investigation?.id) {
      await updateInvestigation.mutateAsync({
        id: investigation.id,
        incidentId,
        updates: data,
      });
    }
  };

  const handleStartInvestigation = async () => {
    await createInvestigation.mutateAsync(incidentId);
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" dir={direction}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
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
                />
              )}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="immediate_cause"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.rca.immediateCause', 'Immediate Cause')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t('investigation.rca.immediateCausePlaceholder', 'What directly caused the incident?')}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="underlying_cause"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.rca.underlyingCause', 'Underlying Cause')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t('investigation.rca.underlyingCausePlaceholder', 'What conditions allowed this to happen?')}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="root_cause"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('investigation.rca.rootCause', 'Root Cause')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t('investigation.rca.rootCausePlaceholder', 'What is the fundamental reason this occurred?')}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contributing_factors"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('investigation.rca.contributingFactors', 'Contributing Factors')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t('investigation.rca.contributingFactorsPlaceholder', 'List other factors that contributed...')}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="findings_summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('investigation.rca.findingsSummary', 'Findings Summary')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t('investigation.rca.findingsSummaryPlaceholder', 'Summarize the key findings of this investigation...')}
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={updateInvestigation.isPending}>
            {updateInvestigation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            <Save className="h-4 w-4 me-2" />
            {t('common.save', 'Save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
