import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, MoreHorizontal, Eye, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { usePurchaseRequests, useDeletePurchaseRequest, PurchaseRequest } from "@/hooks/use-asset-approval-workflows";
import { format } from "date-fns";
import { PurchaseApprovalDialog } from "./PurchaseApprovalDialog";
import { AssetPurchaseRequestDialog } from "./AssetPurchaseRequestDialog";

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
  const deleteRequest = useDeletePurchaseRequest();
  
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<PurchaseRequest | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null);

  const handleApprove = (requestId: string) => {
    setSelectedRequestId(requestId);
    setApprovalDialogOpen(true);
  };

  const handleEdit = (request: PurchaseRequest) => {
    setEditRequest(request);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (requestId: string) => {
    setDeleteRequestId(requestId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteRequestId) {
      await deleteRequest.mutateAsync(deleteRequestId);
      setDeleteDialogOpen(false);
      setDeleteRequestId(null);
    }
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
              <TableHead className="text-start">{t("purchaseRequest.requestNumber", "Request #")}</TableHead>
              <TableHead className="text-start">{t("common.title", "Title")}</TableHead>
              <TableHead className="text-start">{t("purchaseRequest.amount", "Amount")}</TableHead>
              <TableHead className="text-start">{t("purchaseRequest.requestedBy", "Requested By")}</TableHead>
              <TableHead className="text-start">{t("common.date", "Date")}</TableHead>
              <TableHead className="text-start">{t("common.status", "Status")}</TableHead>
              <TableHead className="text-start">{t("purchaseRequest.approvalLevel", "Level")}</TableHead>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">{t("common.actions", "Actions")}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {request.status === "pending" && (
                        <>
                          <DropdownMenuItem onClick={() => handleApprove(request.id)}>
                            <CheckCircle className="h-4 w-4 me-2" />
                            {t("common.review", "Review")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(request)}>
                            <Pencil className="h-4 w-4 me-2" />
                            {t("common.edit", "Edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(request.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 me-2" />
                            {t("common.delete", "Delete")}
                          </DropdownMenuItem>
                        </>
                      )}
                      {request.status !== "pending" && (
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 me-2" />
                          {t("common.view", "View")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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

      <AssetPurchaseRequestDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        request={editRequest}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete", "Confirm Delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("purchaseRequest.deleteWarning", "Are you sure you want to delete this purchase request? This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRequest.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
