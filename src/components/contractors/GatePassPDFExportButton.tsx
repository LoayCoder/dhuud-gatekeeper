import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileDown, Loader2, Globe } from 'lucide-react';
import { useGatePassPDF, GatePassPDFLanguage } from '@/hooks/contractor-management/use-gate-pass-pdf';
import { toast } from '@/hooks/use-toast';

interface GatePassPDFExportButtonProps {
  passId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const languageOptions: { code: GatePassPDFLanguage; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export function GatePassPDFExportButton({ 
  passId, 
  variant = 'outline', 
  size = 'sm' 
}: GatePassPDFExportButtonProps) {
  const { t } = useTranslation();
  const { generatePDF, isGenerating, isLoading } = useGatePassPDF(passId);
  const [selectedLanguage, setSelectedLanguage] = useState<GatePassPDFLanguage>('en');

  const handleExport = async (language: GatePassPDFLanguage) => {
    setSelectedLanguage(language);
    try {
      await generatePDF({ 
        primaryLanguage: language, 
        showQR: true,
        includeItems: true,
      });
      toast({
        title: t('contractors.gatePassPdf.success', 'PDF Generated'),
        description: t('contractors.gatePassPdf.downloadStarted', 'Your gate pass PDF is being downloaded'),
      });
    } catch (error) {
      toast({
        title: t('contractors.gatePassPdf.error', 'Error generating PDF'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isLoading || isGenerating}>
          {isGenerating ? (
            <Loader2 className="h-4 w-4 me-2 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 me-2" />
          )}
          {size !== 'icon' && t('contractors.gatePassPdf.export', 'Save PDF')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {t('contractors.gatePassPdf.selectLanguage', 'Select Language')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languageOptions.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleExport(lang.code)}
            disabled={isGenerating}
          >
            <span className="me-2">{lang.flag}</span>
            {lang.label}
            {isGenerating && selectedLanguage === lang.code && (
              <Loader2 className="h-3 w-3 ms-auto animate-spin" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
