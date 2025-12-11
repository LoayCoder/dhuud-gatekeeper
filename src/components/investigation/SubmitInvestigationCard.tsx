import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Loader2, 
  ClipboardCheck,
  Link2,
  Mail
} from 'lucide-react';
import { useInvestigationCompleteness } from '@/hooks/use-investigation-completeness';
import { useSubmitInvestigation } from '@/hooks/use-investigation';
import { cn } from '@/lib/utils';

interface SubmitInvestigationCardProps {
  incidentId: string;
  onSubmitted?: () => void;
}

export function SubmitInvestigationCard({ incidentId, onSubmitted }: SubmitInvestigationCardProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const completeness = useInvestigationCompleteness(incidentId);
  const submitMutation = useSubmitInvestigation();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitMutation.mutateAsync({ incidentId });
      onSubmitted?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const CheckItem = ({ checked, label }: { checked: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {checked ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
      )}
      <span className={cn(!checked && 'text-muted-foreground')}>{label}</span>
    </div>
  );

  return (
    <Card className={cn(
      'border-2',
      completeness.isComplete ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20'
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-5 w-5" />
          {t('investigation.submit.title', 'Submit Investigation')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Completeness Checklist */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t('investigation.submit.checklist', 'Investigation Checklist')}
          </p>
          <div className="grid gap-1.5">
            <CheckItem 
              checked={completeness.hasFiveWhys} 
              label={t('investigation.submit.fiveWhys', '5-Whys Analysis (min. 3)')} 
            />
            <CheckItem 
              checked={completeness.hasImmediateCause} 
              label={t('investigation.submit.immediateCause', 'Immediate Cause')} 
            />
            <CheckItem 
              checked={completeness.hasUnderlyingCause} 
              label={t('investigation.submit.underlyingCause', 'Underlying Cause')} 
            />
            <CheckItem 
              checked={completeness.hasRootCauses} 
              label={t('investigation.submit.rootCauses', 'Root Causes')} 
            />
            <CheckItem 
              checked={completeness.hasActions} 
              label={t('investigation.submit.actions', 'Corrective Actions')} 
            />
          </div>
        </div>

        {/* Cause Coverage */}
        {completeness.causeCoverage.totalCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                {t('investigation.submit.causeCoverage', 'Cause Coverage')}
              </p>
              <Badge variant={completeness.causeCoverage.allCovered ? 'default' : 'secondary'}>
                {completeness.causeCoverage.coveredCount}/{completeness.causeCoverage.totalCount}
              </Badge>
            </div>
            
            {!completeness.causeCoverage.allCovered && (
              <div className="ps-6 space-y-1">
                {completeness.causeCoverage.rootCauses.filter(rc => !rc.hasAction).map((rc, idx) => (
                  <div key={rc.id} className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {t('investigation.rca.rootCause', 'Root Cause')} #{idx + 1}: {rc.text.substring(0, 40)}...
                    </span>
                  </div>
                ))}
                {completeness.causeCoverage.contributingFactors.filter(cf => !cf.hasAction).map((cf, idx) => (
                  <div key={cf.id} className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {t('investigation.rca.contributingFactor', 'Contributing Factor')} #{idx + 1}: {cf.text.substring(0, 40)}...
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Incomplete Warning */}
        {!completeness.isComplete && completeness.missingItems.length > 0 && (
          <Alert variant="destructive" className="bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>{t('investigation.submit.incomplete', 'Complete the following before submitting:')}</strong>
              <ul className="list-disc list-inside mt-1 text-sm">
                {completeness.missingItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <Button 
            className="w-full" 
            disabled={!completeness.isComplete || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 me-2" />
            )}
            {t('investigation.submit.button', 'Submit Investigation for Review')}
          </Button>
          
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 justify-center">
            <Mail className="h-3 w-3" />
            {t('investigation.submit.note', 'All assigned action owners will be notified via email')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
