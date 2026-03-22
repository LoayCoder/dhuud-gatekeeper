import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Clock, Loader2, Sparkles, Tags, Mic, MicOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AIAnalysisPanel } from '@/features/incidents';
import { AITagsSelector } from '@/components/ai/AITagsSelector';
import { OBSERVATION_TYPES } from './types';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { cn } from '@/lib/utils';

export function QuickObservationCardFormDetails({ state, form }: any) {
  const { t, i18n } = useTranslation();
  const { isOnline, aiValidator, handleAnalyzeDescription, handleConfirmTranslation, handleConfirmAnalysis, availableObservationTags, selectedTags, setSelectedTags } = state;

  const speechToText = useSpeechToText({
    lang: i18n.language,
    onTranscript: (text) => {
      const current = form.getValues('description') || '';
      const separator = current && !current.endsWith(' ') ? ' ' : '';
      form.setValue('description', current + separator + text, { shouldValidate: true, shouldDirty: true });
    },
  });
  return (
    <>      {/* Observation Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="observed_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {t('quickObservation.observationDate')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="observed_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {t('quickObservation.observationTime')}
                      </FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>{t('quickObservation.whatDidYouObserve')}</FormLabel>
                      <div className="flex items-center gap-1">
                        {speechToText.isSupported && (
                          <div className="flex items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted"
                              onClick={speechToText.cycleSpeechLang}
                              title={t('common.switchSpeechLanguage', 'Switch speech language')}
                            >
                              {speechToText.speechLangLabel}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-7 w-7 p-0",
                                speechToText.isListening
                                  ? "text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              )}
                              onClick={speechToText.toggleListening}
                              title={speechToText.isListening ? t('common.stopRecording', 'Stop recording') : t('common.startRecording', 'Voice input')}
                            >
                              {speechToText.isListening ? (
                                <span className="relative flex h-3.5 w-3.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                                  <MicOff className="relative h-3.5 w-3.5" />
                                </span>
                              ) : (
                                <Mic className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        )}
                        {isOnline && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAnalyzeDescription}
                            disabled={aiValidator.validationState === 'analyzing' || field.value.length < 10}
                            className="gap-1.5 h-7 text-xs"
                          >
                            {aiValidator.validationState === 'analyzing' ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            {aiValidator.validationState === 'analyzing' ? t('quickObservation.analyzing') : t('quickObservation.aiAnalyze')}
                          </Button>
                        )}
                      </div>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder={t('quickObservation.descriptionPlaceholder')}
                        className="min-h-[100px] resize-none"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Reset AI validation when text changes significantly
                          if (aiValidator.validationState !== 'idle') {
                            aiValidator.reset();
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* AI Analysis Panel - Only show when online */}
              {isOnline && (
                <AIAnalysisPanel
                  validationState={aiValidator.validationState}
                  analysisResult={aiValidator.analysisResult}
                  processingTime={aiValidator.processingTime}
                  blockingReason={aiValidator.blockingReason}
                  onConfirmTranslation={handleConfirmTranslation}
                  onConfirmAnalysis={handleConfirmAnalysis}
                  availableTags={availableObservationTags}
                  selectedTags={selectedTags}
                  suggestedTags={aiValidator.analysisResult?.suggestedTags}
                  onTagsChange={setSelectedTags}
                />
              )}

              {/* Tags Section - Always visible for manual tag management */}
              {availableObservationTags.length > 0 && (
                <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Tags className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t('admin.ai.observationTags', 'Observation Tags')}</span>
                  </div>
                  <AITagsSelector
                    availableTags={availableObservationTags}
                    selectedTags={selectedTags}
                    suggestedTags={aiValidator.analysisResult?.suggestedTags}
                    onTagsChange={setSelectedTags}
                  />
                </div>
              )}
              
              {/* Observation Type */}
              <FormField
                control={form.control}
                name="subtype"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('quickObservation.observationType')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('quickObservation.selectType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OBSERVATION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {t(type.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              
    </>
  );
}

