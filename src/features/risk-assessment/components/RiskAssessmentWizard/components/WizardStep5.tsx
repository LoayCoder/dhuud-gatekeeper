import React from "react";
import { PenTool } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkerConsultationSection } from "../../WorkerConsultationSection";
import { RiskAcceptabilitySection } from "../../RiskAcceptabilitySection";

export function WizardStep5({ state }: { state: any }) {
  const { t } = state;
  const {
    workerConsultationDate, setWorkerConsultationDate,
    workerConsultationNotes, setWorkerConsultationNotes,
    unionRepConsulted, setUnionRepConsulted,
    riskTolerance, setRiskTolerance,
    acceptanceJustification, setAcceptanceJustification,
    reviewFrequency, setReviewFrequency,
    nextReviewDate, setNextReviewDate,
    overallRating, setOverallRating,
    calculateOverallRisk, hazards, teamMembers,
    validUntil, setValidUntil
  } = state;

  return (
    <div className="space-y-6">
      {/* Worker Consultation (ISO 45001 7.4) */}
      <WorkerConsultationSection
        consultationDate={workerConsultationDate}
        onConsultationDateChange={setWorkerConsultationDate}
        consultationNotes={workerConsultationNotes}
        onConsultationNotesChange={setWorkerConsultationNotes}
        unionRepConsulted={unionRepConsulted}
        onUnionRepConsultedChange={setUnionRepConsulted}
      />

      {/* Risk Acceptability (ISO 45001 6.1.2.2) */}
      <RiskAcceptabilitySection
        riskTolerance={riskTolerance}
        onRiskToleranceChange={setRiskTolerance}
        acceptanceJustification={acceptanceJustification}
        onAcceptanceJustificationChange={setAcceptanceJustification}
        reviewFrequency={reviewFrequency}
        onReviewFrequencyChange={setReviewFrequency}
        nextReviewDate={nextReviewDate}
        onNextReviewDateChange={setNextReviewDate}
        managementApprovalRequired={overallRating === "high" || overallRating === "critical" || calculateOverallRisk() === "high" || calculateOverallRisk() === "critical"}
        overallRiskRating={overallRating || calculateOverallRisk()}
        hazardCount={hazards.length}
        highRiskCount={hazards.filter((h: unknown) => h.residual_likelihood * h.residual_severity > 9).length}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            {t("risk.step5.title", "Final Review")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t("risk.overall.rating", "Overall Risk Rating")} *</Label>
              <Select value={overallRating} onValueChange={setOverallRating}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("risk.overall.selectRating", "Select rating...")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("risk.level.low", "Low")}</SelectItem>
                  <SelectItem value="medium">{t("risk.level.medium", "Medium")}</SelectItem>
                  <SelectItem value="high">{t("risk.level.high", "High")}</SelectItem>
                  <SelectItem value="critical">{t("risk.level.critical", "Critical")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("risk.validUntil", "Valid Until")}</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="mt-1"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{hazards.length}</div>
              <div className="text-xs text-muted-foreground">{t("risk.summary.hazards", "Hazards")}</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{teamMembers.length}</div>
              <div className="text-xs text-muted-foreground">{t("risk.summary.team", "Team Members")}</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {hazards.reduce((sum: number, h: unknown) => sum + h.additional_controls.length, 0)}
              </div>
              <div className="text-xs text-muted-foreground">{t("risk.summary.controls", "Controls")}</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold capitalize">{overallRating || calculateOverallRisk()}</div>
              <div className="text-xs text-muted-foreground">{t("risk.summary.rating", "Rating")}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
