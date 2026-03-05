import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompactRiskMatrix } from "../../CompactRiskMatrix";
import { HazardForm } from "../../HazardForm";
import { createEmptyHazard } from "../hooks/useRiskAssessmentForm";

export function WizardStep3({ state }: { state: any }) {
  const { t } = state;
  const {
    hazards, setHazards, updateHazard, removeHazard
  } = state;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            {t("risk.step3.title", "Hazard Identification")}
          </CardTitle>
        </CardHeader>
      <CardContent>
          <CompactRiskMatrix
            hazards={hazards.map((h: unknown, i: number) => ({
              id: String(i),
              likelihood: h.likelihood,
              severity: h.severity,
              hazard_description: h.hazard_description,
            }))}
            mode="single"
            size="md"
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
            showResidual={false}
          />
        ))}

        <Button
          variant="outline"
          onClick={() => setHazards((prev: unknown) => [...prev, createEmptyHazard()])}
          className="w-full"
        >
          {t("risk.hazard.add", "+ Add Hazard")}
        </Button>
      </div>
    </div>
  );
}
