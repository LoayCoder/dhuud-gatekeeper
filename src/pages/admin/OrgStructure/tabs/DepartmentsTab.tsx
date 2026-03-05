import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, Pencil, Check, X, MapPin, Navigation, Building2, Search, Settings } from "lucide-react";
import { MajorEventsTab } from '@/features/admin';

export function DepartmentsTab(props: ReturnType<typeof import('../hooks/useOrgStructure').useOrgStructure>) {
  const {
    t, direction, canDelete, branches, divisions, departments, sections, sites, buildings, floorsZones,
    newItemName, setNewItemName, parentId, setParentId, creating, newBranchLocation, setNewBranchLocation,
    newBranchLatitude, setNewBranchLatitude, newBranchLongitude, setNewBranchLongitude, getCurrentLocation,
    gettingLocation, handleCreate, editingId, editingName, setEditingName, editingLatitude, setEditingLatitude,
    editingLongitude, setEditingLongitude, handleUpdate, cancelEditing, saving, startEditing, handleDelete,
    openInMaps, selectedBranchForDivision, setSelectedBranchForDivision, divisionBranchFilter, setDivisionBranchFilter,
    selectedBranchForDepartment, setSelectedBranchForDepartment, filteredDivisionsForDropdown,
    selectedBranchForSection, setSelectedBranchForSection, departmentBranchFilter, setDepartmentBranchFilter,
    filteredDepartmentsForDropdown, sectionBranchFilter, setSectionBranchFilter, newSiteLatitude, setNewSiteLatitude,
    newSiteLongitude, setNewSiteLongitude, gettingSiteLocation, setGettingSiteLocation, localBranchFilter,
    setLocalBranchFilter, siteSearchQuery, setSiteSearchQuery, filteredBranchesForDropdown, setSelectedSite,
    setSiteDialogOpen, selectedSiteForBuilding, setSelectedSiteForBuilding, filteredSitesForDropdown,
    newBuildingNameAr, setNewBuildingNameAr, selectedBuildingForFloor, setSelectedBuildingForFloor,
    filteredBuildingsForDropdown, newFloorZoneNameAr, setNewFloorZoneNameAr, newLevelNumber, setNewLevelNumber,
    renderBranchRow, renderSimpleRow, renderRowWithParent, renderSiteRow
  } = props;

  return (
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
                    return (<TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        {t('orgStructure.noItems')}
                      </TableCell>
                    </TableRow>);
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
  );
}

