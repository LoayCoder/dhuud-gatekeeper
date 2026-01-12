import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Eye, Pencil, MoreHorizontal, CheckCircle, XCircle, PauseCircle, AlertTriangle, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ContractorCompany, useChangeContractorStatus, useCheckExpiredContracts, useDeleteContractorCompany, useHardDeleteContractorCompany } from "@/hooks/contractor-management/use-contractor-companies";

interface CompanyListTableProps {
  companies: ContractorCompany[];
  isLoading: boolean;
  onView: (company: ContractorCompany) => void;
  onEdit: (company: ContractorCompany) => void;
}

export function CompanyListTable({ companies, isLoading, onView, onEdit }: CompanyListTableProps) {
  const { t } = useTranslation();
  const changeStatus = useChangeContractorStatus();
  const checkExpired = useCheckExpiredContracts();
  const softDelete = useDeleteContractorCompany();
  const hardDelete = useHardDeleteContractorCompany();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<ContractorCompany | null>(null);

  // Check for expired contracts on mount
  useEffect(() => {
    checkExpired.mutate();
  }, []);

  if (isLoading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (companies.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{t("contractors.companies.noCompanies", "No companies found")}</div>;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline" | "warning"> = {
      active: "default", 
      suspended: "destructive", 
      inactive: "secondary",
      expired: "outline",
      pending_approval: "warning",
    };
    return <Badge variant={variants[status] || "secondary"}>{t(`contractors.status.${status}`, status)}</Badge>;
  };

  const handleStatusChange = (companyId: string, newStatus: string) => {
    changeStatus.mutate({ id: companyId, status: newStatus });
  };

  const openDeleteDialog = (company: ContractorCompany) => {
    setCompanyToDelete(company);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!companyToDelete) return;
    
    // Hard delete for pending_approval, soft delete for others
    if (companyToDelete.status === "pending_approval") {
      hardDelete.mutate(companyToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setCompanyToDelete(null);
        },
      });
    } else {
      softDelete.mutate(companyToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setCompanyToDelete(null);
        },
      });
    }
  };

  const isPendingApproval = companyToDelete?.status === "pending_approval";

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("contractors.companies.name", "Company Name")}</TableHead>
          <TableHead>{t("contractors.companies.email", "Email")}</TableHead>
          <TableHead>{t("contractors.companies.phone", "Phone")}</TableHead>
          <TableHead>{t("contractors.companies.city", "City")}</TableHead>
          <TableHead>{t("common.status", "Status")}</TableHead>
          <TableHead className="text-end">{t("common.actions", "Actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((company) => (
          <TableRow key={company.id}>
            <TableCell className="font-medium">{company.company_name}</TableCell>
            <TableCell>{company.email || "-"}</TableCell>
            <TableCell>{company.phone || "-"}</TableCell>
            <TableCell>{company.city || "-"}</TableCell>
            <TableCell>{getStatusBadge(company.status)}</TableCell>
            <TableCell className="text-end">
              <Button variant="ghost" size="icon" onClick={() => onView(company)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onEdit(company)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    {t("contractors.companies.changeStatus", "Change Status")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {company.status !== "active" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(company.id, "active")}>
                      <CheckCircle className="h-4 w-4 me-2 text-green-600" />
                      {t("contractors.status.active", "Active")}
                    </DropdownMenuItem>
                  )}
                  {company.status !== "inactive" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(company.id, "inactive")}>
                      <XCircle className="h-4 w-4 me-2 text-muted-foreground" />
                      {t("contractors.status.inactive", "Inactive")}
                    </DropdownMenuItem>
                  )}
                  {company.status !== "suspended" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(company.id, "suspended")}>
                      <PauseCircle className="h-4 w-4 me-2 text-destructive" />
                      {t("contractors.status.suspended", "Suspended")}
                    </DropdownMenuItem>
                  )}
                  {company.status !== "expired" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(company.id, "expired")}>
                      <AlertTriangle className="h-4 w-4 me-2 text-yellow-600" />
                      {t("contractors.status.expired", "Expired")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => openDeleteDialog(company)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 me-2" />
                    {company.status === "pending_approval" 
                      ? t("common.deletePermanently", "Delete Permanently")
                      : t("common.delete", "Delete")
                    }
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isPendingApproval 
              ? t("contractors.deletePermanentlyTitle", "Delete Company Permanently?")
              : t("contractors.deleteCompanyTitle", "Delete Company?")
            }
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isPendingApproval 
              ? t("contractors.deletePermanentlyDescription", "This will permanently remove the company and all related data. This action cannot be undone.")
              : t("contractors.deleteCompanyDescription", "This will archive the company. You can restore it later if needed.")
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPendingApproval 
              ? t("common.deletePermanently", "Delete Permanently")
              : t("common.delete", "Delete")
            }
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
