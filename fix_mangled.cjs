const fs = require('fs');
const fp = 'src/features/risk-assessment/components/RiskAssessmentWizard/hooks/useRiskAssessmentForm.ts';
let content = fs.readFileSync(fp, 'utf8');

// The IDE mangled the file because of fallback fuzzy matching.
// We need to restore `canProceed`. 
// First, find `setIsSaving(false);\n    }\n  };\n` and `const progress = `
// The mangled file replaced canProceed with a bunch of useStates and saveAssessment!
// Let's just find the first occurrence of `setIsSaving(false);` and then delete everything until `const progress = `
const saveEndIdx = content.indexOf('setIsSaving(false);\n    }\n  };');
if (saveEndIdx > -1) {
    const afterSave = saveEndIdx + 'setIsSaving(false);\n    }\n  };'.length;
    const progressIdx = content.indexOf('const progress = (currentStep / STEPS.length) * 100;');
    
    if (progressIdx > -1 && progressIdx > afterSave) {
        const fixedMiddle = `

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: {
        const hasRequiredFields = !!activityName && !!activityDescription && !!activityType;
        if (isProjectLinked) {
          return hasRequiredFields && !!selectedProjectId;
        }
        return hasRequiredFields;
      }
      case 2:
        // Require Team Leader + at least 1 member
        return teamLeader !== null && teamMembers.length >= 1;
      case 3:
        return hazards.length > 0 && hazards.every((h) => h.hazard_description);
      case 4:
        return hazards.every(
          (h) => h.residual_likelihood && h.residual_severity
        );
      case 5: {
        // Require risk tolerance and review frequency for ISO 45001 compliance
        const hasRating = !!overallRating;
        const hasRiskTolerance = !!riskTolerance;
        const hasReviewFrequency = !!reviewFrequency;
        const hasJustificationIfNeeded = riskTolerance !== "tolerable_alarp" || !!acceptanceJustification;
        const isNotUnacceptable = riskTolerance !== "unacceptable";
        return hasRating && hasRiskTolerance && hasReviewFrequency && hasJustificationIfNeeded && isNotUnacceptable;
      }
      default:
        return false;
    }
  };

  `;
        content = content.substring(0, afterSave) + fixedMiddle + content.substring(progressIdx);
        fs.writeFileSync(fp, content);
        console.log('Fixed useRiskAssessmentForm.ts');
    }
}
