import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkerPhotoUpload } from "./WorkerPhotoUpload";
import { NATIONALITIES } from "@/lib/nationalities";
import { Lock, Pencil, Phone, Mail, User, Check, X } from "lucide-react";
import { SiteRepFormData } from "./SiteRepWorkerForm";

interface SiteRepLockedCardProps {
  data: SiteRepFormData;
  onChange: (data: SiteRepFormData) => void;
  isNew?: boolean;
}

export function SiteRepLockedCard({ data, onChange, isNew = false }: SiteRepLockedCardProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(isNew);
  const [editData, setEditData] = useState<SiteRepFormData>(data);

  const handleEdit = () => {
    setEditData(data);
    setIsEditing(true);
  };

  const handleSave = () => {
    onChange(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(data);
    setIsEditing(false);
  };

  const handleChange = (field: keyof SiteRepFormData, value: string | null) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const hasData = data.full_name || data.national_id;
  const isActive = true; // Default to active

  // Click-to-call handler
  const handlePhoneClick = (phone: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  if (isEditing) {
    return (
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              {t("contractors.companies.contractorSiteRep", "Contractor's Site Representative")}
            </CardTitle>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
              <Button type="button" variant="default" size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 me-1" />
                {t("common.save", "Save")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <WorkerPhotoUpload
              photoPath={editData.photo_path}
              onPhotoChange={(path) => handleChange("photo_path", path)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("common.fullName", "Full Name")} *</Label>
              <Input
                value={editData.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                placeholder={t("contractors.companies.repName", "Representative name")}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("contractors.workers.nationalId", "National ID")} *</Label>
              <Input
                value={editData.national_id}
                onChange={(e) => handleChange("national_id", e.target.value)}
                placeholder="10XXXXXXXX"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("contractors.workers.mobile", "Mobile")} *</Label>
              <Input
                value={editData.mobile_number}
                onChange={(e) => handleChange("mobile_number", e.target.value)}
                placeholder="+966..."
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("contractors.workers.nationality", "Nationality")}</Label>
              <Select value={editData.nationality} onValueChange={(v) => handleChange("nationality", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("contractors.workers.selectNationality", "Select")} />
                </SelectTrigger>
                <SelectContent>
                  {NATIONALITIES.map((nat) => (
                    <SelectItem key={nat.code} value={nat.code}>
                      {nat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("common.phone", "Phone")}</Label>
              <Input
                value={editData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+966..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("common.email", "Email")}</Label>
              <Input
                type="email"
                value={editData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("contractors.companies.siteRepRequired", "Each company must have exactly ONE site representative. This field is required.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Locked/Display Mode
  return (
    <Card className="border-muted">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            {t("contractors.companies.contractorSiteRep", "Contractor's Site Representative")}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasData && (
              <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                {isActive ? t("common.active", "Active") : t("common.inactive", "Inactive")}
              </Badge>
            )}
            <Button type="button" variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="h-4 w-4 me-1" />
              {t("common.edit", "Edit")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="flex items-start gap-4">
            {data.photo_path ? (
              <img
                src={data.photo_path}
                alt={data.full_name}
                className="w-16 h-16 rounded-full object-cover border-2 border-muted"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 space-y-1">
              <p className="font-medium">{data.full_name}</p>
              {data.mobile_number && (
                <button
                  type="button"
                  onClick={() => handlePhoneClick(data.mobile_number)}
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Phone className="h-3 w-3" />
                  {data.mobile_number}
                </button>
              )}
              {data.email && (
                <a
                  href={`mailto:${data.email}`}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                >
                  <Mail className="h-3 w-3" />
                  {data.email}
                </a>
              )}
              {data.national_id && (
                <p className="text-xs text-muted-foreground">
                  ID: {data.national_id}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t("contractors.companies.noSiteRep", "No site representative assigned")}</p>
            <p className="text-xs mt-1">{t("contractors.companies.clickEditToAdd", "Click Edit to add a site representative")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}