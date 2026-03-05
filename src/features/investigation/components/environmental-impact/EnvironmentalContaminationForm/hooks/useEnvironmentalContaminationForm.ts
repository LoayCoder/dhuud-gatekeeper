import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormData, formSchema, EnvironmentalContaminationFormProps } from '../types';

export function useEnvironmentalContaminationForm(props: Omit<EnvironmentalContaminationFormProps, 'isLoading'>) {
  const { open, onOpenChange, entry, onSubmit } = props;
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [expandedSections, setExpandedSections] = useState<string[]>(['section-a']);


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contamination_types: [],
      contaminant_name: '',
      contaminant_type: '',
      hazard_classification: '',
      release_source: '',
      release_cause: '',
      volume_released: undefined,
      volume_unit: 'liters',
      weight_unit: 'kg',
      secondary_containment_exists: false,
      containment_capacity_unit: 'liters',
      impacted_receptors: [],
      population_exposed: false,
      cost_currency: 'SAR',
      regulatory_notification_required: false,
      authority_notified: [],
    },
  });

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      form.reset({
        contamination_types: entry.contamination_types || [],
        contaminant_name: entry.contaminant_name || '',
        contaminant_type: entry.contaminant_type || '',
        hazard_classification: entry.hazard_classification || '',
        release_source: entry.release_source || '',
        release_source_description: entry.release_source_description || '',
        release_cause: entry.release_cause || '',
        release_cause_justification: entry.release_cause_justification || '',
        volume_released: entry.volume_released || undefined,
        volume_unit: entry.volume_unit || 'liters',
        weight_released: entry.weight_released || undefined,
        weight_unit: entry.weight_unit || 'kg',
        area_affected_sqm: entry.area_affected_sqm || undefined,
        depth_cm: entry.depth_cm || undefined,
        exposure_duration_minutes: entry.exposure_duration_minutes || undefined,
        secondary_containment_exists: entry.secondary_containment_exists || false,
        containment_design_capacity: entry.containment_design_capacity || undefined,
        containment_capacity_unit: entry.containment_capacity_unit || 'liters',
        containment_retained_volume: entry.containment_retained_volume || undefined,
        containment_failure_reason: entry.containment_failure_reason || '',
        containment_failure_reason_other: entry.containment_failure_reason_other || '',
        impacted_receptors: entry.impacted_receptors || [],
        recovery_potential: entry.recovery_potential || '',
        population_exposed: entry.population_exposed || false,
        population_affected_count: entry.population_affected_count || undefined,
        exposure_type: entry.exposure_type || '',
        population_proximity: entry.population_proximity || '',
        soil_remediation_cost: entry.soil_remediation_cost || undefined,
        waste_disposal_cost: entry.waste_disposal_cost || undefined,
        testing_analysis_cost: entry.testing_analysis_cost || undefined,
        cleanup_contractor_cost: entry.cleanup_contractor_cost || undefined,
        regulatory_fines: entry.regulatory_fines || undefined,
        cost_currency: entry.cost_currency || 'SAR',
        applicable_regulation: entry.applicable_regulation || '',
        regulatory_notification_required: entry.regulatory_notification_required || false,
        authority_notified: entry.authority_notified || [],
        notification_date: entry.notification_date ? entry.notification_date.split('T')[0] : '',
        notification_reference: entry.notification_reference || '',
      });
    } else {
      form.reset({
        contamination_types: [],
        contaminant_name: '',
        volume_unit: 'liters',
        weight_unit: 'kg',
        secondary_containment_exists: false,
        containment_capacity_unit: 'liters',
        impacted_receptors: [],
        population_exposed: false,
        cost_currency: 'SAR',
        regulatory_notification_required: false,
        authority_notified: [],
      });
    }
  }, [entry, form]);

  const watchVolume = form.watch('volume_released');
  const watchArea = form.watch('area_affected_sqm');
  const watchDepth = form.watch('depth_cm');
  const watchContainmentExists = form.watch('secondary_containment_exists');
  const watchContainmentCapacity = form.watch('containment_design_capacity');
  const watchContainmentRetained = form.watch('containment_retained_volume');
  const watchPopulationExposed = form.watch('population_exposed');
  const watchReleaseCause = form.watch('release_cause');
  const watchContainmentFailureReason = form.watch('containment_failure_reason');
  const watchRegulatoryNotification = form.watch('regulatory_notification_required');

  // Live calculations
  const calculatedVolume = watchArea && watchDepth ? (watchArea * (watchDepth / 100)).toFixed(3) : null;
  const calculatedFailurePercentage = watchVolume && watchVolume > 0 
    ? (((watchVolume - (watchContainmentRetained || 0)) / watchVolume) * 100).toFixed(1)
    : null;
  const regulatoryBreachDetected = watchContainmentExists && watchContainmentCapacity && watchVolume && watchVolume > watchContainmentCapacity;

  const totalCost = (
    (form.watch('soil_remediation_cost') || 0) +
    (form.watch('waste_disposal_cost') || 0) +
    (form.watch('testing_analysis_cost') || 0) +
    (form.watch('cleanup_contractor_cost') || 0) +
    (form.watch('regulatory_fines') || 0)
  );

  const handleSubmit = async (data: FormData) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  const toggleArrayField = (field: 'contamination_types' | 'impacted_receptors' | 'authority_notified', value: string) => {
    const current = form.getValues(field) || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    form.setValue(field, updated, { shouldValidate: true });
  };


  return {
    t, isRTL, expandedSections, setExpandedSections, form,
    watchVolume, watchArea, watchDepth, watchContainmentExists,
    watchContainmentCapacity, watchContainmentRetained, watchPopulationExposed,
    watchReleaseCause, watchContainmentFailureReason, watchRegulatoryNotification,
    calculatedVolume, calculatedFailurePercentage, regulatoryBreachDetected, totalCost,
    handleSubmit, toggleArrayField,
    open, onOpenChange, entry, onSubmit
  };
}
