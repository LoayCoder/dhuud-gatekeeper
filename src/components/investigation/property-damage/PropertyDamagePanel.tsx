import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Package, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { PropertyDamageCard } from './PropertyDamageCard';
import { PropertyDamageEntryForm } from './PropertyDamageEntryForm';
import {
  useIncidentPropertyDamages,
  useCreateIncidentPropertyDamage,
  useUpdateIncidentPropertyDamage,
  useDeleteIncidentPropertyDamage,
  type IncidentPropertyDamage,
  type CreateIncidentPropertyDamageInput,
} from '@/hooks/use-incident-property-damages';
import { DAMAGE_SEVERITY, type DamageSeverityCode } from '@/lib/property-damage-constants';
import { formatCurrency } from '@/lib/currency-utils';

interface PropertyDamagePanelProps {
  incidentId: string;
  canEdit?: boolean;
}

export function PropertyDamagePanel({ incidentId, canEdit = true }: PropertyDamagePanelProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDamage, setEditingDamage] = useState<IncidentPropertyDamage | null>(null);

  const { data: damages = [], isLoading } = useIncidentPropertyDamages(incidentId);
  const createMutation = useCreateIncidentPropertyDamage();
  const updateMutation = useUpdateIncidentPropertyDamage();
  const deleteMutation = useDeleteIncidentPropertyDamage();

  const handleCreate = async (data: CreateIncidentPropertyDamageInput) => {
    await createMutation.mutateAsync(data);
    setIsFormOpen(false);
  };

  const handleUpdate = async (data: CreateIncidentPropertyDamageInput) => {
    if (!editingDamage) return;
    await updateMutation.mutateAsync({
      id: editingDamage.id,
      ...data,
    });
    setEditingDamage(null);
    setIsFormOpen(false);
  };

  const handleDelete = async (damage: IncidentPropertyDamage) => {
    await deleteMutation.mutateAsync({
      id: damage.id,
      incidentId: damage.incident_id,
    });
  };

  const handleEdit = (damage: IncidentPropertyDamage) => {
    setEditingDamage(damage);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingDamage(null);
  };

  // Calculate statistics
  const stats = {
    total: damages.length,
    bySeverity: damages.reduce((acc, damage) => {
      const severity = damage.damage_severity || 'unknown';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    totalEstimatedCost: damages.reduce((sum, d) => 
      sum + (d.repair_cost_estimate || 0) + (d.replacement_cost_estimate || 0), 0
    ),
    totalDowntime: damages.reduce((sum, d) => sum + (d.downtime_hours || 0), 0),
    hasHazards: damages.filter((d) => d.safety_hazard_created).length,
  };

  // Get primary currency from first damage or default to SAR
  const primaryCurrency = damages[0]?.cost_currency || 'SAR';

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('investigation.propertyDamage.summary.totalDamaged', 'Total Damaged')}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('investigation.propertyDamage.summary.estimatedCost', 'Estimated Cost')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalEstimatedCost > 0 
                ? formatCurrency(stats.totalEstimatedCost * 100, primaryCurrency)
                : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('investigation.propertyDamage.summary.totalDowntime', 'Total Downtime')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalDowntime}
              <span className="text-sm font-normal text-muted-foreground ms-1">
                {t('common.hours', 'hours')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('investigation.propertyDamage.summary.bySeverity', 'By Severity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.bySeverity).map(([severity, count]) => {
                const severityData = DAMAGE_SEVERITY[severity as DamageSeverityCode];
                return (
                  <span
                    key={severity}
                    className={`text-xs px-2 py-0.5 rounded-full ${severityData?.color || 'bg-muted'}`}
                  >
                    {severityData ? (isRTL ? severityData.ar : severityData.en) : severity}: {count}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Safety Hazard Alert */}
      {stats.hasHazards > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              {t('investigation.propertyDamage.hazardAlert', '{{count}} property damage(s) created safety hazards', { count: stats.hasHazards })}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Add Button */}
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('investigation.propertyDamage.addDamage', 'Add Property Damage')}
          </Button>
        </div>
      )}

      {/* Damages List */}
      {damages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">
              {t('investigation.propertyDamage.noDamages', 'No property damage records')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t(
                'investigation.propertyDamage.noDamagesDescription',
                'No property damage records have been added for this incident yet.'
              )}
            </p>
            {canEdit && (
              <Button variant="outline" onClick={() => setIsFormOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('investigation.propertyDamage.addFirstDamage', 'Add First Property Damage Record')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {damages.map((damage, index) => (
            <PropertyDamageCard
              key={damage.id}
              damage={damage}
              index={index}
              onEdit={() => handleEdit(damage)}
              onDelete={() => handleDelete(damage)}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingDamage
                ? t('investigation.propertyDamage.editDamage', 'Edit Property Damage Record')
                : t('investigation.propertyDamage.addDamage', 'Add Property Damage')}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-100px)]">
            <div className="pe-4">
              <PropertyDamageEntryForm
                incidentId={incidentId}
                initialData={editingDamage || undefined}
                onSubmit={editingDamage ? handleUpdate : handleCreate}
                onCancel={handleCloseForm}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
