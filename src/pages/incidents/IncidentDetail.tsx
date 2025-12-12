import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FileText, MapPin, Calendar, AlertTriangle, MoreHorizontal, Trash2, User, Building, ExternalLink, Clock, Tag, Printer } from 'lucide-react';
import { IncidentAttachmentsSection } from '@/components/incidents/IncidentAttachmentsSection';
import { IncidentStatusBadge } from '@/components/incidents/IncidentStatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIncident, useDeleteIncident } from '@/hooks/use-incidents';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useState } from 'react';
import { generateIncidentReportPDF } from '@/lib/generate-incident-report-pdf';
import { toast } from 'sonner';

const getSeverityBadgeVariant = (severity: string | null) => {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
};

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: incident, isLoading } = useIncident(id);
  const { isAdmin, profile } = useAuth();
  
  // Determine back navigation path based on where user came from
  const searchParams = new URLSearchParams(location.search);
  const fromPage = searchParams.get('from');
  const backPath = fromPage === 'my-actions' ? '/incidents/my-actions' : '/incidents';
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const deleteIncident = useDeleteIncident();

  const handleConfirmDelete = async () => {
    if (!id) return;
    await deleteIncident.mutateAsync(id);
    navigate('/incidents');
  };

  const handlePrintReport = async () => {
    if (!incident || !profile?.tenant_id) return;
    
    // Fetch fresh user for the PDF generation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      toast.error(t('common.error'));
      return;
    }
    
    setIsPrinting(true);
    toast.loading(t('incidents.reportGenerating'));
    
    try {
      await generateIncidentReportPDF({
        incident,
        tenantId: profile.tenant_id,
        userId: user.id,
        language: i18n.language as 'en' | 'ar',
      });
      toast.dismiss();
      toast.success(t('incidents.reportGenerated'));
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.dismiss();
      toast.error(t('common.error'));
    } finally {
      setIsPrinting(false);
    }
  };

  // Parse media attachments
  const mediaAttachments = incident?.media_attachments as Array<{ url: string; type: string; name: string }> | null;

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-6 space-y-6" dir={direction}>
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="container max-w-4xl py-6" dir={direction}>
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('incidents.notFound')}</h3>
            <Button asChild variant="outline">
              <Link to={backPath} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t('incidents.backToList')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to={backPath}>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{incident.title}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{incident.reference_id}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem asChild>
                <Link to={`/incidents/investigate?incident=${id}`}>
                  {t('navigation.investigationWorkspace')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handlePrintReport}
                disabled={isPrinting}
              >
                <Printer className="h-4 w-4 me-2" />
                {t('incidents.printReport')}
              </DropdownMenuItem>
              {isAdmin && incident.status !== 'closed' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 me-2" />
                    {t('incidents.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status and Type Badges - Read-only display (status changes via workflow only) */}
      <div className="flex flex-wrap gap-2 items-center">
        {incident.severity && (
          <Badge variant={getSeverityBadgeVariant(incident.severity)} className="text-sm">
            {t(`incidents.severityLevels.${incident.severity}`)}
          </Badge>
        )}
        {incident.status && (
          <IncidentStatusBadge status={incident.status} />
        )}
        <Badge variant="secondary" className="text-sm">
          {t(`incidents.eventTypes.${incident.event_type}`)}
        </Badge>
        {incident.subtype && (
          <Badge variant="outline" className="text-sm">
            <Tag className="h-3 w-3 me-1" />
            {t(`incidents.incidentTypes.${incident.subtype}`) || incident.subtype}
          </Badge>
        )}
      </div>

      {/* Description Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('incidents.description')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{incident.description}</p>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Date/Time Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('incidents.occurredAt')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incident.occurred_at && format(new Date(incident.occurred_at), 'PPpp')}
          </CardContent>
        </Card>

        {/* Reporter Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('incidents.reportedBy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incident.reporter?.full_name || t('common.unknown')}
          </CardContent>
        </Card>

        {/* Location Card */}
        {(incident.location || incident.branch || incident.site || incident.department_info) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4" />
                {t('incidents.locationDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {incident.branch && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('incidents.branch')}: </span>
                  {incident.branch.name}
                </div>
              )}
              {incident.site && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('incidents.site')}: </span>
                  {incident.site.name}
                </div>
              )}
              {incident.department_info && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('incidents.responsibleDepartment')}: </span>
                  {incident.department_info.name}
                </div>
              )}
              {incident.location && (
                <div className="text-sm mt-2">
                  <span className="text-muted-foreground">{t('incidents.location')}: </span>
                  {incident.location}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* GPS Coordinates Card */}
        {(incident.latitude && incident.longitude) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('incidents.gpsLocation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm font-mono">
                {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
              </div>
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  {t('incidents.viewOnMap')}
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Special Event Linkage */}
      {incident.special_event && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('incidents.linkedEvent')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{incident.special_event.name}</Badge>
          </CardContent>
        </Card>
      )}

      {/* Immediate Actions */}
      {incident.immediate_actions && (
        <Card>
          <CardHeader>
            <CardTitle>{t('incidents.immediateActions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{incident.immediate_actions}</p>
          </CardContent>
        </Card>
      )}

      {/* Injury Details */}
      {incident.has_injury && incident.injury_details && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              {t('incidents.injuryDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(incident.injury_details as Record<string, unknown>)?.count && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground">{t('incidents.injuryCount')}:</span>
                  <span className="font-medium">{String((incident.injury_details as Record<string, unknown>).count)}</span>
                </div>
              )}
              {(incident.injury_details as Record<string, unknown>)?.description && (
                <p className="text-sm">{String((incident.injury_details as Record<string, unknown>).description)}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Damage Details */}
      {incident.has_damage && incident.damage_details && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="text-orange-600 dark:text-orange-500">
              {t('incidents.damageDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(incident.damage_details as Record<string, unknown>)?.description && (
                <p className="text-sm">{String((incident.damage_details as Record<string, unknown>).description)}</p>
              )}
              {(incident.damage_details as Record<string, unknown>)?.estimated_cost && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground">{t('incidents.estimatedCost')}:</span>
                  <span className="font-medium">{String((incident.damage_details as Record<string, unknown>).estimated_cost)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Attachments (Initial + Evidence) */}
      <Card>
        <CardContent className="pt-6">
          <IncidentAttachmentsSection 
            incidentId={id!}
            mediaAttachments={mediaAttachments}
          />
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('incidents.metadata')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('incidents.createdAt')}:</span>
            <span>{incident.created_at && format(new Date(incident.created_at), 'PPpp')}</span>
          </div>
          {incident.updated_at && incident.updated_at !== incident.created_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('incidents.updatedAt')}:</span>
              <span>{format(new Date(incident.updated_at), 'PPpp')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('incidents.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('incidents.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}