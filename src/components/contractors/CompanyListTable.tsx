import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ContractorCompany } from "@/hooks/contractor-management/use-contractor-companies";

interface CompanyListTableProps {
  companies: ContractorCompany[];
  isLoading: boolean;
  onView: (company: ContractorCompany) => void;
  onEdit: (company: ContractorCompany) => void;
}

export function CompanyListTable({ companies, isLoading, onView, onEdit }: CompanyListTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (companies.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{t("contractors.companies.noCompanies", "No companies found")}</div>;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default", suspended: "destructive", inactive: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"}>{t(`contractors.status.${status}`, status)}</Badge>;
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
              <Button variant="ghost" size="icon" onClick={() => onView(company)}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => onEdit(company)}><Pencil className="h-4 w-4" /></Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
