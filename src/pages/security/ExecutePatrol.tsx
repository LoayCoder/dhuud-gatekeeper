import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Navigation,
  AlertTriangle,
  Loader2,
  Battery,
  Signal
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { 
  usePatrolRoutes, 
  usePatrolRoute,
  useStartPatrol, 
  useLogCheckpoint, 
  useCompletePatrol 
} from "@/hooks/use-security-patrols";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { calculateDistance } from "@/lib/geo-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CheckpointPhotoCapture } from "@/components/security/CheckpointPhotoCapture";
import { CheckpointIncidentDialog } from "@/components/security/CheckpointIncidentDialog";

export default function ExecutePatrol() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [activePatrolId, setActivePatrolId] = useState<string | null>(null);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [notes, setNotes] = useState('');
  const [completedCheckpoints, setCompletedCheckpoints] = useState<Set<string>>(new Set());
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [linkedIncidentId, setLinkedIncidentId] = useState<string | null>(null);
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  const { data: routes, isLoading: routesLoading } = usePatrolRoutes();
  const { data: selectedRoute, isLoading: routeLoading } = usePatrolRoute(selectedRouteId);
  const startPatrol = useStartPatrol();
  const logCheckpoint = useLogCheckpoint();
  const completePatrol = useCompletePatrol();

  const checkpoints = selectedRoute?.checkpoints || [];
  const currentCheckpoint = checkpoints[currentCheckpointIndex];
  const progress = checkpoints.length > 0
    ? (completedCheckpoints.size / checkpoints.length) * 100 
    : 0;

  // Get GPS validation radius from checkpoint or use default
  const gpsRadius = currentCheckpoint?.radius_meters ?? 20;

  // Calculate distance to current checkpoint
  const distanceToCheckpoint = userLocation && currentCheckpoint?.latitude && currentCheckpoint?.longitude
    ? calculateDistance(userLocation.lat, userLocation.lng, currentCheckpoint.latitude, currentCheckpoint.longitude)
    : null;

  // Check battery level
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }
  }, []);

  const refreshLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError(t('security.patrols.execution.gpsNotSupported', 'GPS not supported on this device'));
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsLocating(false);
      },
      (error) => {
        setLocationError(t('security.patrols.execution.gpsError', 'Unable to get location'));
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleStartPatrol = async () => {
    if (!selectedRouteId || !profile?.tenant_id || !user?.id) return;

    try {
      const result = await startPatrol.mutateAsync({
        routeId: selectedRouteId,
      });

      setActivePatrolId(result.id);
      toast({
        title: t('common.success'),
        description: t('security.patrols.execution.patrolStarted', 'Patrol started successfully'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('security.patrols.execution.patrolStartFailed', 'Failed to start patrol'),
        variant: 'destructive',
      });
    }
  };

  const validateLocation = (): boolean => {
    if (!userLocation || !currentCheckpoint) return false;
    if (!currentCheckpoint.latitude || !currentCheckpoint.longitude) return true; // No GPS required

    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      currentCheckpoint.latitude,
      currentCheckpoint.longitude
    );

    return distance <= gpsRadius;
  };

  const handleLogCheckpoint = async () => {
    if (!activePatrolId || !currentCheckpoint || !profile?.tenant_id) return;

    // Validate GPS location if checkpoint has coordinates
    if (currentCheckpoint.latitude && currentCheckpoint.longitude) {
      if (!userLocation) {
        toast({
          title: t('security.patrols.execution.locationRequired', 'Location Required'),
          description: t('security.patrols.execution.refreshLocationFirst', 'Please refresh your location first'),
          variant: 'destructive',
        });
        return;
      }

      if (!validateLocation()) {
        toast({
          title: t('security.patrols.execution.tooFar', 'Too Far From Checkpoint'),
          description: t('security.patrols.execution.moveCloser', 'Please move closer to the checkpoint location') + ` (${Math.round(distanceToCheckpoint || 0)}m > ${gpsRadius}m)`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate photo requirement
    if (currentCheckpoint.photo_required && capturedPhotos.length === 0) {
      toast({
        title: t('security.patrols.execution.photoRequired', 'Photo Required'),
        description: t('security.patrols.execution.takePhotoFirst', 'Please take at least one photo before logging this checkpoint'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await logCheckpoint.mutateAsync({
        patrolId: activePatrolId,
        checkpointId: currentCheckpoint.id,
        verificationMethod: 'gps',
        gpsLat: userLocation?.lat,
        gpsLng: userLocation?.lng,
        gpsAccuracy: userLocation?.accuracy,
        gpsValidated: !!userLocation && validateLocation(),
        validationDistance: distanceToCheckpoint ?? undefined,
        validationThreshold: gpsRadius,
        observationNotes: notes || undefined,
        photoPaths: capturedPhotos.length > 0 ? capturedPhotos : undefined,
        linkedIncidentId: linkedIncidentId ?? undefined,
      });

      setCompletedCheckpoints(prev => new Set([...prev, currentCheckpoint.id]));
      setNotes('');
      setCapturedPhotos([]);
      setLinkedIncidentId(null);

      if (currentCheckpointIndex < checkpoints.length - 1) {
        setCurrentCheckpointIndex(prev => prev + 1);
      }

      toast({
        title: t('common.success'),
        description: t('security.patrols.execution.checkpointLogged', 'Checkpoint logged successfully'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('security.patrols.execution.checkpointLogFailed', 'Failed to log checkpoint'),
        variant: 'destructive',
      });
    }
  };

  const handleCompletePatrol = async () => {
    if (!activePatrolId) return;

    try {
      await completePatrol.mutateAsync({
        patrolId: activePatrolId,
        notes: notes || undefined,
      });

      toast({
        title: t('common.success'),
        description: t('security.patrols.execution.patrolCompleted', 'Patrol completed successfully'),
      });

      navigate('/security/patrols');
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('security.patrols.execution.patrolCompleteFailed', 'Failed to complete patrol'),
        variant: 'destructive',
      });
    }
  };

  // Auto-refresh location when patrol is active
  useEffect(() => {
    if (activePatrolId) {
      refreshLocation();
    }
  }, [activePatrolId, currentCheckpointIndex]);

  // Route Selection Screen
  if (!activePatrolId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('security.patrols.execution.start', 'Start Patrol')}
          </h1>
          <p className="text-muted-foreground">
            {t('security.patrols.execution.selectRouteDescription', 'Select a patrol route to begin')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('security.patrols.execution.selectRoute', 'Select Route')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {routesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('security.patrols.execution.selectRoutePlaceholder', 'Choose a patrol route...')} />
                </SelectTrigger>
                <SelectContent>
                  {routes?.filter(r => r.is_active).map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.name} ({route.checkpoints?.length || 0} {t('security.patrols.routes.checkpoints', 'checkpoints')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedRoute && (
              <div className="rounded-lg border p-4 space-y-2">
                <p className="font-medium">{selectedRoute.name}</p>
                <p className="text-sm text-muted-foreground">{selectedRoute.description}</p>
                <div className="flex gap-4 text-sm">
                  <span>{checkpoints.length} {t('security.patrols.routes.checkpoints', 'checkpoints')}</span>
                  <span>{selectedRoute.estimated_duration_minutes} {t('common.minutes', 'min')}</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleStartPatrol} 
              disabled={!selectedRouteId || startPatrol.isPending}
              className="w-full"
              size="lg"
            >
              {startPatrol.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : null}
              {t('security.patrols.execution.begin', 'Begin Patrol')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Patrol Execution Screen (Mobile-first, large buttons)
  return (
    <div className="space-y-4 pb-24">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {batteryLevel !== null && batteryLevel < 20 && (
            <div className="flex items-center gap-1 text-warning">
              <Battery className="h-4 w-4" />
              {batteryLevel}%
            </div>
          )}
          {userLocation && (
            <div className="flex items-center gap-1">
              <Signal className="h-4 w-4 text-green-500" />
              ±{Math.round(userLocation.accuracy)}m
            </div>
          )}
        </div>
      </div>

      {/* Progress Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {t('security.patrols.execution.progress', 'Progress')}
            </span>
            <span className="text-sm text-muted-foreground">
              {completedCheckpoints.size}/{checkpoints.length}
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* Current Checkpoint Card */}
      {currentCheckpoint && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="mb-2">
                  {t('security.patrols.execution.checkpoint', 'Checkpoint')} {currentCheckpointIndex + 1}
                </Badge>
                {currentCheckpoint.photo_required && (
                  <Badge variant="secondary" className="mb-2">📷</Badge>
                )}
              </div>
              {completedCheckpoints.has(currentCheckpoint.id) && (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              )}
            </div>
            <CardTitle className="text-xl">{currentCheckpoint.name}</CardTitle>
            <CardDescription>{currentCheckpoint.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Distance to Checkpoint */}
            {distanceToCheckpoint !== null && (
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                distanceToCheckpoint <= gpsRadius ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-destructive/10 text-destructive'
              }`}>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {distanceToCheckpoint <= gpsRadius 
                      ? t('security.patrols.execution.inRange', 'In range')
                      : t('security.patrols.execution.outOfRange', 'Out of range')}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {Math.round(distanceToCheckpoint)}m / {gpsRadius}m
                </span>
              </div>
            )}

            {/* Location Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span className="text-sm">
                  {userLocation 
                    ? t('security.patrols.execution.locationCaptured', 'Location captured')
                    : t('security.patrols.execution.noLocation', 'No location')}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshLocation}
                disabled={isLocating}
              >
                {isLocating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
              </Button>
            </div>

            {locationError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {locationError}
              </div>
            )}

            {/* Photo Capture */}
            <CheckpointPhotoCapture
              patrolId={activePatrolId}
              checkpointId={currentCheckpoint.id}
              onPhotosCaptured={setCapturedPhotos}
              existingPhotos={capturedPhotos}
              required={currentCheckpoint.photo_required ?? false}
            />

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t('security.patrols.execution.observations', 'Observations')}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('security.patrols.execution.notesPlaceholder', 'Any observations or findings...')}
                rows={3}
              />
            </div>

            {/* Linked Incident */}
            {linkedIncidentId && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{t('security.patrols.execution.incidentLinked', 'Incident linked')}</span>
              </div>
            )}

            {/* Action Buttons - Large for mobile */}
            <div className="grid gap-3">
              <Button 
                size="lg" 
                className="h-14 text-lg"
                onClick={handleLogCheckpoint}
                disabled={logCheckpoint.isPending || completedCheckpoints.has(currentCheckpoint.id)}
              >
                {logCheckpoint.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin me-2" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 me-2" />
                )}
                {completedCheckpoints.has(currentCheckpoint.id)
                  ? t('security.patrols.status.completed', 'Completed')
                  : t('security.patrols.execution.confirmLocation', 'I Am Here')}
              </Button>

              {!completedCheckpoints.has(currentCheckpoint.id) && (
                <Button 
                  variant="outline"
                  size="lg"
                  className="h-12 gap-2"
                  onClick={() => setShowIncidentDialog(true)}
                >
                  <AlertTriangle className="h-5 w-5" />
                  {t('security.patrols.execution.reportIncident', 'Report Incident')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checkpoint List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('security.patrols.execution.allCheckpoints', 'All Checkpoints')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checkpoints.map((cp, index) => (
              <div 
                key={cp.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  index === currentCheckpointIndex ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setCurrentCheckpointIndex(index)}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    completedCheckpoints.has(cp.id) 
                      ? 'bg-green-500 text-white' 
                      : 'bg-muted'
                  }`}>
                    {completedCheckpoints.has(cp.id) ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>
                  <div>
                    <span className="font-medium">{cp.name}</span>
                    {cp.radius_meters && cp.radius_meters !== 20 && (
                      <span className="ms-2 text-xs text-muted-foreground">({cp.radius_meters}m)</span>
                    )}
                  </div>
                </div>
                {cp.photo_required && (
                  <Badge variant="secondary" className="text-xs">📷</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Complete Patrol Button - Fixed at bottom */}
      {completedCheckpoints.size === checkpoints.length && checkpoints.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-background border-t">
          <Button 
            size="lg" 
            className="w-full h-14 text-lg"
            onClick={handleCompletePatrol}
            disabled={completePatrol.isPending}
          >
            {completePatrol.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin me-2" />
            ) : (
              <CheckCircle2 className="h-5 w-5 me-2" />
            )}
            {t('security.patrols.execution.complete', 'Complete Patrol')}
          </Button>
        </div>
      )}

      {/* Incident Dialog */}
      {currentCheckpoint && (
        <CheckpointIncidentDialog
          open={showIncidentDialog}
          onOpenChange={setShowIncidentDialog}
          checkpointName={currentCheckpoint.name}
          patrolId={activePatrolId}
          checkpointId={currentCheckpoint.id}
          gpsLat={userLocation?.lat}
          gpsLng={userLocation?.lng}
          onIncidentCreated={setLinkedIncidentId}
        />
      )}
    </div>
  );
}
