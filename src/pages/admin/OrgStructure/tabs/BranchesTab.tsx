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

export function BranchesTab(props: ReturnType<typeof import('../hooks/useOrgStructure').useOrgStructure>) {
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
    </TabsContent>);
}

