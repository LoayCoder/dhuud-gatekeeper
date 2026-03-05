import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, MessageSquareWarning, Upload, FileImage, X } from 'lucide-react';
import { useContractorAcknowledgeViolation } from '@/hooks/contractor-observation';

interface ContractorAcknowledgementCardProps {
  violationId: string;
  status: string;
  violationCategory?: string;
  potentialFine?: number;
  currency?: string;
}

export function ContractorAcknowledgementCard({
  violationId,
  status,
  violationCategory,
  potentialFine,
  currency = 'SAR'
}: ContractorAcknowledgementCardProps) {
  const { t } = useTranslation();
  const [disputeMode, setDisputeMode] = useState(false);
  const [justification, setJustification] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  
  const { mutate: acknowledge, isPending } = useContractorAcknowledgeViolation();

  if (status !== 'pending_contractor_acknowledgement') return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setEvidenceFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAcknowledge = () => {
    acknowledge({
      violationId,
      acknowledged: true
    });
  };

  const handleDispute = () => {
    if (!justification.trim()) return;
    
    // In real implementation, upload files first
    const evidenceUrls = evidenceFiles.map(f => URL.createObjectURL(f));
    
    acknowledge({
      violationId,
      acknowledged: false,
      disputeReason: justification.trim(),
      disputeEvidence: evidenceUrls.length > 0 ? evidenceUrls : undefined
    });
  };

  return (
    <Card className="border-warning/20 bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-warning" />
          {t('workflow.violationAcknowledgement', 'Violation Acknowledgement')}
          <Badge variant="outline" className="ms-auto">
            {t('workflow.actionRequired', 'Action Required')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
          <p className="text-sm text-muted-foreground">
            {t('workflow.acknowledgementInstructions', 
              'A violation has been identified and approved. You may acknowledge it or submit a dispute with supporting evidence.')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {violationCategory && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">{t('workflow.category', 'Category')}</span>
              <p className="font-medium text-sm">{violationCategory}</p>
            </div>
          )}
          {potentialFine && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">{t('workflow.potentialFine', 'Potential Fine')}</span>
              <p className="font-medium text-sm text-destructive">
                {currency} {potentialFine.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {!disputeMode ? (
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setDisputeMode(true)}
              className="gap-2 flex-1"
            >
              <MessageSquareWarning className="h-4 w-4" />
              {t('workflow.submitDispute', 'Submit Dispute')}
            </Button>

            <Button
              onClick={handleAcknowledge}
              disabled={isPending}
              className="gap-2 flex-1"
            >
              <CheckCircle className="h-4 w-4" />
              {t('workflow.acknowledge', 'Acknowledge')}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('workflow.disputeJustification', 'Dispute Justification')} *
              </label>
              <Textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder={t('workflow.disputeJustificationPlaceholder', 'Provide detailed justification for your dispute...')}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('workflow.supportingEvidence', 'Supporting Evidence')}
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => document.getElementById('dispute-evidence')?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {t('workflow.selectFiles', 'Select Files')}
                </Button>
                <input
                  id="dispute-evidence"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {evidenceFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {evidenceFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1">
                      <FileImage className="h-3 w-3" />
                      <span className="text-xs truncate max-w-[100px]">{file.name}</span>
                      <button onClick={() => removeFile(index)} className="ms-1">
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setDisputeMode(false);
                  setJustification('');
                  setEvidenceFiles([]);
                }}
              >
                {t('common.cancel', 'Cancel')}
              </Button>

              <Button
                variant="destructive"
                onClick={handleDispute}
                disabled={isPending || !justification.trim()}
                className="gap-2"
              >
                <MessageSquareWarning className="h-4 w-4" />
                {t('workflow.submitDispute', 'Submit Dispute')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
