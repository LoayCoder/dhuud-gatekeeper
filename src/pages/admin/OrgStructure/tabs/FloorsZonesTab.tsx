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

export function FloorsZonesTab(props: ReturnType<typeof import('../hooks/useOrgStructure').useOrgStructure>) {
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
  );
}

