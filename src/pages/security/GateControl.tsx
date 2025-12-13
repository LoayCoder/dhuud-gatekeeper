import { useTranslation } from 'react-i18next';
import { GateEntryForm } from '@/components/security/GateEntryForm';
import { GateLogTable } from '@/components/security/GateLogTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, ClipboardList, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGateEntries } from '@/hooks/use-gate-entries';

export default function GateControl() {
  const { t } = useTranslation();
  const { data: activeEntries } = useGateEntries({ onlyActive: true });
  const { data: allTodayEntries } = useGateEntries({ 
    dateFrom: new Date().toISOString().split('T')[0] 
  });

  const stats = {
    onSite: activeEntries?.length || 0,
    todayEntries: allTodayEntries?.length || 0,
    visitors: activeEntries?.filter(e => e.entry_type === 'visitor').length || 0,
    contractors: activeEntries?.filter(e => e.entry_type === 'contractor').length || 0,
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            {t('security.gate.title', 'Gate Control')}
          </h1>
          <p className="text-muted-foreground">
            {t('security.gate.description', 'Manage visitor and vehicle entry/exit at facility gates')}
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('security.gate.currentlyOnSite', 'Currently On Site')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{stats.onSite}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('security.gate.todayEntries', "Today's Entries")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.todayEntries}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('security.gate.activeVisitors', 'Active Visitors')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{stats.visitors}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('security.gate.activeContractors', 'Active Contractors')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{stats.contractors}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="entry" className="space-y-4">
          <TabsList>
            <TabsTrigger value="entry" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              {t('security.gate.newEntry', 'New Entry')}
            </TabsTrigger>
            <TabsTrigger value="log" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('security.gate.entryLog', 'Entry Log')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entry">
            <GateEntryForm />
          </TabsContent>

          <TabsContent value="log">
            <GateLogTable />
          </TabsContent>
      </Tabs>
    </div>
  </div>
  );
}
