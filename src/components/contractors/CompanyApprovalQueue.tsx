import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Calendar, Mail, Phone, User, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import {
  usePendingCompanyApprovals,
  useApproveCompany,
  useRejectCompany,
  type ContractorCompany,
} from "@/hooks/contractor-management/use-contractor-companies";
import { PageLoader } from "@/components/ui/page-loader";

export function CompanyApprovalQueue() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  
  const { data: pendingCompanies, isLoading } = usePendingCompanyApprovals();
  const approveCompany = useApproveCompany();
  const rejectCompany = useRejectCompany();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<ContractorCompany | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = (company: ContractorCompany) => {
    approveCompany.mutate(company.id);
  };

  const openRejectDialog = (company: ContractorCompany) => {
    setSelectedCompany(company);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (selectedCompany && rejectionReason.trim()) {
      rejectCompany.mutate(
        { companyId: selectedCompany.id, reason: rejectionReason },
        {
          onSuccess: () => {
            setRejectDialogOpen(false);
            setSelectedCompany(null);
            setRejectionReason("");
          },
        }
      );
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!pendingCompanies || pendingCompanies.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            {t("contractors.noCompaniesAwaitingApproval", "No companies awaiting approval")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {t("contractors.pendingApprovals", "Pending Approvals")}
        </h2>
        <Badge variant="secondary" className="text-sm">
          {pendingCompanies.length} {t("contractors.pending", "pending")}
        </Badge>
      </div>

      <div className="grid gap-4">
        {pendingCompanies.map((company) => (
          <Card key={company.id} className="border-s-4 border-s-warning">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {isRTL && company.company_name_ar ? company.company_name_ar : company.company_name}
                    </CardTitle>
                    {company.city && (
                      <p className="text-sm text-muted-foreground">{company.city}</p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  <Clock className="h-3 w-3 me-1" />
                  {t("contractors.pendingApproval", "Pending Approval")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Site Representative Info */}
              {(company as any).contractor_site_rep_name && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t("contractors.siteRepresentative", "Site Representative")}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <span>{(company as any).contractor_site_rep_name}</span>
                    {(company as any).contractor_site_rep_email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {(company as any).contractor_site_rep_email}
                      </span>
                    )}
                    {(company as any).contractor_site_rep_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {(company as any).contractor_site_rep_phone}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Contract Period */}
              {((company as any).contract_start_date || (company as any).contract_end_date) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {t("contractors.contractPeriod", "Contract Period")}:{" "}
                    {(company as any).contract_start_date && format(new Date((company as any).contract_start_date), "PP")}
                    {(company as any).contract_start_date && (company as any).contract_end_date && " - "}
                    {(company as any).contract_end_date && format(new Date((company as any).contract_end_date), "PP")}
                  </span>
                </div>
              )}

              {/* Scope of Work */}
              {(company as any).scope_of_work && (
                <div className="text-sm">
                  <span className="font-medium">{t("contractors.scopeOfWork", "Scope of Work")}:</span>{" "}
                  <span className="text-muted-foreground">{(company as any).scope_of_work}</span>
                </div>
              )}

              {/* Requested At */}
              {company.approval_requested_at && (
                <p className="text-xs text-muted-foreground">
                  {t("contractors.requestedAt", "Requested")}:{" "}
                  {format(new Date(company.approval_requested_at), "PPp")}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => handleApprove(company)}
                  disabled={approveCompany.isPending}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 me-2" />
                  {t("common.approve", "Approve")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openRejectDialog(company)}
                  disabled={rejectCompany.isPending}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 me-2" />
                  {t("common.reject", "Reject")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("contractors.rejectCompany", "Reject Company")}</DialogTitle>
            <DialogDescription>
              {t(
                "contractors.rejectCompanyDescription",
                "Please provide a reason for rejecting this company registration."
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder={t("contractors.rejectionReasonPlaceholder", "Enter rejection reason...")}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectCompany.isPending}
            >
              {t("common.reject", "Reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
