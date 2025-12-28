import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, Mail, MessageSquare } from "lucide-react";
import { useAssetNotificationPreferences, useSaveAssetNotificationPreferences } from "@/hooks/use-asset-notification-preferences";
import { useState, useEffect } from "react";

export function AssetNotificationPreferences() {
  const { t } = useTranslation();
  const { data: preferences, isLoading } = useAssetNotificationPreferences();
  const savePreferences = useSaveAssetNotificationPreferences();
  
  const [formData, setFormData] = useState(preferences);
  
  useEffect(() => {
    if (preferences) {
      setFormData(preferences);
    }
  }, [preferences]);
  
  if (isLoading || !formData) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  
  const handleSave = () => {
    savePreferences.mutate(formData);
  };
  
  const updateField = (field: string, value: boolean | number) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };
  
  const NotificationRow = ({ 
    title, 
    emailField, 
    whatsappField, 
    daysField 
  }: { 
    title: string; 
    emailField: string; 
    whatsappField: string; 
    daysField?: string;
  }) => (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="font-medium">{title}</div>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={(formData as any)[emailField]}
            onCheckedChange={(v) => updateField(emailField, v)}
          />
          <Mail className="h-4 w-4 text-muted-foreground" />
          <Label>{t("settings.email", "Email")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={(formData as any)[whatsappField]}
            onCheckedChange={(v) => updateField(whatsappField, v)}
          />
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <Label>{t("settings.whatsapp", "WhatsApp")}</Label>
        </div>
        {daysField && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={90}
              value={(formData as any)[daysField]}
              onChange={(e) => updateField(daysField, parseInt(e.target.value) || 7)}
              className="w-20"
            />
            <Label className="text-muted-foreground">{t("settings.daysBefore", "days before")}</Label>
          </div>
        )}
      </div>
    </div>
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t("settings.assetNotifications", "Asset Notifications")}
        </CardTitle>
        <CardDescription>
          {t("settings.assetNotificationsDescription", "Configure how you receive alerts for asset-related events")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <NotificationRow
          title={t("settings.warrantyExpiry", "Warranty Expiry")}
          emailField="warranty_expiry_email"
          whatsappField="warranty_expiry_whatsapp"
          daysField="warranty_expiry_days_before"
        />
        <NotificationRow
          title={t("settings.maintenanceDue", "Maintenance Due")}
          emailField="maintenance_due_email"
          whatsappField="maintenance_due_whatsapp"
          daysField="maintenance_due_days_before"
        />
        <NotificationRow
          title={t("settings.lowStock", "Low Stock Alerts")}
          emailField="low_stock_email"
          whatsappField="low_stock_whatsapp"
        />
        <NotificationRow
          title={t("settings.depreciation", "Depreciation Alerts")}
          emailField="depreciation_email"
          whatsappField="depreciation_whatsapp"
        />
        <NotificationRow
          title={t("settings.insuranceExpiry", "Insurance Expiry")}
          emailField="insurance_expiry_email"
          whatsappField="insurance_expiry_whatsapp"
          daysField="insurance_expiry_days_before"
        />
        
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={savePreferences.isPending}>
            {savePreferences.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
