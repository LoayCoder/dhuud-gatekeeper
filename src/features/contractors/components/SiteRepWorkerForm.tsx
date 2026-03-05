import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkerPhotoUpload } from "./WorkerPhotoUpload";
import { NATIONALITIES } from "@/lib/nationalities";

export interface SiteRepFormData {
  full_name: string;
  national_id: string;
  mobile_number: string;
  nationality: string;
  photo_path: string | null;
  phone: string;
  email: string;
}

interface SiteRepWorkerFormProps {
  data: SiteRepFormData;
  onChange: (data: SiteRepFormData) => void;
}

export function SiteRepWorkerForm({ data, onChange }: SiteRepWorkerFormProps) {
  const { t } = useTranslation();

  const handleChange = (field: keyof SiteRepFormData, value: string | null) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <h4 className="font-medium text-sm">
        {t("contractors.companies.contractorSiteRep", "Contractor's Site Representative")}
      </h4>
      
      <div className="flex justify-center">
        <WorkerPhotoUpload
          photoPath={data.photo_path}
          onPhotoChange={(path) => handleChange("photo_path", path)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">{t("common.fullName", "Full Name")} *</Label>
          <Input
            value={data.full_name}
            onChange={(e) => handleChange("full_name", e.target.value)}
            placeholder={t("contractors.companies.repName", "Representative name")}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("contractors.workers.nationalId", "National ID")} *</Label>
          <Input
            value={data.national_id}
            onChange={(e) => handleChange("national_id", e.target.value)}
            placeholder="10XXXXXXXX"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">{t("contractors.workers.mobile", "Mobile")} *</Label>
          <Input
            value={data.mobile_number}
            onChange={(e) => handleChange("mobile_number", e.target.value)}
            placeholder="+966..."
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("contractors.workers.nationality", "Nationality")}</Label>
          <Select value={data.nationality} onValueChange={(v) => handleChange("nationality", v)}>
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
            value={data.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="+966..."
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("common.email", "Email")}</Label>
          <Input
            type="email"
            value={data.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="email@example.com"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("contractors.companies.siteRepNote", "The Site Representative will be added to the workers list and can receive a safety pass.")}
      </p>
    </div>
  );
}
