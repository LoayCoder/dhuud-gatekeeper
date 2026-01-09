import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  ChevronDown,
  ChevronUp,
  Wrench,
  Car,
  Building,
  Network,
  Package,
  MoreHorizontal,
  Calendar,
  Clock,
  DollarSign,
  Edit,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  PROPERTY_TYPES,
  DAMAGE_SEVERITY,
  OPERATIONAL_IMPACT,
  REPAIR_STATUS,
  type PropertyTypeCode,
  type DamageSeverityCode,
  type OperationalImpactCode,
  type RepairStatusCode,
} from '@/lib/property-damage-constants';
import { formatCurrency } from '@/lib/currency-utils';
import type { IncidentPropertyDamage } from '@/hooks/use-incident-property-damages';

interface PropertyDamageCardProps {
  damage: IncidentPropertyDamage;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  canEdit?: boolean;
}

const PROPERTY_TYPE_ICONS: Record<PropertyTypeCode, React.ElementType> = {
  equipment: Wrench,
  vehicle: Car,
  structure: Building,
  infrastructure: Network,
  material: Package,
  other: MoreHorizontal,
};

export function PropertyDamageCard({
  damage,
  index,
  onEdit,
  onDelete,
  canEdit = true,
}: PropertyDamageCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [isOpen, setIsOpen] = useState(false);

  const dateLocale = isRTL ? ar : enUS;

  const propertyTypeData = damage.property_type
    ? PROPERTY_TYPES[damage.property_type as PropertyTypeCode]
    : null;
  const severityData = damage.damage_severity
    ? DAMAGE_SEVERITY[damage.damage_severity as DamageSeverityCode]
    : null;
  const statusData = damage.repair_status
    ? REPAIR_STATUS[damage.repair_status as RepairStatusCode]
    : null;
  const impactData = damage.operational_impact
    ? OPERATIONAL_IMPACT[damage.operational_impact as OperationalImpactCode]
    : null;

  const PropertyIcon = damage.property_type
    ? PROPERTY_TYPE_ICONS[damage.property_type as PropertyTypeCode]
    : Package;

  const totalEstimatedCost = 
    (damage.repair_cost_estimate || 0) + (damage.replacement_cost_estimate || 0);

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="p-0">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-4 h-auto rounded-none hover:bg-muted/50"
              type="button"
            >
              <div className="flex items-center gap-3 text-start">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold">
                  {index + 1}
                </div>
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <PropertyIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{damage.property_name}</span>
                    {severityData && (
                      <Badge className={cn('text-xs', severityData.color)}>
                        {isRTL ? severityData.ar : severityData.en}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {propertyTypeData && (
                      <span>
                        {isRTL ? propertyTypeData.ar : propertyTypeData.en}
                      </span>
                    )}
                    {damage.downtime_hours > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {damage.downtime_hours}h
                      </span>
                    )}
                    {totalEstimatedCost > 0 && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(totalEstimatedCost * 100, damage.cost_currency)}
                      </span>
                    )}
                    {statusData && (
                      <Badge variant="outline" className={cn('text-xs', statusData.color)}>
                        {isRTL ? statusData.ar : statusData.en}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      type="button"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t('investigation.propertyDamage.deleteConfirmTitle', 'Delete Property Damage Record')}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t(
                              'investigation.propertyDamage.deleteConfirmDescription',
                              'Are you sure you want to delete this property damage record? This action cannot be undone.'
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={onDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t('common.delete', 'Delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-4">
            {/* Property Info */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 p-3 rounded-lg bg-muted/30">
              {damage.asset_tag && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    {t('investigation.propertyDamage.fields.assetTag', 'Asset Tag')}
                  </span>
                  <p className="text-sm font-medium">{damage.asset_tag}</p>
                </div>
              )}
              {damage.location_description && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    {t('investigation.propertyDamage.fields.locationDescription', 'Location')}
                  </span>
                  <p className="text-sm font-medium">{damage.location_description}</p>
                </div>
              )}
              {damage.damage_date && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    {t('investigation.propertyDamage.fields.damageDate', 'Damage Date')}
                  </span>
                  <p className="text-sm font-medium">
                    {format(new Date(damage.damage_date), 'PPP', { locale: dateLocale })}
                  </p>
                </div>
              )}
            </div>

            {/* Damage Description */}
            {damage.damage_description && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">
                  {t('investigation.propertyDamage.fields.damageDescription', 'Damage Description')}
                </span>
                <p className="text-sm">{damage.damage_description}</p>
              </div>
            )}

            {/* Cost Estimation */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 p-3 rounded-lg bg-muted/30">
              <div>
                <span className="text-xs text-muted-foreground block">
                  {t('investigation.propertyDamage.fields.repairCostEstimate', 'Repair Cost Estimate')}
                </span>
                <span className="text-sm font-medium">
                  {damage.repair_cost_estimate 
                    ? formatCurrency(damage.repair_cost_estimate * 100, damage.cost_currency)
                    : '-'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">
                  {t('investigation.propertyDamage.fields.replacementCostEstimate', 'Replacement Cost Estimate')}
                </span>
                <span className="text-sm font-medium">
                  {damage.replacement_cost_estimate 
                    ? formatCurrency(damage.replacement_cost_estimate * 100, damage.cost_currency)
                    : '-'}
                </span>
              </div>
              {damage.actual_repair_cost && (
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {t('investigation.propertyDamage.fields.actualRepairCost', 'Actual Repair Cost')}
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(damage.actual_repair_cost * 100, damage.cost_currency)}
                  </span>
                </div>
              )}
              {damage.cost_assessment_by && (
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {t('investigation.propertyDamage.fields.costAssessmentBy', 'Assessed By')}
                  </span>
                  <span className="text-sm font-medium">{damage.cost_assessment_by}</span>
                </div>
              )}
            </div>

            {/* Impact Assessment */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-3 rounded-lg bg-muted/30">
              <div>
                <span className="text-xs text-muted-foreground block">
                  {t('investigation.propertyDamage.fields.operationalImpact', 'Operational Impact')}
                </span>
                {impactData ? (
                  <Badge className={cn('text-xs mt-1', impactData.color)}>
                    {isRTL ? impactData.ar : impactData.en}
                  </Badge>
                ) : (
                  <span className="text-sm font-medium">-</span>
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">
                  {t('investigation.propertyDamage.fields.downtimeHours', 'Downtime (hours)')}
                </span>
                <span className="text-sm font-medium">{damage.downtime_hours || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn(
                  "h-4 w-4",
                  damage.safety_hazard_created ? "text-destructive" : "text-muted-foreground"
                )} />
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {t('investigation.propertyDamage.fields.safetyHazardCreated', 'Safety Hazard')}
                  </span>
                  <span className="text-sm font-medium">
                    {damage.safety_hazard_created
                      ? t('common.yes', 'Yes')
                      : t('common.no', 'No')}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">
                  {t('investigation.propertyDamage.fields.repairStatus', 'Repair Status')}
                </span>
                {statusData ? (
                  <Badge className={cn('text-xs mt-1', statusData.color)}>
                    {isRTL ? statusData.ar : statusData.en}
                  </Badge>
                ) : (
                  <span className="text-sm font-medium">-</span>
                )}
              </div>
            </div>

            {/* Safety Hazard Description */}
            {damage.safety_hazard_created && damage.safety_hazard_description && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <span className="text-xs text-destructive block mb-1">
                  {t('investigation.propertyDamage.fields.safetyHazardDescription', 'Hazard Description')}
                </span>
                <p className="text-sm text-destructive">{damage.safety_hazard_description}</p>
              </div>
            )}

            {/* Recorder Info */}
            {damage.recorded_by_profile?.full_name && (
              <div className="text-xs text-muted-foreground">
                {t('investigation.propertyDamage.recordedBy', 'Recorded by')}:{' '}
                {damage.recorded_by_profile.full_name}
                {damage.created_at && (
                  <>
                    {' • '}
                    {format(new Date(damage.created_at), 'PPP', { locale: dateLocale })}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
