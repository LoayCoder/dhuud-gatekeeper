import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  MapPin, 
  Edit, 
  Trash2,
  Route,
  Clock
} from "lucide-react";
import { usePatrolRoutes, useCreatePatrolRoute } from "@/hooks/use-security-patrols";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function PatrolRoutes() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoute, setNewRoute] = useState({
    name: '',
    description: '',
    estimated_duration_minutes: 30,
  });

  const { data: routes, isLoading } = usePatrolRoutes();
  const createRoute = useCreatePatrolRoute();

  const handleCreateRoute = async () => {
    if (!newRoute.name.trim() || !profile?.tenant_id) {
      toast({
        title: t('common.error'),
        description: t('security.patrols.routeNameRequired', 'Route name is required'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await createRoute.mutateAsync({
        name: newRoute.name,
        description: newRoute.description || null,
        estimated_duration_minutes: newRoute.estimated_duration_minutes,
        is_active: true,
        branch_id: null,
        building_id: null,
        created_by: null,
        frequency: 'daily',
        frequency_interval_hours: 24,
        name_ar: null,
        site_id: null,
        route_map_path: null,
      });

      toast({
        title: t('common.success'),
        description: t('security.patrols.routeCreated', 'Patrol route created successfully'),
      });

      setIsCreateOpen(false);
      setNewRoute({ name: '', description: '', estimated_duration_minutes: 30 });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('security.patrols.routeCreateFailed', 'Failed to create patrol route'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('security.patrols.routes.title', 'Patrol Routes')}
          </h1>
          <p className="text-muted-foreground">
            {t('security.patrols.routes.description', 'Configure and manage patrol routes and checkpoints')}
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('security.patrols.routes.create', 'Create Route')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('security.patrols.routes.create', 'Create Route')}</DialogTitle>
              <DialogDescription>
                {t('security.patrols.routes.createDescription', 'Add a new patrol route with checkpoints')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('common.name', 'Name')}</Label>
                <Input
                  id="name"
                  value={newRoute.name}
                  onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                  placeholder={t('security.patrols.routes.namePlaceholder', 'e.g., North Perimeter Patrol')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t('common.description', 'Description')}</Label>
                <Textarea
                  id="description"
                  value={newRoute.description}
                  onChange={(e) => setNewRoute({ ...newRoute, description: e.target.value })}
                  placeholder={t('security.patrols.routes.descriptionPlaceholder', 'Describe the patrol route...')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">{t('security.patrols.routes.estimatedDuration', 'Estimated Duration (minutes)')}</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={480}
                  value={newRoute.estimated_duration_minutes}
                  onChange={(e) => setNewRoute({ ...newRoute, estimated_duration_minutes: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button onClick={handleCreateRoute} disabled={createRoute.isPending}>
                {createRoute.isPending ? t('common.creating', 'Creating...') : t('common.create', 'Create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Routes Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : routes && routes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => (
            <Card key={route.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Route className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{route.name}</CardTitle>
                  </div>
                  <Badge variant={route.is_active ? "default" : "secondary"}>
                    {route.is_active 
                      ? t('common.active', 'Active') 
                      : t('common.inactive', 'Inactive')}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {route.description || t('security.patrols.routes.noDescription', 'No description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{route.checkpoints?.length || 0} {t('security.patrols.routes.checkpoints', 'checkpoints')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{route.estimated_duration_minutes} {t('common.minutes', 'min')}</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1">
                    <Edit className="h-3 w-3" />
                    {t('common.edit', 'Edit')}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Route className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">
              {t('security.patrols.routes.noRoutes', 'No patrol routes yet')}
            </p>
            <p className="text-muted-foreground">
              {t('security.patrols.routes.createFirstRoute', 'Create your first patrol route to get started')}
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              {t('security.patrols.routes.create', 'Create Route')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
