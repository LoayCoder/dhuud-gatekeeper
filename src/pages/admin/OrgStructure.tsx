import { useEffect, useState, useMemo, useCallback } from "react";
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
import { Loader2, Plus, Trash2, Pencil, Check, X, MapPin, Navigation, Building2, Search, Trophy, Settings, Layers } from "lucide-react";
import { MajorEventsTab } from "@/components/admin/MajorEventsTab";
import { SiteDetailDialog } from "@/components/admin/SiteDetailDialog";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/use-user-roles";
import { useBranchFilter } from "@/hooks/use-branch-filter";

interface Branch { 
  id: string; 
  name: string; 
  location: string | null; 
  latitude: number | null;
  longitude: number | null;
}
interface Division { id: string; name: string; branch_id?: string | null; branches?: { name: string } | null; }
interface Department { id: string; name: string; division_id: string; branch_id?: string | null; divisions?: { name: string } | null; branches?: { name: string } | null; }
interface Section { id: string; name: string; department_id: string; branch_id?: string | null; departments?: { name: string } | null; branches?: { name: string } | null; }
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
  is_active: boolean | null;
  boundary_polygon?: Coordinate[] | null;
  branches?: { name: string } | null; 
}
interface Building {
  id: string;
  name: string;
  name_ar: string | null;
  site_id: string;
  floor_count: number | null;
  is_active: boolean | null;
  branch_id?: string | null;
  sites?: { name: string } | null;
}
interface FloorZone {
  id: string;
  name: string;
  name_ar: string | null;
  building_id: string;
  zone_type: string | null;
  level_number: number | null;
  is_active: boolean | null;
  branch_id?: string | null;
  buildings?: { name: string } | null;
}

type TableType = 'branches' | 'divisions' | 'departments' | 'sections' | 'sites' | 'buildings' | 'floors_zones';

export default function OrgStructure() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const { hasRole } = useUserRoles();
  const { branchIds, isAllBranchesMode, activeBranchId, isLoading: branchLoading } = useBranchFilter();
  const [loading, setLoading] = useState(true);
  const direction = i18n.dir();
  
  // Only admins can delete - data_entry users can only add/edit
  const canDelete = hasRole('admin');
  
  // Data State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floorsZones, setFloorsZones] = useState<FloorZone[]>([]);

  // Building form state
  const [selectedSiteForBuilding, setSelectedSiteForBuilding] = useState<string>("");
  const [newBuildingNameAr, setNewBuildingNameAr] = useState("");
  
  // Floor/Zone form state
  const [selectedBuildingForFloor, setSelectedBuildingForFloor] = useState<string>("");
  const [newFloorZoneNameAr, setNewFloorZoneNameAr] = useState("");
  const [newLevelNumber, setNewLevelNumber] = useState("");

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
  const [localBranchFilter, setLocalBranchFilter] = useState<string>("all");
  const [divisionBranchFilter, setDivisionBranchFilter] = useState<string>("all");
  const [departmentBranchFilter, setDepartmentBranchFilter] = useState<string>("all");
  const [sectionBranchFilter, setSectionBranchFilter] = useState<string>("all");
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  
  // Branch selection for creation forms
  const [selectedBranchForDivision, setSelectedBranchForDivision] = useState<string>("all");
  const [selectedBranchForDepartment, setSelectedBranchForDepartment] = useState<string>("all");
  const [selectedBranchForSection, setSelectedBranchForSection] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingLatitude, setEditingLatitude] = useState("");
  const [editingLongitude, setEditingLongitude] = useState("");
  
  const [saving, setSaving] = useState(false);

  // Helper to apply branch filter to a query
  const applyBranchFilter = useCallback((query: any, column = 'branch_id') => {
    if (isAllBranchesMode || !branchIds || branchIds.length === 0) {
      return query;
    }
    if (branchIds.length === 1) {
      return query.eq(column, branchIds[0]);
    }
    return query.in(column, branchIds);
  }, [branchIds, isAllBranchesMode]);

  // Fetch all hierarchy data with explicit tenant_id filtering (defense-in-depth)
  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) {
      setLoading(false);
      return;
    }
    
    const tenantId = profile.tenant_id;
    setLoading(true);
    
    try {
      // BRANCHES: Always fetch ALL branches for the tenant
      // Branch Management should show all branches regardless of active filter
      // This aligns with Incident Reporting which uses useTenantBranches() 
      // that also fetches all tenant branches
      const branchesQuery = supabase.from('branches')
        .select('id, name, location, latitude, longitude')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');

      // NOTE: Branch filter is NOT applied to branches query
      // Other org elements (divisions, departments, sites) WILL continue to be filtered

      // Divisions query with branch filter
      let divisionsQuery = supabase.from('divisions')
        .select('id, name, branch_id, branches(name)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');
      divisionsQuery = applyBranchFilter(divisionsQuery);

      // Departments query with branch filter
      let departmentsQuery = supabase.from('departments')
        .select('id, name, division_id, branch_id, divisions(name), branches(name)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');
      departmentsQuery = applyBranchFilter(departmentsQuery);

      // Sections query with branch filter
      let sectionsQuery = supabase.from('sections')
        .select('id, name, department_id, branch_id, departments(name), branches(name)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');
      sectionsQuery = applyBranchFilter(sectionsQuery);

      // SITES: Always fetch ALL sites for the tenant (like Branches)
      // Site Management should show all sites regardless of active branch filter
      // The local branch filter dropdown handles filtering in the UI
      const sitesQuery = supabase.from('sites')
        .select('id, name, latitude, longitude, branch_id, is_active, boundary_polygon, branches(name)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');
      // NOTE: Branch filter is NOT applied to sites query

      // Buildings query with branch filter
      let buildingsQuery = supabase.from('buildings')
        .select('id, name, name_ar, site_id, floor_count, is_active, branch_id, sites(name)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');
      buildingsQuery = applyBranchFilter(buildingsQuery);

      // Floors/Zones query with branch filter
      let floorsZonesQuery = supabase.from('floors_zones')
        .select('id, name, name_ar, building_id, zone_type, level_number, is_active, branch_id, buildings(name)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('level_number');
      floorsZonesQuery = applyBranchFilter(floorsZonesQuery);

      const [b, d, dep, sec, sit, bldg, fz] = await Promise.all([
        branchesQuery,
        divisionsQuery,
        departmentsQuery,
        sectionsQuery,
        sitesQuery,
        buildingsQuery,
        floorsZonesQuery,
      ]);

      if (b.data) setBranches(b.data);
      if (d.data) setDivisions(d.data);
      if (dep.data) setDepartments(dep.data as Department[]);
      if (sec.data) setSections(sec.data as Section[]);
      if (sit.data) setSites(sit.data as unknown as Site[]);
      if (bldg.data) setBuildings(bldg.data as unknown as Building[]);
      if (fz.data) setFloorsZones(fz.data as unknown as FloorZone[]);
    } catch (error) {
      console.error("Error fetching org structure:", error);
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, branchIds, isAllBranchesMode, applyBranchFilter]);

  // Refetch data when branch changes
  useEffect(() => {
    if (!branchLoading) {
      fetchData();
    }
  }, [fetchData, branchLoading]);

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

      // Handle branch assignment for divisions - use explicit form selection
      if (table === 'divisions') {
        if (selectedBranchForDivision && selectedBranchForDivision !== 'all') {
          payload.branch_id = selectedBranchForDivision;
        } else {
          payload.branch_id = null; // Hybrid - applies to all branches
        }
      }
      
      // Handle branch assignment for departments - use explicit form selection
      if (table === 'departments') {
        if (selectedBranchForDepartment && selectedBranchForDepartment !== 'all') {
          payload.branch_id = selectedBranchForDepartment;
        } else {
          payload.branch_id = null; // Hybrid - applies to all branches
        }
      }
      
      // Handle branch assignment for sections - use explicit form selection
      if (table === 'sections') {
        if (selectedBranchForSection && selectedBranchForSection !== 'all') {
          payload.branch_id = selectedBranchForSection;
        } else {
          payload.branch_id = null; // Hybrid - applies to all branches
        }
      }
      
      // Auto-assign branch_id for other tables (buildings, floors_zones) - use activeBranchId
      if (table !== 'branches' && table !== 'divisions' && table !== 'departments' && table !== 'sections' && table !== 'sites' && !isAllBranchesMode && activeBranchId) {
        payload.branch_id = activeBranchId;
      }

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

      // Add site-specific fields (override branch_id with parentId if provided)
      if (table === 'sites') {
        if (!parentId) {
          toast({ title: t('common.error'), description: t('orgStructure.branchRequired'), variant: "destructive" });
          setCreating(false);
          return;
        }
        payload.branch_id = parentId; // Site's branch is explicitly selected in the form
        if (newSiteLatitude && newSiteLongitude) {
          payload.latitude = parseFloat(newSiteLatitude);
          payload.longitude = parseFloat(newSiteLongitude);
        }
      }

      // Add parent FKs for departments with duplicate validation
      if (table === 'departments') {
        if (!parentId) {
          toast({ title: t('common.error'), description: t('orgStructure.divisionRequired'), variant: "destructive" });
          setCreating(false);
          return;
        }
        payload.division_id = parentId;
        
        // Check for duplicate department (same name + same division + same branch)
        const branchId = selectedBranchForDepartment === 'all' ? null : selectedBranchForDepartment;
        const existingDept = departments.find(d => 
          d.name.toLowerCase() === newItemName.trim().toLowerCase() &&
          d.division_id === parentId &&
          d.branch_id === branchId
        );
        if (existingDept) {
          toast({ 
            title: t('common.error'), 
            description: t('orgStructure.departmentAlreadyExists'),
            variant: "destructive" 
          });
          setCreating(false);
          return;
        }
      }

      // Add parent FKs for sections with duplicate validation
      if (table === 'sections') {
        if (!parentId) {
          toast({ title: t('common.error'), description: t('orgStructure.departmentRequired'), variant: "destructive" });
          setCreating(false);
          return;
        }
        payload.department_id = parentId;
        
        // Check for duplicate section (same name + same department + same branch)
        const branchId = selectedBranchForSection === 'all' ? null : selectedBranchForSection;
        const existingSection = sections.find(s => 
          s.name.toLowerCase() === newItemName.trim().toLowerCase() &&
          s.department_id === parentId &&
          s.branch_id === branchId
        );
        if (existingSection) {
          toast({ 
            title: t('common.error'), 
            description: t('orgStructure.sectionAlreadyExists'),
            variant: "destructive" 
          });
          setCreating(false);
          return;
        }
      }

      // Add building-specific fields
      if (table === 'buildings') {
        if (!selectedSiteForBuilding) {
          toast({ title: t('common.error'), description: t('orgStructure.siteRequired'), variant: "destructive" });
          setCreating(false);
          return;
        }
        payload.site_id = selectedSiteForBuilding;
        if (newBuildingNameAr.trim()) {
          payload.name_ar = newBuildingNameAr.trim();
        }
      }

      // Add floor/zone-specific fields
      if (table === 'floors_zones') {
        if (!selectedBuildingForFloor) {
          toast({ title: t('common.error'), description: t('orgStructure.buildingRequired'), variant: "destructive" });
          setCreating(false);
          return;
        }
        payload.building_id = selectedBuildingForFloor;
        if (newFloorZoneNameAr.trim()) {
          payload.name_ar = newFloorZoneNameAr.trim();
        }
        if (newLevelNumber) {
          payload.level_number = parseInt(newLevelNumber);
        }
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
      setSelectedSiteForBuilding("");
      setNewBuildingNameAr("");
      setSelectedBuildingForFloor("");
      setNewFloorZoneNameAr("");
      setNewLevelNumber("");
      setSelectedBranchForDivision("all");
      setSelectedBranchForDepartment("all");
      setSelectedBranchForSection("all");
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

  // Filter divisions for department dropdown based on selected branch
  // Show divisions from selected branch OR hybrid divisions (null branch_id)
  // MUST be before early return to follow React Hooks rules
  const filteredDivisionsForDropdown = useMemo(() => {
    if (selectedBranchForDepartment === 'all' || !selectedBranchForDepartment) {
      return divisions; // Show all
    }
    return divisions.filter(d => 
      d.branch_id === selectedBranchForDepartment || d.branch_id === null
    );
  }, [divisions, selectedBranchForDepartment]);
  
  // Filter departments for section dropdown based on selected branch
  // Show departments from selected branch OR hybrid departments (null branch_id)
  // MUST be before early return to follow React Hooks rules
  const filteredDepartmentsForDropdown = useMemo(() => {
    if (selectedBranchForSection === 'all' || !selectedBranchForSection) {
      return departments; // Show all
    }
    return departments.filter(d => 
      d.branch_id === selectedBranchForSection || d.branch_id === null
    );
  }, [departments, selectedBranchForSection]);

  if (loading || branchLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filtered dropdown options based on selected branch
  const filteredBranchesForDropdown = branches; // Branches shown are already filtered by useBranchFilter
  const filteredSitesForDropdown = sites; // Sites are already filtered
  const filteredBuildingsForDropdown = buildings; // Buildings are already filtered

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
              {canDelete && (
                <Button variant="ghost" size="sm" onClick={() => handleDelete('branches', item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  // Reusable row component for simple tables (divisions)
  const renderSimpleRow = (item: { id: string; name: string; branches?: { name: string } | null }, table: TableType) => (
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
      <TableCell className="text-muted-foreground text-start">
        {item.branches?.name || (
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary border-primary/20">
            {t('orgStructure.allBranchesHybrid')}
          </span>
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
              {canDelete && (
                <Button variant="ghost" size="sm" onClick={() => handleDelete(table, item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  // Reusable row component for tables with parent (departments, sections)
  const renderRowWithParent = (
    item: { id: string; name: string; branches?: { name: string } | null },
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
      <TableCell className="text-muted-foreground text-start">
        {item.branches?.name || (
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary border-primary/20">
            {t('orgStructure.allBranchesHybrid')}
          </span>
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
              {canDelete && (
                <Button variant="ghost" size="sm" onClick={() => handleDelete(table, item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
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
              <Button variant="ghost" size="sm" onClick={() => {
                setSelectedSite(item);
                setSiteDialogOpen(true);
              }}>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Button>
              {canDelete && (
                <Button variant="ghost" size="sm" onClick={() => handleDelete('sites', item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
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
          <TabsTrigger value="buildings" className="flex items-center gap-1"><Building2 className="h-4 w-4" />{t('orgStructure.buildings')}</TabsTrigger>
          <TabsTrigger value="floorsZones" className="flex items-center gap-1"><Layers className="h-4 w-4" />{t('orgStructure.floorsZones')}</TabsTrigger>
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
                        {filteredBranchesForDropdown.map(b => (
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

              {/* Filter Controls Row */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Branch Filter Dropdown */}
                <Select value={localBranchFilter} onValueChange={setLocalBranchFilter}>
                  <SelectTrigger className="w-full sm:w-[200px] text-start" dir={direction}>
                    <SelectValue placeholder={t('orgStructure.filterByBranch')} />
                  </SelectTrigger>
                  <SelectContent dir={direction}>
                    <SelectItem value="all" className="text-start">{t('orgStructure.allBranches')}</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id} className="text-start">
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Search Filter */}
                <div className="relative flex-1 text-start">
                  <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground start-3" />
                  <Input
                    placeholder={t('orgStructure.searchSites')}
                    value={siteSearchQuery}
                    onChange={(e) => setSiteSearchQuery(e.target.value)}
                    className="ps-10 text-start"
                    dir={direction}
                  />
                </div>
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
                        // Branch filter
                        const branchFilterMatch = localBranchFilter === "all" || site.branch_id === localBranchFilter;
                        if (!branchFilterMatch) return false;
                        
                        // Search filter
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

        {/* BUILDINGS TAB */}
        <TabsContent value="buildings">
          <Card>
            <CardHeader>
              <CardTitle className="text-start">{t('orgStructure.manageBuildings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Building Creation Form */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="grid gap-4 md:grid-cols-2 text-start">
                  {/* Parent Site */}
                  <div className="space-y-2">
                    <Label className="text-start">{t('orgStructure.parentSite')}</Label>
                    <Select onValueChange={setSelectedSiteForBuilding} value={selectedSiteForBuilding}>
                      <SelectTrigger className="text-start" dir={direction}>
                        <SelectValue placeholder={t('orgStructure.selectSite')} />
                      </SelectTrigger>
                      <SelectContent dir={direction}>
                        {filteredSitesForDropdown.map(s => (
                          <SelectItem key={s.id} value={s.id} className="text-start">{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Building Name */}
                  <div className="space-y-2">
                    <Label className="text-start">{t('orgStructure.buildingName')}</Label>
                    <Input 
                      placeholder={t('orgStructure.newBuildingPlaceholder')}
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="text-start"
                      dir={direction}
                    />
                  </div>
                </div>
                <div className="space-y-2 text-start">
                  <Label className="text-start">{t('orgStructure.buildingNameAr')}</Label>
                  <Input 
                    placeholder={t('orgStructure.newBuildingPlaceholder')}
                    value={newBuildingNameAr}
                    onChange={(e) => setNewBuildingNameAr(e.target.value)}
                    className="text-start"
                    dir="rtl"
                  />
                </div>
                <Button 
                  onClick={() => handleCreate('buildings')} 
                  disabled={creating || !selectedSiteForBuilding || !newItemName.trim()} 
                  className="w-full md:w-auto"
                >
                  <Plus className="h-4 w-4 me-2" />
                  {t('orgStructure.addBuilding')}
                </Button>
              </div>

              {/* Buildings Table */}
              <div className="rounded-md border" dir={direction}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t('orgStructure.buildingName')}</TableHead>
                      <TableHead className="text-start">{t('orgStructure.parentSite')}</TableHead>
                      <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buildings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          {t('orgStructure.noItems')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      buildings.map((item) => (
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
                                  if (e.key === 'Enter') handleUpdate('buildings', item.id);
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                              />
                            ) : (
                              <div className="flex flex-col">
                                <span>{item.name}</span>
                                {item.name_ar && <span className="text-xs text-muted-foreground" dir="rtl">{item.name_ar}</span>}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-start">{item.sites?.name || '-'}</TableCell>
                          <TableCell className="text-end">
                            <div className="flex gap-1 justify-end">
                              {editingId === item.id ? (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => handleUpdate('buildings', item.id)} disabled={saving}>
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
                                  {canDelete && (
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete('buildings', item.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FLOORS/ZONES TAB */}
        <TabsContent value="floorsZones">
          <Card>
            <CardHeader>
              <CardTitle className="text-start">{t('orgStructure.manageFloorsZones')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Floor/Zone Creation Form */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="grid gap-4 md:grid-cols-3 text-start">
                  {/* Parent Building */}
                  <div className="space-y-2">
                    <Label className="text-start">{t('orgStructure.parentBuilding')}</Label>
                    <Select onValueChange={setSelectedBuildingForFloor} value={selectedBuildingForFloor}>
                      <SelectTrigger className="text-start" dir={direction}>
                        <SelectValue placeholder={t('orgStructure.selectBuilding')} />
                      </SelectTrigger>
                      <SelectContent dir={direction}>
                        {filteredBuildingsForDropdown.map(b => (
                          <SelectItem key={b.id} value={b.id} className="text-start">{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Floor/Zone Name */}
                  <div className="space-y-2">
                    <Label className="text-start">{t('orgStructure.floorZoneName')}</Label>
                    <Input 
                      placeholder={t('orgStructure.newFloorZonePlaceholder')}
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="text-start"
                      dir={direction}
                    />
                  </div>
                  {/* Level Number */}
                  <div className="space-y-2">
                    <Label className="text-start">{t('orgStructure.levelNumber')}</Label>
                    <Input 
                      placeholder="0"
                      value={newLevelNumber}
                      onChange={(e) => setNewLevelNumber(e.target.value)}
                      type="number"
                      className="text-start"
                    />
                  </div>
                </div>
                <div className="space-y-2 text-start">
                  <Label className="text-start">{t('orgStructure.floorZoneNameAr')}</Label>
                  <Input 
                    placeholder={t('orgStructure.newFloorZonePlaceholder')}
                    value={newFloorZoneNameAr}
                    onChange={(e) => setNewFloorZoneNameAr(e.target.value)}
                    className="text-start"
                    dir="rtl"
                  />
                </div>
                <Button 
                  onClick={() => handleCreate('floors_zones')} 
                  disabled={creating || !selectedBuildingForFloor || !newItemName.trim()} 
                  className="w-full md:w-auto"
                >
                  <Plus className="h-4 w-4 me-2" />
                  {t('orgStructure.addFloorZone')}
                </Button>
              </div>

              {/* Floors/Zones Table */}
              <div className="rounded-md border" dir={direction}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t('orgStructure.floorZoneName')}</TableHead>
                      <TableHead className="text-start">{t('orgStructure.levelNumber')}</TableHead>
                      <TableHead className="text-start">{t('orgStructure.parentBuilding')}</TableHead>
                      <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {floorsZones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          {t('orgStructure.noItems')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      floorsZones.map((item) => (
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
                                  if (e.key === 'Enter') handleUpdate('floors_zones', item.id);
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                              />
                            ) : (
                              <div className="flex flex-col">
                                <span>{item.name}</span>
                                {item.name_ar && <span className="text-xs text-muted-foreground" dir="rtl">{item.name_ar}</span>}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-start">{item.level_number ?? '-'}</TableCell>
                          <TableCell className="text-muted-foreground text-start">{item.buildings?.name || '-'}</TableCell>
                          <TableCell className="text-end">
                            <div className="flex gap-1 justify-end">
                              {editingId === item.id ? (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => handleUpdate('floors_zones', item.id)} disabled={saving}>
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
                                  {canDelete && (
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete('floors_zones', item.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
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
              <CardTitle className="text-start">{t('orgStructure.manageDivisions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="w-1/4">
                  <Label className="mb-2 block text-start">{t('orgStructure.assignToBranch')}</Label>
                  <Select value={selectedBranchForDivision} onValueChange={setSelectedBranchForDivision}>
                    <SelectTrigger className="text-start" dir={direction}>
                      <SelectValue placeholder={t('orgStructure.selectBranch')} />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      <SelectItem value="all" className="text-start">{t('orgStructure.allBranchesHybrid')}</SelectItem>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id} className="text-start">
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="mb-2 block text-start">{t('orgStructure.divisionName')}</Label>
                  <Input 
                    placeholder={t('orgStructure.newDivisionPlaceholder')}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="text-start"
                    dir={direction}
                  />
                </div>
                <Button onClick={() => handleCreate('divisions')} disabled={creating}>
                  <Plus className="h-4 w-4 me-2" />
                  {t('orgStructure.add')}
                </Button>
              </div>

              {/* Branch Filter Dropdown */}
              <Select value={divisionBranchFilter} onValueChange={setDivisionBranchFilter}>
                <SelectTrigger className="w-full sm:w-[200px] text-start" dir={direction}>
                  <SelectValue placeholder={t('orgStructure.filterByBranch')} />
                </SelectTrigger>
                <SelectContent dir={direction}>
                  <SelectItem value="all" className="text-start">{t('orgStructure.allBranches')}</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id} className="text-start">
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="rounded-md border" dir={direction}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t('orgStructure.name')}</TableHead>
                      <TableHead className="text-start">{t('orgStructure.branch')}</TableHead>
                      <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const filteredDivisions = divisions.filter(division => 
                        divisionBranchFilter === "all" || 
                        division.branch_id === divisionBranchFilter || 
                        division.branch_id === null // Include hybrid divisions
                      );
                      
                      if (filteredDivisions.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              {t('orgStructure.noItems')}
                            </TableCell>
                          </TableRow>
                        );
                      }
                      return filteredDivisions.map((item) => renderSimpleRow(item, 'divisions'));
                    })()}
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
              <div className="flex gap-4 items-end flex-wrap">
                <div className="w-full sm:w-1/4">
                  <Label className="mb-2 block text-start">{t('orgStructure.assignToBranch')}</Label>
                  <Select value={selectedBranchForDepartment} onValueChange={(value) => {
                    setSelectedBranchForDepartment(value);
                    setParentId(""); // Reset parent when branch changes
                  }}>
                    <SelectTrigger className="text-start" dir={direction}>
                      <SelectValue placeholder={t('orgStructure.selectBranch')} />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      <SelectItem value="all" className="text-start">{t('orgStructure.allBranchesHybrid')}</SelectItem>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id} className="text-start">
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-1/4">
                  <Label className="mb-2 block text-start">{t('orgStructure.parentDivision')}</Label>
                  <Select onValueChange={setParentId} value={parentId}>
                    <SelectTrigger className="text-start" dir={direction}>
                      <SelectValue placeholder={t('orgStructure.selectDivision')} />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      {filteredDivisionsForDropdown.map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-start">{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
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

              {/* Branch Filter Dropdown */}
              <Select value={departmentBranchFilter} onValueChange={setDepartmentBranchFilter}>
                <SelectTrigger className="w-full sm:w-[200px] text-start" dir={direction}>
                  <SelectValue placeholder={t('orgStructure.filterByBranch')} />
                </SelectTrigger>
                <SelectContent dir={direction}>
                  <SelectItem value="all" className="text-start">{t('orgStructure.allBranches')}</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id} className="text-start">
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="rounded-md border" dir={direction}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t('orgStructure.department')}</TableHead>
                      <TableHead className="text-start">{t('orgStructure.parentDivision')}</TableHead>
                      <TableHead className="text-start">{t('orgStructure.branch')}</TableHead>
                      <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const filteredDepartments = departments.filter(department => 
                        departmentBranchFilter === "all" || 
                        department.branch_id === departmentBranchFilter ||
                        department.branch_id === null // Include hybrid departments
                      );
                      
                      if (filteredDepartments.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              {t('orgStructure.noItems')}
                            </TableCell>
                          </TableRow>
                        );
                      }
                      return filteredDepartments.map((item) =>
                        renderRowWithParent(item, item.divisions?.name, 'departments')
                      );
                    })()}
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
              <div className="flex gap-4 items-end flex-wrap">
                <div className="w-full sm:w-1/4">
                  <Label className="mb-2 block text-start">{t('orgStructure.assignToBranch')}</Label>
                  <Select value={selectedBranchForSection} onValueChange={(value) => {
                    setSelectedBranchForSection(value);
                    setParentId(""); // Reset parent when branch changes
                  }}>
                    <SelectTrigger className="text-start" dir={direction}>
                      <SelectValue placeholder={t('orgStructure.selectBranch')} />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      <SelectItem value="all" className="text-start">{t('orgStructure.allBranchesHybrid')}</SelectItem>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id} className="text-start">
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-1/4">
                  <Label className="mb-2 block text-start">{t('orgStructure.parentDepartment')}</Label>
                  <Select onValueChange={setParentId} value={parentId}>
                    <SelectTrigger className="text-start" dir={direction}>
                      <SelectValue placeholder={t('orgStructure.selectDepartment')} />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      {filteredDepartmentsForDropdown.map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-start">{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
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

              {/* Branch Filter Dropdown */}
              <Select value={sectionBranchFilter} onValueChange={setSectionBranchFilter}>
                <SelectTrigger className="w-full sm:w-[200px] text-start" dir={direction}>
                  <SelectValue placeholder={t('orgStructure.filterByBranch')} />
                </SelectTrigger>
                <SelectContent dir={direction}>
                  <SelectItem value="all" className="text-start">{t('orgStructure.allBranches')}</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id} className="text-start">
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="rounded-md border" dir={direction}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t('orgStructure.section')}</TableHead>
                      <TableHead className="text-start">{t('orgStructure.parentDepartment')}</TableHead>
                      <TableHead className="text-start">{t('orgStructure.branch')}</TableHead>
                      <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const filteredSections = sections.filter(section => 
                        sectionBranchFilter === "all" || 
                        section.branch_id === sectionBranchFilter ||
                        section.branch_id === null // Include hybrid sections
                      );
                      
                      if (filteredSections.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              {t('orgStructure.noItems')}
                            </TableCell>
                          </TableRow>
                        );
                      }
                      return filteredSections.map((item) =>
                        renderRowWithParent(item, item.departments?.name, 'sections')
                      );
                    })()}
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

      {/* Site Detail Dialog */}
      <SiteDetailDialog
        open={siteDialogOpen}
        onOpenChange={setSiteDialogOpen}
        site={selectedSite}
        onSave={fetchData}
      />
    </div>
  );
}
