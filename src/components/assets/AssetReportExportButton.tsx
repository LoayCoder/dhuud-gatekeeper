import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, Loader2, ChevronDown, ImageIcon, History, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { generateAssetReportPDF } from '@/lib/generate-asset-report-pdf';
import { useDocumentBranding } from '@/hooks/use-document-branding';
import { useTheme } from '@/contexts/ThemeContext';
import type { AssetWithRelations } from '@/hooks/use-assets';

interface AssetReportExportButtonProps {
  asset: AssetWithRelations;
  photos?: Array<{ storage_path: string; file_name: string; is_primary: boolean }>;
  maintenanceHistory?: Array<{
    id: string;
    maintenance_type: string;
    performed_date: string;
    notes?: string;
    cost?: number;
  }>;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function AssetReportExportButton({
  asset,
  photos = [],
  maintenanceHistory = [],
  variant = 'outline',
  size = 'default',
}: AssetReportExportButtonProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { activeLogoUrl, tenantName } = useTheme();
  const { getHeaderConfig, getFooterConfig, getWatermarkConfig } = useDocumentBranding();

  const [isGenerating, setIsGenerating] = useState(false);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includeFinancials, setIncludeFinancials] = useState(true);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const headerConfig = getHeaderConfig();
      const footerConfig = getFooterConfig();
      const watermarkConfig = getWatermarkConfig();

      await generateAssetReportPDF({
        asset,
        photos: includePhotos ? photos : [],
        maintenanceHistory: includeHistory ? maintenanceHistory : [],
        branding: {
          logoUrl: headerConfig.logoUrl || activeLogoUrl,
          tenantName: headerConfig.primaryText || tenantName,
          headerText: headerConfig.primaryText,
          footerText: footerConfig.text,
          watermarkText: watermarkConfig.text,
          watermarkEnabled: watermarkConfig.enabled,
        },
        isRTL,
        includePhotos,
        includeHistory,
        includeFinancials,
      });

      toast.success(t('assets.report.exportSuccess'));
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(t('assets.report.exportError'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2" disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {size !== 'icon' && t('assets.report.exportPDF')}
          {size !== 'icon' && <ChevronDown className="h-3 w-3" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('assets.report.includeOptions')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuCheckboxItem
          checked={includePhotos}
          onCheckedChange={setIncludePhotos}
        >
          <ImageIcon className="h-4 w-4 me-2" />
          {t('assets.report.includePhotos')}
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={includeHistory}
          onCheckedChange={setIncludeHistory}
        >
          <History className="h-4 w-4 me-2" />
          {t('assets.report.includeHistory')}
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={includeFinancials}
          onCheckedChange={setIncludeFinancials}
        >
          <DollarSign className="h-4 w-4 me-2" />
          {t('assets.report.includeFinancials')}
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleGeneratePDF} disabled={isGenerating}>
          <Download className="h-4 w-4 me-2" />
          {isGenerating ? t('common.generating') : t('assets.report.downloadPDF')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
