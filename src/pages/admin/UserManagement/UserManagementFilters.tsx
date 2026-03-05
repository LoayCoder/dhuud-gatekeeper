
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserTypeLabel } from "@/lib/license-utils";

export function UserManagementFilters(props: import('./types').BaseUserManagementProps & { activeFilterCount: number; clearAllFilters: () => void }) {
  const { t } = useTranslation();
  const { searchInput, setSearchInput, filtersOpen, setFiltersOpen, activeFilterCount, clearAllFilters, userTypeFilter, setUserTypeFilter, statusFilter, setStatusFilter, branchFilter, setBranchFilter, divisionFilter, setDivisionFilter, roleFilter, setRoleFilter, branches, divisions, roles, direction } = props;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Search Input */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('userManagement.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="ps-10"
            />
            {searchInput && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute end-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchInput('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {t('userManagement.filters')}
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                      {activeFilterCount}
                    </Badge>
                  )}
                  <ChevronDown className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground">
                  {t('userManagement.clearFilters', 'Clear all')}
                </Button>
              )}
            </div>
          </Collapsible>
        </div>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2 text-start">
                <label className="text-sm font-medium">{t('userManagement.filterByType')}</label>
                <Select value={userTypeFilter} onValueChange={setUserTypeFilter} dir={direction}>
                  <SelectTrigger className="text-start"><SelectValue /></SelectTrigger>
                  <SelectContent dir={direction} className="bg-background">
                    <SelectItem value="all">{t('userManagement.allTypes')}</SelectItem>
                    <SelectItem value="employee">{t('userTypes.employee')}</SelectItem>
                    <SelectItem value="contractor_longterm">{t('userTypes.contractorLongterm')}</SelectItem>
                    <SelectItem value="contractor_shortterm">{t('userTypes.contractorShortterm')}</SelectItem>
                    <SelectItem value="member">{t('userTypes.member')}</SelectItem>
                    <SelectItem value="visitor">{t('userTypes.visitor')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 text-start">
                <label className="text-sm font-medium">{t('userManagement.filterByStatus')}</label>
                <Select value={statusFilter} onValueChange={setStatusFilter} dir={direction}>
                  <SelectTrigger className="text-start"><SelectValue /></SelectTrigger>
                  <SelectContent dir={direction} className="bg-background">
                    <SelectItem value="all">{t('userManagement.allStatuses')}</SelectItem>
                    <SelectItem value="active">{t('userManagement.active')}</SelectItem>
                    <SelectItem value="inactive">{t('userManagement.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 text-start">
                <label className="text-sm font-medium">{t('userManagement.filterByBranch')}</label>
                <Select value={branchFilter} onValueChange={setBranchFilter} dir={direction}>
                  <SelectTrigger className="text-start"><SelectValue /></SelectTrigger>
                  <SelectContent dir={direction} className="bg-background">
                    <SelectItem value="all">{t('userManagement.allBranches')}</SelectItem>
                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 text-start">
                <label className="text-sm font-medium">{t('userManagement.filterByDivision')}</label>
                <Select value={divisionFilter} onValueChange={setDivisionFilter} dir={direction}>
                  <SelectTrigger className="text-start"><SelectValue /></SelectTrigger>
                  <SelectContent dir={direction} className="bg-background">
                    <SelectItem value="all">{t('userManagement.allDivisions')}</SelectItem>
                    {divisions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 text-start">
                <label className="text-sm font-medium">{t('userManagement.filterByRole')}</label>
                <Select value={roleFilter} onValueChange={setRoleFilter} dir={direction}>
                  <SelectTrigger className="text-start"><SelectValue /></SelectTrigger>
                  <SelectContent dir={direction} className="bg-background">
                    <SelectItem value="all">{t('userManagement.allRoles')}</SelectItem>
                    {roles.map(r => <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
