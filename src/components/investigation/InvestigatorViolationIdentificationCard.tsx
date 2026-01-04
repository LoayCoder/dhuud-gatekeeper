/**
 * Investigator Violation Identification Card
 * 
 * Displayed during investigation_in_progress for contractor-related incidents.
 * Allows investigator to identify contractor violations and set contribution percentage.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, Percent, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIdentifyContractorViolation, useViolationTypesForIncident, useIsAssignedInvestigator } from '@/hooks/use-investigator-violation';
import type { IncidentWithDetails } from '@/hooks/use-incidents';
import type { Investigation } from '@/hooks/use-investigation';

interface InvestigatorViolationIdentificationCardProps {
  incident: IncidentWithDetails;
  investigation: Investigation | null;
  onComplete?: () => void;
}

export function InvestigatorViolationIdentificationCard({ 
  incident, 
  investigation, 
  onComplete 
}: InvestigatorViolationIdentificationCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const [violationTypeId, setViolationTypeId] = useState<string>('');
  const [rootCauseSummary, setRootCauseSummary] = useState('');
  const [contributionPercentage, setContributionPercentage] = useState(50);
  const [evidenceSummary, setEvidenceSummary] = useState('');
  
  const { data: violationTypes, isLoading: loadingTypes } = useViolationTypesForIncident();
  const identifyMutation = useIdentifyContractorViolation();
  const isAssignedInvestigator = useIsAssignedInvestigator(investigation?.investigator_id);
  
  // Only show for incidents with contractor and in investigation_in_progress
  const hasContractor = !!(incident as any).related_contractor_company_id;
  const isInProgress = incident.status === 'investigation_in_progress';
  const alreadyIdentified = (investigation as any)?.violation_identified === true;
  
  if (!hasContractor || !isInProgress || !isAssignedInvestigator || alreadyIdentified) {
    return null;
  }
  
  const handleIdentify = async () => {
    if (!investigation?.id || !violationTypeId || rootCauseSummary.length < 50) return;
    
    await identifyMutation.mutateAsync({
      investigationId: investigation.id,
      violationTypeId,
      rootCauseSummary,
      contractorContributionPercentage: contributionPercentage,
      evidenceSummary: evidenceSummary || undefined,
    });
    
    onComplete?.();
  };
  
  const isValid = violationTypeId && rootCauseSummary.length >= 50;
  
  return (
    <Card className="border-2 border-warning/50 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <CardTitle className="text-lg">
            {t('investigation.violation.identifyTitle', 'Identify Contractor Violation')}
          </CardTitle>
        </div>
        <CardDescription>
          {t('investigation.violation.identifyDescription', 
            'If the root cause analysis indicates contractor responsibility, document the violation here.')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Violation Type Selector */}
        <div className="space-y-2">
          <Label htmlFor="violation-type">
            {t('investigation.violation.typeLabel', 'Violation Type')} *
          </Label>
          <Select value={violationTypeId} onValueChange={setViolationTypeId} disabled={loadingTypes}>
            <SelectTrigger id="violation-type">
              <SelectValue placeholder={t('investigation.violation.selectType', 'Select violation type...')} />
            </SelectTrigger>
            <SelectContent>
              {violationTypes?.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {isRTL && type.name_ar ? type.name_ar : type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Contribution Percentage Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              {t('investigation.violation.contributionLabel', 'Contractor Contribution to Root Cause')}
            </Label>
            <span className="text-lg font-semibold text-primary">{contributionPercentage}%</span>
          </div>
          <Slider
            value={[contributionPercentage]}
            onValueChange={(values) => setContributionPercentage(values[0])}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('investigation.violation.minorContribution', 'Minor')}</span>
            <span>{t('investigation.violation.majorContribution', 'Major')}</span>
          </div>
        </div>
        
        {/* Root Cause Summary */}
        <div className="space-y-2">
          <Label htmlFor="root-cause-summary" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('investigation.violation.rootCauseLabel', 'Root Cause Summary')} *
          </Label>
          <Textarea
            id="root-cause-summary"
            value={rootCauseSummary}
            onChange={(e) => setRootCauseSummary(e.target.value)}
            placeholder={t('investigation.violation.rootCausePlaceholder', 
              'Describe how the contractor contributed to the root cause (min. 50 characters)...')}
            rows={4}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className={rootCauseSummary.length < 50 ? 'text-destructive' : 'text-success'}>
              {rootCauseSummary.length}/50 {t('common.minCharacters', 'min characters')}
            </span>
          </div>
        </div>
        
        {/* Evidence Summary (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="evidence-summary">
            {t('investigation.violation.evidenceLabel', 'Evidence Summary')} 
            <span className="text-muted-foreground ms-1">({t('common.optional', 'optional')})</span>
          </Label>
          <Textarea
            id="evidence-summary"
            value={evidenceSummary}
            onChange={(e) => setEvidenceSummary(e.target.value)}
            placeholder={t('investigation.violation.evidencePlaceholder', 
              'Summarize the evidence supporting this violation...')}
            rows={3}
          />
        </div>
        
        {/* Info Alert */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('investigation.violation.identifyWarning', 
              'Once identified, this violation will need to be submitted for approval by department manager and contract controller.')}
          </AlertDescription>
        </Alert>
        
        {/* Action Button */}
        <Button
          onClick={handleIdentify}
          disabled={!isValid || identifyMutation.isPending}
          className="w-full gap-2"
          variant="default"
        >
          {identifyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <AlertTriangle className="h-4 w-4" />
          {t('investigation.violation.identifyButton', 'Identify Contractor Violation')}
        </Button>
      </CardContent>
    </Card>
  );
}
