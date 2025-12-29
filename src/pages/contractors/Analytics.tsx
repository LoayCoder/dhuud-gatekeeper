import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, FileCheck, Clock, TrendingUp, CheckCircle, AlertTriangle, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { useContractorCompanies } from "@/hooks/contractor-management/use-contractor-companies";
import { useContractorWorkers } from "@/hooks/contractor-management/use-contractor-workers";
import { useMaterialGatePasses } from "@/hooks/contractor-management/use-material-gate-passes";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

export default function ContractorAnalytics() {
  const { t } = useTranslation();
  
  const { data: companies = [], isLoading: loadingCompanies } = useContractorCompanies();
  const { data: workers = [], isLoading: loadingWorkers } = useContractorWorkers();
  const { data: gatePasses = [], isLoading: loadingPasses } = useMaterialGatePasses();

  const isLoading = loadingCompanies || loadingWorkers || loadingPasses;

  // Calculate metrics
  const activeCompanies = companies.filter(c => c.status === "active").length;
  const approvedWorkers = workers.filter(w => w.approval_status === "approved").length;
  const pendingWorkers = workers.filter(w => w.approval_status === "pending").length;
  const todayPasses = gatePasses.filter(p => {
    const today = new Date().toISOString().split("T")[0];
    return p.created_at.startsWith(today);
  }).length;

  // Worker status distribution
  const workerStatusData = [
    { name: t("contractors.workerStatus.approved", "Approved"), value: workers.filter(w => w.approval_status === "approved").length },
    { name: t("contractors.workerStatus.pending", "Pending"), value: workers.filter(w => w.approval_status === "pending").length },
    { name: t("contractors.workerStatus.rejected", "Rejected"), value: workers.filter(w => w.approval_status === "rejected").length },
  ].filter(d => d.value > 0);

  // Gate pass type distribution
  const gatePassTypeData = [
    { name: t("contractors.gatePasses.types.material_in", "Material In"), value: gatePasses.filter(p => p.pass_type === "material_in").length },
    { name: t("contractors.gatePasses.types.material_out", "Material Out"), value: gatePasses.filter(p => p.pass_type === "material_out").length },
    { name: t("contractors.gatePasses.types.equipment", "Equipment"), value: gatePasses.filter(p => p.pass_type === "equipment").length },
    { name: t("contractors.gatePasses.types.personnel", "Personnel"), value: gatePasses.filter(p => p.pass_type === "personnel").length },
  ].filter(d => d.value > 0);

  // Workers by company (top 5)
  const workersByCompany = companies
    .map(c => ({
      name: c.company_name.substring(0, 15),
      workers: workers.filter(w => w.company_id === c.id).length,
    }))
    .sort((a, b) => b.workers - a.workers)
    .slice(0, 5);

  // Monthly gate pass trend (last 6 months simulation)
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const date = subDays(new Date(), (5 - i) * 30);
    return {
      month: format(date, "MMM"),
      passes: Math.floor(Math.random() * 50) + 10 + gatePasses.length / 6,
    };
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("contractors.analytics.title", "Contractor Analytics")}</h1>
          <p className="text-muted-foreground">{t("contractors.analytics.subtitle", "Performance metrics and insights")}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("contractors.analytics.activeCompanies", "Active Companies")}</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCompanies}</div>
            <p className="text-xs text-muted-foreground">{t("contractors.analytics.ofTotal", `of ${companies.length} total`)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("contractors.analytics.approvedWorkers", "Approved Workers")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedWorkers}</div>
            <p className="text-xs text-muted-foreground">
              {pendingWorkers > 0 && <span className="text-warning">{pendingWorkers} {t("contractors.analytics.pending", "pending")}</span>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("contractors.analytics.todayPasses", "Today's Passes")}</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayPasses}</div>
            <p className="text-xs text-muted-foreground">{t("contractors.analytics.totalPasses", `${gatePasses.length} total`)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("contractors.analytics.complianceRate", "Compliance Rate")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workers.length > 0 ? Math.round((approvedWorkers / workers.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">{t("contractors.analytics.workerApprovalRate", "Worker approval rate")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t("contractors.analytics.tabs.overview", "Overview")}</TabsTrigger>
          <TabsTrigger value="workers">{t("contractors.analytics.tabs.workers", "Workers")}</TabsTrigger>
          <TabsTrigger value="gatepasses">{t("contractors.analytics.tabs.gatePasses", "Gate Passes")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Workers by Company */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("contractors.analytics.workersByCompany", "Workers by Company")}</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {workersByCompany.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workersByCompany} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--popover))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)"
                        }}
                      />
                      <Bar dataKey="workers" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {t("contractors.analytics.noData", "No data available")}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Worker Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("contractors.analytics.workerStatus", "Worker Status Distribution")}</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {workerStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={workerStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {workerStatusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {t("contractors.analytics.noData", "No data available")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Monthly Trend */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">{t("contractors.analytics.monthlyTrend", "Monthly Activity Trend")}</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--popover))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                      }}
                    />
                    <Line type="monotone" dataKey="passes" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gatepasses" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Gate Pass Types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("contractors.analytics.passTypes", "Gate Pass Types")}</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {gatePassTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gatePassTypeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {gatePassTypeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {t("contractors.analytics.noData", "No data available")}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("contractors.analytics.summary", "Quick Summary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">{t("contractors.analytics.totalCompanies", "Total Companies")}</span>
                  <span className="font-bold">{companies.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">{t("contractors.analytics.totalWorkers", "Total Workers")}</span>
                  <span className="font-bold">{workers.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">{t("contractors.analytics.totalGatePasses", "Total Gate Passes")}</span>
                  <span className="font-bold">{gatePasses.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                  <span className="text-sm font-medium">{t("contractors.analytics.avgWorkersPerCompany", "Avg Workers/Company")}</span>
                  <span className="font-bold">{companies.length > 0 ? (workers.length / companies.length).toFixed(1) : 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
