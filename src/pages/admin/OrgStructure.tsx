import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Pencil, Check, X, MapPin, Navigation, Building2, Search, Trophy } from "lucide-react";
import { MajorEventsTab } from "@/components/admin/MajorEventsTab";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";

interface Branch { 
  id: string; 
  name: string; 
  location: string | null; 
  latitude: number | null;
  longitude: number | null;
}
interface Division { id: string; name: string; }
interface Department { id: string; name: string; division_id: string; divisions?: { name: string } | null; }
interface Section { id: string; name: string; department_id: string; departments?: { name: string } | null; }
interface Site { 
  id: string; 
  name: string; 
  latitude: number | null;
  longitude: number | null;
  branch_id: string | null; 
  is_active: boolean | null;
  branches?: { name: string } | null; 
}

type TableType = 'branches' | 'divisions' | 'departments' | 'sections' | 'sites';

export default function OrgStructure() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const direction = i18n.dir();
  
  // Data State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  // Form State
  const [newItemName, setNewItemName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  
  // Branch location form state
  const [newBranchLocation, setNewBranchLocation] = useState("");
  const [newBranchLatitude, setNewBranchLatitude] = useState("");
  const [newBranchLongitude, setNewBranchLongitude] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);

  // Site form state
  const [newSiteLatitude, setNewSiteLatitude] = useState("");
  const [newSiteLongitude, setNewSiteLongitude] = useState("");
  const [gettingSiteLocation, setGettingSiteLocation] = useState(false);
  const [siteSearchQuery, setSiteSearchQuery] = useState("");

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingLatitude, setEditingLatitude] = useState("");
  const [editingLongitude, setEditingLongitude] = useState("");
  
  const [saving, setSaving] = useState(false);

  // Fetch all hierarchy data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [b, d, dep, sec, sit] = await Promise.all([
        supabase.from('branches').select('id, name, location, latitude, longitude').is('deleted_at', null).order('name'),
        supabase.from('divisions').select('id, name').is('deleted_at', null).order('name'),
        supabase.from('departments').select('id, name, division_id, divisions(name)').is('deleted_at', null).order('name'),
        supabase.from('sections').select('id, name, department_id, departments(name)').is('deleted_at', null).order('name'),
        supabase.from('sites').select('id, name, latitude, longitude, branch_id, is_active, branches(name)').is('deleted_at', null).order('name'),
      ]);

      if (b.data) setBranches(b.data);
      if (d.data) setDivisions(d.data);
      if (dep.data) setDepartments(dep.data as Department[]);
      if (sec.data) setSections(sec.data as Section[]);
      if (sit.data) setSites(sit.data as Site[]);
    } catch (error) {
      console.error("Error fetching org structure:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get current location using browser geolocation
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ 
        title: t('common.error'), 
        description: t('orgStructure.geolocationNotSupported'), 
        variant: "destructive" 
      });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewBranchLatitude(position.coords.latitude.toFixed(6));
        setNewBranchLongitude(position.coords.longitude.toFixed(6));
        setGettingLocation(false);
        toast({ 
          title: t('orgStructure.success'), 
          description: t('orgStructure.locationRetrieved') 
        });
      },
      (error) => {
        setGettingLocation(false);
        let message = t('orgStructure.locationError');
        if (error.code === error.PERMISSION_DENIED) {
          message = t('orgStructure.locationPermissionDenied');
        }
        toast({ title: t('common.error'), description: message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Generic Create Function
  const handleCreate = async (table: TableType) => {
    if (!newItemName.trim()) return;
    if (!profile?.tenant_id) {
      toast({ title: t('common.error'), description: t('orgStructure.noTenant'), variant: "destructive" });
      return;
    }
    setCreating(true);

    try {
      const payload: Record<string, unknown> = {
        name: newItemName.trim(),
        tenant_id: profile.tenant_id
      };

      // Add branch-specific fields
      if (table === 'branches') {
        if (newBranchLocation.trim()) {
          payload.location = newBranchLocation.trim();
        }
        if (newBranchLatitude && newBranchLongitude) {
          payload.latitude = parseFloat(newBranchLatitude);
          payload.longitude = parseFloat(newBranchLongitude);
        }
      }

      // Add site-specific fields
      if (table === 'sites') {
        if (!parentId) {
          toast({ title: t('common.error'), description: t('orgStructure.branchRequired'), variant: "destructive" });
          setCreating(false);
          return;
        }
        payload.branch_id = parentId;
        if (newSiteLatitude && newSiteLongitude) {
          payload.latitude = parseFloat(newSiteLatitude);
          payload.longitude = parseFloat(newSiteLongitude);
        }
      }

      // Add parent FKs for departments
      if (table === 'departments') {
        if (!parentId) {
          toast({ title: t('common.error'), description: t('orgStructure.divisionRequired'), variant: "destructive" });
          setCreating(false);
          return;
        }
        payload.division_id = parentId;
      }

      // Add parent FKs for sections
      if (table === 'sections') {
        if (!parentId) {
          toast({ title: t('common.error'), description: t('orgStructure.departmentRequired'), variant: "destructive" });
          setCreating(false);
          return;
        }
        payload.department_id = parentId;
      }

      const { error } = await supabase.from(table).insert([payload] as never);
      if (error) throw error;

      toast({ title: t('orgStructure.success'), description: t('orgStructure.itemCreated') });
      setNewItemName("");
      setParentId("");
      setNewBranchLocation("");
      setNewBranchLatitude("");
      setNewBranchLongitude("");
      setNewSiteLatitude("");
      setNewSiteLongitude("");
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.error');
      toast({ title: t('common.error'), description: message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // Generic Update Function
  const handleUpdate = async (table: TableType, id: string) => {
    if (!editingName.trim()) {
      toast({ title: t('common.error'), description: t('orgStructure.nameRequired'), variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      const updatePayload: Record<string, unknown> = { name: editingName.trim() };
      
      // Add branch-specific fields for updates
      if (table === 'branches') {
        if (editingLatitude && editingLongitude) {
          updatePayload.latitude = parseFloat(editingLatitude);
          updatePayload.longitude = parseFloat(editingLongitude);
        } else {
          updatePayload.latitude = null;
          updatePayload.longitude = null;
        }
      }

      // Add site-specific fields for updates
      if (table === 'sites') {
        if (editingLatitude && editingLongitude) {
          updatePayload.latitude = parseFloat(editingLatitude);
          updatePayload.longitude = parseFloat(editingLongitude);
        } else {
          updatePayload.latitude = null;
          updatePayload.longitude = null;
        }
      }

      const { error } = await supabase
        .from(table)
        .update(updatePayload)
        .eq('id', id);
      
      if (error) throw error;

      toast({ title: t('orgStructure.success'), description: t('orgStructure.itemUpdated') });
      setEditingId(null);
      setEditingName("");
      setEditingLatitude("");
      setEditingLongitude("");
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.error');
      toast({ title: t('common.error'), description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Start editing
  const startEditing = (id: string, currentName: string, latitude?: number | null, longitude?: number | null) => {
    setEditingId(id);
    setEditingName(currentName);
    setEditingLatitude(latitude?.toString() || "");
    setEditingLongitude(longitude?.toString() || "");
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
    setEditingLatitude("");
    setEditingLongitude("");
  };

  // Generic Delete Function (Soft Delete)
  const handleDelete = async (table: string, id: string) => {
    if (!confirm(t('orgStructure.confirmDelete'))) return;
    try {
      // Soft delete - set deleted_at timestamp
      const { error } = await supabase
        .from(table as TableType)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast({ title: t('orgStructure.deleted'), description: t('orgStructure.itemRemoved') });
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.error');
      toast({ title: t('common.error'), description: message, variant: "destructive" });
    }
  };

  // Open location in external map
  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Branch row component with location support
  const renderBranchRow = (item: Branch) => (
    <TableRow key={item.id}>
      <TableCell className="text-start">
        {editingId === item.id ? (
          <Input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className="h-8 text-start"
            dir={direction}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUpdate('branches', item.id);
              if (e.key === 'Escape') cancelEditing();
            }}
          />
        ) : (
          item.name
        )}
      </TableCell>
      <TableCell className="text-start">
        {editingId === item.id ? (
          <div className="flex gap-2">
            <Input
              value={editingLatitude}
              onChange={(e) => setEditingLatitude(e.target.value)}
              placeholder={t('orgStructure.latitude')}
              className="h-8 w-24"
              type="number"
              step="any"
            />
            <Input
              value={editingLongitude}
              onChange={(e) => setEditingLongitude(e.target.value)}
              placeholder={t('orgStructure.longitude')}
              className="h-8 w-24"
              type="number"
              step="any"
            />
          </div>
        ) : (
          item.latitude && item.longitude ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => openInMaps(item.latitude!, item.longitude!)}
            >
              <MapPin className="h-3 w-3" />
              <span className="text-xs">{item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}</span>
            </Button>
          ) : (
            <span className="text-muted-foreground text-xs">{t('orgStructure.noCoordinates')}</span>
          )
        )}
      </TableCell>
      <TableCell className="text-end">
        <div className="flex gap-1 justify-end">
          {editingId === item.id ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleUpdate('branches', item.id)} disabled={saving}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => startEditing(item.id, item.name, item.latitude, item.longitude)}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete('branches', item.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  // Reusable row component for simple tables (divisions)
  const renderSimpleRow = (item: { id: string; name: string }, table: TableType) => (
    <TableRow key={item.id}>
      <TableCell className="text-start">
        {editingId === item.id ? (
          <Input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className="h-8 text-start"
            dir={direction}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUpdate(table, item.id);
              if (e.key === 'Escape') cancelEditing();
            }}
          />
        ) : (
          item.name
        )}
      </TableCell>
      <TableCell className="text-end">
        <div className="flex gap-1 justify-end">
          {editingId === item.id ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleUpdate(table, item.id)} disabled={saving}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => startEditing(item.id, item.name)}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(table, item.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  // Reusable row component for tables with parent (departments, sections)
  const renderRowWithParent = (
    item: { id: string; name: string },
    parentName: string | undefined,
    table: TableType
  ) => (
    <TableRow key={item.id}>
      <TableCell className="text-start">
        {editingId === item.id ? (
          <Input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className="h-8 text-start"
            dir={direction}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUpdate(table, item.id);
              if (e.key === 'Escape') cancelEditing();
            }}
          />
        ) : (
          item.name
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-start">{parentName}</TableCell>
      <TableCell className="text-end">
        <div className="flex gap-1 justify-end">
          {editingId === item.id ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleUpdate(table, item.id)} disabled={saving}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => startEditing(item.id, item.name)}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(table, item.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  // Site row component with GPS coordinates support
  const renderSiteRow = (item: Site) => (
    <TableRow key={item.id}>
      <TableCell className="text-start">
        {editingId === item.id ? (
          <Input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className="h-8 text-start"
            dir={direction}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUpdate('sites', item.id);
              if (e.key === 'Escape') cancelEditing();
            }}
          />
        ) : (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {item.name}
          </div>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-start">
        {item.branches?.name || '-'}
      </TableCell>
      <TableCell className="text-start">
        {editingId === item.id ? (
          <div className="flex gap-2">
            <Input
              value={editingLatitude}
              onChange={(e) => setEditingLatitude(e.target.value)}
              placeholder={t('orgStructure.latitude')}
              className="h-8 w-24"
              type="number"
              step="any"
            />
            <Input
              value={editingLongitude}
              onChange={(e) => setEditingLongitude(e.target.value)}
              placeholder={t('orgStructure.longitude')}
              className="h-8 w-24"
              type="number"
              step="any"
            />
          </div>
        ) : (
          item.latitude && item.longitude ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => openInMaps(item.latitude!, item.longitude!)}
            >
              <MapPin className="h-3 w-3" />
              <span className="text-xs">{item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}</span>
            </Button>
          ) : (
            <span className="text-muted-foreground text-xs">{t('orgStructure.noCoordinates')}</span>
          )
        )}
      </TableCell>
      <TableCell className="text-end">
        <div className="flex gap-1 justify-end">
          {editingId === item.id ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleUpdate('sites', item.id)} disabled={saving}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => startEditing(item.id, item.name, item.latitude, item.longitude)}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete('sites', item.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="container py-8 space-y-8" dir={direction}>
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-start">{t('orgStructure.title')}</h1>
        <p className="text-muted-foreground text-start">{t('orgStructure.description')}</p>
      </div>

      <Tabs defaultValue="branches" className="w-full" dir={direction}>
        <TabsList className="flex flex-wrap h-auto gap-1 w-full lg:w-[900px]">
          <TabsTrigger value="branches">{t('orgStructure.branches')}</TabsTrigger>
          <TabsTrigger value="sites" className="flex items-center gap-1"><Building2 className="h-4 w-4" />{t('orgStructure.sites')}</TabsTrigger>
          <TabsTrigger value="divisions">{t('orgStructure.divisions')}</TabsTrigger>
          <TabsTrigger value="departments">{t('orgStructure.departments')}</TabsTrigger>
          <TabsTrigger value="sections">{t('orgStructure.sections')}</TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-1"><Trophy className="h-4 w-4" />{t('specialEvents.tabTitle')}</TabsTrigger>
        </TabsList>

        {/* BRANCHES TAB */}
        <TabsContent value="branches">
          <Card>
            <CardHeader>
              <CardTitle className="text-start">{t('orgStructure.manageBranches')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Branch Creation Form */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="grid gap-4 md:grid-cols-2 text-start">
                  {/* Branch Name */}
                  <div className="space-y-2">
                    <Label className="text-start">{t('orgStructure.branchName')}</Label>
                    <Input 
                      placeholder={t('orgStructure.newBranchPlaceholder')}
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="text-start"
                      dir={direction}
                    />
                  </div>
                  {/* Location Description */}
                  <div className="space-y-2">
                    <Label className="text-start">{t('orgStructure.locationDescription')}</Label>
                    <Input 
                      placeholder={t('orgStructure.locationPlaceholder')}
                      value={newBranchLocation}
                      onChange={(e) => setNewBranchLocation(e.target.value)}
                      className="text-start"
                      dir={direction}
                    />
                  </div>
                </div>

                {/* GPS Coordinates */}
                <div className="space-y-2">
                  <Label className="text-start">{t('orgStructure.gpsCoordinates')}</Label>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Input 
                        placeholder={t('orgStructure.latitude')}
                        value={newBranchLatitude}
                        onChange={(e) => setNewBranchLatitude(e.target.value)}
                        type="number"
                        step="any"
                        className="text-start"
                      />
                    </div>
                    <div className="flex-1">
                      <Input 
                        placeholder={t('orgStructure.longitude')}
                        value={newBranchLongitude}
                        onChange={(e) => setNewBranchLongitude(e.target.value)}
                        type="number"
                        step="any"
                        className="text-start"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="shrink-0"
                    >
                      {gettingLocation ? (
                        <Loader2 className="h-4 w-4 animate-spin me-2" />
                      ) : (
                        <Navigation className="h-4 w-4 me-2" />
                      )}
                      {t('orgStructure.useCurrentLocation')}
                    </Button>
                  </div>
                  {newBranchLatitude && newBranchLongitude && (
                    <p className="text-xs text-muted-foreground text-start">
                      <a 
                        href={`https://www.google.com/maps?q=${newBranchLatitude},${newBranchLongitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {t('orgStructure.viewOnMap')} →
                      </a>
                    </p>
                  )}
                </div>

                <Button 
                  onClick={() => handleCreate('branches')} 
                  disabled={creating || !newItemName.trim()} 
                  className="w-full md:w-auto"
                >
                  <Plus className="h-4 w-4 me-2" />
                  {t('orgStructure.addBranch')}
                </Button>
              </div>

              {/* Branches Table */}
              <div className="rounded-md border" dir={direction}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t('orgStructure.name')}</TableHead>
                      <TableHead className="text-start">{t('orgStructure.coordinates')}</TableHead>
                      <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          {t('orgStructure.noItems')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      branches.map((item) => renderBranchRow(item))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SITES TAB */}
        <TabsContent value="sites">
          <Card>
            <CardHeader>
              <CardTitle className="text-start">{t('orgStructure.manageSites')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Site Creation Form */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="grid gap-4 md:grid-cols-2 text-start">
                  {/* Parent Branch */}
                  <div className="space-y-2">
                    <Label className="text-start">{t('orgStructure.parentBranch')}</Label>
                    <Select onValueChange={setParentId} value={parentId}>
                      <SelectTrigger className="text-start" dir={direction}>
                        <SelectValue placeholder={t('orgStructure.selectBranch')} />
                      </SelectTrigger>
                      <SelectContent dir={direction}>
                        {branches.map(b => (
                          <SelectItem key={b.id} value={b.id} className="text-start">{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Site Name */}
                  <div className="space-y-2">
                    <Label className="text-start">{t('orgStructure.siteName')}</Label>
                    <Input 
                      placeholder={t('orgStructure.newSitePlaceholder')}
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="text-start"
                      dir={direction}
                    />
                  </div>
                </div>

                {/* GPS Coordinates */}
                <div className="space-y-2">
                  <Label className="text-start">{t('orgStructure.gpsCoordinates')}</Label>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Input 
                        placeholder={t('orgStructure.latitude')}
                        value={newSiteLatitude}
                        onChange={(e) => setNewSiteLatitude(e.target.value)}
                        type="number"
                        step="any"
                        className="text-start"
                      />
                    </div>
                    <div className="flex-1">
                      <Input 
                        placeholder={t('orgStructure.longitude')}
                        value={newSiteLongitude}
                        onChange={(e) => setNewSiteLongitude(e.target.value)}
                        type="number"
                        step="any"
                        className="text-start"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (!navigator.geolocation) {
                          toast({ title: t('common.error'), description: t('orgStructure.geolocationNotSupported'), variant: "destructive" });
                          return;
                        }
                        setGettingSiteLocation(true);
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            setNewSiteLatitude(position.coords.latitude.toFixed(6));
                            setNewSiteLongitude(position.coords.longitude.toFixed(6));
                            setGettingSiteLocation(false);
                            toast({ title: t('orgStructure.success'), description: t('orgStructure.locationRetrieved') });
                          },
                          (error) => {
                            setGettingSiteLocation(false);
                            let message = t('orgStructure.locationError');
                            if (error.code === error.PERMISSION_DENIED) {
                              message = t('orgStructure.locationPermissionDenied');
                            }
                            toast({ title: t('common.error'), description: message, variant: "destructive" });
                          },
                          { enableHighAccuracy: true, timeout: 10000 }
                        );
                      }}
                      disabled={gettingSiteLocation}
                      className="shrink-0"
                    >
                      {gettingSiteLocation ? (
                        <Loader2 className="h-4 w-4 animate-spin me-2" />
                      ) : (
                        <Navigation className="h-4 w-4 me-2" />
                      )}
                      {t('orgStructure.useCurrentLocation')}
                    </Button>
                  </div>
                  {newSiteLatitude && newSiteLongitude && (
                    <p className="text-xs text-muted-foreground text-start">
                      <a 
                        href={`https://www.google.com/maps?q=${newSiteLatitude},${newSiteLongitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {t('orgStructure.viewOnMap')} →
                      </a>
                    </p>
                  )}
                </div>

                <Button 
                  onClick={() => handleCreate('sites')} 
                  disabled={creating || !parentId || !newItemName.trim()} 
                  className="w-full md:w-auto"
                >
                  <Plus className="h-4 w-4 me-2" />
                  {t('orgStructure.addSite')}
                </Button>
              </div>

              {/* Search Filter */}
              <div className="relative text-start">
                <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground start-3" />
                <Input
                  placeholder={t('orgStructure.searchSites')}
                  value={siteSearchQuery}
                  onChange={(e) => setSiteSearchQuery(e.target.value)}
                  className="ps-10 text-start"
                  dir={direction}
                />
              </div>

              {/* Sites Table */}
              <div className="rounded-md border" dir={direction}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t('orgStructure.siteName')}</TableHead>
                      <TableHead className="text-start">{t('orgStructure.parentBranch')}</TableHead>
                      <TableHead className="text-start">{t('orgStructure.coordinates')}</TableHead>
                      <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const filteredSites = sites.filter(site => {
                        const query = siteSearchQuery.toLowerCase().trim();
                        if (!query) return true;
                        const nameMatch = site.name.toLowerCase().includes(query);
                        const branchMatch = site.branches?.name?.toLowerCase().includes(query) || false;
                        return nameMatch || branchMatch;
                      });
                      
                      if (filteredSites.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              {siteSearchQuery ? t('orgStructure.noSearchResults') : t('orgStructure.noItems')}
                            </TableCell>
                          </TableRow>
                        );
                      }
                      return filteredSites.map((item) => renderSiteRow(item));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DIVISIONS TAB */}
        <TabsContent value="divisions">
          <Card>
            <CardHeader>
              <CardTitle className="text-start">{t('orgStructure.manageDivisions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input 
                  placeholder={t('orgStructure.newDivisionPlaceholder')}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="text-start"
                  dir={direction}
                />
                <Button onClick={() => handleCreate('divisions')} disabled={creating}>
                  <Plus className="h-4 w-4 me-2" />
                  {t('orgStructure.add')}
                </Button>
              </div>
              <div className="rounded-md border" dir={direction}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t('orgStructure.name')}</TableHead>
                      <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {divisions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                          {t('orgStructure.noItems')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      divisions.map((item) => renderSimpleRow(item, 'divisions'))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEPARTMENTS TAB */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle className="text-start">{t('orgStructure.manageDepartments')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="w-1/3">
                  <Label className="mb-2 block text-start">{t('orgStructure.parentDivision')}</Label>
                  <Select onValueChange={setParentId} value={parentId}>
                    <SelectTrigger className="text-start" dir={direction}>
                      <SelectValue placeholder={t('orgStructure.selectDivision')} />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      {divisions.map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-start">{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="mb-2 block text-start">{t('orgStructure.departmentName')}</Label>
                  <Input 
                    placeholder={t('orgStructure.newDepartmentPlaceholder')}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="text-start"
                    dir={direction}
                  />
                </div>
                <Button onClick={() => handleCreate('departments')} disabled={creating || !parentId}>
                  <Plus className="h-4 w-4 me-2" />
                  {t('orgStructure.add')}
                </Button>
              </div>
              <div className="rounded-md border" dir={direction}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t('orgStructure.department')}</TableHead>
                      <TableHead className="text-start">{t('orgStructure.parentDivision')}</TableHead>
                      <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          {t('orgStructure.noItems')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      departments.map((item) =>
                        renderRowWithParent(item, item.divisions?.name, 'departments')
                      )
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECTIONS TAB */}
        <TabsContent value="sections">
          <Card>
            <CardHeader>
              <CardTitle className="text-start">{t('orgStructure.manageSections')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="w-1/3">
                  <Label className="mb-2 block text-start">{t('orgStructure.parentDepartment')}</Label>
                  <Select onValueChange={setParentId} value={parentId}>
                    <SelectTrigger className="text-start" dir={direction}>
                      <SelectValue placeholder={t('orgStructure.selectDepartment')} />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-start">{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="mb-2 block text-start">{t('orgStructure.sectionName')}</Label>
                  <Input 
                    placeholder={t('orgStructure.newSectionPlaceholder')}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="text-start"
                    dir={direction}
                  />
                </div>
                <Button onClick={() => handleCreate('sections')} disabled={creating || !parentId}>
                  <Plus className="h-4 w-4 me-2" />
                  {t('orgStructure.add')}
                </Button>
              </div>
              <div className="rounded-md border" dir={direction}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t('orgStructure.section')}</TableHead>
                      <TableHead className="text-start">{t('orgStructure.parentDepartment')}</TableHead>
                      <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sections.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          {t('orgStructure.noItems')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sections.map((item) =>
                        renderRowWithParent(item, item.departments?.name, 'sections')
                      )
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MAJOR EVENTS TAB */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="text-start">{t('specialEvents.manageEvents')}</CardTitle>
            </CardHeader>
            <CardContent>
              <MajorEventsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
