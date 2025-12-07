import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { exportToCSV, exportToExcel, ExportColumn } from '@/lib/export-utils';
import { generateSessionReportPDF } from '@/lib/generate-session-report-pdf';
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
  };
  responses?: Array<{
    template_item_id: string;
    result: string | null;
    notes?: string | null;
    template_item?: { question: string; question_ar?: string | null };
  }>;
  findings?: Array<{
    reference_id: string;
    classification: string;
    risk_level?: string | null;
    status?: string | null;
    description?: string | null;
  }>;
}

export function SessionExportDropdown({ session, responses = [], findings = [] }: SessionExportDropdownProps) {
  const { t } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  const { tenantName } = useTheme();
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
