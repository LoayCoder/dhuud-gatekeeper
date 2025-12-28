import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, CheckCircle, XCircle } from "lucide-react";
import { usePurchaseRequests } from "@/hooks/use-asset-approval-workflows";
import { format } from "date-fns";
import { PurchaseApprovalDialog } from "./PurchaseApprovalDialog";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  cancelled: "outline",
};

export function PurchaseRequestsTable() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: requests, isLoading } = usePurchaseRequests(statusFilter === "all" ? undefined : statusFilter);
  
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

  const handleApprove = (requestId: string) => {
    setSelectedRequestId(requestId);
    setApprovalDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{t("purchaseRequest.list", "Purchase Requests")}</h3>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all", "All")}</SelectItem>
            <SelectItem value="pending">{t("purchaseRequest.status.pending", "Pending")}</SelectItem>
            <SelectItem value="approved">{t("purchaseRequest.status.approved", "Approved")}</SelectItem>
            <SelectItem value="rejected">{t("purchaseRequest.status.rejected", "Rejected")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {requests?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <p>{t("purchaseRequest.noRequests", "No purchase requests found")}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("purchaseRequest.requestNumber", "Request #")}</TableHead>
              <TableHead>{t("common.title", "Title")}</TableHead>
              <TableHead>{t("purchaseRequest.amount", "Amount")}</TableHead>
              <TableHead>{t("purchaseRequest.requestedBy", "Requested By")}</TableHead>
              <TableHead>{t("common.date", "Date")}</TableHead>
              <TableHead>{t("common.status", "Status")}</TableHead>
              <TableHead>{t("purchaseRequest.approvalLevel", "Level")}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests?.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-mono text-sm">{request.request_number}</TableCell>
                <TableCell className="font-medium">{request.title}</TableCell>
                <TableCell>
                  {(request.estimated_cost * request.quantity).toLocaleString()} {request.currency}
                </TableCell>
                <TableCell>
                  {(request as any).requester?.full_name || "-"}
                </TableCell>
                <TableCell>
                  {format(new Date(request.requested_at), "dd/MM/yyyy")}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_COLORS[request.status] || "secondary"}>
                    {t(`purchaseRequest.status.${request.status}`) as string}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{request.current_approval_level}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {request.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(request.id)}
                      >
                        <CheckCircle className="h-4 w-4 me-1" />
                        {t("common.review", "Review")}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PurchaseApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        requestId={selectedRequestId}
      />
    </div>
  );
}
