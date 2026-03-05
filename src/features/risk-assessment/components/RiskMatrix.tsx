import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Hazard {
  id: string;
  likelihood: number;
  severity: number;
  residual_likelihood?: number;
  residual_severity?: number;
  hazard_description: string;
}

interface RiskMatrixProps {
  hazards: Hazard[];
  showResidual?: boolean;
  onCellClick?: (likelihood: number, severity: number) => void;
}

const getRiskLevel = (score: number): { level: string; color: string } => {
  if (score <= 4) return { level: "low", color: "bg-green-500" };
  if (score <= 9) return { level: "medium", color: "bg-yellow-500" };
  if (score <= 15) return { level: "high", color: "bg-orange-500" };
  return { level: "critical", color: "bg-red-500" };
};

const getCellColor = (likelihood: number, severity: number): string => {
  const score = likelihood * severity;
  const { color } = getRiskLevel(score);
  return color;
};

export function RiskMatrix({ hazards, showResidual = false, onCellClick }: RiskMatrixProps) {
  const { t } = useTranslation();

  const severityLabels = [
    t("risk.severity.negligible", "Negligible"),
    t("risk.severity.minor", "Minor"),
    t("risk.severity.moderate", "Moderate"),
    t("risk.severity.major", "Major"),
    t("risk.severity.catastrophic", "Catastrophic"),
  ];

  const likelihoodLabels = [
    t("risk.likelihood.veryUnlikely", "Very Unlikely"),
    t("risk.likelihood.unlikely", "Unlikely"),
    t("risk.likelihood.possible", "Possible"),
    t("risk.likelihood.likely", "Likely"),
    t("risk.likelihood.veryLikely", "Very Likely"),
  ];

  const hazardPositions = useMemo(() => {
    const positions: Record<string, Hazard[]> = {};
    hazards.forEach((hazard) => {
      const l = showResidual ? (hazard.residual_likelihood || hazard.likelihood) : hazard.likelihood;
      const s = showResidual ? (hazard.residual_severity || hazard.severity) : hazard.severity;
      const key = `${l}-${s}`;
      if (!positions[key]) positions[key] = [];
      positions[key].push(hazard);
    });
    return positions;
  }, [hazards, showResidual]);

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[400px]">
        {/* Header row - Severity */}
        <div className="flex">
          <div className="w-24 shrink-0" />
          <div className="flex-1 grid grid-cols-5 gap-1 mb-1">
            {severityLabels.map((label, i) => (
              <div
                key={i}
                className="text-center text-xs font-medium p-1 bg-muted rounded truncate"
                title={label}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Severity axis label */}
        <div className="flex items-center mb-2">
          <div className="w-24 shrink-0" />
          <div className="flex-1 text-center text-xs text-muted-foreground font-medium">
            {t("risk.severity.label", "Severity")} →
          </div>
        </div>

        {/* Matrix grid */}
        <div className="flex">
          {/* Likelihood axis */}
          <div className="w-24 shrink-0 flex flex-col justify-center pe-2">
            <div className="text-xs text-muted-foreground font-medium text-center mb-2 -rotate-90 origin-center whitespace-nowrap">
              {t("risk.likelihood.label", "Likelihood")} ↑
            </div>
          </div>

          {/* Grid cells */}
          <div className="flex-1">
            {[5, 4, 3, 2, 1].map((likelihood) => (
              <div key={likelihood} className="flex items-center gap-1 mb-1">
                <div className="w-6 text-xs text-center font-medium">{likelihood}</div>
                <div className="flex-1 grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((severity) => {
                    const key = `${likelihood}-${severity}`;
                    const cellHazards = hazardPositions[key] || [];
                    const score = likelihood * severity;

                    return (
                      <div
                        key={severity}
                        onClick={() => onCellClick?.(likelihood, severity)}
                        className={cn(
                          "aspect-square rounded flex items-center justify-center text-xs font-bold text-white cursor-pointer transition-transform hover:scale-105 relative",
                          getCellColor(likelihood, severity)
                        )}
                        title={`L${likelihood} × S${severity} = ${score}`}
                      >
                        {score}
                        {cellHazards.length > 0 && (
                          <div className="absolute -top-1 -end-1 w-4 h-4 bg-background border-2 border-foreground rounded-full flex items-center justify-center text-[10px] text-foreground font-bold">
                            {cellHazards.length}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>{t("risk.level.low", "Low")} (1-4)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-yellow-500" />
            <span>{t("risk.level.medium", "Medium")} (5-9)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-orange-500" />
            <span>{t("risk.level.high", "High")} (10-15)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span>{t("risk.level.critical", "Critical")} (16-25)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
