import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useDashboardDrilldown } from "@/hooks/use-dashboard-drilldown";
import type { IncidentTypeCount } from "@/hooks/use-incident-type-distribution";

interface Props {
  data: IncidentTypeCount[];
  isLoading?: boolean;
}

// Colors for each incident type using CSS variables
const INCIDENT_TYPE_COLORS: Record<string, string> = {
  // New HSSE event types
  safety: 'hsl(var(--chart-1))',
  health: 'hsl(var(--chart-2))',
  process_safety: 'hsl(var(--chart-3))',
  environment: 'hsl(var(--chart-4))',
  security: 'hsl(var(--chart-5))',
  property_asset_damage: 'hsl(48, 96%, 53%)',
  road_traffic_vehicle: 'hsl(340, 75%, 55%)',
  quality_service: 'hsl(200, 70%, 50%)',
  community_third_party: 'hsl(30, 80%, 55%)',
  compliance_regulatory: 'hsl(0, 65%, 50%)',
  emergency_crisis: 'hsl(290, 70%, 50%)',
  // Legacy subtypes
  first_aid: 'hsl(120, 60%, 45%)',
  near_miss: 'hsl(45, 90%, 50%)',
  environmental: 'hsl(var(--chart-4))',
  property_damage: 'hsl(48, 96%, 53%)',
  medical_treatment: 'hsl(200, 70%, 50%)',
  lost_time: 'hsl(0, 70%, 50%)',
  fatality: 'hsl(0, 90%, 35%)',
  restricted_work: 'hsl(30, 80%, 55%)',
  vehicle: 'hsl(340, 75%, 55%)',
  equipment: 'hsl(260, 60%, 50%)',
  fall_from_height: 'hsl(var(--chart-1))',
  slip_trip_fall: 'hsl(var(--chart-2))',
  heat_stress: 'hsl(25, 90%, 55%)',
  chemical_exposure: 'hsl(280, 70%, 50%)',
};

const INCIDENT_TYPE_KEYS = [
  'safety',
  'health',
  'process_safety',
  'environment',
  'security',
  'property_asset_damage',
  'road_traffic_vehicle',
  'quality_service',
  'community_third_party',
  'compliance_regulatory',
  'emergency_crisis',
];

export function IncidentTypeBreakdownChart({ data, isLoading }: Props) {
  const { t } = useTranslation();
  const { drillDown } = useDashboardDrilldown();

  const getTypeLabel = (type: string) => {
    const labelMap: Record<string, string> = {
      // New HSSE event types (incident_type field)
      safety: t('incidents.hsseEventTypes.safety', 'Safety'),
      health: t('incidents.hsseEventTypes.health', 'Health'),
      process_safety: t('incidents.hsseEventTypes.processSafety', 'Process Safety'),
      environment: t('incidents.hsseEventTypes.environment', 'Environment'),
      security: t('incidents.hsseEventTypes.security', 'Security'),
      property_asset_damage: t('incidents.hsseEventTypes.propertyAssetDamage', 'Property & Asset Damage'),
      road_traffic_vehicle: t('incidents.hsseEventTypes.roadTrafficVehicle', 'Road Traffic / Vehicle'),
      quality_service: t('incidents.hsseEventTypes.qualityService', 'Quality / Service'),
      community_third_party: t('incidents.hsseEventTypes.communityThirdParty', 'Community / Third-Party'),
      compliance_regulatory: t('incidents.hsseEventTypes.complianceRegulatory', 'Compliance / Regulatory'),
      emergency_crisis: t('incidents.hsseEventTypes.emergencyCrisis', 'Emergency / Crisis'),
      
      // Legacy subtypes (subtype field - for older incidents)
      first_aid: t('incidents.incidentTypes.first_aid', 'First Aid'),
      near_miss: t('incidents.incidentTypes.near_miss', 'Near Miss'),
      environmental: t('incidents.incidentTypes.environmental', 'Environmental'),
      property_damage: t('incidents.incidentTypes.property_damage', 'Property Damage'),
      medical_treatment: t('incidents.incidentTypes.medical_treatment', 'Medical Treatment'),
      lost_time: t('incidents.incidentTypes.lost_time', 'Lost Time Injury'),
      fatality: t('incidents.incidentTypes.fatality', 'Fatality'),
      restricted_work: t('incidents.incidentTypes.restricted_work', 'Restricted Work'),
      vehicle: t('incidents.incidentTypes.vehicle', 'Vehicle Incident'),
      equipment: t('incidents.incidentTypes.equipment', 'Equipment Incident'),
      
      // HSSE safety subtypes
      fall_from_height: t('incidents.hsseSubtypes.safety.fallFromHeight', 'Fall from Height'),
      slip_trip_fall: t('incidents.hsseSubtypes.safety.slipTripFallSameLevel', 'Slip/Trip/Fall'),
      struck_by: t('incidents.hsseSubtypes.safety.struckBy', 'Struck By'),
      caught_in_between: t('incidents.hsseSubtypes.safety.caughtInBetween', 'Caught In/Between'),
      manual_handling: t('incidents.hsseSubtypes.safety.manualHandling', 'Manual Handling'),
      cut_laceration: t('incidents.hsseSubtypes.safety.cutLaceration', 'Cut/Laceration'),
      eye_injury: t('incidents.hsseSubtypes.safety.eyeInjury', 'Eye Injury'),
      burn_scald: t('incidents.hsseSubtypes.safety.burnScald', 'Burn/Scald'),
      electrical_shock: t('incidents.hsseSubtypes.safety.electricalShock', 'Electrical Shock'),
      dropped_object: t('incidents.hsseSubtypes.safety.droppedObject', 'Dropped Object'),
      confined_space: t('incidents.hsseSubtypes.safety.confinedSpace', 'Confined Space'),
      tool_equipment_injury: t('incidents.hsseSubtypes.safety.toolEquipmentInjury', 'Tool/Equipment Injury'),
      
      // HSSE health subtypes
      heat_stress: t('incidents.hsseSubtypes.health.heatStressDehydration', 'Heat Stress'),
      chemical_exposure: t('incidents.hsseSubtypes.health.chemicalExposure', 'Chemical Exposure'),
      noise_exposure: t('incidents.hsseSubtypes.health.noiseExposure', 'Noise Exposure'),
      biological_hazard: t('incidents.hsseSubtypes.health.biologicalHazard', 'Biological Hazard'),
      respiratory_issue: t('incidents.hsseSubtypes.health.respiratoryIssue', 'Respiratory Issue'),
      skin_condition: t('incidents.hsseSubtypes.health.skinCondition', 'Skin Condition'),
      food_poisoning: t('incidents.hsseSubtypes.health.foodPoisoning', 'Food Poisoning'),
      ergonomic_msd: t('incidents.hsseSubtypes.health.ergonomicMsd', 'Ergonomic/MSD'),
      mental_health: t('incidents.hsseSubtypes.health.mentalHealthStress', 'Mental Health/Stress'),
    };
    return labelMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const chartData = data.map((item) => ({
    ...item,
    label: getTypeLabel(item.incident_type),
    color: INCIDENT_TYPE_COLORS[item.incident_type] || 'hsl(var(--muted-foreground))',
  }));

  const handleClick = (entry: { incident_type: string }) => {
    drillDown({ incidentType: entry.incident_type });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('hsseDashboard.incidentTypeBreakdown', 'Incident Type Breakdown')}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <Skeleton className="w-full h-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('hsseDashboard.incidentTypeBreakdown', 'Incident Type Breakdown')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          {t('hsseDashboard.noData')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('hsseDashboard.incidentTypeBreakdown', 'Incident Type Breakdown')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="animate-chart-fade-in">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={150}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => [value, t('hsseDashboard.count')]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
                onClick={(data) => handleClick(data)}
                className="cursor-pointer"
                isAnimationActive={true}
                animationDuration={800}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="hover:opacity-80 transition-opacity duration-200"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {t('hsseDashboard.clickToFilter', 'Click to filter')}
        </p>
      </CardContent>
    </Card>
  );
}
