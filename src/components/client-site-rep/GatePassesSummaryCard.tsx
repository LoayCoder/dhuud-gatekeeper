import { useState } from "react";
import { Ticket, Clock, CheckCircle, XCircle, TimerOff, ChevronDown, ChevronUp, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import type { ClientSiteRepGatePassSummary, ClientSiteRepGatePassDetail } from "@/hooks/contractor-management/use-client-site-rep-data";

interface GatePassesSummaryCardProps {
  summary: ClientSiteRepGatePassSummary;
  recentGatePasses?: ClientSiteRepGatePassDetail[];
}

export function GatePassesSummaryCard({ summary, recentGatePasses = [] }: GatePassesSummaryCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStatusClick = (e: React.MouseEvent, status: string) => {
    e.stopPropagation();
    setIsExpanded(true);
  };

  const handleViewAll = () => {
    navigate("/contractors/gate-passes");
  };

  const stats = [
    {
      label: t("clientSiteRep.pending", "Pending"),
      value: summary.pending,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      status: "pending",
    },
    {
      label: t("clientSiteRep.approved", "Approved"),
      value: summary.approved,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
      status: "approved",
    },
    {
      label: t("clientSiteRep.rejected", "Rejected"),
      value: summary.rejected,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/30",
      status: "rejected",
    },
    {
      label: t("clientSiteRep.expired", "Expired"),
      value: summary.expired,
      icon: TimerOff,
      color: "text-gray-600 dark:text-gray-400",
      bg: "bg-gray-100 dark:bg-gray-900/30",
      status: "expired",
    },
  ];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved": return "default";
      case "pending": return "secondary";
      case "rejected": return "destructive";
      case "expired": return "outline";
      default: return "secondary";
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                {t("clientSiteRep.gatePasses", "Gate Passes")}
                <span className="text-muted-foreground font-normal">({summary.total})</span>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`${stat.bg} rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={(e) => handleStatusClick(e, stat.status)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleStatusClick(e as unknown as React.MouseEvent, stat.status)}
              >
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>

        <CollapsibleContent>
          <div className="border-t px-4 pb-4 pt-3 space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              {t("clientSiteRep.recentGatePasses", "Recent Gate Passes")}
            </p>
            
            {recentGatePasses.length > 0 ? (
              recentGatePasses.map((gatePass) => (
                <div
                  key={gatePass.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium truncate">{gatePass.pass_number}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {gatePass.material_description || gatePass.company_name}
                    </p>
                    {gatePass.pass_date && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(gatePass.pass_date), "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="ms-3">
                    <Badge variant={getStatusBadgeVariant(gatePass.status)}>
                      {gatePass.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("clientSiteRep.noGatePassesFound", "No gate passes found")}
              </p>
            )}

            <Button 
              variant="outline" 
              className="w-full mt-3"
              onClick={handleViewAll}
            >
              {t("clientSiteRep.viewAllGatePasses", "View All Gate Passes")}
            </Button>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
