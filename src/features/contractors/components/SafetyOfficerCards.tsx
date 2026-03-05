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
import { Plus, Pencil, Phone, Mail, User, Check, X, Star, UserMinus } from "lucide-react";
import { SafetyOfficerFullFormData } from "./SafetyOfficerFullForm";

interface SafetyOfficerCardsProps {
  officers: SafetyOfficerFullFormData[];
  onChange: (officers: SafetyOfficerFullFormData[]) => void;
}

export function SafetyOfficerCards({ officers, onChange }: SafetyOfficerCardsProps) {
  const { t } = useTranslation();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<SafetyOfficerFullFormData | null>(null);

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
    setEditingIndex(officers.length);
    setEditData(newOfficer);
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditData({ ...officers[index] });
  };

  const saveEdit = () => {
    if (editingIndex === null || !editData) return;
    const updated = [...officers];
    updated[editingIndex] = editData;
    onChange(updated);
    setEditingIndex(null);
    setEditData(null);
  };

  const cancelEdit = () => {
    // If it's a new empty officer, remove it
    if (editingIndex !== null && editingIndex === officers.length - 1 && !officers[editingIndex].full_name) {
      onChange(officers.slice(0, -1));
    }
    setEditingIndex(null);
    setEditData(null);
  };

  const deactivateOfficer = (index: number) => {
    const updated = officers.filter((_, i) => i !== index);
    // If we removed the primary, make the first one primary
    if (officers[index].is_primary && updated.length > 0) {
      updated[0] = { ...updated[0], is_primary: true };
    }
    onChange(updated);
  };

  const setPrimary = (index: number) => {
    const updated = officers.map((officer, i) => ({
      ...officer,
      is_primary: i === index,
    }));
    onChange(updated);
  };

  const handleChange = (field: keyof SafetyOfficerFullFormData, value: string | boolean | null) => {
    if (!editData) return;
    setEditData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handlePhoneClick = (phone: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
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
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t("contractors.companies.noSafetyOfficers", "No safety officers added")}</p>
            <Button type="button" variant="link" size="sm" onClick={addOfficer} className="mt-2">
              {t("contractors.companies.addFirstOfficer", "Add the first safety officer")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {officers.map((officer, index) => (
            <Card key={officer.id || `new-${index}`} className={editingIndex === index ? "border-primary/50 bg-primary/5" : ""}>
              {editingIndex === index && editData ? (
                // Edit Mode
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t("common.editing", "Editing")}</span>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="default" size="sm" onClick={saveEdit}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <WorkerPhotoUpload
                      photoPath={editData.photo_path}
                      onPhotoChange={(path) => handleChange("photo_path", path)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("common.fullName", "Full Name")} *</Label>
                      <Input
                        value={editData.full_name}
                        onChange={(e) => handleChange("full_name", e.target.value)}
                        placeholder={t("contractors.companies.officerName", "Officer name")}
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

                  <div className="grid grid-cols-2 gap-2">
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

                  <div className="space-y-1">
                    <Label className="text-xs">{t("common.email", "Email")}</Label>
                    <Input
                      type="email"
                      value={editData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                </CardContent>
              ) : (
                // Display Mode
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    {officer.photo_path ? (
                      <img
                        src={officer.photo_path}
                        alt={officer.full_name}
                        className="w-12 h-12 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{officer.full_name || t("common.unnamed", "Unnamed")}</p>
                        {officer.is_primary && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Star className="h-3 w-3" />
                            {t("contractors.companies.primary", "Primary")}
                          </Badge>
                        )}
                      </div>
                      {officer.mobile_number && (
                        <button
                          type="button"
                          onClick={() => handlePhoneClick(officer.mobile_number)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          <Phone className="h-3 w-3" />
                          {officer.mobile_number}
                        </button>
                      )}
                      {officer.email && (
                        <a
                          href={`mailto:${officer.email}`}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        >
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{officer.email}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
                    {!officer.is_primary && (
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
                      onClick={() => startEdit(index)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deactivateOfficer(index)}
                      className="text-destructive hover:text-destructive"
                      title={t("contractors.companies.deactivate", "Deactivate")}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              )}
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