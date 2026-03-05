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

export function DivisionsTab(props: ReturnType<typeof import('../hooks/useOrgStructure').useOrgStructure>) {
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
                    return (<TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        {t('orgStructure.noItems')}
                      </TableCell>
                    </TableRow>);
                  }
                  return filteredDivisions.map((item) => renderSimpleRow(item, 'divisions'));
                })()}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

