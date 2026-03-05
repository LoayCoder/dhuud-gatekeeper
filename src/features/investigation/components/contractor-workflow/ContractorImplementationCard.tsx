import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Wrench, Upload, CheckCircle, FileImage, X } from 'lucide-react';
import { useContractorCompleteAction } from '@/features/contractors/hooks/use-contractor-observation-workflow';

interface CorrectiveAction {
  id: string;
  title: string;
  status: string;
  due_date?: string;
}

interface ContractorImplementationCardProps {
  incidentId: string;
  status: string;
  actions: CorrectiveAction[];
}

export function ContractorImplementationCard({
  incidentId,
  status,
  actions
}: ContractorImplementationCardProps) {
  const { t } = useTranslation();
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  
  const { mutate: completeAction, isPending } = useContractorCompleteAction();

  const isImplementationStage = status === 'pending_contractor_implementation' || 
                                 status === 'pending_implementation_evidence';

  if (!isImplementationStage) return null;

  const pendingActions = actions.filter(a => 
    a.status === 'open' || a.status === 'in_progress'
  );
  const completedActions = actions.filter(a => 
    a.status === 'completed' || a.status === 'verified'
  );
  const progress = actions.length > 0 
    ? (completedActions.length / actions.length) * 100 
    : 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setEvidenceFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    if (!selectedAction) return;
    
    // In real implementation, upload files first and get URLs
    const evidenceUrls = evidenceFiles.map(f => URL.createObjectURL(f));
    
    completeAction({
      actionId: selectedAction,
      notes: notes.trim() || undefined,
      evidence: evidenceUrls.length > 0 ? evidenceUrls : undefined
    }, {
      onSuccess: () => {
        setSelectedAction(null);
        setNotes('');
        setEvidenceFiles([]);
      }
    });
  };

  return (
    <Card className="border-warning/20 bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wrench className="h-5 w-5 text-warning" />
          {t('workflow.implementation', 'Action Implementation')}
          <Badge variant="outline" className="ms-auto">
            {completedActions.length}/{actions.length} {t('workflow.completed', 'Completed')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">{t('workflow.progress', 'Progress')}</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('workflow.pendingActions', 'Pending Actions')}
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {pendingActions.map(action => (
              <div
                key={action.id}
                onClick={() => setSelectedAction(action.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedAction === action.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{action.title}</span>
                  <Badge variant={action.status === 'in_progress' ? 'secondary' : 'outline'}>
                    {action.status}
                  </Badge>
                </div>
                {action.due_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('workflow.dueDate', 'Due')}: {new Date(action.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
            {pendingActions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('workflow.allActionsCompleted', 'All actions have been completed')}
              </p>
            )}
          </div>
        </div>

        {selectedAction && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('workflow.implementationNotes', 'Implementation Notes')}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('workflow.implementationNotesPlaceholder', 'Describe the actions taken...')}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('workflow.uploadEvidence', 'Upload Evidence')}
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => document.getElementById('evidence-upload')?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {t('workflow.selectFiles', 'Select Files')}
                </Button>
                <input
                  id="evidence-upload"
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

            <Button
              onClick={handleComplete}
              disabled={isPending}
              className="w-full gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {t('workflow.markComplete', 'Mark as Complete')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
