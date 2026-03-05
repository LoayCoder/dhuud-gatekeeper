import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Star, User } from "lucide-react";
import { WorkerPhotoUpload } from "./WorkerPhotoUpload";
import { NATIONALITIES } from "@/lib/nationalities";

export interface SafetyOfficerFullFormData {
  id?: string;
  full_name: string;
  national_id: string;
  mobile_number: string;
  nationality: string;
  photo_path: string | null;
  phone: string;
  email: string;
  is_primary: boolean;
  // Legacy fields for backward compatibility
  name?: string;
}

interface SafetyOfficerFullFormListProps {
  officers: SafetyOfficerFullFormData[];
  onChange: (officers: SafetyOfficerFullFormData[]) => void;
}

export function SafetyOfficerFullFormList({ officers, onChange }: SafetyOfficerFullFormListProps) {
  const { t } = useTranslation();

  const addOfficer = () => {
    const newOfficer: SafetyOfficerFullFormData = {
      full_name: "",
      national_id: "",
      mobile_number: "",
      nationality: "",
      photo_path: null,
      phone: "",
      email: "",
      is_primary: officers.length === 0,
    };
    onChange([...officers, newOfficer]);
  };

  const removeOfficer = (index: number) => {
    const updated = officers.filter((_, i) => i !== index);
    if (officers[index].is_primary && updated.length > 0) {
      updated[0].is_primary = true;
    }
    onChange(updated);
  };

  const updateOfficer = (index: number, field: keyof SafetyOfficerFullFormData, value: string | boolean | null) => {
    const updated = officers.map((officer, i) => {
      if (i === index) {
        return { ...officer, [field]: value };
      }
      if (field === "is_primary" && value === true) {
        return { ...officer, is_primary: false };
      }
      return officer;
    });
    onChange(updated);
  };

  const setPrimary = (index: number) => {
    const updated = officers.map((officer, i) => ({
      ...officer,
      is_primary: i === index,
    }));
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">
          {t("contractors.companies.contractorSafetyOfficers", "Contractor's Safety Officers")}
        </h4>
        <Button type="button" variant="outline" size="sm" onClick={addOfficer}>
          <Plus className="h-4 w-4 me-1" />
          {t("contractors.companies.addSafetyOfficer", "Add")}
        </Button>
      </div>

      {officers.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">
          <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("contractors.companies.noSafetyOfficers", "No safety officers added")}</p>
          <Button type="button" variant="link" size="sm" onClick={addOfficer} className="mt-2">
            {t("contractors.companies.addFirstOfficer", "Add the first safety officer")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {officers.map((officer, index) => (
            <Card key={officer.id || `new-${index}`} className="relative">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {officer.is_primary ? (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="h-3 w-3" />
                        {t("contractors.companies.primary", "Primary")}
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrimary(index)}
                        title={t("contractors.companies.setAsPrimary", "Set as primary")}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOfficer(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex justify-center mb-4">
                  <WorkerPhotoUpload
                    photoPath={officer.photo_path}
                    onPhotoChange={(path) => updateOfficer(index, "photo_path", path)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("common.fullName", "Full Name")} *</Label>
                    <Input
                      value={officer.full_name}
                      onChange={(e) => updateOfficer(index, "full_name", e.target.value)}
                      placeholder={t("contractors.companies.officerName", "Officer name")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("contractors.workers.nationalId", "National ID")} *</Label>
                    <Input
                      value={officer.national_id}
                      onChange={(e) => updateOfficer(index, "national_id", e.target.value)}
                      placeholder="10XXXXXXXX"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("contractors.workers.mobile", "Mobile")} *</Label>
                    <Input
                      value={officer.mobile_number}
                      onChange={(e) => updateOfficer(index, "mobile_number", e.target.value)}
                      placeholder="+966..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("contractors.workers.nationality", "Nationality")}</Label>
                    <Select 
                      value={officer.nationality} 
                      onValueChange={(v) => updateOfficer(index, "nationality", v)}
                    >
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
                      value={officer.phone}
                      onChange={(e) => updateOfficer(index, "phone", e.target.value)}
                      placeholder="+966..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("common.email", "Email")}</Label>
                    <Input
                      type="email"
                      value={officer.email}
                      onChange={(e) => updateOfficer(index, "email", e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t("contractors.companies.safetyOfficerFullNote", "Safety officers will be added to the workers list and can receive safety passes. Mark one as primary contact.")}
      </p>
    </div>
  );
}
