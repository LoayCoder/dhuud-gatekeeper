import { useTranslation } from "react-i18next";
import { Building2, CheckCircle, UserCheck, Users, AlertTriangle, PauseCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ContractorCompanyKPICardsProps {
  stats: {
    totalCompanies: number;
    activeCompanies: number;
    pendingWorkers: number;
    totalWorkers: number;
    expiringContracts: number;
    suspendedCompanies: number;
    inactiveCompanies: number;
  } | undefined;
  isLoading: boolean;
}

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  subtitle?: string;
}

function KPICard({ title, value, icon, variant = "default", subtitle }: KPICardProps) {
  const variantStyles = {
    default: "border-border bg-card",
    success: "border-chart-3/30 bg-chart-3/5",
    warning: "border-warning/30 bg-warning/5",
    danger: "border-destructive/30 bg-destructive/5",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    success: "text-chart-3",
    warning: "text-warning",
    danger: "text-destructive",
  };

  return (
    <Card className={cn("border transition-all hover:shadow-md", variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value.toLocaleString()}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn("rounded-lg p-2.5 bg-background/50", iconStyles[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KPICardSkeleton() {
  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ContractorCompanyKPICards({ stats, isLoading }: ContractorCompanyKPICardsProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const kpiCards = [
    {
      title: t("contractors.stats.totalCompanies", "Total Companies"),
      value: stats.totalCompanies,
      icon: <Building2 className="h-5 w-5" />,
      variant: "default" as const,
    },
    {
      title: t("contractors.stats.activeCompanies", "Active"),
      value: stats.activeCompanies,
      icon: <CheckCircle className="h-5 w-5" />,
      variant: "success" as const,
    },
    {
      title: t("contractors.stats.pendingWorkers", "Pending Workers"),
      value: stats.pendingWorkers,
      icon: <UserCheck className="h-5 w-5" />,
      variant: "warning" as const,
    },
    {
      title: t("contractors.stats.totalWorkers", "Total Workers"),
      value: stats.totalWorkers,
      icon: <Users className="h-5 w-5" />,
      variant: "default" as const,
    },
    {
      title: t("contractors.stats.expiringContracts", "Expiring Soon"),
      value: stats.expiringContracts,
      icon: <AlertTriangle className="h-5 w-5" />,
      variant: stats.expiringContracts > 0 ? "danger" as const : "default" as const,
      subtitle: t("contractors.stats.within30Days", "Within 30 days"),
    },
    {
      title: t("contractors.stats.needsAttention", "Needs Attention"),
      value: stats.suspendedCompanies + stats.inactiveCompanies,
      icon: <PauseCircle className="h-5 w-5" />,
      variant: (stats.suspendedCompanies + stats.inactiveCompanies) > 0 ? "warning" as const : "default" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpiCards.map((card, index) => (
        <KPICard key={index} {...card} />
      ))}
    </div>
  );
}
