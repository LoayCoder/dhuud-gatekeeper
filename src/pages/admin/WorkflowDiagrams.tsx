import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { GitBranch, Sparkles } from 'lucide-react';
import {
  allWorkflows,
  getWorkflowsByCategory,
  WorkflowDefinition,
  WorkflowCategory,
} from '@/lib/workflow-definitions';
import { generateWorkflowPDF, generateBulkWorkflowPDFs } from '@/lib/generate-workflow-pdf';
import {
  WorkflowCanvas,
  WorkflowLiveStatus,
  WorkflowCategoryTabs,
  WorkflowList,
  WorkflowExportOptions,
} from '@/components/workflow-diagrams';

export default function WorkflowDiagrams() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const { toast } = useToast();
  const isRtl = i18n.dir() === 'rtl';
  const direction = i18n.dir();

  const [selectedCategory, setSelectedCategory] = useState<WorkflowCategory>('hsse_events');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(allWorkflows[0]);
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Export options
  const [includeActors, setIncludeActors] = useState(true);
  const [includeDescription, setIncludeDescription] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  // Get workflows for selected category
  const categoryWorkflows = useMemo(
    () => getWorkflowsByCategory(selectedCategory),
    [selectedCategory]
  );

  const handleExportSingle = useCallback(async () => {
    if (!selectedWorkflow || !profile?.tenant_id) return;

    setIsExporting(true);
    try {
      await generateWorkflowPDF({
        workflow: selectedWorkflow,
        tenantId: profile.tenant_id,
        language: isRtl ? 'ar' : 'en',
        includeActors,
        includeDescription,
        showLegend,
      });
      toast({
        title: t('workflowDiagrams.success', 'Export Complete'),
        description: isRtl ? selectedWorkflow.nameAr : selectedWorkflow.name,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: t('common.error', 'Error'),
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [selectedWorkflow, profile?.tenant_id, isRtl, includeActors, includeDescription, showLegend, toast, t]);

  const handleExportSelected = useCallback(async () => {
    if (selectedForExport.size === 0 || !profile?.tenant_id) return;

    const workflows = allWorkflows.filter(w => selectedForExport.has(w.id));
    setIsExporting(true);
    try {
      await generateBulkWorkflowPDFs(
        workflows,
        profile.tenant_id,
        isRtl ? 'ar' : 'en'
      );
      toast({
        title: t('workflowDiagrams.success', 'Export Complete'),
        description: `${workflows.length} ${t('workflowDiagrams.workflows', 'workflows')}`,
      });
    } catch (error) {
      console.error('Bulk export failed:', error);
      toast({
        title: t('common.error', 'Error'),
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [selectedForExport, profile?.tenant_id, isRtl, toast, t]);

  const toggleWorkflowSelection = useCallback((workflowId: string) => {
    setSelectedForExport(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workflowId)) {
        newSet.delete(workflowId);
      } else {
        newSet.add(workflowId);
      }
      return newSet;
    });
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    console.log('Node clicked:', nodeId);
    // Future: Open node details or highlight step
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{t('workflowDiagrams.title', 'Workflow Diagrams')}</h1>
          </div>
          <p className="text-muted-foreground">
            {t('workflowDiagrams.subtitle', 'Interactive process visualization with real-time status')}
          </p>
        </div>
        
        {/* Compact Live Status */}
        <WorkflowLiveStatus compact className="sm:ms-auto" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Workflow Selection */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Category Tabs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {t('workflowDiagrams.selectWorkflow', 'Select Workflow')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <WorkflowCategoryTabs
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              />

              <WorkflowList
                workflows={categoryWorkflows}
                selectedWorkflow={selectedWorkflow}
                selectedForExport={selectedForExport}
                onSelectWorkflow={setSelectedWorkflow}
                onToggleExport={toggleWorkflowSelection}
              />

              <WorkflowExportOptions
                includeActors={includeActors}
                setIncludeActors={setIncludeActors}
                includeDescription={includeDescription}
                setIncludeDescription={setIncludeDescription}
                showLegend={showLegend}
                setShowLegend={setShowLegend}
                onExportSingle={handleExportSingle}
                onExportSelected={handleExportSelected}
                selectedCount={selectedForExport.size}
                hasSelectedWorkflow={!!selectedWorkflow}
                isExporting={isExporting}
              />
            </CardContent>
          </Card>

          {/* Live Status Panel (Desktop) */}
          <div className="hidden lg:block">
            <WorkflowLiveStatus workflowKey={selectedWorkflow?.id} />
          </div>
        </div>

        {/* Main Content: Interactive Canvas */}
        <Card className="lg:col-span-8 xl:col-span-9">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {t('workflowDiagrams.preview', 'Workflow Preview')}
                </CardTitle>
                {selectedWorkflow && (
                  <CardDescription className="mt-1">
                    {isRtl ? selectedWorkflow.nameAr : selectedWorkflow.name}
                  </CardDescription>
                )}
              </div>
              {selectedWorkflow && (
                <Badge variant="secondary" className="gap-1">
                  <GitBranch className="h-3 w-3" />
                  {selectedWorkflow.steps.length} {t('workflowDiagrams.steps', 'steps')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px] lg:h-[600px]">
              <WorkflowCanvas
                workflow={selectedWorkflow}
                includeActors={includeActors}
                showLegend={showLegend}
                onNodeClick={handleNodeClick}
                className="h-full rounded-b-lg"
              />
            </div>

            {/* Description Panel */}
            {selectedWorkflow && includeDescription && (
              <>
                <Separator />
                <div className="p-4 bg-muted/30">
                  <h4 className="font-medium text-sm mb-2">
                    {t('workflowDiagrams.description', 'Description')}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {isRtl ? selectedWorkflow.descriptionAr : selectedWorkflow.description}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile Live Status */}
      <div className="lg:hidden">
        <WorkflowLiveStatus workflowKey={selectedWorkflow?.id} />
      </div>
    </div>
  );
}
