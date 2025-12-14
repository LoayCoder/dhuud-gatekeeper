import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, MapPin, Shield, Pencil, Trash2, Search, Map } from 'lucide-react';
import { useSecurityZones, useCreateSecurityZone, useUpdateSecurityZone, useDeleteSecurityZone } from '@/hooks/use-security-zones';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ZonePolygonEditor from '@/components/security/ZonePolygonEditor';
import { Slider } from '@/components/ui/slider';

const ZONE_TYPES = ['perimeter', 'building', 'restricted', 'parking', 'entrance', 'exit'];
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];

interface FormData {
  zone_name: string;
  zone_code: string;
  zone_type: string;
  risk_level: string;
  is_active: boolean;
  polygon_coords: [number, number][] | null;
  geofence_radius_meters: number;
}

const initialFormData: FormData = {
  zone_name: '',
  zone_code: '',
  zone_type: 'building',
  risk_level: 'medium',
  is_active: true,
  polygon_coords: null,
  geofence_radius_meters: 50,
};

export default function SecurityZones() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const { data: zones, isLoading } = useSecurityZones();
  const createZone = useCreateSecurityZone();
  const updateZone = useUpdateSecurityZone();
  const deleteZone = useDeleteSecurityZone();

  const filteredZones = zones?.filter(z => z.zone_name?.toLowerCase().includes(search.toLowerCase()) || z.zone_code?.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      zone_name: formData.zone_name,
      zone_code: formData.zone_code,
      zone_type: formData.zone_type,
      risk_level: formData.risk_level,
      is_active: formData.is_active,
      polygon_coords: formData.polygon_coords,
      geofence_radius_meters: formData.geofence_radius_meters,
    };
    if (editingZone) {
      await updateZone.mutateAsync({ id: editingZone, ...payload });
    } else {
      await createZone.mutateAsync(payload);
    }
    setDialogOpen(false);
    setFormData(initialFormData);
    setEditingZone(null);
  };

  const handleEdit = (zone: any) => {
    setEditingZone(zone.id);
    setFormData({
      zone_name: zone.zone_name || '',
      zone_code: zone.zone_code || '',
      zone_type: zone.zone_type || 'building',
      risk_level: zone.risk_level || 'medium',
      is_active: zone.is_active ?? true,
      polygon_coords: zone.polygon_coords as [number, number][] | null,
      geofence_radius_meters: zone.geofence_radius_meters ?? 50,
    });
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingZone(null);
      setFormData(initialFormData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('security.zones.title', 'Security Zones')}</h1>
          <p className="text-muted-foreground">{t('security.zones.description', 'Manage security zones')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 me-2" />{t('security.zones.addZone', 'Add Zone')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingZone ? t('security.zones.editZone', 'Edit Zone') : t('security.zones.addZone', 'Add Zone')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">{t('security.zones.basicInfo', 'Basic Info')}</TabsTrigger>
                  <TabsTrigger value="boundary"><Map className="h-4 w-4 me-1" />{t('security.zones.boundary', 'Boundary')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('security.zones.zoneName', 'Zone Name')}</Label>
                      <Input value={formData.zone_name} onChange={(e) => setFormData({ ...formData, zone_name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('security.zones.zoneCode', 'Zone Code')}</Label>
                      <Input value={formData.zone_code} onChange={(e) => setFormData({ ...formData, zone_code: e.target.value })} placeholder="Z-001" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('security.zones.zoneType', 'Type')}</Label>
                      <Select value={formData.zone_type} onValueChange={(v) => setFormData({ ...formData, zone_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{ZONE_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('security.zones.riskLevel', 'Risk')}</Label>
                      <Select value={formData.risk_level} onValueChange={(v) => setFormData({ ...formData, risk_level: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{RISK_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} />
                    <Label>{t('common.active', 'Active')}</Label>
                  </div>
                </TabsContent>
                
                <TabsContent value="boundary" className="mt-4 space-y-4">
                  {/* Geofence Radius Configuration */}
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">{t('security.zones.geofenceRadius', 'Geofence Radius')}</Label>
                      <Badge variant="outline">{formData.geofence_radius_meters}m</Badge>
                    </div>
                    <Slider
                      value={[formData.geofence_radius_meters]}
                      onValueChange={([val]) => setFormData(prev => ({ ...prev, geofence_radius_meters: val }))}
                      min={10}
                      max={500}
                      step={10}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('security.zones.geofenceRadiusDescription', 'Breach detection tolerance in meters')}
                    </p>
                  </div>
                  
                  <ZonePolygonEditor
                    polygonCoords={formData.polygon_coords}
                    onChange={(coords) => setFormData({ ...formData, polygon_coords: coords })}
                    zoneType={formData.zone_type}
                    geofenceRadius={formData.geofence_radius_meters}
                  />
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                <Button type="submit" disabled={createZone.isPending || updateZone.isPending}>
                  {editingZone ? t('common.save', 'Save') : t('common.create', 'Create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t('common.search', 'Search...')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9 max-w-sm" />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Card key={i} className="animate-pulse"><CardHeader className="h-24 bg-muted" /></Card>)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredZones?.map(zone => (
            <Card key={zone.id} className={!zone.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{zone.zone_name}</CardTitle>
                    <CardDescription>{zone.zone_code}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={zone.risk_level === 'critical' || zone.risk_level === 'high' ? 'destructive' : 'secondary'}>
                      {zone.risk_level}
                    </Badge>
                    {zone.polygon_coords && (
                      <Badge variant="outline" className="text-xs">
                        <Map className="h-3 w-3 me-1" />{t('security.zones.hasBoundary', 'Mapped')}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Shield className="h-3 w-3" />{zone.zone_type}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(zone)}><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('security.zones.deleteConfirm', 'Delete Zone?')}</AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteZone.mutate(zone.id)} className="bg-destructive text-destructive-foreground">
                          {t('common.delete', 'Delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!isLoading && !filteredZones?.length && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('security.zones.noZones', 'No zones found')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
