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
import { toast } from "@/hooks/use-toast";

export function SitesTab(props: ReturnType<typeof import('../hooks/useOrgStructure').useOrgStructure>) {
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
                    return (<TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        {siteSearchQuery ? t('orgStructure.noSearchResults') : t('orgStructure.noItems')}
                      </TableCell>
                    </TableRow>);
                  }
                  return filteredSites.map((item) => renderSiteRow(item));
                })()}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

