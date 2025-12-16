import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePTWTypes } from "@/hooks/ptw";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Construction, Shield, Shovel, Radiation, Zap, Mountain } from "lucide-react";

interface PermitOperationalStepProps {
  data: {
    operational_data?: Record<string, unknown>;
  };
  onChange: (data: { operational_data: Record<string, unknown> }) => void;
  typeId?: string;
}

export function PermitOperationalStep({ data, onChange, typeId }: PermitOperationalStepProps) {
  const { t } = useTranslation();
  const { data: permitTypes } = usePTWTypes();
  
  const selectedType = permitTypes?.find(pt => pt.id === typeId);
  const operationalData = data.operational_data || {};

  const updateOperationalData = (key: string, value: unknown) => {
    onChange({
      operational_data: {
        ...operationalData,
        [key]: value,
      },
    });
  };

  if (!typeId || !selectedType) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("ptw.form.selectTypeFirst", "Please select a permit type in the previous step")}
      </div>
    );
  }

  // Render type-specific form fields based on permit type code
  const renderTypeSpecificFields = () => {
    switch (selectedType.code) {
      case "HOT_WORK":
        return <HotWorkFields data={operationalData} onChange={updateOperationalData} />;
      case "LIFTING":
        return <LiftingFields data={operationalData} onChange={updateOperationalData} />;
      case "CONFINED_SPACE":
        return <ConfinedSpaceFields data={operationalData} onChange={updateOperationalData} />;
      case "EXCAVATION":
        return <ExcavationFields data={operationalData} onChange={updateOperationalData} />;
      case "RADIOGRAPHY":
        return <RadiographyFields data={operationalData} onChange={updateOperationalData} />;
      case "ELECTRICAL":
        return <ElectricalFields data={operationalData} onChange={updateOperationalData} />;
      case "HEIGHT":
        return <HeightFields data={operationalData} onChange={updateOperationalData} />;
      default:
        return <GeneralFields data={operationalData} onChange={updateOperationalData} />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {selectedType.code === "HOT_WORK" && <Flame className="h-5 w-5" />}
            {selectedType.code === "LIFTING" && <Construction className="h-5 w-5" />}
            {selectedType.code === "CONFINED_SPACE" && <Shield className="h-5 w-5" />}
            {selectedType.code === "EXCAVATION" && <Shovel className="h-5 w-5" />}
            {selectedType.code === "RADIOGRAPHY" && <Radiation className="h-5 w-5" />}
            {selectedType.code === "ELECTRICAL" && <Zap className="h-5 w-5" />}
            {selectedType.code === "HEIGHT" && <Mountain className="h-5 w-5" />}
            {selectedType.name}
          </CardTitle>
          <CardDescription>
            {t("ptw.form.operationalDataDesc", "Provide specific details for this type of work")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderTypeSpecificFields()}
        </CardContent>
      </Card>
    </div>
  );
}

// Hot Work specific fields
function HotWorkFields({ data, onChange }: { data: Record<string, unknown>; onChange: (key: string, value: unknown) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("ptw.hotWork.workType", "Type of Hot Work")}</Label>
        <Select value={data.work_type as string || ""} onValueChange={(v) => onChange("work_type", v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("ptw.hotWork.selectWorkType", "Select work type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="welding">{t("ptw.hotWork.welding", "Welding")}</SelectItem>
            <SelectItem value="cutting">{t("ptw.hotWork.cutting", "Cutting")}</SelectItem>
            <SelectItem value="grinding">{t("ptw.hotWork.grinding", "Grinding")}</SelectItem>
            <SelectItem value="brazing">{t("ptw.hotWork.brazing", "Brazing")}</SelectItem>
            <SelectItem value="other">{t("common.other", "Other")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t("ptw.hotWork.combustibleMaterials", "Combustible Materials Nearby")}</Label>
        <Textarea
          placeholder={t("ptw.hotWork.describeMaterials", "Describe any combustible materials in the area...")}
          value={data.combustible_materials as string || ""}
          onChange={(e) => onChange("combustible_materials", e.target.value)}
        />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="fire_watch_required"
          checked={data.fire_watch_required as boolean || false}
          onCheckedChange={(checked) => onChange("fire_watch_required", checked)}
        />
        <Label htmlFor="fire_watch_required">{t("ptw.hotWork.fireWatchRequired", "Fire Watch Required")}</Label>
      </div>
      <div className="space-y-2">
        <Label>{t("ptw.hotWork.fireExtinguisher", "Fire Extinguisher Type")}</Label>
        <Input
          placeholder={t("ptw.hotWork.extinguisherPlaceholder", "e.g., CO2, Dry Powder")}
          value={data.fire_extinguisher_type as string || ""}
          onChange={(e) => onChange("fire_extinguisher_type", e.target.value)}
        />
      </div>
    </div>
  );
}

// Lifting Operations fields
function LiftingFields({ data, onChange }: { data: Record<string, unknown>; onChange: (key: string, value: unknown) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("ptw.lifting.equipmentType", "Lifting Equipment Type")}</Label>
        <Select value={data.equipment_type as string || ""} onValueChange={(v) => onChange("equipment_type", v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("ptw.lifting.selectEquipment", "Select equipment")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="crane">{t("ptw.lifting.crane", "Crane")}</SelectItem>
            <SelectItem value="forklift">{t("ptw.lifting.forklift", "Forklift")}</SelectItem>
            <SelectItem value="hoist">{t("ptw.lifting.hoist", "Hoist")}</SelectItem>
            <SelectItem value="chain_block">{t("ptw.lifting.chainBlock", "Chain Block")}</SelectItem>
            <SelectItem value="telehandler">{t("ptw.lifting.telehandler", "Telehandler")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("ptw.lifting.loadWeight", "Load Weight (kg)")}</Label>
          <Input
            type="number"
            placeholder="0"
            value={data.load_weight as string || ""}
            onChange={(e) => onChange("load_weight", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("ptw.lifting.equipmentCapacity", "Equipment Capacity (kg)")}</Label>
          <Input
            type="number"
            placeholder="0"
            value={data.equipment_capacity as string || ""}
            onChange={(e) => onChange("equipment_capacity", e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t("ptw.lifting.liftPlan", "Lift Plan Reference")}</Label>
        <Input
          placeholder={t("ptw.lifting.liftPlanPlaceholder", "Lift plan document reference")}
          value={data.lift_plan_ref as string || ""}
          onChange={(e) => onChange("lift_plan_ref", e.target.value)}
        />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="exclusion_zone"
          checked={data.exclusion_zone_established as boolean || false}
          onCheckedChange={(checked) => onChange("exclusion_zone_established", checked)}
        />
        <Label htmlFor="exclusion_zone">{t("ptw.lifting.exclusionZone", "Exclusion Zone Established")}</Label>
      </div>
    </div>
  );
}

// Confined Space Entry fields
function ConfinedSpaceFields({ data, onChange }: { data: Record<string, unknown>; onChange: (key: string, value: unknown) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("ptw.confinedSpace.spaceType", "Confined Space Type")}</Label>
        <Select value={data.space_type as string || ""} onValueChange={(v) => onChange("space_type", v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("ptw.confinedSpace.selectType", "Select type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tank">{t("ptw.confinedSpace.tank", "Tank")}</SelectItem>
            <SelectItem value="vessel">{t("ptw.confinedSpace.vessel", "Vessel")}</SelectItem>
            <SelectItem value="manhole">{t("ptw.confinedSpace.manhole", "Manhole")}</SelectItem>
            <SelectItem value="trench">{t("ptw.confinedSpace.trench", "Trench")}</SelectItem>
            <SelectItem value="pit">{t("ptw.confinedSpace.pit", "Pit")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t("ptw.confinedSpace.previousContents", "Previous Contents")}</Label>
        <Textarea
          placeholder={t("ptw.confinedSpace.describePrevious", "Describe what the space previously contained...")}
          value={data.previous_contents as string || ""}
          onChange={(e) => onChange("previous_contents", e.target.value)}
        />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="standby_person"
          checked={data.standby_person_assigned as boolean || false}
          onCheckedChange={(checked) => onChange("standby_person_assigned", checked)}
        />
        <Label htmlFor="standby_person">{t("ptw.confinedSpace.standbyPerson", "Standby Person Assigned")}</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="rescue_equipment"
          checked={data.rescue_equipment_available as boolean || false}
          onCheckedChange={(checked) => onChange("rescue_equipment_available", checked)}
        />
        <Label htmlFor="rescue_equipment">{t("ptw.confinedSpace.rescueEquipment", "Rescue Equipment Available")}</Label>
      </div>
      <div className="space-y-2">
        <Label>{t("ptw.confinedSpace.ventilationMethod", "Ventilation Method")}</Label>
        <Input
          placeholder={t("ptw.confinedSpace.ventilationPlaceholder", "e.g., Forced air ventilation")}
          value={data.ventilation_method as string || ""}
          onChange={(e) => onChange("ventilation_method", e.target.value)}
        />
      </div>
    </div>
  );
}

// Excavation fields
function ExcavationFields({ data, onChange }: { data: Record<string, unknown>; onChange: (key: string, value: unknown) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>{t("ptw.excavation.depth", "Depth (m)")}</Label>
          <Input
            type="number"
            step="0.1"
            placeholder="0"
            value={data.depth as string || ""}
            onChange={(e) => onChange("depth", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("ptw.excavation.length", "Length (m)")}</Label>
          <Input
            type="number"
            step="0.1"
            placeholder="0"
            value={data.length as string || ""}
            onChange={(e) => onChange("length", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("ptw.excavation.width", "Width (m)")}</Label>
          <Input
            type="number"
            step="0.1"
            placeholder="0"
            value={data.width as string || ""}
            onChange={(e) => onChange("width", e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="underground_services"
          checked={data.underground_services_checked as boolean || false}
          onCheckedChange={(checked) => onChange("underground_services_checked", checked)}
        />
        <Label htmlFor="underground_services">{t("ptw.excavation.undergroundServices", "Underground Services Checked")}</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="shoring_required"
          checked={data.shoring_required as boolean || false}
          onCheckedChange={(checked) => onChange("shoring_required", checked)}
        />
        <Label htmlFor="shoring_required">{t("ptw.excavation.shoringRequired", "Shoring/Shielding Required")}</Label>
      </div>
      <div className="space-y-2">
        <Label>{t("ptw.excavation.soilType", "Soil Type")}</Label>
        <Select value={data.soil_type as string || ""} onValueChange={(v) => onChange("soil_type", v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("ptw.excavation.selectSoil", "Select soil type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stable_rock">{t("ptw.excavation.stableRock", "Stable Rock")}</SelectItem>
            <SelectItem value="type_a">{t("ptw.excavation.typeA", "Type A (Clay)")}</SelectItem>
            <SelectItem value="type_b">{t("ptw.excavation.typeB", "Type B (Sandy)")}</SelectItem>
            <SelectItem value="type_c">{t("ptw.excavation.typeC", "Type C (Granular)")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Radiography/NDT fields
function RadiographyFields({ data, onChange }: { data: Record<string, unknown>; onChange: (key: string, value: unknown) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("ptw.radiography.sourceType", "Radiation Source Type")}</Label>
        <Select value={data.source_type as string || ""} onValueChange={(v) => onChange("source_type", v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("ptw.radiography.selectSource", "Select source type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="x_ray">{t("ptw.radiography.xRay", "X-Ray")}</SelectItem>
            <SelectItem value="gamma">{t("ptw.radiography.gamma", "Gamma Ray")}</SelectItem>
            <SelectItem value="neutron">{t("ptw.radiography.neutron", "Neutron")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("ptw.radiography.exclusionRadius", "Exclusion Radius (m)")}</Label>
          <Input
            type="number"
            placeholder="0"
            value={data.exclusion_radius as string || ""}
            onChange={(e) => onChange("exclusion_radius", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("ptw.radiography.exposureDuration", "Exposure Duration (min)")}</Label>
          <Input
            type="number"
            placeholder="0"
            value={data.exposure_duration as string || ""}
            onChange={(e) => onChange("exposure_duration", e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="barriers_posted"
          checked={data.barriers_posted as boolean || false}
          onCheckedChange={(checked) => onChange("barriers_posted", checked)}
        />
        <Label htmlFor="barriers_posted">{t("ptw.radiography.barriersPosted", "Warning Barriers Posted")}</Label>
      </div>
      <div className="space-y-2">
        <Label>{t("ptw.radiography.rsoName", "RSO Name")}</Label>
        <Input
          placeholder={t("ptw.radiography.rsoPlaceholder", "Radiation Safety Officer name")}
          value={data.rso_name as string || ""}
          onChange={(e) => onChange("rso_name", e.target.value)}
        />
      </div>
    </div>
  );
}

// Electrical Isolation fields
function ElectricalFields({ data, onChange }: { data: Record<string, unknown>; onChange: (key: string, value: unknown) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("ptw.electrical.voltage", "Voltage (V)")}</Label>
          <Input
            type="number"
            placeholder="0"
            value={data.voltage as string || ""}
            onChange={(e) => onChange("voltage", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("ptw.electrical.circuitId", "Circuit ID")}</Label>
          <Input
            placeholder={t("ptw.electrical.circuitPlaceholder", "Circuit identification")}
            value={data.circuit_id as string || ""}
            onChange={(e) => onChange("circuit_id", e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="loto_applied"
          checked={data.loto_applied as boolean || false}
          onCheckedChange={(checked) => onChange("loto_applied", checked)}
        />
        <Label htmlFor="loto_applied">{t("ptw.electrical.lotoApplied", "LOTO Applied")}</Label>
      </div>
      <div className="space-y-2">
        <Label>{t("ptw.electrical.isolationPoints", "Isolation Points")}</Label>
        <Textarea
          placeholder={t("ptw.electrical.isolationPlaceholder", "List all isolation points...")}
          value={data.isolation_points as string || ""}
          onChange={(e) => onChange("isolation_points", e.target.value)}
        />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="live_work"
          checked={data.live_work as boolean || false}
          onCheckedChange={(checked) => onChange("live_work", checked)}
        />
        <Label htmlFor="live_work" className="text-destructive">{t("ptw.electrical.liveWork", "Live Work (Requires Additional Approval)")}</Label>
      </div>
    </div>
  );
}

// Working at Height fields
function HeightFields({ data, onChange }: { data: Record<string, unknown>; onChange: (key: string, value: unknown) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("ptw.height.workingHeight", "Working Height (m)")}</Label>
        <Input
          type="number"
          step="0.1"
          placeholder="0"
          value={data.working_height as string || ""}
          onChange={(e) => onChange("working_height", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("ptw.height.accessMethod", "Access Method")}</Label>
        <Select value={data.access_method as string || ""} onValueChange={(v) => onChange("access_method", v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("ptw.height.selectMethod", "Select method")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scaffold">{t("ptw.height.scaffold", "Scaffold")}</SelectItem>
            <SelectItem value="mewp">{t("ptw.height.mewp", "MEWP (Aerial Lift)")}</SelectItem>
            <SelectItem value="ladder">{t("ptw.height.ladder", "Ladder")}</SelectItem>
            <SelectItem value="rope_access">{t("ptw.height.ropeAccess", "Rope Access")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="fall_protection"
          checked={data.fall_protection_required as boolean || false}
          onCheckedChange={(checked) => onChange("fall_protection_required", checked)}
        />
        <Label htmlFor="fall_protection">{t("ptw.height.fallProtection", "Fall Protection Required")}</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="area_secured"
          checked={data.area_below_secured as boolean || false}
          onCheckedChange={(checked) => onChange("area_below_secured", checked)}
        />
        <Label htmlFor="area_secured">{t("ptw.height.areaSecured", "Area Below Secured")}</Label>
      </div>
    </div>
  );
}

// General/Other fields
function GeneralFields({ data, onChange }: { data: Record<string, unknown>; onChange: (key: string, value: unknown) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("ptw.general.additionalInfo", "Additional Information")}</Label>
        <Textarea
          placeholder={t("ptw.general.additionalPlaceholder", "Provide any additional relevant details...")}
          value={data.additional_info as string || ""}
          onChange={(e) => onChange("additional_info", e.target.value)}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("ptw.general.specialRequirements", "Special Requirements")}</Label>
        <Textarea
          placeholder={t("ptw.general.specialPlaceholder", "Any special requirements or precautions...")}
          value={data.special_requirements as string || ""}
          onChange={(e) => onChange("special_requirements", e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}
