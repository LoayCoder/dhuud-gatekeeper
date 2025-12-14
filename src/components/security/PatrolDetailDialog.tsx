import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Route, 
  User, 
  Clock, 
  MapPin, 
  Camera, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";
import { useSecurityPatrol } from "@/hooks/use-security-patrols";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface PatrolDetailDialogProps {
  patrolId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatrolDetailDialog({ patrolId, open, onOpenChange }: PatrolDetailDialogProps) {
  const { t } = useTranslation();
  const { data: patrol, isLoading } = useSecurityPatrol(patrolId);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage.from('patrol-evidence').getPublicUrl(path);
    return data.publicUrl;
  };

  const calculateDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return '-';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMins = Math.round(diffMs / 60000);
    return `${diffMins} ${t('common.minutes', 'min')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">{t('security.patrols.status.completed', 'Completed')}</Badge>;
      case 'in_progress':
        return <Badge variant="default">{t('security.patrols.status.active', 'In Progress')}</Badge>;
      case 'missed':
        return <Badge variant="destructive">{t('security.patrols.status.missed', 'Missed')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            {t('security.patrols.detail.title', 'Patrol Details')}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : patrol ? (
          <ScrollArea className="flex-1">
            <div className="space-y-4 p-1">
              {/* Summary Card */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t('security.patrols.history.route', 'Route')}</p>
                        <p className="font-medium">{patrol.route?.name || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t('security.patrols.history.guard', 'Guard')}</p>
                        <p className="font-medium">{(patrol.guard as unknown as { full_name: string } | null)?.full_name || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t('security.patrols.history.duration', 'Duration')}</p>
                        <p className="font-medium">{calculateDuration(patrol.actual_start, patrol.actual_end)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('security.patrols.history.status', 'Status')}</p>
                      <div className="mt-1">{getStatusBadge(patrol.status)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="checkpoints" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="checkpoints" className="flex-1">
                    {t('security.patrols.detail.checkpointLogs', 'Checkpoint Logs')}
                  </TabsTrigger>
                  <TabsTrigger value="evidence" className="flex-1">
                    {t('security.patrols.detail.evidence', 'Evidence')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="checkpoints" className="mt-4">
                  <div className="space-y-3">
                    {patrol.logs && patrol.logs.length > 0 ? (
                      patrol.logs.map((log: any) => (
                        <Card key={log.id} className="border-s-4 border-s-primary">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{log.checkpoint?.name || 'Checkpoint'}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(log.scanned_at), 'MMM dd, yyyy HH:mm:ss')}
                                </p>
                                {log.notes && (
                                  <p className="text-sm mt-2">{log.notes}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {log.gps_validated ? (
                                  <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {t('security.patrols.detail.validated', 'Validated')}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-600">
                                    <XCircle className="h-3 w-3" />
                                    {t('security.patrols.detail.notValidated', 'Not Validated')}
                                  </Badge>
                                )}
                                {log.linked_incident_id && (
                                  <Badge variant="destructive" className="gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {t('security.patrols.detail.linkedIncident', 'Incident')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {log.photo_paths && Array.isArray(log.photo_paths) && log.photo_paths.length > 0 && (
                              <div className="flex gap-2 mt-3">
                                {log.photo_paths.map((photo: string, idx: number) => (
                                  <button
                                    key={idx}
                                    onClick={() => setSelectedPhoto(photo)}
                                    className="relative h-16 w-16 rounded-md overflow-hidden border hover:ring-2 ring-primary transition-all"
                                  >
                                    <img
                                      src={getPhotoUrl(photo)}
                                      alt={`Evidence ${idx + 1}`}
                                      className="h-full w-full object-cover"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>{t('security.patrols.detail.noCheckpoints', 'No checkpoint logs')}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="evidence" className="mt-4">
                  <div className="space-y-4">
                    {patrol.logs?.some((log: any) => log.photo_paths?.length > 0) ? (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {patrol.logs.flatMap((log: any) =>
                          (log.photo_paths || []).map((photo: string, idx: number) => (
                            <button
                              key={`${log.id}-${idx}`}
                              onClick={() => setSelectedPhoto(photo)}
                              className="relative aspect-square rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all group"
                            >
                              <img
                                src={getPhotoUrl(photo)}
                                alt={`Evidence`}
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Camera className="h-6 w-6 text-white" />
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>{t('security.patrols.detail.noPhotos', 'No photos captured')}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('common.notFound', 'Not found')}</p>
          </div>
        )}

        {/* Photo Lightbox */}
        {selectedPhoto && (
          <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden">
              <img
                src={getPhotoUrl(selectedPhoto)}
                alt="Evidence"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}