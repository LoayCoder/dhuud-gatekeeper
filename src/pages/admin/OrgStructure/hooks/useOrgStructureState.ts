import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from '@/features/users';
import { useBranchFilter } from "@/hooks/use-branch-filter";
import type { Branch, Division, Department, Section, Site, Building, FloorZone } from './types';

export function useOrgStructureState() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const { hasRole } = useUserRoles();
  const { branchIds, isAllBranchesMode, activeBranchId, isLoading: branchLoading } = useBranchFilter();
  const [loading, setLoading] = useState(true);
  const direction = i18n.dir();
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

  return {
    t, i18n, profile, hasRole, branchIds, isAllBranchesMode, activeBranchId, branchLoading,
    loading, setLoading, direction, canDelete,
    branches, setBranches, divisions, setDivisions, departments, setDepartments,
    sections, setSections, sites, setSites, buildings, setBuildings, floorsZones, setFloorsZones,
    selectedSiteForBuilding, setSelectedSiteForBuilding, newBuildingNameAr, setNewBuildingNameAr,
    selectedBuildingForFloor, setSelectedBuildingForFloor, newFloorZoneNameAr, setNewFloorZoneNameAr,
    newLevelNumber, setNewLevelNumber, newItemName, setNewItemName, parentId, setParentId,
    creating, setCreating, newBranchLocation, setNewBranchLocation, newBranchLatitude, setNewBranchLatitude,
    newBranchLongitude, setNewBranchLongitude, gettingLocation, setGettingLocation, newSiteLatitude,
    setNewSiteLatitude, newSiteLongitude, setNewSiteLongitude, gettingSiteLocation, setGettingSiteLocation,
    siteSearchQuery, setSiteSearchQuery, localBranchFilter, setLocalBranchFilter, divisionBranchFilter,
    setDivisionBranchFilter, departmentBranchFilter, setDepartmentBranchFilter, sectionBranchFilter,
    setSectionBranchFilter, selectedSite, setSelectedSite, siteDialogOpen, setSiteDialogOpen,
    selectedBranchForDivision, setSelectedBranchForDivision, selectedBranchForDepartment,
    setSelectedBranchForDepartment, selectedBranchForSection, setSelectedBranchForSection,
    editingId, setEditingId, editingName, setEditingName, editingLatitude, setEditingLatitude,
    editingLongitude, setEditingLongitude, saving, setSaving
  };
}

