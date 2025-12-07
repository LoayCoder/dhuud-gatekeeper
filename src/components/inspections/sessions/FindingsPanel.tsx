import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  XCircle,
  AlertCircle,
  Eye,
  Lightbulb,
  Loader2,
  Pencil,
  CheckCircle,
  Link2,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  useAreaFindings,
  useUpdateAreaFinding,
  useCloseAreaFinding,
  type AreaFinding,
} from '@/hooks/use-area-findings';

interface FindingsPanelProps {
  sessionId: string;
  isLocked: boolean;
}

const CLASSIFICATION_CONFIG: Record<string, { icon: typeof AlertTriangle; color: string; bgColor: string }> = {
  critical_nc: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  major_nc: { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  minor_nc: { icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  observation: { icon: Eye, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  ofi: { icon: Lightbulb, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
};

const RISK_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

export function FindingsPanel({ sessionId, isLocked }: FindingsPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingFinding, setEditingFinding] = useState<AreaFinding | null>(null);
  const [editForm, setEditForm] = useState({
    classification: '' as AreaFinding['classification'],
    risk_level: '' as AreaFinding['risk_level'],
    recommendation: '',
  });
  
  const { data: findings = [], isLoading } = useAreaFindings(sessionId);
  const updateFinding = useUpdateAreaFinding();
  const closeFinding = useCloseAreaFinding();
  
  // Filter findings by status
  const filteredFindings = statusFilter === 'all'
    ? findings
    : findings.filter(f => f.status === statusFilter);
  
  const openEditDialog = (finding: AreaFinding) => {
    setEditingFinding(finding);
    setEditForm({
      classification: finding.classification,
      risk_level: finding.risk_level,
      recommendation: finding.recommendation || '',
    });
  };
  
  const handleSaveEdit = async () => {
    if (!editingFinding) return;
    
    await updateFinding.mutateAsync({
      findingId: editingFinding.id,
      sessionId,
      classification: editForm.classification,
      risk_level: editForm.risk_level,
      recommendation: editForm.recommendation || undefined,
    });
    
    setEditingFinding(null);
  };
  
  const handleCloseFinding = async (findingId: string) => {
    await closeFinding.mutateAsync({ findingId, sessionId });
  };
  
  // Get question text from finding
  const getQuestionText = (finding: AreaFinding) => {
    const item = finding.response?.template_item;
    if (!item) return finding.description || t('inspections.findings.noDescription');
    return i18n.language === 'ar' && item.question_ar ? item.question_ar : item.question;
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  const openCount = findings.filter(f => f.status === 'open').length;
  const actionCount = findings.filter(f => f.status === 'action_assigned').length;
  const closedCount = findings.filter(f => f.status === 'closed').length;
  
  return (
    <>
      <Card dir={direction}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('inspections.findings.title')}
              {findings.length > 0 && (
                <Badge variant="destructive">{findings.length}</Badge>
              )}
            </CardTitle>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir={direction}>
                <SelectItem value="all">{t('common.all')} ({findings.length})</SelectItem>
                <SelectItem value="open">{t('inspections.findings.statusOpen')} ({openCount})</SelectItem>
                <SelectItem value="action_assigned">{t('inspections.findings.statusActionAssigned')} ({actionCount})</SelectItem>
                <SelectItem value="closed">{t('inspections.findings.statusClosed')} ({closedCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {filteredFindings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {findings.length === 0 
                ? t('inspections.findings.noFindings')
                : t('inspections.findings.noMatchingFindings')
              }
            </p>
          ) : (
            filteredFindings.map((finding) => {
              const config = CLASSIFICATION_CONFIG[finding.classification] || CLASSIFICATION_CONFIG.observation;
              const Icon = config.icon;
              
              return (
                <div
                  key={finding.id}
                  className={cn(
                    'p-4 rounded-lg border',
                    config.bgColor
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', config.color)} />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm text-muted-foreground">
                            {finding.reference_id}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {t(`inspections.findings.classification.${finding.classification}`)}
                          </Badge>
                          <Badge 
                            variant="secondary" 
                            className={cn('text-xs text-white', RISK_COLORS[finding.risk_level])}
                          >
                            {t(`inspections.findings.riskLevel.${finding.risk_level}`)}
                          </Badge>
                          {finding.status === 'closed' && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              <CheckCircle className="h-3 w-3 me-1" />
                              {t('inspections.findings.statusClosed')}
                            </Badge>
                          )}
                          {finding.status === 'action_assigned' && (
                            <Badge variant="default" className="text-xs bg-blue-600">
                              <Link2 className="h-3 w-3 me-1" />
                              {t('inspections.findings.statusActionAssigned')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{getQuestionText(finding)}</p>
                        
                        {finding.recommendation && (
                          <p className="text-sm text-muted-foreground italic">
                            {t('inspections.findings.recommendation')}: {finding.recommendation}
                          </p>
                        )}
                        
                        {/* Linked Action */}
                        {finding.corrective_action && (
                          <div className="flex items-center gap-2 pt-2">
                            <Link2 className="h-4 w-4 text-muted-foreground" />
                            <Link 
                              to={`/incidents/my-actions?actionId=${finding.corrective_action.id}`}
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              {finding.corrective_action.title}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                            <Badge variant="outline" className="text-xs">
                              {finding.corrective_action.status}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    {!isLocked && finding.status !== 'closed' && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(finding)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {finding.corrective_action?.status === 'verified' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCloseFinding(finding.id)}
                            disabled={closeFinding.isPending}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={!!editingFinding} onOpenChange={() => setEditingFinding(null)}>
        <DialogContent dir={direction}>
          <DialogHeader>
            <DialogTitle>{t('inspections.findings.editFinding')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Classification */}
            <div className="space-y-2">
              <Label>{t('inspections.findings.classification')}</Label>
              <Select 
                value={editForm.classification} 
                onValueChange={(v) => setEditForm(prev => ({ ...prev, classification: v as AreaFinding['classification'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir={direction}>
                  <SelectItem value="observation">{t('inspections.findings.classification.observation')}</SelectItem>
                  <SelectItem value="ofi">{t('inspections.findings.classification.ofi')}</SelectItem>
                  <SelectItem value="minor_nc">{t('inspections.findings.classification.minor_nc')}</SelectItem>
                  <SelectItem value="major_nc">{t('inspections.findings.classification.major_nc')}</SelectItem>
                  <SelectItem value="critical_nc">{t('inspections.findings.classification.critical_nc')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Risk Level */}
            <div className="space-y-2">
              <Label>{t('inspections.findings.riskLevel')}</Label>
              <Select 
                value={editForm.risk_level} 
                onValueChange={(v) => setEditForm(prev => ({ ...prev, risk_level: v as AreaFinding['risk_level'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir={direction}>
                  <SelectItem value="low">{t('inspections.findings.riskLevel.low')}</SelectItem>
                  <SelectItem value="medium">{t('inspections.findings.riskLevel.medium')}</SelectItem>
                  <SelectItem value="high">{t('inspections.findings.riskLevel.high')}</SelectItem>
                  <SelectItem value="critical">{t('inspections.findings.riskLevel.critical')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Recommendation */}
            <div className="space-y-2">
              <Label>{t('inspections.findings.recommendation')}</Label>
              <Textarea
                value={editForm.recommendation}
                onChange={(e) => setEditForm(prev => ({ ...prev, recommendation: e.target.value }))}
                placeholder={t('inspections.findings.recommendationPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFinding(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateFinding.isPending}>
              {updateFinding.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
