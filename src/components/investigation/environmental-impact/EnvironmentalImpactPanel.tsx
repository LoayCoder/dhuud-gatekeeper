import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Leaf, Plus, AlertTriangle, DollarSign, FileWarning, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useEnvironmentalContaminationEntries,
  useCreateEnvironmentalContamination,
  useUpdateEnvironmentalContamination,
  useDeleteEnvironmentalContamination,
} from '@/hooks/use-environmental-contamination';
import { EnvironmentalContaminationCard } from './EnvironmentalContaminationCard';
import { EnvironmentalContaminationForm } from './EnvironmentalContaminationForm';
import type { EnvironmentalContaminationEntry } from '@/lib/environmental-contamination-constants';
import { SPILL_SEVERITY, getConstantLabel } from '@/lib/environmental-contamination-constants';
import { cn } from '@/lib/utils';

interface EnvironmentalImpactPanelProps {
  incidentId: string;
  canEdit?: boolean;
}

export function EnvironmentalImpactPanel({ incidentId, canEdit = false }: EnvironmentalImpactPanelProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EnvironmentalContaminationEntry | null>(null);

  const { data: entries = [], isLoading, error } = useEnvironmentalContaminationEntries(incidentId);
  const createMutation = useCreateEnvironmentalContamination();
  const updateMutation = useUpdateEnvironmentalContamination();
  const deleteMutation = useDeleteEnvironmentalContamination();

  // Calculate summary statistics
  const totalEntries = entries.length;
  const totalCost = entries.reduce((sum, e) => sum + (e.total_environmental_cost || 0), 0);
  const regulatoryBreaches = entries.filter(e => e.regulatory_breach_flagged).length;
  const severityCounts = entries.reduce((acc, e) => {
    if (e.spill_severity) {
      acc[e.spill_severity] = (acc[e.spill_severity] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleCreate = async (data: any) => {
    await createMutation.mutateAsync({ incidentId, data });
  };

  const handleUpdate = async (data: any) => {
    if (editingEntry) {
      await updateMutation.mutateAsync({ id: editingEntry.id, incidentId, data });
      setEditingEntry(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync({ id, incidentId });
  };

  const handleEdit = (entry: EnvironmentalContaminationEntry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    if (!open) {
      setEditingEntry(null);
    }
    setIsFormOpen(open);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('common.error', 'Error')}</AlertTitle>
        <AlertDescription>
          {t('investigation.environmentalImpact.loadError', 'Failed to load environmental contamination data')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Leaf className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('investigation.environmentalImpact.summary.totalEntries', 'Total Entries')}
                </p>
                <p className="text-2xl font-bold">{totalEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <DollarSign className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('investigation.environmentalImpact.summary.estimatedCost', 'Est. Cost')}
                </p>
                <p className="text-lg font-bold">{formatCurrency(totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(regulatoryBreaches > 0 && 'border-destructive/50')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                'p-2 rounded-full',
                regulatoryBreaches > 0 
                  ? 'bg-destructive/10' 
                  : 'bg-green-100 dark:bg-green-900/30'
              )}>
                <FileWarning className={cn(
                  'h-4 w-4',
                  regulatoryBreaches > 0 ? 'text-destructive' : 'text-green-600'
                )} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('investigation.environmentalImpact.summary.regulatoryBreaches', 'Breaches')}
                </p>
                <p className={cn('text-2xl font-bold', regulatoryBreaches > 0 && 'text-destructive')}>
                  {regulatoryBreaches}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('investigation.environmentalImpact.summary.bySeverity', 'By Severity')}
                </p>
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(severityCounts).map(([severity, count]) => (
                    <Badge 
                      key={severity} 
                      variant="outline" 
                      className={cn('text-xs', SPILL_SEVERITY[severity]?.color)}
                    >
                      {getConstantLabel(SPILL_SEVERITY, severity, isRTL)}: {count}
                    </Badge>
                  ))}
                  {Object.keys(severityCounts).length === 0 && (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regulatory Breach Alert */}
      {regulatoryBreaches > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('investigation.environmentalImpact.alerts.breachTitle', 'Regulatory Breach Detected')}</AlertTitle>
          <AlertDescription>
            {t('investigation.environmentalImpact.alerts.breachCount', {
              count: regulatoryBreaches,
              defaultValue: `${regulatoryBreaches} contamination entry(ies) flagged for regulatory breach`
            })}
          </AlertDescription>
        </Alert>
      )}

      {/* Add Button */}
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('investigation.environmentalImpact.addEntry', 'Add Contamination Entry')}
          </Button>
        </div>
      )}

      {/* Entries List */}
      {entries.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 rounded-full bg-muted w-fit mb-2">
              <Leaf className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">
              {t('investigation.environmentalImpact.noEntries', 'No Contamination Records')}
            </CardTitle>
            <CardDescription>
              {t('investigation.environmentalImpact.noEntriesDescription', 
                'No environmental contamination records have been added for this incident yet.')}
            </CardDescription>
          </CardHeader>
          {canEdit && (
            <CardContent className="text-center pb-6">
              <Button variant="outline" onClick={() => setIsFormOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('investigation.environmentalImpact.addFirstEntry', 'Add First Entry')}
              </Button>
            </CardContent>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <EnvironmentalContaminationCard
              key={entry.id}
              entry={entry}
              index={index}
              canEdit={canEdit}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <EnvironmentalContaminationForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        entry={editingEntry}
        onSubmit={editingEntry ? handleUpdate : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
