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

export function BuildingsTab(props: ReturnType<typeof import('../hooks/useOrgStructure').useOrgStructure>) {
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
  );
}

