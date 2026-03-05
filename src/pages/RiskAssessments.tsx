import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRiskAssessments } from "@/hooks/risk-assessment";
import { format } from "date-fns";

const STATUS_CONFIG = {
  draft: { icon: FileText, color: "bg-gray-500", label: "Draft" },
  under_review: { icon: Clock, color: "bg-yellow-500", label: "Under Review" },
  approved: { icon: CheckCircle2, color: "bg-green-500", label: "Approved" },
  rejected: { icon: XCircle, color: "bg-red-500", label: "Rejected" },
  expired: { icon: AlertTriangle, color: "bg-orange-500", label: "Expired" },
};

const RISK_COLORS = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function RiskAssessments() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === "ar";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const { data: assessments, isLoading } = useRiskAssessments({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
  });

  const filteredAssessments = assessments?.filter((a) => {
    if (riskFilter !== "all" && a.overall_risk_rating !== riskFilter) return false;
    return true;
  });

  const stats = {
    total: assessments?.length || 0,
    draft: assessments?.filter((a) => a.status === "draft").length || 0,
    underReview: assessments?.filter((a) => a.status === "under_review").length || 0,
    approved: assessments?.filter((a) => a.status === "approved").length || 0,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t("risk.title", "Risk Assessments")}
          </h1>
          <p className="text-muted-foreground">
            {t("risk.subtitle", "Manage activity risk assessments")}
          </p>
        </div>
        <Button onClick={() => navigate("/risk-assessments/create")}>
          <Plus className="h-4 w-4 me-2" />
          {t("risk.create", "New Assessment")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">
              {t("risk.stats.total", "Total")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
            <div className="text-sm text-muted-foreground">
              {t("risk.stats.draft", "Drafts")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.underReview}</div>
            <div className="text-sm text-muted-foreground">
              {t("risk.stats.underReview", "Under Review")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-muted-foreground">
              {t("risk.stats.approved", "Approved")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("risk.search", "Search assessments...")}
                  className="ps-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 me-2" />
                <SelectValue placeholder={t("risk.filter.status", "Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                <SelectItem value="draft">{t("risk.status.draft", "Draft")}</SelectItem>
                <SelectItem value="under_review">{t("risk.status.underReview", "Under Review")}</SelectItem>
                <SelectItem value="approved">{t("risk.status.approved", "Approved")}</SelectItem>
                <SelectItem value="rejected">{t("risk.status.rejected", "Rejected")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[160px]">
                <AlertTriangle className="h-4 w-4 me-2" />
                <SelectValue placeholder={t("risk.filter.risk", "Risk Level")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                <SelectItem value="low">{t("risk.level.low", "Low")}</SelectItem>
                <SelectItem value="medium">{t("risk.level.medium", "Medium")}</SelectItem>
                <SelectItem value="high">{t("risk.level.high", "High")}</SelectItem>
                <SelectItem value="critical">{t("risk.level.critical", "Critical")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("risk.table.number", "Ref #")}</TableHead>
                <TableHead>{t("risk.table.activity", "Activity")}</TableHead>
                <TableHead>{t("risk.table.location", "Location")}</TableHead>
                <TableHead>{t("risk.table.risk", "Risk")}</TableHead>
                <TableHead>{t("risk.table.status", "Status")}</TableHead>
                <TableHead>{t("risk.table.date", "Date")}</TableHead>
                <TableHead>{t("risk.table.validUntil", "Valid Until")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {t("common.loading", "Loading...")}
                  </TableCell>
                </TableRow>
              ) : filteredAssessments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t("risk.noAssessments", "No risk assessments found")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssessments?.map((assessment) => {
                  const statusConfig = STATUS_CONFIG[assessment.status as keyof typeof STATUS_CONFIG];
                  const StatusIcon = statusConfig?.icon || FileText;
                  const activityName = isRTL && assessment.activity_name_ar
                    ? assessment.activity_name_ar
                    : assessment.activity_name;

                  return (
                    <TableRow
                      key={assessment.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/risk-assessments/${assessment.id}`)}
                    >
                      <TableCell className="font-mono text-sm">
                        {assessment.assessment_number}
                      </TableCell>
                      <TableCell className="font-medium">{activityName}</TableCell>
                      <TableCell>{assessment.location || "-"}</TableCell>
                      <TableCell>
                        {assessment.overall_risk_rating && (
                          <Badge
                            className={RISK_COLORS[assessment.overall_risk_rating as keyof typeof RISK_COLORS]}
                          >
                            {t(`risk.level.${assessment.overall_risk_rating}`, assessment.overall_risk_rating)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${statusConfig?.color}`} />
                          <span className="text-sm">
                            {t(`risk.status.${assessment.status}`, statusConfig?.label)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(assessment.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {assessment.valid_until
                          ? format(new Date(assessment.valid_until), "dd/MM/yyyy")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
