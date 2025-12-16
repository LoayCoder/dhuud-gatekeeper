import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePTWTypes } from "@/hooks/ptw";
import { Shield, AlertTriangle, HardHat, Eye, Ear, Hand, Footprints, Shirt } from "lucide-react";

interface PermitSafetyStepProps {
  data: {
    safety_responses?: Array<{
      requirement_id: string;
      is_checked: boolean;
      comments?: string;
    }>;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
    risk_assessment_ref?: string;
  };
  onChange: (data: Partial<PermitSafetyStepProps["data"]>) => void;
  typeId?: string;
}

// Standard PPE checklist items
const standardPPE = [
  { id: "hard_hat", label: "Hard Hat", icon: HardHat },
  { id: "safety_glasses", label: "Safety Glasses", icon: Eye },
  { id: "hearing_protection", label: "Hearing Protection", icon: Ear },
  { id: "safety_gloves", label: "Safety Gloves", icon: Hand },
  { id: "safety_footwear", label: "Safety Footwear", icon: Footprints },
  { id: "hi_vis_vest", label: "Hi-Vis Vest", icon: Shirt },
];

// Type-specific safety requirements
const typeSpecificRequirements: Record<string, Array<{ id: string; label: string; isCritical?: boolean }>> = {
  HOT_WORK: [
    { id: "fire_extinguisher", label: "Fire Extinguisher Available", isCritical: true },
    { id: "fire_blanket", label: "Fire Blanket Available" },
    { id: "gas_test_completed", label: "Gas Test Completed", isCritical: true },
    { id: "combustibles_removed", label: "Combustibles Removed/Protected", isCritical: true },
    { id: "ventilation_adequate", label: "Adequate Ventilation" },
  ],
  LIFTING: [
    { id: "lift_plan_approved", label: "Lift Plan Approved", isCritical: true },
    { id: "equipment_inspected", label: "Equipment Inspected" },
    { id: "exclusion_zone", label: "Exclusion Zone Established", isCritical: true },
    { id: "signal_person", label: "Signal Person Assigned" },
    { id: "weather_checked", label: "Weather Conditions Checked" },
  ],
  CONFINED_SPACE: [
    { id: "atmosphere_tested", label: "Atmosphere Tested", isCritical: true },
    { id: "continuous_monitoring", label: "Continuous Monitoring in Place", isCritical: true },
    { id: "rescue_plan", label: "Rescue Plan Ready", isCritical: true },
    { id: "standby_person", label: "Standby Person Present", isCritical: true },
    { id: "communication_tested", label: "Communication Tested" },
  ],
  EXCAVATION: [
    { id: "utility_clearance", label: "Underground Utility Clearance", isCritical: true },
    { id: "shoring_installed", label: "Shoring/Shielding Installed" },
    { id: "access_egress", label: "Safe Access/Egress Provided" },
    { id: "barricades", label: "Barricades in Place" },
    { id: "soil_inspected", label: "Soil Conditions Inspected" },
  ],
  RADIOGRAPHY: [
    { id: "exclusion_zone_marked", label: "Exclusion Zone Clearly Marked", isCritical: true },
    { id: "warning_signs", label: "Warning Signs Posted", isCritical: true },
    { id: "area_cleared", label: "Area Cleared of Personnel", isCritical: true },
    { id: "dosimeters_worn", label: "Dosimeters Worn" },
    { id: "rso_present", label: "RSO Present/Available" },
  ],
  ELECTRICAL: [
    { id: "loto_applied", label: "LOTO Applied", isCritical: true },
    { id: "voltage_verified", label: "Zero Voltage Verified", isCritical: true },
    { id: "insulated_tools", label: "Insulated Tools Available" },
    { id: "arc_flash_ppe", label: "Arc Flash PPE Available" },
    { id: "grounding_in_place", label: "Grounding in Place" },
  ],
  HEIGHT: [
    { id: "fall_protection", label: "Fall Protection in Place", isCritical: true },
    { id: "anchor_points", label: "Anchor Points Inspected" },
    { id: "area_below_secured", label: "Area Below Secured", isCritical: true },
    { id: "equipment_inspected", label: "Equipment Inspected" },
    { id: "rescue_plan", label: "Rescue Plan Available" },
  ],
};

export function PermitSafetyStep({ data, onChange, typeId }: PermitSafetyStepProps) {
  const { t } = useTranslation();
  const { data: permitTypes } = usePTWTypes();
  
  const selectedType = permitTypes?.find(pt => pt.id === typeId);
  const safetyResponses = data.safety_responses || [];

  const isChecked = (requirementId: string) => {
    return safetyResponses.some(r => r.requirement_id === requirementId && r.is_checked);
  };

  const toggleRequirement = (requirementId: string, checked: boolean) => {
    const existing = safetyResponses.filter(r => r.requirement_id !== requirementId);
    onChange({
      safety_responses: [
        ...existing,
        { requirement_id: requirementId, is_checked: checked },
      ],
    });
  };

  const typeRequirements = selectedType?.code 
    ? typeSpecificRequirements[selectedType.code] || []
    : [];

  return (
    <div className="space-y-6">
      {/* PPE Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("ptw.safety.ppeChecklist", "Personal Protective Equipment")}
          </CardTitle>
          <CardDescription>
            {t("ptw.safety.ppeDesc", "Select all required PPE for this work")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {standardPPE.map((ppe) => {
              const IconComponent = ppe.icon;
              return (
                <div key={ppe.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={ppe.id}
                    checked={isChecked(ppe.id)}
                    onCheckedChange={(checked) => toggleRequirement(ppe.id, !!checked)}
                  />
                  <Label htmlFor={ppe.id} className="flex items-center gap-2 cursor-pointer">
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                    {t(`ptw.ppe.${ppe.id}`, ppe.label)}
                  </Label>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Type-Specific Safety Requirements */}
      {typeRequirements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("ptw.safety.typeRequirements", "{{type}} Safety Requirements", { type: selectedType?.name })}
            </CardTitle>
            <CardDescription>
              {t("ptw.safety.typeRequirementsDesc", "Complete all safety checks specific to this permit type")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {typeRequirements.map((req) => (
                <div key={req.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={req.id}
                    checked={isChecked(req.id)}
                    onCheckedChange={(checked) => toggleRequirement(req.id, !!checked)}
                  />
                  <Label htmlFor={req.id} className="flex items-center gap-2 cursor-pointer">
                    {t(`ptw.safety.req.${req.id}`, req.label)}
                    {req.isCritical && (
                      <Badge variant="destructive" className="text-xs">
                        {t("ptw.safety.critical", "Critical")}
                      </Badge>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Assessment Reference */}
      <div className="space-y-2">
        <Label htmlFor="risk_assessment_ref">
          {t("ptw.safety.riskAssessmentRef", "Risk Assessment Reference")}
        </Label>
        <Input
          id="risk_assessment_ref"
          placeholder={t("ptw.safety.riskAssessmentPlaceholder", "JHA/Risk Assessment document number")}
          value={data.risk_assessment_ref || ""}
          onChange={(e) => onChange({ risk_assessment_ref: e.target.value })}
        />
      </div>

      {/* Emergency Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("ptw.safety.emergencyContact", "Emergency Contact")}
          </CardTitle>
          <CardDescription>
            {t("ptw.safety.emergencyContactDesc", "Provide emergency contact for this work")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name">
                {t("ptw.safety.contactName", "Contact Name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="emergency_contact_name"
                placeholder={t("ptw.safety.contactNamePlaceholder", "Emergency contact name")}
                value={data.emergency_contact_name || ""}
                onChange={(e) => onChange({ emergency_contact_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_number">
                {t("ptw.safety.contactNumber", "Contact Number")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="emergency_contact_number"
                type="tel"
                placeholder={t("ptw.safety.contactNumberPlaceholder", "+966 5XX XXX XXXX")}
                value={data.emergency_contact_number || ""}
                onChange={(e) => onChange({ emergency_contact_number: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
