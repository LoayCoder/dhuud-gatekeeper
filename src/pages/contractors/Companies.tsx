import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyListTable } from "@/components/contractors/CompanyListTable";
import { CompanyFormDialog } from "@/components/contractors/CompanyFormDialog";
import { CompanyDetailDialog } from "@/components/contractors/CompanyDetailDialog";
import { useContractorCompanies, ContractorCompany } from "@/hooks/contractor-management/use-contractor-companies";

export default function Companies() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<ContractorCompany | null>(null);
  const [editingCompany, setEditingCompany] = useState<ContractorCompany | null>(null);

  const { data: companies = [], isLoading } = useContractorCompanies({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {t("contractors.companies.title", "Contractor Companies")}
          </h1>
          <p className="text-muted-foreground">
            {t("contractors.companies.description", "Manage contractor companies and their information")}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 me-2" />
          {t("contractors.companies.addCompany", "Add Company")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("contractors.companies.searchPlaceholder", "Search companies...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 me-2" />
                  <SelectValue placeholder={t("common.status", "Status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                  <SelectItem value="active">{t("contractors.status.active", "Active")}</SelectItem>
                  <SelectItem value="suspended">{t("contractors.status.suspended", "Suspended")}</SelectItem>
                  <SelectItem value="inactive">{t("contractors.status.inactive", "Inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CompanyListTable
            companies={companies}
            isLoading={isLoading}
            onView={(company) => setSelectedCompany(company)}
            onEdit={(company) => setEditingCompany(company)}
          />
        </CardContent>
      </Card>

      <CompanyFormDialog
        open={isCreateOpen || !!editingCompany}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingCompany(null);
          }
        }}
        company={editingCompany}
      />

      <CompanyDetailDialog
        company={selectedCompany}
        open={!!selectedCompany}
        onOpenChange={(open) => !open && setSelectedCompany(null)}
        onEdit={(company) => {
          setSelectedCompany(null);
          setEditingCompany(company);
        }}
      />
    </div>
  );
}
