import { useMemo } from 'react';
import { useInvestigation, useCorrectiveActions } from './use-investigation';

interface CauseCoverage {
  rootCauses: Array<{ id: string; text: string; hasAction: boolean }>;
  contributingFactors: Array<{ id: string; text: string; hasAction: boolean }>;
  allCovered: boolean;
  coveredCount: number;
  totalCount: number;
}

interface InvestigationCompleteness {
  isComplete: boolean;
  missingItems: string[];
  causeCoverage: CauseCoverage;
  hasRCAData: boolean;
  hasFiveWhys: boolean;
  hasImmediateCause: boolean;
  hasUnderlyingCause: boolean;
  hasRootCauses: boolean;
  hasActions: boolean;
}

export function useInvestigationCompleteness(incidentId: string | null): InvestigationCompleteness {
  const { data: investigation } = useInvestigation(incidentId);
  const { data: actions } = useCorrectiveActions(incidentId);

  return useMemo(() => {
    const missingItems: string[] = [];
    
    // Parse investigation data
    const fiveWhys = investigation?.five_whys || [];
    const rootCauses = investigation?.root_causes || [];
    const contributingFactors = investigation?.contributing_factors_list || [];
    const immediateCause = investigation?.immediate_cause;
    const underlyingCause = investigation?.underlying_cause;

    // Check basic RCA completeness
    const hasFiveWhys = fiveWhys.length >= 3 && fiveWhys.every(w => w.why && w.answer);
    const hasImmediateCause = !!immediateCause?.trim();
    const hasUnderlyingCause = !!underlyingCause?.trim();
    const hasRootCauses = rootCauses.length > 0 && rootCauses.some(rc => rc.text?.trim());
    const hasActions = (actions?.length || 0) > 0;

    if (!hasFiveWhys) missingItems.push('5-Whys analysis (minimum 3)');
    if (!hasImmediateCause) missingItems.push('Immediate Cause');
    if (!hasUnderlyingCause) missingItems.push('Underlying Cause');
    if (!hasRootCauses) missingItems.push('At least one Root Cause');

    // Check cause coverage - each root cause and contributing factor should have at least one action
    const rootCauseCoverage = rootCauses.filter(rc => rc.id && rc.text?.trim()).map(rc => ({
      id: rc.id,
      text: rc.text,
      hasAction: actions?.some(a => a.linked_root_cause_id === rc.id && a.linked_cause_type === 'root_cause') || false,
    }));

    const contributingFactorCoverage = contributingFactors.filter(cf => cf.id && cf.text?.trim()).map(cf => ({
      id: cf.id,
      text: cf.text,
      hasAction: actions?.some(a => a.linked_root_cause_id === cf.id && a.linked_cause_type === 'contributing_factor') || false,
    }));

    // Check if all causes are covered
    const uncoveredRootCauses = rootCauseCoverage.filter(rc => !rc.hasAction);
    const uncoveredFactors = contributingFactorCoverage.filter(cf => !cf.hasAction);
    
    if (uncoveredRootCauses.length > 0) {
      missingItems.push(`Actions for ${uncoveredRootCauses.length} root cause(s)`);
    }
    if (uncoveredFactors.length > 0) {
      missingItems.push(`Actions for ${uncoveredFactors.length} contributing factor(s)`);
    }

    const totalCauses = rootCauseCoverage.length + contributingFactorCoverage.length;
    const coveredCauses = rootCauseCoverage.filter(rc => rc.hasAction).length + 
                          contributingFactorCoverage.filter(cf => cf.hasAction).length;
    const allCausesCovered = totalCauses > 0 && coveredCauses === totalCauses;

    const causeCoverage: CauseCoverage = {
      rootCauses: rootCauseCoverage,
      contributingFactors: contributingFactorCoverage,
      allCovered: allCausesCovered,
      coveredCount: coveredCauses,
      totalCount: totalCauses,
    };

    const hasRCAData = hasFiveWhys && hasImmediateCause && hasUnderlyingCause && hasRootCauses;
    const isComplete = hasRCAData && hasActions && allCausesCovered;

    return {
      isComplete,
      missingItems,
      causeCoverage,
      hasRCAData,
      hasFiveWhys,
      hasImmediateCause,
      hasUnderlyingCause,
      hasRootCauses,
      hasActions,
    };
  }, [investigation, actions]);
}
