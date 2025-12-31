import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Star, User } from "lucide-react";
import { SafetyOfficerFormData } from "@/hooks/contractor-management/use-contractor-safety-officers";

interface SafetyOfficersListProps {
  officers: SafetyOfficerFormData[];
  onChange: (officers: SafetyOfficerFormData[]) => void;
}

export function SafetyOfficersList({ officers, onChange }: SafetyOfficersListProps) {
  const { t } = useTranslation();

  const addOfficer = () => {
    const newOfficer: SafetyOfficerFormData = {
      name: "",
      phone: "",
      email: "",
      is_primary: officers.length === 0, // First one is primary by default
    };
    onChange([...officers, newOfficer]);
  };

  const removeOfficer = (index: number) => {
    const updated = officers.filter((_, i) => i !== index);
    // If we removed the primary officer, make the first one primary
    if (officers[index].is_primary && updated.length > 0) {
      updated[0].is_primary = true;
    }
    onChange(updated);
  };

  const updateOfficer = (index: number, field: keyof SafetyOfficerFormData, value: string | boolean) => {
    const updated = officers.map((officer, i) => {
      if (i === index) {
        return { ...officer, [field]: value };
      }
      // If setting is_primary to true, unset others
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
        <div className="space-y-3">
          {officers.map((officer, index) => (
            <Card key={officer.id || `new-${index}`} className="relative">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("common.name", "Name")} *</Label>
                      <Input
                        value={officer.name}
                        onChange={(e) => updateOfficer(index, "name", e.target.value)}
                        placeholder={t("contractors.companies.officerName", "Officer name")}
                        required
                      />
                    </div>
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
                  <div className="flex items-center gap-1 pt-5">
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t("contractors.companies.safetyOfficerNote", "Add all safety officers assigned to this contractor. Mark one as primary contact.")}
      </p>
    </div>
  );
}
