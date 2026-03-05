import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Trash2, 
  AlertTriangle,
  Leaf,
  Droplets,
  Wind,
  Mountain,
  Container,
  Users,
  DollarSign,
  FileWarning
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
  EnvironmentalContaminationEntry,
  CONTAMINATION_TYPES,
  HAZARD_CLASSIFICATIONS,
  SPILL_SEVERITY,
  COST_SEVERITY,
  RELEASE_SOURCES,
  RELEASE_CAUSES,
  CONTAINMENT_FAILURE_REASONS,
  IMPACTED_RECEPTORS,
  RECOVERY_POTENTIAL,
  EXPOSURE_TYPES,
  POPULATION_PROXIMITY,
  APPLICABLE_REGULATIONS,
  AUTHORITIES,
  getConstantLabel,
  getConstantLabels,
} from '@/lib/environmental-contamination-constants';
import { cn } from '@/lib/utils';

interface EnvironmentalContaminationCardProps {
  entry: EnvironmentalContaminationEntry;
  index: number;
  canEdit: boolean;
  onEdit: (entry: EnvironmentalContaminationEntry) => void;
  onDelete: (id: string) => void;
}

export function EnvironmentalContaminationCard({
  entry,
  index,
  canEdit,
  onEdit,
  onDelete,
}: EnvironmentalContaminationCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [isOpen, setIsOpen] = useState(false);

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: entry.cost_currency || 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number | null | undefined, unit?: string) => {
    if (num === null || num === undefined) return '-';
    const formatted = new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US').format(num);
    return unit ? `${formatted} ${unit}` : formatted;
  };

  const getContaminationIcon = (type: string) => {
    switch (type) {
      case 'soil': return Mountain;
      case 'surface_water':
      case 'groundwater': return Droplets;
      case 'air': return Wind;
      case 'secondary_containment': return Container;
      default: return Leaf;
    }
  };

  return (
    <Card className={cn(
      'transition-all duration-200',
      entry.regulatory_breach_flagged && 'border-destructive/50 bg-destructive/5'
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 rounded-t-lg">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-600" />
                <span className="font-medium text-sm text-muted-foreground">
                  #{index + 1}
                </span>
              </div>
              
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{entry.contaminant_name}</span>
                  {entry.hazard_classification && (
                    <Badge variant="outline" className={cn(
                      'text-xs',
                      HAZARD_CLASSIFICATIONS[entry.hazard_classification]?.color
                    )}>
                      {getConstantLabel(HAZARD_CLASSIFICATIONS, entry.hazard_classification, isRTL)}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {entry.contamination_types?.slice(0, 3).map((type) => {
                    const Icon = getContaminationIcon(type);
                    return (
                      <Badge key={type} variant="secondary" className="text-xs gap-1">
                        <Icon className="h-3 w-3" />
                        {getConstantLabel(CONTAMINATION_TYPES, type, isRTL)}
                      </Badge>
                    );
                  })}
                  {(entry.contamination_types?.length || 0) > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{entry.contamination_types.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {entry.spill_severity && (
                <Badge className={cn('text-xs', SPILL_SEVERITY[entry.spill_severity]?.color)}>
                  {getConstantLabel(SPILL_SEVERITY, entry.spill_severity, isRTL)}
                </Badge>
              )}
              
              {entry.total_environmental_cost && entry.total_environmental_cost > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(entry.total_environmental_cost)}
                </Badge>
              )}
              
              {entry.regulatory_breach_flagged && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <FileWarning className="h-3 w-3" />
                  {t('investigation.environmentalImpact.breach', 'Breach')}
                </Badge>
              )}
              
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {entry.regulatory_breach_flagged && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('investigation.environmentalImpact.alerts.regulatoryBreach', 
                    'Regulatory breach detected: Containment capacity exceeded')}
                </AlertDescription>
              </Alert>
            )}

            {/* Section A: Contamination Type & Source */}
            <div>
              <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                {t('investigation.environmentalImpact.sections.contaminationType', 'Contamination Type & Source')}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('investigation.environmentalImpact.fields.releaseSource', 'Source')}:</span>
                  <span className="ms-2 font-medium">{getConstantLabel(RELEASE_SOURCES, entry.release_source, isRTL)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('investigation.environmentalImpact.fields.releaseCause', 'Cause')}:</span>
                  <span className="ms-2 font-medium">{getConstantLabel(RELEASE_CAUSES, entry.release_cause, isRTL)}</span>
                </div>
                {entry.contaminant_type && (
                  <div>
                    <span className="text-muted-foreground">{t('investigation.environmentalImpact.fields.contaminantType', 'Type')}:</span>
                    <span className="ms-2 font-medium">{entry.contaminant_type}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Section B: Quantity & Spread */}
            <div>
              <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                {t('investigation.environmentalImpact.sections.quantitySpread', 'Quantity & Spread')}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {entry.volume_released && (
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-xs text-muted-foreground">{t('investigation.environmentalImpact.fields.volumeReleased', 'Volume')}</div>
                    <div className="font-medium">{formatNumber(entry.volume_released, entry.volume_unit || 'L')}</div>
                  </div>
                )}
                {entry.area_affected_sqm && (
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-xs text-muted-foreground">{t('investigation.environmentalImpact.fields.areaAffected', 'Area')}</div>
                    <div className="font-medium">{formatNumber(entry.area_affected_sqm, 'm²')}</div>
                  </div>
                )}
                {entry.contaminated_volume_m3 && (
                  <div className="bg-primary/10 p-2 rounded border border-primary/20">
                    <div className="text-xs text-muted-foreground">{t('investigation.environmentalImpact.fields.contaminatedVolume', 'Contaminated Vol.')}</div>
                    <div className="font-medium text-primary">{formatNumber(entry.contaminated_volume_m3, 'm³')}</div>
                  </div>
                )}
                {entry.exposure_duration_minutes && (
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-xs text-muted-foreground">{t('investigation.environmentalImpact.fields.exposureDuration', 'Duration')}</div>
                    <div className="font-medium">{formatNumber(entry.exposure_duration_minutes, 'min')}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Section C: Secondary Containment */}
            {entry.secondary_containment_exists && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                    {t('investigation.environmentalImpact.sections.secondaryContainment', 'Secondary Containment')}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-muted/50 p-2 rounded">
                      <div className="text-xs text-muted-foreground">{t('investigation.environmentalImpact.fields.containmentCapacity', 'Design Capacity')}</div>
                      <div className="font-medium">{formatNumber(entry.containment_design_capacity, entry.containment_capacity_unit || 'L')}</div>
                    </div>
                    <div className="bg-muted/50 p-2 rounded">
                      <div className="text-xs text-muted-foreground">{t('investigation.environmentalImpact.fields.containmentRetained', 'Retained')}</div>
                      <div className="font-medium">{formatNumber(entry.containment_retained_volume, entry.containment_capacity_unit || 'L')}</div>
                    </div>
                    {entry.containment_failure_percentage !== null && (
                      <div className={cn(
                        'p-2 rounded border',
                        entry.containment_failure_percentage > 50 
                          ? 'bg-destructive/10 border-destructive/20' 
                          : 'bg-muted/50'
                      )}>
                        <div className="text-xs text-muted-foreground">{t('investigation.environmentalImpact.fields.containmentFailurePercentage', 'Failure %')}</div>
                        <div className={cn('font-medium', entry.containment_failure_percentage > 50 && 'text-destructive')}>
                          {formatNumber(entry.containment_failure_percentage)}%
                        </div>
                      </div>
                    )}
                    <div className="bg-muted/50 p-2 rounded">
                      <div className="text-xs text-muted-foreground">{t('investigation.environmentalImpact.fields.containmentFailureReason', 'Failure Reason')}</div>
                      <div className="font-medium">{getConstantLabel(CONTAINMENT_FAILURE_REASONS, entry.containment_failure_reason, isRTL)}</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Section D: Environmental & Population Impact */}
            {(entry.impacted_receptors?.length > 0 || entry.population_exposed) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                    {t('investigation.environmentalImpact.sections.environmentalPopulationImpact', 'Environmental & Population Impact')}
                  </h4>
                  <div className="space-y-2 text-sm">
                    {entry.impacted_receptors?.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-muted-foreground">{t('investigation.environmentalImpact.fields.impactedReceptors', 'Impacted')}:</span>
                        {entry.impacted_receptors.map(receptor => (
                          <Badge key={receptor} variant="outline" className="text-xs">
                            {getConstantLabel(IMPACTED_RECEPTORS, receptor, isRTL)}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {entry.recovery_potential && (
                      <div>
                        <span className="text-muted-foreground">{t('investigation.environmentalImpact.fields.recoveryPotential', 'Recovery')}:</span>
                        <span className="ms-2 font-medium">{getConstantLabel(RECOVERY_POTENTIAL, entry.recovery_potential, isRTL)}</span>
                      </div>
                    )}
                    {entry.population_exposed && (
                      <div className="flex items-center gap-3 p-2 bg-orange-100 dark:bg-orange-900/30 rounded">
                        <Users className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">
                          {formatNumber(entry.population_affected_count)} {t('investigation.environmentalImpact.fields.populationCount', 'persons affected')}
                        </span>
                        {entry.exposure_type && (
                          <Badge variant="outline" className="text-xs">
                            {getConstantLabel(EXPOSURE_TYPES, entry.exposure_type, isRTL)}
                          </Badge>
                        )}
                        {entry.population_proximity && (
                          <Badge variant="outline" className="text-xs">
                            {getConstantLabel(POPULATION_PROXIMITY, entry.population_proximity, isRTL)}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Section E: Cost Estimation */}
            {entry.total_environmental_cost && entry.total_environmental_cost > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                    {t('investigation.environmentalImpact.sections.costEstimation', 'Cost Estimation')}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    {entry.soil_remediation_cost && entry.soil_remediation_cost > 0 && (
                      <div>
                        <span className="text-muted-foreground">{t('investigation.environmentalImpact.fields.soilRemediationCost', 'Remediation')}:</span>
                        <span className="ms-2 font-medium">{formatCurrency(entry.soil_remediation_cost)}</span>
                      </div>
                    )}
                    {entry.waste_disposal_cost && entry.waste_disposal_cost > 0 && (
                      <div>
                        <span className="text-muted-foreground">{t('investigation.environmentalImpact.fields.wasteDisposalCost', 'Disposal')}:</span>
                        <span className="ms-2 font-medium">{formatCurrency(entry.waste_disposal_cost)}</span>
                      </div>
                    )}
                    {entry.cleanup_contractor_cost && entry.cleanup_contractor_cost > 0 && (
                      <div>
                        <span className="text-muted-foreground">{t('investigation.environmentalImpact.fields.cleanupContractorCost', 'Cleanup')}:</span>
                        <span className="ms-2 font-medium">{formatCurrency(entry.cleanup_contractor_cost)}</span>
                      </div>
                    )}
                    {entry.regulatory_fines && entry.regulatory_fines > 0 && (
                      <div>
                        <span className="text-muted-foreground">{t('investigation.environmentalImpact.fields.regulatoryFines', 'Fines')}:</span>
                        <span className="ms-2 font-medium text-destructive">{formatCurrency(entry.regulatory_fines)}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 p-2 bg-primary/10 rounded flex items-center justify-between">
                    <span className="font-medium">{t('investigation.environmentalImpact.fields.totalCost', 'Total Cost')}:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{formatCurrency(entry.total_environmental_cost)}</span>
                      {entry.cost_severity && (
                        <Badge className={COST_SEVERITY[entry.cost_severity]?.color}>
                          {getConstantLabel(COST_SEVERITY, entry.cost_severity, isRTL)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Section F: Regulatory */}
            {(entry.applicable_regulation || entry.regulatory_notification_required) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                    {t('investigation.environmentalImpact.sections.regulatory', 'Regulatory & Compliance')}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {entry.applicable_regulation && (
                      <div>
                        <span className="text-muted-foreground">{t('investigation.environmentalImpact.fields.applicableRegulation', 'Regulation')}:</span>
                        <span className="ms-2 font-medium">{getConstantLabel(APPLICABLE_REGULATIONS, entry.applicable_regulation, isRTL)}</span>
                      </div>
                    )}
                    {entry.authority_notified?.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">{t('investigation.environmentalImpact.fields.authorityNotified', 'Notified')}:</span>
                        <span className="ms-2 font-medium">
                          {getConstantLabels(AUTHORITIES, entry.authority_notified, isRTL).join(', ')}
                        </span>
                      </div>
                    )}
                    {entry.notification_reference && (
                      <div>
                        <span className="text-muted-foreground">{t('investigation.environmentalImpact.fields.notificationReference', 'Reference')}:</span>
                        <span className="ms-2 font-medium">{entry.notification_reference}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            {canEdit && (
              <>
                <Separator />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(entry)}>
                    <Edit className="h-4 w-4 me-1" />
                    {t('common.edit', 'Edit')}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4 me-1" />
                        {t('common.delete', 'Delete')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('common.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('investigation.environmentalImpact.confirmDelete', 
                            'Are you sure you want to delete this contamination entry? This action cannot be undone.')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDelete(entry.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('common.delete', 'Delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
