import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, HeartPulse, AlertTriangle, Users } from 'lucide-react';
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
import { InjuredPersonCard } from './injury/InjuredPersonCard';
import { InjuryEntryForm } from './injury/InjuryEntryForm';
import {
  useIncidentInjuries,
  useCreateIncidentInjury,
  useUpdateIncidentInjury,
  useDeleteIncidentInjury,
  type IncidentInjury,
  type CreateIncidentInjuryInput,
} from '@/hooks/use-incident-injuries';
import { INJURY_SEVERITY, type InjurySeverityCode } from '@/lib/body-parts-constants';

interface InjuryPanelProps {
  incidentId: string;
  canEdit?: boolean;
}

export function InjuryPanel({ incidentId, canEdit = true }: InjuryPanelProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInjury, setEditingInjury] = useState<IncidentInjury | null>(null);

  const { data: injuries = [], isLoading } = useIncidentInjuries(incidentId);
  const createMutation = useCreateIncidentInjury();
  const updateMutation = useUpdateIncidentInjury();
  const deleteMutation = useDeleteIncidentInjury();

  const handleCreate = async (data: CreateIncidentInjuryInput) => {
    await createMutation.mutateAsync(data);
    setIsFormOpen(false);
  };

  const handleUpdate = async (data: CreateIncidentInjuryInput) => {
    if (!editingInjury) return;
    await updateMutation.mutateAsync({
      id: editingInjury.id,
      ...data,
    });
    setEditingInjury(null);
    setIsFormOpen(false);
  };

  const handleDelete = async (injury: IncidentInjury) => {
    await deleteMutation.mutateAsync({
      id: injury.id,
      incidentId: injury.incident_id,
    });
  };

  const handleEdit = (injury: IncidentInjury) => {
    setEditingInjury(injury);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingInjury(null);
  };

  // Calculate statistics
  const stats = {
    total: injuries.length,
    bySeverity: injuries.reduce((acc, injury) => {
      const severity = injury.injury_severity || 'unknown';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    totalDaysLost: injuries.reduce((sum, i) => sum + (i.days_lost || 0), 0),
    hospitalized: injuries.filter((i) => i.hospitalized).length,
  };

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
              {t('investigation.injuries.summary.totalInjured', 'Total Injured')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('investigation.injuries.summary.hospitalized', 'Hospitalized')}
            </CardTitle>
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hospitalized}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('investigation.injuries.summary.totalDaysLost', 'Total Days Lost')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDaysLost}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('investigation.injuries.summary.severityBreakdown', 'By Severity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.bySeverity).map(([severity, count]) => {
                const severityData = INJURY_SEVERITY[severity as InjurySeverityCode];
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

      {/* Add Button */}
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('investigation.injuries.addInjury', 'Add Injured Person')}
          </Button>
        </div>
      )}

      {/* Injuries List */}
      {injuries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <HeartPulse className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">
              {t('investigation.injuries.noInjuries', 'No injury records')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t(
                'investigation.injuries.noInjuriesDescription',
                'No injury records have been added for this incident yet.'
              )}
            </p>
            {canEdit && (
              <Button variant="outline" onClick={() => setIsFormOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('investigation.injuries.addFirstInjury', 'Add First Injury Record')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {injuries.map((injury, index) => (
            <InjuredPersonCard
              key={injury.id}
              injury={injury}
              index={index}
              onEdit={() => handleEdit(injury)}
              onDelete={() => handleDelete(injury)}
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
              {editingInjury
                ? t('investigation.injuries.editInjury', 'Edit Injury Record')
                : t('investigation.injuries.addInjury', 'Add Injured Person')}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-100px)]">
            <div className="pe-4">
              <InjuryEntryForm
                incidentId={incidentId}
                initialData={editingInjury || undefined}
                onSubmit={editingInjury ? handleUpdate : handleCreate}
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
