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
import { Plus, MapPin, Shield, Pencil, Trash2, Search } from 'lucide-react';
import { useSecurityZones, useCreateSecurityZone, useUpdateSecurityZone, useDeleteSecurityZone } from '@/hooks/use-security-zones';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const ZONE_TYPES = ['perimeter', 'building', 'restricted', 'parking', 'entrance', 'exit'];
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];

export default function SecurityZones() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [formData, setFormData] = useState({ zone_name: '', zone_code: '', zone_type: 'building', risk_level: 'medium', is_active: true });

  const { data: zones, isLoading } = useSecurityZones();
  const createZone = useCreateSecurityZone();
  const updateZone = useUpdateSecurityZone();
  const deleteZone = useDeleteSecurityZone();

  const filteredZones = zones?.filter(z => z.zone_name?.toLowerCase().includes(search.toLowerCase()) || z.zone_code?.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingZone) {
      await updateZone.mutateAsync({ id: editingZone, ...formData });
    } else {
      await createZone.mutateAsync(formData);
    }
    setDialogOpen(false);
    setFormData({ zone_name: '', zone_code: '', zone_type: 'building', risk_level: 'medium', is_active: true });
    setEditingZone(null);
  };

  const handleEdit = (zone: any) => {
    setEditingZone(zone.id);
    setFormData({ zone_name: zone.zone_name || '', zone_code: zone.zone_code || '', zone_type: zone.zone_type || 'building', risk_level: zone.risk_level || 'medium', is_active: zone.is_active ?? true });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('security.zones.title', 'Security Zones')}</h1>
          <p className="text-muted-foreground">{t('security.zones.description', 'Manage security zones')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingZone(null); setFormData({ zone_name: '', zone_code: '', zone_type: 'building', risk_level: 'medium', is_active: true }); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 me-2" />{t('security.zones.addZone', 'Add Zone')}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingZone ? t('security.zones.editZone', 'Edit Zone') : t('security.zones.addZone', 'Add Zone')}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t('security.zones.zoneName', 'Zone Name')}</Label><Input value={formData.zone_name} onChange={(e) => setFormData({ ...formData, zone_name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>{t('security.zones.zoneCode', 'Zone Code')}</Label><Input value={formData.zone_code} onChange={(e) => setFormData({ ...formData, zone_code: e.target.value })} placeholder="Z-001" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t('security.zones.zoneType', 'Type')}</Label><Select value={formData.zone_type} onValueChange={(v) => setFormData({ ...formData, zone_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ZONE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>{t('security.zones.riskLevel', 'Risk')}</Label><Select value={formData.risk_level} onValueChange={(v) => setFormData({ ...formData, risk_level: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RISK_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} /><Label>{t('common.active', 'Active')}</Label></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button><Button type="submit" disabled={createZone.isPending || updateZone.isPending}>{editingZone ? t('common.save', 'Save') : t('common.create', 'Create')}</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={t('common.search', 'Search...')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9 max-w-sm" /></div>

      {isLoading ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => <Card key={i} className="animate-pulse"><CardHeader className="h-24 bg-muted" /></Card>)}</div> : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredZones?.map(zone => (
            <Card key={zone.id} className={!zone.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div><CardTitle className="text-lg">{zone.zone_name}</CardTitle><CardDescription>{zone.zone_code}</CardDescription></div>
                  <Badge variant={zone.risk_level === 'critical' || zone.risk_level === 'high' ? 'destructive' : 'secondary'}>{zone.risk_level}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3"><Shield className="h-3 w-3" />{zone.zone_type}</div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(zone)}><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('security.zones.deleteConfirm', 'Delete Zone?')}</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteZone.mutate(zone.id)} className="bg-destructive text-destructive-foreground">{t('common.delete', 'Delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!isLoading && !filteredZones?.length && <Card><CardContent className="flex flex-col items-center py-12"><MapPin className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">{t('security.zones.noZones', 'No zones found')}</p></CardContent></Card>}
    </div>
  );
}
