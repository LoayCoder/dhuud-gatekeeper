import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ShieldAlert, ChevronDown, ChevronUp, X, CheckCircle, Clock, AlertTriangle, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, isBefore } from "date-fns";

interface RiskAssessmentCardProps {
  approved: number;
  pending: number;
  expired: number;
  highRisk: number;
  total: number;
}

type FilterType = "approved" | "pending" | "expired" | "highRisk" | null;

const ITEMS_PER_PAGE = 5;

export function RiskAssessmentCard({ 
  approved, 
  pending, 
  expired, 
  highRisk, 
  total 
}: RiskAssessmentCardProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Fetch risk assessments - use correct columns: activity_name, assessment_number, overall_risk_rating, valid_until
  const { data: assessments = [] } = useQuery({
    queryKey: ["contractor-dashboard-risk-assessments", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data } = await supabase
        .from("risk_assessments")
        .select("id, assessment_number, activity_name, status, overall_risk_rating, valid_until, assessment_date")
        .eq("tenant_id", profile.tenant_id)
        .is("deleted_at", null)
        .order("assessment_date", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!profile?.tenant_id && isExpanded,
  });

  const handleFilterClick = (filter: FilterType) => {
    setActiveFilter(activeFilter === filter ? null : filter);
    setIsExpanded(true);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const now = new Date();

  const filteredAssessments = useMemo(() => {
    if (!activeFilter) return assessments;
    
    return assessments.filter((r) => {
      const isExpiredByDate = r.valid_until && isBefore(new Date(r.valid_until), now);
      const isHighRisk = r.overall_risk_rating === "high" || r.overall_risk_rating === "critical";
      
      switch (activeFilter) {
        case "approved":
          return (r.status === "approved" || r.status === "active") && !isExpiredByDate;
        case "pending":
          return r.status === "draft" || r.status === "pending_review";
        case "expired":
          return r.status === "expired" || isExpiredByDate;
        case "highRisk":
          return isHighRisk;
        default:
          return true;
      }
    });
  }, [assessments, activeFilter, now]);

  const visibleAssessments = filteredAssessments.slice(0, visibleCount);

  const statusCards = [
    {
      key: "approved" as FilterType,
      label: t("contractors.dashboard.approved", "Approved"),
      count: approved,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      key: "pending" as FilterType,
      label: t("contractors.dashboard.pending", "Pending"),
      count: pending,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      key: "expired" as FilterType,
      label: t("contractors.dashboard.expired", "Expired"),
      count: expired,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      key: "highRisk" as FilterType,
      label: t("contractors.dashboard.highRisk", "High Risk"),
      count: highRisk,
      icon: Flame,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  const getRiskBadge = (riskLevel: string | null) => {
    if (!riskLevel) return null;
    const riskColors: Record<string, string> = {
      critical: "bg-destructive text-destructive-foreground",
      high: "bg-destructive/80 text-destructive-foreground",
      medium: "bg-warning text-warning-foreground",
      low: "bg-success/80 text-success-foreground",
    };
    return (
      <Badge className={riskColors[riskLevel] || riskColors.low}>
        {riskLevel}
      </Badge>
    );
  };

  const getStatusBadge = (status: string | null, validUntil: string | null) => {
    const isExpiredByDate = validUntil && isBefore(new Date(validUntil), now);
    
    if (status === "expired" || isExpiredByDate) {
      return <Badge variant="destructive">{t("common.expired", "Expired")}</Badge>;
    }
    if (status === "approved" || status === "active") {
      return <Badge variant="outline" className="border-success text-success">{t("common.approved", "Approved")}</Badge>;
    }
    return <Badge variant="outline" className="border-warning text-warning">{t("common.pending", "Pending")}</Badge>;
  };

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-full bg-warning/10">
                <ShieldAlert className="h-5 w-5 text-warning" />
              </div>
              {t("contractors.dashboard.riskAssessments", "Risk Assessments")}
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {statusCards.map((card) => (
              <button
                key={card.key}
                onClick={() => handleFilterClick(card.key)}
                className={cn(
                  "p-3 rounded-lg text-center transition-all cursor-pointer",
                  card.bgColor,
                  activeFilter === card.key && "ring-2 ring-primary ring-offset-2"
                )}
              >
                <card.icon className={cn("h-4 w-4 mx-auto mb-1", card.color)} />
                <p className="text-lg font-bold">{card.count}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </button>
            ))}
          </div>

          <CollapsibleContent className="space-y-3">
            {/* Active Filter */}
            {activeFilter && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                <span className="text-sm">
                  {t("contractors.dashboard.showingFiltered", "Showing {{status}} only", {
                    status: statusCards.find((s) => s.key === activeFilter)?.label,
                  })}
                </span>
                <Button variant="ghost" size="sm" onClick={clearFilter}>
                  <X className="h-4 w-4 me-1" />
                  {t("common.clearFilter", "Clear")}
                </Button>
              </div>
            )}

            {/* Assessments List */}
            {visibleAssessments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {t("contractors.dashboard.noAssessmentsMatch", "No assessments match this filter")}
              </div>
            ) : (
              <div className="space-y-2">
                {visibleAssessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{assessment.activity_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {assessment.assessment_number}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {assessment.valid_until && `Expires: ${format(new Date(assessment.valid_until), "dd/MM/yyyy")}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(assessment.status, assessment.valid_until)}
                        {getRiskBadge(assessment.overall_risk_rating)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            {filteredAssessments.length > visibleCount && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
              >
                {t("common.loadMore", "Load More")}
              </Button>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
