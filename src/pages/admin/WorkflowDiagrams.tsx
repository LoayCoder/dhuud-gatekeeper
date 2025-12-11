import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Download, FileDown, Eye, Loader2 } from 'lucide-react';
import {
  allWorkflows,
  workflowCategories,
  getWorkflowsByCategory,
  WorkflowDefinition,
  WorkflowCategory,
} from '@/lib/workflow-definitions';
import { renderWorkflowSVG, getSVGDataUrl } from '@/lib/render-workflow-svg';
import { generateWorkflowPDF, generateBulkWorkflowPDFs } from '@/lib/generate-workflow-pdf';

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

  // Generate SVG preview
  const svgPreview = useMemo(() => {
    if (!selectedWorkflow) return null;
    return renderWorkflowSVG(selectedWorkflow, {
      isRtl,
      includeActors,
      showLegend,
    });
  }, [selectedWorkflow, isRtl, includeActors, showLegend]);

  const handleExportSingle = async () => {
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
        title: t('workflowDiagrams.success'),
        description: isRtl ? selectedWorkflow.nameAr : selectedWorkflow.name,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSelected = async () => {
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
        title: t('workflowDiagrams.success'),
        description: `${workflows.length} ${t('workflowDiagrams.workflows')}`,
      });
    } catch (error) {
      console.error('Bulk export failed:', error);
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleWorkflowSelection = (workflowId: string) => {
    const newSet = new Set(selectedForExport);
    if (newSet.has(workflowId)) {
      newSet.delete(workflowId);
    } else {
      newSet.add(workflowId);
    }
    setSelectedForExport(newSet);
  };

  return (
    <div className="container mx-auto py-6 space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{t('workflowDiagrams.title')}</h1>
        <p className="text-muted-foreground">{t('workflowDiagrams.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Workflow Selection */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('workflowDiagrams.selectWorkflow')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs
              value={selectedCategory}
              onValueChange={(v) => setSelectedCategory(v as WorkflowCategory)}
              dir={direction}
            >
              <TabsList className="w-full grid grid-cols-2 mx-4 mb-2" style={{ width: 'calc(100% - 2rem)' }}>
                {workflowCategories.slice(0, 2).map((cat) => (
                  <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                    {isRtl ? cat.nameAr : cat.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsList className="w-full grid grid-cols-2 mx-4 mb-4" style={{ width: 'calc(100% - 2rem)' }}>
                {workflowCategories.slice(2).map((cat) => (
                  <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                    {isRtl ? cat.nameAr : cat.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {workflowCategories.map((cat) => (
                <TabsContent key={cat.id} value={cat.id} className="mt-0">
                  <ScrollArea className="h-[300px]">
                    <div className="px-4 pb-4 space-y-2">
                      {getWorkflowsByCategory(cat.id).map((workflow) => (
                        <div
                          key={workflow.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedWorkflow?.id === workflow.id
                              ? 'bg-primary/10 border border-primary/30'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => setSelectedWorkflow(workflow)}
                        >
                          <Checkbox
                            checked={selectedForExport.has(workflow.id)}
                            onCheckedChange={() => toggleWorkflowSelection(workflow.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {isRtl ? workflow.nameAr : workflow.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {workflow.steps.length} {t('workflowDiagrams.steps')}
                            </p>
                          </div>
                          {selectedWorkflow?.id === workflow.id && (
                            <Eye className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>

            <Separator />

            {/* Export Options */}
            <div className="p-4 space-y-4">
              <h4 className="font-medium text-sm">{t('workflowDiagrams.exportOptions')}</h4>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="includeActors"
                    checked={includeActors}
                    onCheckedChange={(c) => setIncludeActors(!!c)}
                  />
                  <Label htmlFor="includeActors" className="text-sm">
                    {t('workflowDiagrams.includeActors')}
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="includeDescription"
                    checked={includeDescription}
                    onCheckedChange={(c) => setIncludeDescription(!!c)}
                  />
                  <Label htmlFor="includeDescription" className="text-sm">
                    {t('workflowDiagrams.includeDescription')}
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showLegend"
                    checked={showLegend}
                    onCheckedChange={(c) => setShowLegend(!!c)}
                  />
                  <Label htmlFor="showLegend" className="text-sm">
                    {t('workflowDiagrams.showLegend')}
                  </Label>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={handleExportSingle}
                  disabled={!selectedWorkflow || isExporting}
                  className="w-full"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 me-2" />
                  )}
                  {t('workflowDiagrams.exportPdf')}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleExportSelected}
                  disabled={selectedForExport.size === 0 || isExporting}
                  className="w-full"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4 me-2" />
                  )}
                  {t('workflowDiagrams.exportSelected')} ({selectedForExport.size})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel: Preview */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t('workflowDiagrams.preview')}</CardTitle>
                {selectedWorkflow && (
                  <CardDescription>
                    {isRtl ? selectedWorkflow.nameAr : selectedWorkflow.name}
                  </CardDescription>
                )}
              </div>
              {selectedWorkflow && (
                <Badge variant="secondary">
                  {selectedWorkflow.steps.length} {t('workflowDiagrams.steps')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedWorkflow && svgPreview ? (
              <div className="bg-muted/30 rounded-lg p-4 overflow-auto max-h-[600px]">
                <div
                  className="bg-white rounded shadow-sm mx-auto"
                  style={{ minWidth: 'fit-content' }}
                  dangerouslySetInnerHTML={{ __html: svgPreview }}
                />
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                {t('workflowDiagrams.selectToPreview')}
              </div>
            )}

            {selectedWorkflow && includeDescription && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">{t('workflowDiagrams.description')}</h4>
                <p className="text-sm text-muted-foreground">
                  {isRtl ? selectedWorkflow.descriptionAr : selectedWorkflow.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
