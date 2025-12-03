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
import { Loader2, Plus, Trash2, Pencil, Check, X, MapPin, Navigation } from "lucide-react";
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

type TableType = 'branches' | 'divisions' | 'departments' | 'sections';

export default function OrgStructure() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const isRTL = i18n.dir() === 'rtl';
  
  // Data State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  // Form State
  const [newItemName, setNewItemName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  
  // Branch location form state
  const [newBranchLocation, setNewBranchLocation] = useState("");
  const [newBranchLatitude, setNewBranchLatitude] = useState("");
  const [newBranchLongitude, setNewBranchLongitude] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);

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
      const [b, d, dep, sec] = await Promise.all([
        supabase.from('branches').select('id, name, location, latitude, longitude').order('name'),
        supabase.from('divisions').select('id, name').order('name'),
        supabase.from('departments').select('id, name, division_id, divisions(name)').order('name'),
        supabase.from('sections').select('id, name, department_id, departments(name)').order('name'),
      ]);

      if (b.data) setBranches(b.data);
      if (d.data) setDivisions(d.data);
      if (dep.data) setDepartments(dep.data as Department[]);
      if (sec.data) setSections(sec.data as Section[]);
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

      // Add parent FKs
      if (table === 'departments') {
        if (!parentId) {
          toast({ title: t('common.error'), description: t('orgStructure.divisionRequired'), variant: "destructive" });
          setCreating(false);
          return;
        }
        payload.division_id = parentId;
      }
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

  // Generic Delete Function
  const handleDelete = async (table: string, id: string) => {
    if (!confirm(t('orgStructure.confirmDelete'))) return;
    try {
      const { error } = await supabase.from(table as TableType).delete().eq('id', id);
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

  const direction = isRTL ? 'rtl' : 'ltr';
  const textAlign = isRTL ? 'text-end' : 'text-start';

  // Branch row component with location support
  const renderBranchRow = (item: Branch) => (
    <TableRow key={item.id}>
      <TableCell className={textAlign}>
        {editingId === item.id ? (
          <Input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className={`h-8 ${textAlign}`}
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
      <TableCell className={textAlign}>
        {editingId === item.id ? (
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
              className={`gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}
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
      <TableCell className={isRTL ? 'text-start' : 'text-end'}>
        <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
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
      <TableCell className={textAlign}>
        {editingId === item.id ? (
          <Input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className={`h-8 ${textAlign}`}
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
      <TableCell className={isRTL ? 'text-start' : 'text-end'}>
        <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
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
      <TableCell className={textAlign}>
        {editingId === item.id ? (
          <Input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className={`h-8 ${textAlign}`}
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
      <TableCell className={`text-muted-foreground ${textAlign}`}>{parentName}</TableCell>
      <TableCell className={isRTL ? 'text-start' : 'text-end'}>
        <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
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

  return (
    <div className="container py-8 space-y-8" dir={direction}>
      {/* Header */}
      <div className={`flex flex-col gap-1 ${isRTL ? 'items-end' : 'items-start'}`}>
        <h1 className={`text-3xl font-bold tracking-tight ${textAlign}`}>{t('orgStructure.title')}</h1>
        <p className={`text-muted-foreground ${textAlign}`}>{t('orgStructure.description')}</p>
      </div>

      <Tabs defaultValue="branches" className="w-full" dir={direction}>
        <TabsList className={`grid w-full grid-cols-4 lg:w-[600px] ${isRTL ? 'ms-auto' : ''}`}>
          <TabsTrigger value="branches">{t('orgStructure.branches')}</TabsTrigger>
          <TabsTrigger value="divisions">{t('orgStructure.divisions')}</TabsTrigger>
          <TabsTrigger value="departments">{t('orgStructure.departments')}</TabsTrigger>
          <TabsTrigger value="sections">{t('orgStructure.sections')}</TabsTrigger>
        </TabsList>

        {/* BRANCHES TAB */}
        <TabsContent value="branches">
          <Card>
            <CardHeader>
              <CardTitle className={textAlign}>{t('orgStructure.manageBranches')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Branch Creation Form */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className={`grid gap-4 md:grid-cols-2 ${isRTL ? 'text-end' : 'text-start'}`}>
                  {/* Branch Name */}
                  <div className="space-y-2">
                    <Label className={textAlign}>{t('orgStructure.branchName')}</Label>
                    <Input 
                      placeholder={t('orgStructure.newBranchPlaceholder')}
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className={textAlign}
                      dir={direction}
                    />
                  </div>
                  {/* Location Description */}
                  <div className="space-y-2">
                    <Label className={textAlign}>{t('orgStructure.locationDescription')}</Label>
                    <Input 
                      placeholder={t('orgStructure.locationPlaceholder')}
                      value={newBranchLocation}
                      onChange={(e) => setNewBranchLocation(e.target.value)}
                      className={textAlign}
                      dir={direction}
                    />
                  </div>
                </div>

                {/* GPS Coordinates */}
                <div className="space-y-2">
                  <Label className={textAlign}>{t('orgStructure.gpsCoordinates')}</Label>
                  <div className={`flex gap-4 items-end ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-1">
                      <Input 
                        placeholder={t('orgStructure.latitude')}
                        value={newBranchLatitude}
                        onChange={(e) => setNewBranchLatitude(e.target.value)}
                        type="number"
                        step="any"
                        className={textAlign}
                      />
                    </div>
                    <div className="flex-1">
                      <Input 
                        placeholder={t('orgStructure.longitude')}
                        value={newBranchLongitude}
                        onChange={(e) => setNewBranchLongitude(e.target.value)}
                        type="number"
                        step="any"
                        className={textAlign}
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className={`shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      {gettingLocation ? (
                        <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ms-2' : 'me-2'}`} />
                      ) : (
                        <Navigation className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                      )}
                      {t('orgStructure.useCurrentLocation')}
                    </Button>
                  </div>
                  {newBranchLatitude && newBranchLongitude && (
                    <p className={`text-xs text-muted-foreground ${textAlign}`}>
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
                  className={`w-full md:w-auto ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Plus className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('orgStructure.addBranch')}
                </Button>
              </div>

              {/* Branches Table */}
              <div className="rounded-md border" dir={direction}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={textAlign}>{t('orgStructure.name')}</TableHead>
                      <TableHead className={textAlign}>{t('orgStructure.coordinates')}</TableHead>
                      <TableHead className={isRTL ? 'text-start' : 'text-end'}>{t('orgStructure.actions')}</TableHead>
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

        {/* DIVISIONS TAB */}
        <TabsContent value="divisions">
          <Card>
            <CardHeader>
              <CardTitle className={textAlign}>{t('orgStructure.manageDivisions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Input 
                  placeholder={t('orgStructure.newDivisionPlaceholder')}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className={textAlign}
                  dir={direction}
                />
                <Button onClick={() => handleCreate('divisions')} disabled={creating} className={isRTL ? 'flex-row-reverse' : ''}>
                  <Plus className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('orgStructure.add')}
                </Button>
              </div>
              <div className="rounded-md border" dir={direction}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={textAlign}>{t('orgStructure.name')}</TableHead>
                      <TableHead className={isRTL ? 'text-start' : 'text-end'}>{t('orgStructure.actions')}</TableHead>
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
              <CardTitle className={textAlign}>{t('orgStructure.manageDepartments')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex gap-4 items-end ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-1/3">
                  <Label className={`mb-2 block ${textAlign}`}>{t('orgStructure.parentDivision')}</Label>
                  <Select onValueChange={setParentId} value={parentId}>
                    <SelectTrigger className={textAlign} dir={direction}>
                      <SelectValue placeholder={t('orgStructure.selectDivision')} />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      {divisions.map(d => (
                        <SelectItem key={d.id} value={d.id} className={textAlign}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className={`mb-2 block ${textAlign}`}>{t('orgStructure.departmentName')}</Label>
                  <Input 
                    placeholder={t('orgStructure.newDepartmentPlaceholder')}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className={textAlign}
                    dir={direction}
                  />
                </div>
                <Button onClick={() => handleCreate('departments')} disabled={creating || !parentId} className={isRTL ? 'flex-row-reverse' : ''}>
                  <Plus className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('orgStructure.add')}
                </Button>
              </div>
              <div className="rounded-md border" dir={direction}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={textAlign}>{t('orgStructure.department')}</TableHead>
                      <TableHead className={textAlign}>{t('orgStructure.parentDivision')}</TableHead>
                      <TableHead className={isRTL ? 'text-start' : 'text-end'}>{t('orgStructure.actions')}</TableHead>
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
              <CardTitle className={textAlign}>{t('orgStructure.manageSections')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex gap-4 items-end ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-1/3">
                  <Label className={`mb-2 block ${textAlign}`}>{t('orgStructure.parentDepartment')}</Label>
                  <Select onValueChange={setParentId} value={parentId}>
                    <SelectTrigger className={textAlign} dir={direction}>
                      <SelectValue placeholder={t('orgStructure.selectDepartment')} />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id} className={textAlign}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className={`mb-2 block ${textAlign}`}>{t('orgStructure.sectionName')}</Label>
                  <Input 
                    placeholder={t('orgStructure.newSectionPlaceholder')}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className={textAlign}
                    dir={direction}
                  />
                </div>
                <Button onClick={() => handleCreate('sections')} disabled={creating || !parentId} className={isRTL ? 'flex-row-reverse' : ''}>
                  <Plus className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('orgStructure.add')}
                </Button>
              </div>
              <div className="rounded-md border" dir={direction}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={textAlign}>{t('orgStructure.section')}</TableHead>
                      <TableHead className={textAlign}>{t('orgStructure.parentDepartment')}</TableHead>
                      <TableHead className={isRTL ? 'text-start' : 'text-end'}>{t('orgStructure.actions')}</TableHead>
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
      </Tabs>
    </div>
  );
}
