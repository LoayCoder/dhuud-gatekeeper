import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trash2, Star, Plus } from 'lucide-react';
import { SiteLocationPicker } from './SiteLocationPicker';
import { useSiteDepartments } from '@/hooks/use-site-departments';
import { useTenantDepartments } from '@/hooks/use-org-hierarchy';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Coordinate {
  lat: number;
  lng: number;
}

interface Site {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  branch_id: string | null;
  boundary_polygon?: Coordinate[] | null;
}

interface SiteDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: Site | null;
  onSave: () => void;
}

export function SiteDetailDialog({
  open,
  onOpenChange,
  site,
  onSave,
}: SiteDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [boundaryPolygon, setBoundaryPolygon] = useState<Coordinate[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');

  const { data: allDepartments, isLoading: loadingDepartments } = useTenantDepartments();
  const {
    departments: assignedDepartments,
    isLoading: loadingAssigned,
    assignDepartment,
    removeDepartment,
    setPrimaryDepartment,
  } = useSiteDepartments(site?.id);

  // Reset form when site changes
  useEffect(() => {
    if (site) {
      setName(site.name);
      setLatitude(site.latitude);
      setLongitude(site.longitude);
      setBoundaryPolygon(site.boundary_polygon ?? null);
    } else {
      setName('');
      setLatitude(null);
      setLongitude(null);
      setBoundaryPolygon(null);
    }
    setSelectedDepartmentId('');
  }, [site]);

  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handlePolygonChange = (polygon: Coordinate[] | null) => {
    setBoundaryPolygon(polygon);
  };

  const handleSave = async () => {
    if (!site) return;
    
    setSaving(true);
    try {
      const updatePayload: Record<string, unknown> = {
        name,
        latitude,
        longitude,
        boundary_polygon: boundaryPolygon,
      };

      const { error } = await supabase
        .from('sites')
        .update(updatePayload)
        .eq('id', site.id);

      if (error) throw error;

      toast.success(t('orgStructure.itemUpdated'));
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving site:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleAssignDepartment = () => {
    if (!selectedDepartmentId || !site) return;
    
    assignDepartment.mutate({
      siteId: site.id,
      departmentId: selectedDepartmentId,
    });
    setSelectedDepartmentId('');
  };

  // Filter out already assigned departments
  const availableDepartments = allDepartments?.filter(
    (dept) => !assignedDepartments.some((ad) => ad.department_id === dept.id)
  ) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-start">{site?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Site Name */}
          <div className="space-y-2">
            <Label className="text-start">{t('orgStructure.siteName')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-start"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Map with Location Picker */}
          <SiteLocationPicker
            latitude={latitude}
            longitude={longitude}
            boundaryPolygon={boundaryPolygon}
            onLocationChange={handleLocationChange}
            onPolygonChange={handlePolygonChange}
          />

          {/* Department Assignment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-start">
                {t('orgStructure.assignedDepartments')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Assign New Department */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select
                    value={selectedDepartmentId}
                    onValueChange={setSelectedDepartmentId}
                    disabled={loadingDepartments || availableDepartments.length === 0}
                  >
                    <SelectTrigger className="text-start" dir={isRTL ? 'rtl' : 'ltr'}>
                      <SelectValue placeholder={t('orgStructure.assignDepartment')} />
                    </SelectTrigger>
                    <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                      {availableDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id} className="text-start">
                          {dept.name}
                          {dept.division_name && (
                            <span className="text-muted-foreground text-xs ms-2">
                              ({dept.division_name})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAssignDepartment}
                  disabled={!selectedDepartmentId || assignDepartment.isPending}
                  size="sm"
                >
                  {assignDepartment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className={cn("h-4 w-4", isRTL ? "ms-1" : "me-1")} />
                  )}
                  {t('orgStructure.add')}
                </Button>
              </div>

              {/* Assigned Departments List */}
              {loadingAssigned ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : assignedDepartments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('orgStructure.noDepartmentsAssigned')}
                </p>
              ) : (
                <div className="space-y-2">
                  {assignedDepartments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {(assignment as any).departments?.name ?? 'Unknown'}
                        </span>
                        {assignment.is_primary && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 me-1" />
                            {t('orgStructure.primary')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!assignment.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPrimaryDepartment.mutate(assignment.id)}
                            disabled={setPrimaryDepartment.isPending}
                            title={t('orgStructure.setPrimary')}
                          >
                            <Star className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDepartment.mutate(assignment.id)}
                          disabled={removeDepartment.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
