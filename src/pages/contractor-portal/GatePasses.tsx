import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Truck, Search, CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ContractorPortalLayout from "@/components/contractor-portal/ContractorPortalLayout";
import ContractorGatePassRequest from "@/components/contractor-portal/ContractorGatePassRequest";
import { useContractorPortalData, useContractorGatePasses } from "@/hooks/contractor-management";
import { format } from "date-fns";

export default function ContractorPortalGatePasses() {
  const { t } = useTranslation();
  const { company, projects, isLoading } = useContractorPortalData();
  const { data: gatePasses } = useContractorGatePasses(company?.id);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPasses = gatePasses?.filter(pass => 
    pass.reference_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pass.vehicle_plate?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 me-1" />{t("common.approved", "Approved")}</Badge>;
      case "pending_pm_approval":
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="h-3 w-3 me-1" />{t("contractors.gatePasses.pendingPM", "Pending PM")}</Badge>;
      case "pending_safety_approval":
        return <Badge variant="outline" className="text-blue-500 border-blue-500"><Clock className="h-3 w-3 me-1" />{t("contractors.gatePasses.pendingSafety", "Pending Safety")}</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 me-1" />{t("common.rejected", "Rejected")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <ContractorPortalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </ContractorPortalLayout>
    );
  }

  const activeProjects = projects?.filter(p => p.status === "active") || [];

  return (
    <ContractorPortalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{t("contractorPortal.gatePasses.title", "Gate Passes")}</h1>
              <p className="text-muted-foreground">{t("contractorPortal.gatePasses.description", "Request and track material gate passes")}</p>
            </div>
          </div>
          <Button onClick={() => setIsFormOpen(true)} disabled={activeProjects.length === 0}>
            <Plus className="h-4 w-4 me-2" />
            {t("contractorPortal.gatePasses.requestPass", "Request Pass")}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t("common.search", "Search...")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredPasses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t("contractorPortal.gatePasses.noPasses", "No gate passes")}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("contractors.gatePasses.reference", "Reference")}</TableHead>
                    <TableHead>{t("contractors.gatePasses.date", "Date")}</TableHead>
                    <TableHead>{t("contractors.gatePasses.type", "Type")}</TableHead>
                    <TableHead>{t("contractors.gatePasses.vehicle", "Vehicle")}</TableHead>
                    <TableHead>{t("common.status", "Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPasses.map((pass) => (
                    <TableRow key={pass.id}>
                      <TableCell className="font-mono">{pass.reference_number}</TableCell>
                      <TableCell>{format(new Date(pass.pass_date), "PP")}</TableCell>
                      <TableCell>{pass.pass_type}</TableCell>
                      <TableCell>{pass.vehicle_plate || "-"}</TableCell>
                      <TableCell>{getStatusBadge(pass.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {company && <ContractorGatePassRequest open={isFormOpen} onOpenChange={setIsFormOpen} companyId={company.id} projects={activeProjects} />}
      </div>
    </ContractorPortalLayout>
  );
}
