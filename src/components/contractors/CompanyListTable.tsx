import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Eye, Pencil, MoreHorizontal, CheckCircle, XCircle, PauseCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ContractorCompany, useChangeContractorStatus, useCheckExpiredContracts } from "@/hooks/contractor-management/use-contractor-companies";

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
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default", 
      suspended: "destructive", 
      inactive: "secondary",
      expired: "outline",
    };
    return <Badge variant={variants[status] || "secondary"}>{t(`contractors.status.${status}`, status)}</Badge>;
  };

  const handleStatusChange = (companyId: string, newStatus: string) => {
    changeStatus.mutate({ id: companyId, status: newStatus });
  };

  return (
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
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
