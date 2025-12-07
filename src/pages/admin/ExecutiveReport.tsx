import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { format, subMonths } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, Download, Calendar, AlertTriangle, Shield, 
  ClipboardCheck, CheckCircle, Clock, TrendingUp, TrendingDown
} from "lucide-react";
import { useExecutiveSummary } from "@/hooks/use-executive-summary";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { generatePDFFromElement, createPDFRenderContainer, removePDFRenderContainer } from "@/lib/pdf-utils";
import { fetchDocumentSettings } from "@/hooks/use-document-branding";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const SEVERITY_COLORS = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

export default function ExecutiveReport() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  const { tenantName } = useTheme();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate last 12 months for selection
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM-01'),
      label: format(date, 'MMMM yyyy'),
    };
  });

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const { data, isLoading } = useExecutiveSummary(new Date(selectedMonth));

  const handleGeneratePDF = async () => {
    if (!reportRef.current || !data || !profile?.tenant_id) return;

    setIsGenerating(true);
    try {
      // Fetch document branding settings
      const settings = await fetchDocumentSettings(profile.tenant_id);
      
      const container = createPDFRenderContainer();
      container.dir = direction;
      
      // Build branded header
      const headerHtml = settings?.showLogo ? `
        <div style="display: flex; justify-content: ${settings.headerLogoPosition === 'center' ? 'center' : settings.headerLogoPosition === 'right' ? 'flex-end' : 'flex-start'}; margin-bottom: 16px;">
        </div>
      ` : '';
      
      const primaryText = settings?.headerTextPrimary || tenantName || 'Organization';
      const secondaryText = settings?.headerTextSecondary || t('executiveReport.reportTitle');
      
      // Build branded footer
      const footerHtml = (settings?.showPageNumbers || settings?.showDatePrinted || settings?.footerText) ? `
        <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px; color: #666; display: flex; justify-content: space-between;">
          <span>${settings?.footerText || ''}</span>
          <span>${settings?.showDatePrinted ? format(new Date(), 'PPP') : ''}</span>
        </div>
      ` : '';
      
      // Build watermark if enabled
      const watermarkStyle = settings?.watermarkEnabled ? `
        position: relative;
      ` : '';
      
      const watermarkOverlay = settings?.watermarkEnabled ? `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 60px; color: rgba(0,0,0,${(settings.watermarkOpacity || 15) / 100}); pointer-events: none; white-space: nowrap; z-index: 0;">
          ${settings.watermarkText || tenantName || ''}
        </div>
      ` : '';
      
      // Wrap report content with branding
      container.innerHTML = `
        <div style="font-family: 'Rubik', Arial, sans-serif; color: #333; padding: 20px; ${watermarkStyle}">
          ${watermarkOverlay}
          <div style="position: relative; z-index: 1;">
            ${headerHtml}
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: bold;">${primaryText}</h1>
              <p style="margin: 4px 0 0; font-size: 14px; color: #666;">${secondaryText}</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: #999;">${format(new Date(selectedMonth), 'MMMM yyyy')}</p>
            </div>
            ${reportRef.current.innerHTML}
            ${footerHtml}
          </div>
        </div>
      `;
      
      await generatePDFFromElement(container, {
        filename: `HSSE-Executive-Report-${format(new Date(selectedMonth), 'yyyy-MM')}.pdf`,
        quality: 2,
        margin: 15,
      });
      
      removePDFRenderContainer(container);
      toast.success(t('executiveReport.pdfGenerated'));
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error(t('executiveReport.pdfError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const severityChartData = data ? [
    { name: t('severity.critical'), value: data.incidents.by_severity.critical, color: SEVERITY_COLORS.critical },
    { name: t('severity.high'), value: data.incidents.by_severity.high, color: SEVERITY_COLORS.high },
    { name: t('severity.medium'), value: data.incidents.by_severity.medium, color: SEVERITY_COLORS.medium },
    { name: t('severity.low'), value: data.incidents.by_severity.low, color: SEVERITY_COLORS.low },
  ].filter(item => item.value > 0) : [];

  const inspectionTypeData = data ? [
    { name: t('inspections.types.asset'), count: data.inspections.by_type.asset },
    { name: t('inspections.types.area'), count: data.inspections.by_type.area },
    { name: t('inspections.types.audit'), count: data.inspections.by_type.audit },
  ] : [];

  return (
    <div className="container mx-auto p-6 space-y-6" dir={direction}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('executiveReport.title')}</h1>
          <p className="text-muted-foreground">{t('executiveReport.subtitle')}</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]">
              <Calendar className="h-4 w-4 me-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            onClick={handleGeneratePDF} 
            disabled={isLoading || isGenerating || !data}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isGenerating ? t('common.generating') : t('executiveReport.downloadPdf')}
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="space-y-6 bg-background">
        {/* Header */}
        <Card className="border-2">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">{t('executiveReport.reportTitle')}</CardTitle>
            <CardDescription className="text-lg">
              {tenantName || 'Organization'} - {format(new Date(selectedMonth), 'MMMM yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            {t('executiveReport.generatedOn')}: {format(new Date(), 'PPP')}
          </CardContent>
        </Card>

        {/* Key Performance Indicators */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('executiveReport.totalIncidents')}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{data?.incidents.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {data?.incidents.observations_count || 0} {t('executiveReport.observations')}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('executiveReport.inspectionsCompleted')}</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{data?.inspections.sessions_completed || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {data?.inspections.avg_compliance_percentage || 0}% {t('executiveReport.avgCompliance')}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('executiveReport.actionsCompleted')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {data?.actions.completed || 0}/{data?.actions.total_created || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data?.actions.overdue || 0} {t('executiveReport.overdue')}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('executiveReport.slaPerformance')}</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {100 - (data?.actions.sla_breach_rate || 0)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data?.actions.sla_breach_count || 0} {t('executiveReport.breaches')}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Incidents Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('executiveReport.incidentsSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">{t('executiveReport.bySeverity')}</h4>
                  {severityChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={severityChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {severityChartData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      {t('executiveReport.noIncidents')}
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">{t('executiveReport.byStatus')}</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>{t('status.submitted')}</span>
                      <Badge variant="secondary">{data?.incidents.by_status.submitted || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>{t('status.investigation_in_progress')}</span>
                      <Badge variant="secondary">{data?.incidents.by_status.investigation_in_progress || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>{t('status.closed')}</span>
                      <Badge>{data?.incidents.by_status.closed || 0}</Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {t('executiveReport.avgClosureTime')}
                      </span>
                      <span className="font-medium">{data?.incidents.avg_closure_days || 0} {t('common.days')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inspections Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              {t('executiveReport.inspectionsSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">{t('executiveReport.sessionsByType')}</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={inspectionTypeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">{t('executiveReport.findingsStatus')}</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>{t('executiveReport.findingsRaised')}</span>
                      <Badge variant="outline">{data?.inspections.findings_raised || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>{t('executiveReport.findingsClosed')}</span>
                      <Badge>{data?.inspections.findings_closed || 0}</Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span>{t('executiveReport.complianceRate')}</span>
                      <span className="font-medium text-lg">
                        {data?.inspections.avg_compliance_percentage || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {t('executiveReport.actionsSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[150px] w-full" />
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">{t('executiveReport.actionStatus')}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t('executiveReport.totalCreated')}</span>
                      <span className="font-medium">{data?.actions.total_created || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('executiveReport.completed')}</span>
                      <span className="font-medium text-green-600">{data?.actions.completed || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('executiveReport.verified')}</span>
                      <span className="font-medium text-blue-600">{data?.actions.verified || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">{t('executiveReport.performance')}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t('executiveReport.avgResolution')}</span>
                      <span className="font-medium">{data?.actions.avg_resolution_days || 0} {t('common.days')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('executiveReport.slaBreachRate')}</span>
                      <span className={`font-medium ${(data?.actions.sla_breach_rate || 0) > 10 ? 'text-destructive' : 'text-green-600'}`}>
                        {data?.actions.sla_breach_rate || 0}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">{t('executiveReport.attention')}</h4>
                  <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    <div>
                      <div className="font-medium text-destructive">{data?.actions.overdue || 0}</div>
                      <div className="text-sm text-muted-foreground">{t('executiveReport.overdueActions')}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
