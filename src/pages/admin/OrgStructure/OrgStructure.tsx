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
import { MajorEventsTab } from '@/features/admin';
import { SiteDetailDialog } from '@/features/admin';
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from '@/features/users';
import { useBranchFilter } from "@/hooks/use-branch-filter";

import { Branch, Division, Department, Section, Coordinate, Site, Building, FloorZone, TableType } from './types';

import { BranchesTab } from './OrgStructureTabs';
import { SitesTab } from './OrgStructureTabs';
import { BuildingsTab } from './OrgStructureTabs';
import { FloorsZonesTab } from './OrgStructureTabs';
import { DivisionsTab } from './OrgStructureTabs';
import { DepartmentsTab } from './OrgStructureTabs';
import { SectionsTab } from './OrgStructureTabs';
import { EventsTab } from './OrgStructureTabs';

import { useOrgStructure } from './hooks/useOrgStructure';

export default function OrgStructure() {
  const viewProps = useOrgStructure();
  const { loading, branchLoading, t, direction } = viewProps;

  if (loading || branchLoading) {
    return (<div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>);
  }

return (<div className="container py-8 space-y-8" dir={direction}>
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

      {/* BranchesTab */}
        <BranchesTab {...viewProps} />

        {/* SitesTab */}
        <SitesTab {...viewProps} />

        {/* BuildingsTab */}
        <BuildingsTab {...viewProps} />

        {/* FloorsZonesTab */}
        <FloorsZonesTab {...viewProps} />

        {/* DivisionsTab */}
        <DivisionsTab {...viewProps} />

        {/* DepartmentsTab */}
        <DepartmentsTab {...viewProps} />

        {/* SectionsTab */}
        <SectionsTab {...viewProps} />

        {/* EventsTab */}
        <EventsTab {...viewProps} />
      </Tabs>

      {/* Site Detail Dialog */}
      <SiteDetailDialog
        open={siteDialogOpen}
        onOpenChange={setSiteDialogOpen}
        site={selectedSite}
        onSave={fetchData}
      />
    </div>);
}


