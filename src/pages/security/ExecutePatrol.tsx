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
  Camera,
  FileText,
  Loader2
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

const GPS_RADIUS_METERS = 50; // Configurable radius for GPS validation

export default function ExecutePatrol() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [activePatrolId, setActivePatrolId] = useState<string | null>(null);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [notes, setNotes] = useState('');
  const [completedCheckpoints, setCompletedCheckpoints] = useState<Set<string>>(new Set());

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

    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      currentCheckpoint.latitude!,
      currentCheckpoint.longitude!
    );

    return distance <= GPS_RADIUS_METERS;
  };

  const handleLogCheckpoint = async () => {
    if (!activePatrolId || !currentCheckpoint || !profile?.tenant_id) return;

    // Validate GPS location
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
          description: t('security.patrols.execution.moveCloser', 'Please move closer to the checkpoint location'),
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      await logCheckpoint.mutateAsync({
        patrolId: activePatrolId,
        checkpointId: currentCheckpoint.id,
        verificationMethod: 'gps',
        gpsLat: userLocation?.lat,
        gpsLng: userLocation?.lng,
        observationNotes: notes || undefined,
      });

      setCompletedCheckpoints(prev => new Set([...prev, currentCheckpoint.id]));
      setNotes('');

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
              <Badge variant="outline" className="mb-2">
                {t('security.patrols.execution.checkpoint', 'Checkpoint')} {currentCheckpointIndex + 1}
              </Badge>
              {completedCheckpoints.has(currentCheckpoint.id) && (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              )}
            </div>
            <CardTitle className="text-xl">{currentCheckpoint.name}</CardTitle>
            <CardDescription>{currentCheckpoint.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <span className="font-medium">{cp.name}</span>
                </div>
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
    </div>
  );
}
