import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  ChevronDown,
  ChevronUp,
  User,
  HardHat,
  Calendar,
  Activity,
  Stethoscope,
  Edit,
  Trash2,
  HeartPulse,
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
import { BodyDiagramCanvas } from './BodyDiagramCanvas';
import {
  INJURY_SEVERITY,
  INJURY_TYPES,
  BODY_PARTS,
  RECORDER_ROLES,
  type InjurySeverityCode,
  type InjuryTypeCode,
  type BodyPartCode,
  type RecorderRoleCode,
} from '@/lib/body-parts-constants';
import type { IncidentInjury } from '@/hooks/use-incident-injuries';

interface InjuredPersonCardProps {
  injury: IncidentInjury;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  canEdit?: boolean;
}

export function InjuredPersonCard({
  injury,
  index,
  onEdit,
  onDelete,
  canEdit = true,
}: InjuredPersonCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [isOpen, setIsOpen] = useState(false);

  const dateLocale = isRTL ? ar : enUS;

  const severityData = injury.injury_severity
    ? INJURY_SEVERITY[injury.injury_severity as InjurySeverityCode]
    : null;

  const getMarkerCount = () => {
    const data = injury.body_diagram_data;
    return (
      (data?.front?.length || 0) +
      (data?.back?.length || 0) +
      (data?.left?.length || 0) +
      (data?.right?.length || 0)
    );
  };

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
                    {injury.is_platform_user ? (
                      <User className="h-4 w-4 text-muted-foreground" />
                    ) : injury.linked_contractor_worker_id ? (
                      <HardHat className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{injury.injured_person_name}</span>
                    {severityData && (
                      <Badge className={cn('text-xs', severityData.color)}>
                        {isRTL ? severityData.ar : severityData.en}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {injury.injury_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(injury.injury_date), 'PP', { locale: dateLocale })}
                      </span>
                    )}
                    {injury.injury_type && injury.injury_type.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {injury.injury_type.length} {t('investigation.injuries.injuryTypes', 'type(s)')}
                      </span>
                    )}
                    {getMarkerCount() > 0 && (
                      <span className="flex items-center gap-1">
                        <HeartPulse className="h-3 w-3" />
                        {getMarkerCount()} {t('investigation.injuries.markers', 'marker(s)')}
                      </span>
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
                            {t('investigation.injuries.deleteConfirmTitle', 'Delete Injury Record')}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t(
                              'investigation.injuries.deleteConfirmDescription',
                              'Are you sure you want to delete this injury record? This action cannot be undone.'
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
            {/* Personal Info */}
            <div className="grid gap-4 sm:grid-cols-2 p-3 rounded-lg bg-muted/30">
              {injury.national_id && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    {t('investigation.injuries.fields.nationalId', 'National ID')}
                  </span>
                  <p className="text-sm font-medium">{injury.national_id}</p>
                </div>
              )}
              {injury.injury_date && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    {t('investigation.injuries.fields.injuryDate', 'Injury Date')}
                  </span>
                  <p className="text-sm font-medium">
                    {format(new Date(injury.injury_date), 'PPP', { locale: dateLocale })}
                  </p>
                </div>
              )}
            </div>

            {/* Injury Types */}
            {injury.injury_type && injury.injury_type.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground block mb-2">
                  {t('investigation.injuries.fields.injuryType', 'Injury Type(s)')}
                </span>
                <div className="flex flex-wrap gap-1">
                  {injury.injury_type.map((type) => {
                    const typeData = INJURY_TYPES[type as InjuryTypeCode];
                    return (
                      <Badge key={type} variant="outline">
                        {typeData ? (isRTL ? typeData.ar : typeData.en) : type}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Body Parts */}
            {injury.body_parts_affected && injury.body_parts_affected.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground block mb-2">
                  {t('investigation.injuries.fields.bodyPartsAffected', 'Body Parts Affected')}
                </span>
                <div className="flex flex-wrap gap-1">
                  {injury.body_parts_affected.map((part) => {
                    const partData = BODY_PARTS[part as BodyPartCode];
                    return (
                      <Badge key={part} variant="secondary">
                        {partData ? (isRTL ? partData.ar : partData.en) : part}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            {injury.injury_description && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">
                  {t('investigation.injuries.fields.description', 'Description')}
                </span>
                <p className="text-sm">{injury.injury_description}</p>
              </div>
            )}

            {/* Body Diagram (read-only) */}
            {getMarkerCount() > 0 && (
              <div>
                <span className="text-xs text-muted-foreground block mb-2">
                  {t('investigation.injuries.bodyDiagram', 'Body Diagram')}
                </span>
                <BodyDiagramCanvas
                  value={injury.body_diagram_data}
                  onChange={() => {}}
                  readOnly
                />
              </div>
            )}

            {/* Treatment Info */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {t('investigation.injuries.fields.firstAidProvided', 'First Aid')}
                  </span>
                  <span className="text-sm font-medium">
                    {injury.first_aid_provided
                      ? t('common.yes', 'Yes')
                      : t('common.no', 'No')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {t('investigation.injuries.fields.medicalAttention', 'Medical Attention')}
                  </span>
                  <span className="text-sm font-medium">
                    {injury.medical_attention_required
                      ? t('common.yes', 'Yes')
                      : t('common.no', 'No')}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block">
                  {t('investigation.injuries.fields.daysLost', 'Lost Days')}
                </span>
                <span className="text-sm font-medium">{injury.days_lost || 0}</span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block">
                  {t('investigation.injuries.fields.restrictedDays', 'Restricted Days')}
                </span>
                <span className="text-sm font-medium">{injury.restricted_duty_days || 0}</span>
              </div>
            </div>

            {/* Recorder Info */}
            {injury.recorder_role && (
              <div className="text-xs text-muted-foreground">
                {t('investigation.injuries.recordedBy', 'Recorded by')}:{' '}
                {injury.recorded_by_profile?.full_name || t('common.unknown', 'Unknown')}
                {' ('}
                {RECORDER_ROLES[injury.recorder_role as RecorderRoleCode]
                  ? isRTL
                    ? RECORDER_ROLES[injury.recorder_role as RecorderRoleCode].ar
                    : RECORDER_ROLES[injury.recorder_role as RecorderRoleCode].en
                  : injury.recorder_role}
                {')'}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
