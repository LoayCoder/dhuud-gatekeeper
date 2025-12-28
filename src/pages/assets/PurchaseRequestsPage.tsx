import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PurchaseRequestsTable } from "@/components/assets/PurchaseRequestsTable";
import { AssetPurchaseRequestDialog } from "@/components/assets/AssetPurchaseRequestDialog";

export default function PurchaseRequestsPage() {
  const { t } = useTranslation();
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("purchaseRequest.pageTitle", "Purchase Requests")}</h1>
          <p className="text-muted-foreground">{t("purchaseRequest.pageSubtitle", "Manage and track asset purchase requests")}</p>
        </div>
        <Button onClick={() => setIsNewRequestOpen(true)}>
          <Plus className="h-4 w-4 me-2" />
          {t("purchaseRequest.newRequest", "New Request")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("purchaseRequest.list", "Purchase Requests")}</CardTitle>
          <CardDescription>{t("purchaseRequest.listDesc", "View and manage all purchase requests across your organization")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PurchaseRequestsTable />
        </CardContent>
      </Card>

      <AssetPurchaseRequestDialog 
        open={isNewRequestOpen} 
        onOpenChange={setIsNewRequestOpen} 
      />
    </div>
  );
}
