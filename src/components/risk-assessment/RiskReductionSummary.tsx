import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TrendingDown, Shield, AlertTriangle, CheckCircle2, ArrowDownRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Hazard {
  id: string;
  likelihood: number;
  severity: number;
  residual_likelihood?: number;
  residual_severity?: number;
  hazard_description: string;
}

interface RiskReductionSummaryProps {
  hazards: Hazard[];
  className?: string;
}

const getRiskCategory = (score: number): { key: string; color: string } => {
  if (score <= 4) return { key: "low", color: "text-emerald-600 dark:text-emerald-400" };
  if (score <= 9) return { key: "medium", color: "text-amber-600 dark:text-amber-400" };
  if (score <= 15) return { key: "high", color: "text-orange-600 dark:text-orange-400" };
  return { key: "critical", color: "text-red-600 dark:text-red-400" };
};

export function RiskReductionSummary({ hazards, className }: RiskReductionSummaryProps) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    if (hazards.length === 0) return null;

    const categoryCounts = {
      initial: { low: 0, medium: 0, high: 0, critical: 0 },
      residual: { low: 0, medium: 0, high: 0, critical: 0 }
    };

    let totalInitial = 0;
    let totalResidual = 0;
    let improvedCount = 0;

    hazards.forEach((h) => {
      const initialScore = h.likelihood * h.severity;
      const residualScore = (h.residual_likelihood || h.likelihood) * (h.residual_severity || h.severity);
      
      totalInitial += initialScore;
      totalResidual += residualScore;

      if (residualScore < initialScore) improvedCount++;

      const initialCat = getRiskCategory(initialScore).key as keyof typeof categoryCounts.initial;
      const residualCat = getRiskCategory(residualScore).key as keyof typeof categoryCounts.residual;
      
      categoryCounts.initial[initialCat]++;
      categoryCounts.residual[residualCat]++;
    });

    const avgInitial = Math.round(totalInitial / hazards.length);
    const avgResidual = Math.round(totalResidual / hazards.length);
    const reduction = totalInitial > 0 ? Math.round(((totalInitial - totalResidual) / totalInitial) * 100) : 0;

    return {
      totalHazards: hazards.length,
      totalInitial,
      totalResidual,
      avgInitial,
      avgResidual,
      reduction,
      improvedCount,
      categoryCounts
    };
  }, [hazards]);

  if (!stats) {
    return (
      <div className={cn("p-4 bg-muted/50 rounded-lg text-center text-muted-foreground text-sm", className)}>
        {t("risk.summary.noHazards", "No hazards to analyze")}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label={t("risk.summary.totalHazards", "Total Hazards")}
          value={stats.totalHazards}
          color="text-muted-foreground"
        />
        <StatCard
          icon={<Shield className="w-4 h-4" />}
          label={t("risk.summary.improved", "Improved")}
          value={stats.improvedCount}
          subValue={`/ ${stats.totalHazards}`}
          color="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={<ArrowDownRight className="w-4 h-4" />}
          label={t("risk.summary.avgReduction", "Avg. Reduction")}
          value={`${stats.avgInitial} → ${stats.avgResidual}`}
          color="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={<TrendingDown className="w-4 h-4" />}
          label={t("risk.summary.overallReduction", "Overall Reduction")}
          value={`${stats.reduction}%`}
          color={stats.reduction > 50 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}
        />
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t("risk.summary.riskReductionProgress", "Risk Reduction Progress")}</span>
          <span>{stats.reduction}%</span>
        </div>
        <Progress value={stats.reduction} className="h-2" />
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <CategoryBreakdown
          title={t("risk.matrix.initialRisk", "Initial Risk")}
          counts={stats.categoryCounts.initial}
          variant="initial"
        />
        <CategoryBreakdown
          title={t("risk.matrix.residualRisk", "Residual Risk")}
          counts={stats.categoryCounts.residual}
          variant="residual"
        />
      </div>
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  subValue,
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  subValue?: string;
  color: string;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-lg p-3 space-y-1">
      <div className={cn("flex items-center gap-1.5", color)}>
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={cn("text-xl font-bold", color)}>
        {value}
        {subValue && <span className="text-sm font-normal text-muted-foreground">{subValue}</span>}
      </p>
    </div>
  );
}

function CategoryBreakdown({ 
  title, 
  counts, 
  variant 
}: { 
  title: string; 
  counts: { low: number; medium: number; high: number; critical: number };
  variant: 'initial' | 'residual';
}) {
  const { t } = useTranslation();
  const total = counts.low + counts.medium + counts.high + counts.critical;
  
  const categories = [
    { key: 'critical', label: t("risk.level.critical", "Critical"), count: counts.critical, color: 'bg-red-500' },
    { key: 'high', label: t("risk.level.high", "High"), count: counts.high, color: 'bg-orange-500' },
    { key: 'medium', label: t("risk.level.medium", "Medium"), count: counts.medium, color: 'bg-amber-500' },
    { key: 'low', label: t("risk.level.low", "Low"), count: counts.low, color: 'bg-emerald-500' },
  ];

  return (
    <div className="bg-card/50 border border-border/30 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        {variant === 'initial' ? (
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        )}
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <div className="space-y-1.5">
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-center gap-2 text-[10px]">
            <div className={cn("w-2 h-2 rounded-sm", cat.color)} />
            <span className="flex-1 text-muted-foreground">{cat.label}</span>
            <span className="font-medium">{cat.count}</span>
            <span className="text-muted-foreground w-8 text-end">
              {total > 0 ? Math.round((cat.count / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
