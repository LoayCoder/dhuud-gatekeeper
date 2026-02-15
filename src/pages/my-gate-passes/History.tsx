import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuBasedAdminRoute } from "@/components/auth/MenuBasedAdminRoute";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, History, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useGatePassApprovalHistory, useIsGatePassApprover } from "@/hooks/contractor-management/use-my-gate-passes";
import { format } from "date-fns";

function MyGatePassHistoryContent() {
  const { t } = useTranslation();

  const { data: approvalHistory, isLoading } = useGatePassApprovalHistory();
  const { data: isApprover } = useIsGatePassApprover();

  const getActionBadge = (action: "approved" | "rejected") => {
    return action === "approved" ? (
      <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        {t("gatePasses.action.approved", "Approved")}
      </Badge>
    ) : (
      <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        {t("gatePasses.action.rejected", "Rejected")}
      </Badge>
    );
  };

  const getRoleBadge = (role: "pm" | "safety" | "contractor" | "club_mgmt" | "security") => {
    const config: Record<string, { label: string; className: string }> = {
      pm: { label: t("gatePasses.role.pm", "Dept/PM"), className: "text-blue-600 border-blue-200 bg-blue-50" },
      safety: { label: t("gatePasses.role.safety", "Safety"), className: "text-green-600 border-green-200 bg-green-50" },
      contractor: { label: t("gatePasses.role.contractor", "Contractor"), className: "text-orange-600 border-orange-200 bg-orange-50" },
      club_mgmt: { label: t("gatePasses.role.clubMgmt", "Club Mgmt"), className: "text-purple-600 border-purple-200 bg-purple-50" },
      security: { label: t("gatePasses.role.security", "Security"), className: "text-emerald-600 border-emerald-200 bg-emerald-50" },
    };
    const c = config[role] || config.pm;
    return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/my-gate-passes">
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("myGatePasses.historyTitle", "Approval History")}
          </h1>
          <p className="text-muted-foreground">
            {isApprover 
              ? t("myGatePasses.historyDescriptionApprover", "Gate passes you have reviewed and approved/rejected")
              : t("myGatePasses.historyDescriptionUser", "History of your gate pass approvals")}
          </p>
        </div>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t("myGatePasses.approvalActions", "Approval Actions")}
          </CardTitle>
          <CardDescription>
            {approvalHistory?.length ?? 0} {t("common.records", "records")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !approvalHistory?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("myGatePasses.noHistory", "No approval history found")}</p>
              {!isApprover && (
                <p className="text-sm mt-2">
                  {t("myGatePasses.notApprover", "You are not configured as a gate pass approver")}
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("gatePasses.referenceNumber", "Reference")}</TableHead>
                    <TableHead>{t("gatePasses.material", "Material")}</TableHead>
                    <TableHead>{t("gatePasses.passDate", "Pass Date")}</TableHead>
                    <TableHead>{t("gatePasses.approvalRole", "Role")}</TableHead>
                    <TableHead>{t("gatePasses.action", "Action")}</TableHead>
                    <TableHead>{t("gatePasses.actionDate", "Action Date")}</TableHead>
                    <TableHead>{t("gatePasses.notes", "Notes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvalHistory.map(pass => (
                    <TableRow key={pass.id}>
                      <TableCell className="font-medium">{pass.reference_number}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {pass.material_description}
                      </TableCell>
                      <TableCell>
                        {pass.pass_date ? format(new Date(pass.pass_date), "PP") : "-"}
                      </TableCell>
                      <TableCell>{getRoleBadge(pass.approvalRole)}</TableCell>
                      <TableCell>{getActionBadge(pass.approvalAction)}</TableCell>
                      <TableCell>
                        {pass.approvalAt ? format(new Date(pass.approvalAt), "PPp") : "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {pass.approvalNotes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MyGatePassHistory() {
  return (
    <MenuBasedAdminRoute menuCode="my_gate_pass_history">
      <MyGatePassHistoryContent />
    </MenuBasedAdminRoute>
  );
}
