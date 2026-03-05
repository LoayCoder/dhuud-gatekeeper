import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, MoreHorizontal, Eye, CheckCircle, Pencil, Trash2, FileDown } from "lucide-react";
import { usePurchaseRequests, useDeletePurchaseRequest, PurchaseRequest } from '@/features/assets';
import { format } from "date-fns";
import { PurchaseApprovalDialog } from "./PurchaseApprovalDialog";
import { AssetPurchaseRequestDialog } from "./AssetPurchaseRequestDialog";
import { usePurchaseRequestPDF, PurchaseRequestPDFLanguage } from "@/hooks/use-purchase-request-pdf";
import { toast } from "sonner";

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
  const [exportRequestId, setExportRequestId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExportPDF = async (requestId: string, language: PurchaseRequestPDFLanguage) => {
    setExportRequestId(requestId);
    setIsExporting(true);
    try {
      // Dynamically import and use the hook's logic
      const { renderPurchaseRequestPDFTemplate } = await import('@/features/assets');
      const { generateBrandedPDFFromElement, preloadImageWithDimensions } = await import('@/lib/pdf-utils');
      const { fetchDocumentSettings } = await import('@/hooks/use-document-branding');
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Fetch request data
      const { data: request, error } = await (supabase as unknown)
        .from('asset_purchase_requests')
        .select(`
          *,
          requester:profiles!asset_purchase_requests_requested_by_fkey(full_name, employee_id),
          category:asset_categories(name, name_ar),
          type:asset_types(name, name_ar)
        `)
        .eq('id', requestId)
        .single();
      
      if (error) throw error;

      // Fetch approvals
      const { data: approvals } = await (supabase as unknown)
        .from('asset_purchase_approvals')
        .select(`
          id, approval_level, decision, notes, decided_at,
          approver:profiles!asset_purchase_approvals_approver_id_fkey(full_name, employee_id)
        `)
        .eq('request_id', requestId)
        .is('deleted_at', null)
        .order('approval_level', { ascending: true });

      const isRTL = language === 'ar';

      // Create container
      const container = document.createElement('div');
      container.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: 210mm;
        background: white;
        font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Arial, sans-serif;
      `;
      document.body.appendChild(container);

      // Render template
      container.innerHTML = renderPurchaseRequestPDFTemplate(request, {
        primaryLanguage: language,
        showQR: true,
        includeApprovalHistory: true,
        approvals: approvals || [],
      });

      // Fetch branding
      const documentSettings = await fetchDocumentSettings(request.tenant_id);

      // Generate PDF
      await generateBrandedPDFFromElement(container, {
        filename: `purchase-request-${request.request_number}.pdf`,
        margin: 10,
        quality: 2,
        header: {
          primaryText: documentSettings?.headerTextPrimary || t('purchaseRequest.pageTitle', 'Purchase Request'),
          secondaryText: documentSettings?.headerTextSecondary,
          bgColor: documentSettings?.headerBgColor || '#ffffff',
          textColor: documentSettings?.headerTextColor || '#1f2937',
        },
        footer: {
          text: documentSettings?.footerText || t('common.confidential', 'Confidential'),
          showPageNumbers: documentSettings?.showPageNumbers ?? true,
          showDatePrinted: documentSettings?.showDatePrinted ?? true,
          bgColor: documentSettings?.footerBgColor || '#f3f4f6',
          textColor: documentSettings?.footerTextColor || '#6b7280',
        },
        watermark: documentSettings?.watermarkEnabled && request.status !== 'approved' ? {
          text: documentSettings?.watermarkText || request.status.toUpperCase(),
          enabled: true,
          opacity: documentSettings?.watermarkOpacity ?? 15,
        } : undefined,
        isRTL,
      });

      document.body.removeChild(container);
      toast.success(t("common.exportSuccess", "PDF exported successfully"));
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error(t("common.exportError", "Failed to export PDF"));
    } finally {
      setIsExporting(false);
      setExportRequestId(null);
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
                  {(request as unknown).requester?.full_name || "-"}
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
                      <DropdownMenuSeparator />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger disabled={isExporting && exportRequestId === request.id}>
                          {isExporting && exportRequestId === request.id ? (
                            <Loader2 className="h-4 w-4 me-2 animate-spin" />
                          ) : (
                            <FileDown className="h-4 w-4 me-2" />
                          )}
                          {t("common.exportPDF", "Export PDF")}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => handleExportPDF(request.id, 'en')}>
                            <span className="me-2">ðŸ‡¬ðŸ‡§</span>
                            English
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportPDF(request.id, 'ar')}>
                            <span className="me-2">ðŸ‡¸ðŸ‡¦</span>
                            Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
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

