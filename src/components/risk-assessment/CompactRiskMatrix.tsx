import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ArrowRight, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Hazard {
  id: string;
  likelihood: number;
  severity: number;
  residual_likelihood?: number;
  residual_severity?: number;
  hazard_description: string;
}

interface CompactRiskMatrixProps {
  hazards: Hazard[];
  mode?: 'single' | 'comparison';
  size?: 'sm' | 'md';
  showLegend?: boolean;
  showReductionStats?: boolean;
}

const getRiskLevel = (score: number): { level: string; gradient: string; textColor: string } => {
  if (score <= 4) return { 
    level: "low", 
    gradient: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    textColor: "text-emerald-50"
  };
  if (score <= 9) return { 
    level: "medium", 
    gradient: "bg-gradient-to-br from-amber-400 to-amber-600",
    textColor: "text-amber-50"
  };
  if (score <= 15) return { 
    level: "high", 
    gradient: "bg-gradient-to-br from-orange-400 to-orange-600",
    textColor: "text-orange-50"
  };
  return { 
    level: "critical", 
    gradient: "bg-gradient-to-br from-red-500 to-red-700",
    textColor: "text-red-50"
  };
};

function MiniMatrix({ 
  hazards, 
  showResidual, 
  size,
  title,
  subtitle
}: { 
  hazards: Hazard[]; 
  showResidual: boolean;
  size: 'sm' | 'md';
  title: string;
  subtitle: string;
}) {
  const { t } = useTranslation();
  
  const cellSize = size === 'sm' ? 'w-6 h-6 text-[8px]' : 'w-8 h-8 text-[10px]';
  const markerSize = size === 'sm' ? 'w-3.5 h-3.5 text-[7px]' : 'w-4.5 h-4.5 text-[8px]';

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

  const totalScore = useMemo(() => {
    return hazards.reduce((sum, h) => {
      const l = showResidual ? (h.residual_likelihood || h.likelihood) : h.likelihood;
      const s = showResidual ? (h.residual_severity || h.severity) : h.severity;
      return sum + (l * s);
    }, 0);
  }, [hazards, showResidual]);

  const avgScore = hazards.length > 0 ? Math.round(totalScore / hazards.length) : 0;
  const riskInfo = getRiskLevel(avgScore);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-center">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
      
      <div className="bg-card/50 backdrop-blur-sm rounded-lg p-2 border border-border/50 shadow-sm">
        <div className="flex flex-col gap-0.5">
          {[5, 4, 3, 2, 1].map((likelihood) => (
            <div key={likelihood} className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((severity) => {
                const key = `${likelihood}-${severity}`;
                const cellHazards = hazardPositions[key] || [];
                const score = likelihood * severity;
                const { gradient, textColor } = getRiskLevel(score);

                return (
                  <TooltipProvider key={severity}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            cellSize,
                            gradient,
                            textColor,
                            "rounded flex items-center justify-center font-bold cursor-default transition-all hover:scale-110 hover:shadow-lg relative"
                          )}
                        >
                          {cellHazards.length > 0 ? (
                            <div className={cn(
                              markerSize,
                              "rounded-full flex items-center justify-center font-bold",
                              showResidual 
                                ? "bg-white text-emerald-600 ring-2 ring-emerald-400" 
                                : "bg-white text-red-600 ring-2 ring-red-400"
                            )}>
                              {cellHazards.length}
                            </div>
                          ) : (
                            <span className="opacity-60">{score}</span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <p className="font-medium">{t("risk.likelihood.label")}: {likelihood} × {t("risk.severity.label")}: {severity} = {score}</p>
                        {cellHazards.length > 0 && (
                          <ul className="mt-1 text-xs space-y-0.5">
                            {cellHazards.map((h, i) => (
                              <li key={h.id} className="truncate">• {h.hazard_description || `Hazard ${i + 1}`}</li>
                            ))}
                          </ul>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Average Score Badge */}
      <div className={cn(
        "px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5",
        riskInfo.gradient,
        riskInfo.textColor
      )}>
        {showResidual ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
        {t("risk.matrix.avgScore", "Avg")}: {avgScore}
      </div>
    </div>
  );
}

export function CompactRiskMatrix({ 
  hazards, 
  mode = 'single',
  size = 'md',
  showLegend = true,
  showReductionStats = true
}: CompactRiskMatrixProps) {
  const { t } = useTranslation();

  const reductionStats = useMemo(() => {
    if (hazards.length === 0) return { initial: 0, residual: 0, reduction: 0 };
    
    const initial = hazards.reduce((sum, h) => sum + (h.likelihood * h.severity), 0);
    const residual = hazards.reduce((sum, h) => {
      const l = h.residual_likelihood || h.likelihood;
      const s = h.residual_severity || h.severity;
      return sum + (l * s);
    }, 0);
    const reduction = initial > 0 ? Math.round(((initial - residual) / initial) * 100) : 0;
    
    return { initial, residual, reduction };
  }, [hazards]);

  if (mode === 'single') {
    return (
      <div className="flex flex-col items-center gap-3">
        <MiniMatrix 
          hazards={hazards} 
          showResidual={false} 
          size={size}
          title={t("risk.matrix.riskDistribution", "Risk Distribution")}
          subtitle={t("risk.matrix.hazardPlacement", "Hazard placement")}
        />
        {showLegend && <CompactLegend />}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Comparison View */}
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <MiniMatrix 
          hazards={hazards} 
          showResidual={false} 
          size={size}
          title={t("risk.matrix.initialRisk", "Initial Risk")}
          subtitle={t("risk.matrix.beforeControls", "Before Controls")}
        />
        
        {/* Arrow with Reduction */}
        <div className="flex flex-col items-center gap-1">
          <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-red-100 to-emerald-100 dark:from-red-900/30 dark:to-emerald-900/30">
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="sm:hidden flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-b from-red-100 to-emerald-100 dark:from-red-900/30 dark:to-emerald-900/30 rotate-90">
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
          {showReductionStats && reductionStats.reduction > 0 && (
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <TrendingDown className="w-3 h-3" />
              {reductionStats.reduction}%
            </div>
          )}
        </div>

        <MiniMatrix 
          hazards={hazards} 
          showResidual={true} 
          size={size}
          title={t("risk.matrix.residualRisk", "Residual Risk")}
          subtitle={t("risk.matrix.afterControls", "After Controls")}
        />
      </div>

      {/* Stats Summary */}
      {showReductionStats && hazards.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 rounded-lg text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{t("risk.matrix.totalInitial", "Initial")}:</span>
            <span className="font-semibold text-red-600 dark:text-red-400">{reductionStats.initial}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{t("risk.matrix.totalResidual", "Residual")}:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{reductionStats.residual}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{t("risk.matrix.reduction", "Reduction")}:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{reductionStats.reduction}%</span>
          </div>
        </div>
      )}

      {showLegend && <CompactLegend />}
    </div>
  );
}

function CompactLegend() {
  const { t } = useTranslation();
  
  return (
    <div className="flex items-center gap-3 text-[10px]">
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded bg-gradient-to-br from-emerald-400 to-emerald-600" />
        <span className="text-muted-foreground">{t("risk.level.low", "Low")}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded bg-gradient-to-br from-amber-400 to-amber-600" />
        <span className="text-muted-foreground">{t("risk.level.medium", "Medium")}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded bg-gradient-to-br from-orange-400 to-orange-600" />
        <span className="text-muted-foreground">{t("risk.level.high", "High")}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded bg-gradient-to-br from-red-500 to-red-700" />
        <span className="text-muted-foreground">{t("risk.level.critical", "Critical")}</span>
      </div>
    </div>
  );
}
