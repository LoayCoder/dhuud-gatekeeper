import React from "react";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CompactRiskMatrix } from "../../CompactRiskMatrix";
import { RiskReductionSummary } from "../../RiskReductionSummary";
import { HazardForm } from "../../HazardForm";

export function WizardStep4({ state }: { state: unknown }) {
  const { t } = state;
  const {
    hazards, updateHazard, removeHazard
  } = state;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            {t("risk.step4.title", "Control Measures & Residual Risk")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="mb-4">
            <AlertDescription>
              {t("risk.controls.hierarchy", "Apply controls in order: Elimination → Substitution → Engineering → Administrative → PPE")}
            </AlertDescription>
          </Alert>

          <CompactRiskMatrix
            hazards={hazards.map((h: unknown, i: number) => ({
              id: String(i),
              likelihood: h.likelihood,
              severity: h.severity,
              residual_likelihood: h.residual_likelihood,
              residual_severity: h.residual_severity,
              hazard_description: h.hazard_description,
            }))}
            mode="comparison"
            size="md"
            showReductionStats
          />

          <RiskReductionSummary
            hazards={hazards.map((h: unknown, i: number) => ({
              id: String(i),
              likelihood: h.likelihood,
              severity: h.severity,
              residual_likelihood: h.residual_likelihood,
              residual_severity: h.residual_severity,
              hazard_description: h.hazard_description,
            }))}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {hazards.map((hazard: unknown, index: number) => (
          <HazardForm
            key={index}
            hazard={hazard}
            index={index}
            onChange={updateHazard}
            onRemove={removeHazard}
            showResidual
          />
        ))}
      </div>
    </div>
  );
}
