import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gavel, CheckCircle, XCircle, Scale, Loader2, Building2, Clock, FileText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { 
  usePendingContractorDisputes, 
  useResolveContractorDispute,
  useCanReviewContractorDispute,
  type ContractorDisputeStatus 
} from "@/hooks/use-contractor-dispute";

const DISPUTE_STATUS_OPTIONS: Array<{ 
  value: ContractorDisputeStatus; 
  labelEn: string; 
  labelAr: string;
  descEn: string;
  descAr: string;
  icon: typeof CheckCircle;
  color: string;
}> = [
  { 
    value: 'upheld', 
    labelEn: 'Uphold Dispute', 
    labelAr: 'قبول النزاع',
    descEn: 'Accept the contractor\'s dispute. Remove or reduce liability.',
    descAr: 'قبول نزاع المقاول. إزالة أو تقليل المسؤولية.',
    icon: CheckCircle,
    color: 'text-green-600'
  },
  { 
    value: 'rejected', 
    labelEn: 'Reject Dispute', 
    labelAr: 'رفض النزاع',
    descEn: 'Reject the dispute. Original finding stands.',
    descAr: 'رفض النزاع. النتيجة الأصلية تظل قائمة.',
    icon: XCircle,
    color: 'text-red-600'
  },
  { 
    value: 'partially_accepted', 
    labelEn: 'Partially Accept', 
    labelAr: 'قبول جزئي',
    descEn: 'Partially accept the dispute. Modify findings or liability.',
    descAr: 'قبول جزئي للنزاع. تعديل النتائج أو المسؤولية.',
    icon: Scale,
    color: 'text-blue-600'
  },
];

export function ContractorArbitrationView() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const dateLocale = isRTL ? ar : enUS;

  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);
  const [decision, setDecision] = useState<ContractorDisputeStatus | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");

  const { data: canReview, isLoading: checkingPermission } = useCanReviewContractorDispute();
  const { data: pendingDisputes, isLoading: loadingDisputes } = usePendingContractorDisputes();
  const { mutate: resolveDispute, isPending } = useResolveContractorDispute();

  if (checkingPermission || loadingDisputes) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!canReview) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Gavel className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {t('workflow.arbitration.noPermission', 'You do not have permission to review contractor disputes.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!pendingDisputes?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            {t('workflow.arbitration.title', 'Contractor Arbitration')}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <p className="text-muted-foreground">
            {t('workflow.arbitration.noDisputes', 'No pending contractor disputes to review.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentDispute = pendingDisputes.find(d => d.id === selectedDispute);

  const handleSubmit = () => {
    if (!selectedDispute || !decision || !decisionNotes.trim()) return;

    resolveDispute({
      disputeId: selectedDispute,
      decision,
      decisionNotes,
    }, {
      onSuccess: () => {
        setSelectedDispute(null);
        setDecision(null);
        setDecisionNotes("");
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            {t('workflow.arbitration.title', 'Contractor Arbitration Queue')}
          </CardTitle>
          <CardDescription>
            {t('workflow.arbitration.description', 'Review and resolve contractor disputes. {{count}} pending.', { count: pendingDisputes.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('workflow.arbitration.incident', 'Incident')}</TableHead>
                <TableHead>{t('workflow.arbitration.contractor', 'Contractor')}</TableHead>
                <TableHead>{t('workflow.arbitration.submittedBy', 'Submitted By')}</TableHead>
                <TableHead>{t('workflow.arbitration.date', 'Date')}</TableHead>
                <TableHead>{t('common.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingDisputes.map((dispute) => (
                <TableRow 
                  key={dispute.id}
                  className={selectedDispute === dispute.id ? 'bg-muted/50' : ''}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{dispute.incident?.reference_id}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {dispute.incident?.title}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {dispute.contractor?.company_name || '-'}
                    </div>
                  </TableCell>
                  <TableCell>{dispute.submitted_by_profile?.full_name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(dispute.submitted_at), 'PP', { locale: dateLocale })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={selectedDispute === dispute.id ? 'default' : 'outline'}
                      onClick={() => setSelectedDispute(dispute.id)}
                    >
                      {t('common.review', 'Review')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Panel */}
      {currentDispute && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('workflow.arbitration.reviewDispute', 'Review Dispute')}
              </CardTitle>
              <Badge variant="outline">
                {currentDispute.incident?.reference_id}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('workflow.arbitration.disputeType', 'Dispute Type')}</Label>
                <p className="font-medium capitalize">{currentDispute.dispute_type?.replace('_', ' ')}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('workflow.arbitration.contractor', 'Contractor')}</Label>
                <p className="font-medium">{currentDispute.contractor?.company_name || '-'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">{t('workflow.arbitration.reason', 'Dispute Reason')}</Label>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">{currentDispute.dispute_reason}</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label>{t('workflow.arbitration.decision', 'Your Decision')}</Label>
              <RadioGroup
                value={decision || ''}
                onValueChange={(v) => setDecision(v as ContractorDisputeStatus)}
                className="space-y-3"
              >
                {DISPUTE_STATUS_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <div
                      key={option.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        decision === option.value
                          ? 'border-orange-400 bg-orange-100/50 dark:bg-orange-900/20'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => setDecision(option.value)}
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${option.color}`} />
                          <Label htmlFor={option.value} className="font-medium cursor-pointer">
                            {isRTL ? option.labelAr : option.labelEn}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isRTL ? option.descAr : option.descEn}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="decision-notes">
                {t('workflow.arbitration.decisionNotes', 'Decision Notes')}
                <span className="text-destructive ms-1">*</span>
              </Label>
              <Textarea
                id="decision-notes"
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder={t('workflow.arbitration.notesPlaceholder', 'Explain your decision and any conditions...')}
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDispute(null);
                  setDecision(null);
                  setDecisionNotes("");
                }}
                className="flex-1"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!decision || !decisionNotes.trim() || isPending}
                className="flex-1"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                    {t('common.processing', 'Processing...')}
                  </>
                ) : (
                  t('workflow.arbitration.submit', 'Submit Decision')
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
