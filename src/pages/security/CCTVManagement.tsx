import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Video,
  VideoOff,
  RefreshCw,
  Plus,
  Settings,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Wrench,
  XCircle,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  useCCTVCameras,
  useCCTVEvents,
  useCameraStats,
  useCreateCamera,
  useUpdateCamera,
  useDeleteCamera,
  useReviewEvent,
  CCTVCamera,
  CCTVEvent,
} from '@/hooks/use-cctv-cameras';
import { CCTVEventsList } from '@/components/security/CCTVEventsList';

export default function CCTVManagement() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'cameras' | 'events'>('cameras');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [editingCamera, setEditingCamera] = useState<CCTVCamera | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: cameras, isLoading, refetch } = useCCTVCameras({
    status: statusFilter || undefined,
  });
  const { data: stats, isLoading: statsLoading } = useCameraStats();
  const deleteMutation = useDeleteCamera();

  const filteredCameras = cameras;

  const getStatusIcon = (status: CCTVCamera['status']) => {
    switch (status) {
      case 'online':
        return <Video className="h-4 w-4 text-success" />;
      case 'offline':
        return <VideoOff className="h-4 w-4 text-muted-foreground" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4 text-warning" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: CCTVCamera['status']) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-success text-success-foreground">{t('common.online', 'Online')}</Badge>;
      case 'offline':
        return <Badge variant="secondary">{t('common.offline', 'Offline')}</Badge>;
      case 'maintenance':
        return <Badge className="bg-warning text-warning-foreground">{t('common.maintenance', 'Maintenance')}</Badge>;
      case 'error':
        return <Badge variant="destructive">{t('common.error', 'Error')}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            {t('security.cctvManagement', 'CCTV Management')}
          </h1>
          <p className="text-muted-foreground">
            {t('security.cctvManagementDesc', 'Monitor cameras, review events, and manage surveillance infrastructure')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 me-2" />
            {t('common.refresh', 'Refresh')}
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t('security.addCamera', 'Add Camera')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.totalCameras', 'Total Cameras')}
            </CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.registeredDevices', 'Registered devices')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={cn((stats?.online ?? 0) > 0 && 'border-success bg-success/5')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('common.online', 'Online')}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-success">{stats?.online ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.activeStreams', 'Active streams')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={cn((stats?.offline ?? 0) > 0 && 'border-muted-foreground')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('common.offline', 'Offline')}
            </CardTitle>
            <VideoOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.offline ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.needsAttention', 'Needs attention')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={cn((stats?.error ?? 0) > 0 && 'border-destructive bg-destructive/5')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.errors', 'Errors')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-destructive">{stats?.error ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.requiresIntervention', 'Requires intervention')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.healthRate', 'Health Rate')}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{Math.round(stats?.healthRate ?? 0)}%</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.camerasOperational', 'Cameras operational')}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="cameras">
                  {t('security.cameras', 'Cameras')}
                  <Badge variant="secondary" className="ms-2">{cameras?.length ?? 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="events">
                  {t('security.events', 'Events')}
                </TabsTrigger>
              </TabsList>
              {activeTab === 'cameras' && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={t('common.allStatus', 'All Status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('common.all', 'All')}</SelectItem>
                    <SelectItem value="online">{t('common.online', 'Online')}</SelectItem>
                    <SelectItem value="offline">{t('common.offline', 'Offline')}</SelectItem>
                    <SelectItem value="maintenance">{t('common.maintenance', 'Maintenance')}</SelectItem>
                    <SelectItem value="error">{t('common.error', 'Error')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </Tabs>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab}>
            <TabsContent value="cameras" className="m-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.status', 'Status')}</TableHead>
                      <TableHead>{t('common.name', 'Name')}</TableHead>
                      <TableHead>{t('security.code', 'Code')}</TableHead>
                      <TableHead>{t('security.zone', 'Zone')}</TableHead>
                      <TableHead>{t('security.location', 'Location')}</TableHead>
                      <TableHead>{t('security.provider', 'Provider')}</TableHead>
                      <TableHead>{t('security.features', 'Features')}</TableHead>
                      <TableHead>{t('security.lastSeen', 'Last Seen')}</TableHead>
                      <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={9}>
                            <Skeleton className="h-10 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredCameras?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {t('common.noRecordsFound', 'No records found')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCameras?.map((camera) => (
                        <TableRow key={camera.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(camera.status)}
                              {getStatusBadge(camera.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{camera.name}</span>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {camera.camera_code}
                            </code>
                          </TableCell>
                          <TableCell>
                            {camera.zone?.zone_name ?? '-'}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {camera.location_description ?? '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {camera.provider ?? '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {camera.ptz_enabled && (
                                <Badge variant="outline" className="text-xs">PTZ</Badge>
                              )}
                              {camera.night_vision && (
                                <Badge variant="outline" className="text-xs">NV</Badge>
                              )}
                              {camera.audio_enabled && (
                                <Badge variant="outline" className="text-xs">Audio</Badge>
                              )}
                              {camera.is_motion_detection_enabled && (
                                <Badge variant="outline" className="text-xs">Motion</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {camera.last_seen_at ? (
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(camera.last_seen_at), 'MMM dd, HH:mm')}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-end">
                            <div className="flex justify-end gap-1">
                              {camera.stream_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(camera.stream_url!, '_blank')}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingCamera(camera)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(camera.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="events" className="m-0">
              <CCTVEventsList />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add/Edit Camera Dialog */}
      <CameraDialog
        open={showAddDialog || !!editingCamera}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingCamera(null);
          }
        }}
        camera={editingCamera}
      />
    </div>
  );
}

function CameraDialog({
  open,
  onOpenChange,
  camera,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camera: CCTVCamera | null;
}) {
  const { t } = useTranslation();
  const createMutation = useCreateCamera();
  const updateMutation = useUpdateCamera();
  const isEditing = !!camera;

  const [formData, setFormData] = useState({
    camera_code: '',
    name: '',
    location_description: '',
    provider: '',
    ip_address: '',
    stream_url: '',
    ptz_enabled: false,
    night_vision: false,
    audio_enabled: false,
    is_motion_detection_enabled: false,
  });

  // Reset form when camera changes
  useState(() => {
    if (camera) {
      setFormData({
        camera_code: camera.camera_code,
        name: camera.name,
        location_description: camera.location_description ?? '',
        provider: camera.provider ?? '',
        ip_address: camera.ip_address ?? '',
        stream_url: camera.stream_url ?? '',
        ptz_enabled: camera.ptz_enabled,
        night_vision: camera.night_vision,
        audio_enabled: camera.audio_enabled,
        is_motion_detection_enabled: camera.is_motion_detection_enabled,
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && camera) {
      await updateMutation.mutateAsync({ id: camera.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('security.editCamera', 'Edit Camera')
              : t('security.addCamera', 'Add Camera')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('security.editCameraDesc', 'Update camera details')
              : t('security.addCameraDesc', 'Register a new camera in the system')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="camera_code">{t('security.cameraCode', 'Camera Code')} *</Label>
              <Input
                id="camera_code"
                value={formData.camera_code}
                onChange={(e) => setFormData({ ...formData, camera_code: e.target.value })}
                placeholder="CAM-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t('common.name', 'Name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Main Entrance Camera"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location_description">{t('security.location', 'Location')}</Label>
            <Input
              id="location_description"
              value={formData.location_description}
              onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
              placeholder="Building A, Ground Floor"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">{t('security.provider', 'Provider')}</Label>
              <Input
                id="provider"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                placeholder="Hikvision"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ip_address">{t('security.ipAddress', 'IP Address')}</Label>
              <Input
                id="ip_address"
                value={formData.ip_address}
                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                placeholder="192.168.1.100"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stream_url">{t('security.streamUrl', 'Stream URL')}</Label>
            <Input
              id="stream_url"
              value={formData.stream_url}
              onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="ptz_enabled">{t('security.ptz', 'PTZ Enabled')}</Label>
              <Switch
                id="ptz_enabled"
                checked={formData.ptz_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, ptz_enabled: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="night_vision">{t('security.nightVision', 'Night Vision')}</Label>
              <Switch
                id="night_vision"
                checked={formData.night_vision}
                onCheckedChange={(checked) => setFormData({ ...formData, night_vision: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="audio_enabled">{t('security.audio', 'Audio')}</Label>
              <Switch
                id="audio_enabled"
                checked={formData.audio_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, audio_enabled: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="motion_detection">{t('security.motionDetection', 'Motion Detection')}</Label>
              <Switch
                id="motion_detection"
                checked={formData.is_motion_detection_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, is_motion_detection_enabled: checked })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? t('common.save', 'Save') : t('common.add', 'Add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
