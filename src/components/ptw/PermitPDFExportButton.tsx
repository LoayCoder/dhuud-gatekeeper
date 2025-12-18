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
import { usePTWPermitPDF, PDFLanguage } from '@/hooks/ptw/use-ptw-permit-pdf';
import { toast } from '@/hooks/use-toast';

interface PermitPDFExportButtonProps {
  permitId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const languageOptions: { code: PDFLanguage; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰' },
  { code: 'fil', label: 'Filipino', flag: '🇵🇭' },
];

export function PermitPDFExportButton({ 
  permitId, 
  variant = 'outline', 
  size = 'default' 
}: PermitPDFExportButtonProps) {
  const { t } = useTranslation();
  const { generatePDF, isGenerating, isLoading } = usePTWPermitPDF(permitId);
  const [selectedLanguage, setSelectedLanguage] = useState<PDFLanguage>('en');

  const handleExport = async (language: PDFLanguage) => {
    setSelectedLanguage(language);
    try {
      await generatePDF({ primaryLanguage: language, showQR: true });
      toast({
        title: t('ptw.pdf.success', 'PDF Generated'),
        description: t('ptw.pdf.downloadStarted', 'Your permit PDF is being downloaded'),
      });
    } catch (error) {
      toast({
        title: t('ptw.pdf.error', 'Error generating PDF'),
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
          {size !== 'icon' && t('ptw.pdf.export', 'Export PDF')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {t('ptw.pdf.selectLanguage', 'Select Language')}
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
