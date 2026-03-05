import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, FileSpreadsheet, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { exportToCSV, exportToExcel, ExportColumn } from '@/lib/export-utils';
import { generateSessionReportPDF } from '@/lib/generate-session-report-pdf';
import { generateAreaSessionPDF } from '@/lib/generate-area-session-pdf';
import { prepareFullPrintData } from '@/hooks/use-session-print-data';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import i18n from '@/i18n';

interface SessionExportDropdownProps {
  session: {
    id: string;
    reference_id: string | null;
    period: string;
    status: string;
    template?: { name: string; name_ar?: string | null };
    site?: { name: string };
    inspector?: { full_name: string };
    started_at: string | null;
    completed_at: string | null;
    compliance_percentage: number | null;
    total_assets?: number;
    passed_count?: number;
    failed_count?: number;
    not_accessible_count?: number;
    tenant_id: string;
    weather_conditions?: string | null;
    scope_notes?: string | null;
    attendees?: unknown;
  };
  responses?: Array<{
    id?: string;
    template_item_id: string;
    result: string | null;
    notes?: string | null;
    response_value?: string | null;
    template_item?: { question: string; question_ar?: string | null };
  }>;
  findings?: Array<{
    reference_id: string;
    classification: string;
    risk_level?: string | null;
    status?: string | null;
    description?: string | null;
  }>;
  templateItems?: Array<{
    id: string;
    question: string;
    question_ar?: string | null;
    is_critical: boolean;
    sort_order: number;
  }>;
  isAreaSession?: boolean;
}

export function SessionExportDropdown({ session, responses = [], findings = [], templateItems = [], isAreaSession = false }: SessionExportDropdownProps) {
  const { t } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  const { tenantName, logoUrl } = useTheme();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generateSessionReportPDF({
        session,
        responses,
        findings,
        tenantId: session.tenant_id,
        tenantName: tenantName || 'Organization',
        language: i18n.language === 'ar' ? 'ar' : 'en',
      });
      toast.success(t('inspectionDashboard.export.pdfSuccess'));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('inspectionDashboard.export.error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintReport = async () => {
    setIsExporting(true);
    try {
      // Prepare full print data with photos
      const printData = await prepareFullPrintData(
        session.id,
        session.tenant_id,
        {
          ...session,
          attendees: Array.isArray(session.attendees) ? session.attendees as Array<{ name: string; role?: string }> : [],
        },
        templateItems,
        responses.map(r => ({
          id: r.id || '',
          template_item_id: r.template_item_id,
          result: r.result,
          notes: r.notes || null,
          response_value: r.response_value,
        }))
      );

      await generateAreaSessionPDF({
        session: printData.session!,
        templateItems: printData.templateItems.length > 0 ? printData.templateItems : templateItems,
        responses: printData.responses.length > 0 ? printData.responses : responses.map(r => ({
          id: r.id || '',
          template_item_id: r.template_item_id,
          result: r.result,
          notes: r.notes || null,
          response_value: r.response_value,
        })),
        photosByResponse: printData.photosByResponse,
        findings: printData.findings,
        actions: printData.actions,
        brandingSettings: printData.brandingSettings,
        tenantName: tenantName || 'Organization',
        logoUrl,
        language: i18n.language === 'ar' ? 'ar' : 'en',
      });
      toast.success(t('inspectionDashboard.export.pdfSuccess'));
    } catch (error) {
      console.error('Print report error:', error);
      toast.error(t('inspectionDashboard.export.error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    const columns: ExportColumn[] = [
      { key: 'question', label: t('inspections.question') },
      { key: 'result', label: t('inspections.result') },
      { key: 'notes', label: t('inspections.notes') },
    ];
    
    const data = responses.map(r => ({
      question: r.template_item?.question || '',
      result: r.result || 'N/A',
      notes: r.notes || '',
    }));
    
    exportToCSV(data, `inspection-${session.reference_id || 'draft'}.csv`, columns);
    toast.success(t('inspectionDashboard.export.csvSuccess'));
  };

  const handleExportExcel = () => {
    const columns: ExportColumn[] = [
      { key: 'question', label: t('inspections.question') },
      { key: 'result', label: t('inspections.result') },
      { key: 'notes', label: t('inspections.notes') },
    ];
    
    const data = responses.map(r => ({
      question: r.template_item?.question || '',
      result: r.result || 'N/A',
      notes: r.notes || '',
    }));
    
    exportToExcel(data, `inspection-${session.reference_id || 'draft'}.xlsx`, columns);
    toast.success(t('inspectionDashboard.export.excelSuccess'));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin me-2" />
          ) : (
            <Download className="h-4 w-4 me-2" />
          )}
          {t('inspectionDashboard.export.title')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={direction === 'rtl' ? 'start' : 'end'}>
        {isAreaSession && (
          <>
            <DropdownMenuItem onClick={handlePrintReport}>
              <Printer className="h-4 w-4 me-2" />
              {t('inspectionDashboard.export.printReport', 'Print Report')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="h-4 w-4 me-2" />
          {t('inspectionDashboard.export.pdf')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="h-4 w-4 me-2" />
          {t('inspectionDashboard.export.csv')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          <FileSpreadsheet className="h-4 w-4 me-2" />
          {t('inspectionDashboard.export.excel')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
