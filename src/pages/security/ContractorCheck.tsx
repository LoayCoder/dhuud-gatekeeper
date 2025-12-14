import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { useValidateContractor, useLogContractorAccess, useContractorAccessLogs } from '@/hooks/use-contractors';
import { ContractorQRScanner } from '@/components/security/ContractorQRScanner';
import { ValidationResultCard } from '@/components/security/ValidationResultCard';
import { ContractorAccessLogTable } from '@/components/security/ContractorAccessLogTable';
import { QrCode, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ValidationResult {
  valid: boolean;
  contractor_id?: string;
  contractor_name?: string;
  company_name?: string;
  nationality?: string;
  preferred_language?: string;
  photo_url?: string;
  errors: string[];
  warnings: string[];
}

export default function ContractorCheck() {
  const { t } = useTranslation();
  const [searchCode, setSearchCode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const validateContractor = useValidateContractor();
  const logAccess = useLogContractorAccess();
  const { data: accessLogs, isLoading: logsLoading } = useContractorAccessLogs();

  const handleValidate = async (code: string) => {
    if (!code.trim()) return;

    try {
      const result = await validateContractor.mutateAsync({ contractorCode: code.trim() });
      setValidationResult(result);
    } catch (error) {
      toast.error(t('security.contractors.validationFailed'));
    }
  };

  const handleScan = (code: string) => {
    setSearchCode(code);
    handleValidate(code);
  };

  const handleLogEntry = async () => {
    if (!validationResult?.contractor_id) return;

    await logAccess.mutateAsync({
      contractorId: validationResult.contractor_id,
      accessType: 'entry',
      validationStatus: validationResult.valid ? (validationResult.warnings.length > 0 ? 'warning' : 'passed') : 'failed',
      validationErrors: validationResult.errors,
    });

    setValidationResult(null);
    setSearchCode('');
  };

  const handleClear = () => {
    setValidationResult(null);
    setSearchCode('');
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('security.contractorCheck.title')}</h1>
          <p className="text-muted-foreground">{t('security.contractorCheck.description')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('security.contractorCheck.scanOrSearch')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('security.contractorCheck.searchPlaceholder')}
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="ps-9"
                  onKeyDown={(e) => e.key === 'Enter' && handleValidate(searchCode)}
                />
              </div>
              <Button onClick={() => handleValidate(searchCode)} disabled={validateContractor.isPending || !searchCode.trim()}>
                {validateContractor.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('security.contractorCheck.check')
                )}
              </Button>
              <Button variant="secondary" onClick={() => setScannerOpen(true)}>
                <QrCode className="h-4 w-4 me-2" />
                {t('security.contractorCheck.scanQR')}
              </Button>
            </div>

            {validationResult && (
              <div className="space-y-4">
                <ValidationResultCard
                  result={validationResult}
                  onLogEntry={handleLogEntry}
                  isLogging={logAccess.isPending}
                />
                <Button variant="outline" onClick={handleClear} className="w-full">
                  {t('security.contractorCheck.checkAnother')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('security.contractorCheck.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ContractorAccessLogTable logs={accessLogs || []} isLoading={logsLoading} />
          </CardContent>
        </Card>
      </div>

      <ContractorQRScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScan}
      />
    </>
  );
}
