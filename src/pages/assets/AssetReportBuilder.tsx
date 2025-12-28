import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  FileDown, 
  Eye, 
  Columns3, 
  Filter as FilterIcon,
  GripVertical,
  Plus,
  Trash2,
  Settings2,
  FileText,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Json } from '@/integrations/supabase/types';

// Available columns for report
const AVAILABLE_COLUMNS = [
  { id: 'asset_code', label: 'Asset Code', category: 'identification' },
  { id: 'name', label: 'Asset Name', category: 'identification' },
  { id: 'serial_number', label: 'Serial Number', category: 'identification' },
  { id: 'description', label: 'Description', category: 'identification' },
  { id: 'category', label: 'Category', category: 'classification' },
  { id: 'type', label: 'Type', category: 'classification' },
  { id: 'subtype', label: 'Subtype', category: 'classification' },
  { id: 'status', label: 'Status', category: 'status' },
  { id: 'condition_rating', label: 'Condition', category: 'status' },
  { id: 'criticality_level', label: 'Criticality', category: 'status' },
  { id: 'branch', label: 'Branch', category: 'location' },
  { id: 'site', label: 'Site', category: 'location' },
  { id: 'building', label: 'Building', category: 'location' },
  { id: 'floor_zone', label: 'Floor/Zone', category: 'location' },
  { id: 'gps_lat', label: 'GPS Latitude', category: 'location' },
  { id: 'gps_lng', label: 'GPS Longitude', category: 'location' },
  { id: 'manufacturer', label: 'Manufacturer', category: 'details' },
  { id: 'model', label: 'Model', category: 'details' },
  { id: 'purchase_price', label: 'Purchase Price', category: 'financial' },
  { id: 'current_book_value', label: 'Current Value', category: 'financial' },
  { id: 'salvage_value', label: 'Salvage Value', category: 'financial' },
  { id: 'currency', label: 'Currency', category: 'financial' },
  { id: 'installation_date', label: 'Installation Date', category: 'dates' },
  { id: 'warranty_expiry', label: 'Warranty Expiry', category: 'dates' },
  { id: 'next_inspection_due', label: 'Next Inspection', category: 'dates' },
  { id: 'created_at', label: 'Created Date', category: 'dates' },
];

const COLUMN_CATEGORIES = [
  { id: 'identification', label: 'Identification' },
  { id: 'classification', label: 'Classification' },
  { id: 'status', label: 'Status' },
  { id: 'location', label: 'Location' },
  { id: 'details', label: 'Details' },
  { id: 'financial', label: 'Financial' },
  { id: 'dates', label: 'Dates' },
];

interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'is_null' | 'not_null';
  value: string;
}

interface ReportTemplate {
  id?: string;
  name: string;
  columns: string[];
  filters: ReportFilter[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export default function AssetReportBuilder() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const direction = i18n.dir();

  const [templateName, setTemplateName] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'asset_code', 'name', 'category', 'status', 'site'
  ]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [sortBy, setSortBy] = useState<string>('asset_code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch saved templates
  const { data: savedTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ['report-templates', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from('saved_report_templates')
        .select('id, name, columns, filters, sorting, created_at')
        .eq('tenant_id', profile.tenant_id)
        .eq('entity_type', 'asset')
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: ReportTemplate) => {
      if (!profile?.tenant_id) throw new Error('No tenant');
      
      const { data, error } = await supabase
        .from('saved_report_templates')
        .insert({
          tenant_id: profile.tenant_id,
          created_by: profile.id || null,
          name: template.name,
          entity_type: 'asset',
          columns: template.columns as unknown as Json,
          filters: template.filters as unknown as Json,
          sorting: { field: template.sortBy, order: template.sortOrder } as unknown as Json,
        })
        .select('id')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast.success(t('assets.reports.templateSaved', 'Report template saved'));
      setSaveDialogOpen(false);
      setTemplateName('');
    },
    onError: () => {
      toast.error(t('assets.reports.templateSaveError', 'Failed to save template'));
    },
  });

  // Define template type for loaded templates
  type SavedTemplate = NonNullable<typeof savedTemplates>[number];

  // Load template
  const loadTemplate = (template: SavedTemplate) => {
    if (!template) return;
    setSelectedColumns((template.columns as unknown as string[]) || []);
    setFilters((template.filters as unknown as ReportFilter[]) || []);
    const sorting = template.sorting as unknown as { field?: string; order?: 'asc' | 'desc' } | null;
    setSortBy(sorting?.field || 'asset_code');
    setSortOrder(sorting?.order || 'asc');
    toast.success(t('assets.reports.templateLoaded', 'Template loaded'));
  };

  // Toggle column selection
  const toggleColumn = (columnId: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnId)
        ? prev.filter(c => c !== columnId)
        : [...prev, columnId]
    );
  };

  // Add filter
  const addFilter = () => {
    setFilters(prev => [...prev, { field: 'status', operator: 'eq', value: '' }]);
  };

  // Update filter
  const updateFilter = (index: number, updates: Partial<ReportFilter>) => {
    setFilters(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  // Remove filter
  const removeFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  };

  // Save template
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error(t('assets.reports.nameRequired', 'Please enter a template name'));
      return;
    }
    
    saveTemplateMutation.mutate({
      name: templateName,
      columns: selectedColumns,
      filters,
      sortBy,
      sortOrder,
    });
  };

  // Export report (placeholder - would generate actual report)
  const handleExport = async (format: 'excel' | 'pdf') => {
    setIsExporting(true);
    try {
      // TODO: Implement actual export logic using the selected columns and filters
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(t('assets.reports.exportSuccess', `Report exported as ${format.toUpperCase()}`));
    } catch {
      toast.error(t('assets.reports.exportError', 'Failed to export report'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/assets/reports')}>
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t('assets.reports.builder', 'Report Builder')}
            </h1>
            <p className="text-muted-foreground">
              {t('assets.reports.builderDescription', 'Create custom asset reports')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Save className="h-4 w-4" />
                {t('assets.reports.saveTemplate', 'Save Template')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('assets.reports.saveTemplate', 'Save Template')}</DialogTitle>
                <DialogDescription>
                  {t('assets.reports.saveTemplateDescription', 'Save this configuration as a reusable template')}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="templateName">{t('assets.reports.templateName', 'Template Name')}</Label>
                <Input
                  id="templateName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={t('assets.reports.templateNamePlaceholder', 'e.g., Monthly Asset Summary')}
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSaveTemplate} disabled={saveTemplateMutation.isPending}>
                  {saveTemplateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                  ) : (
                    <Save className="h-4 w-4 me-2" />
                  )}
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" className="gap-2" onClick={() => handleExport('excel')} disabled={isExporting}>
            <FileDown className="h-4 w-4" />
            Excel
          </Button>
          <Button className="gap-2" onClick={() => handleExport('pdf')} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Panel - Column & Filter Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="columns" dir={direction}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="columns" className="gap-2">
                <Columns3 className="h-4 w-4" />
                {t('assets.reports.columns', 'Columns')}
              </TabsTrigger>
              <TabsTrigger value="filters" className="gap-2">
                <FilterIcon className="h-4 w-4" />
                {t('assets.reports.filters', 'Filters')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="columns" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('assets.reports.selectColumns', 'Select Columns')}</CardTitle>
                  <CardDescription>
                    {t('assets.reports.selectColumnsDescription', 'Choose which fields to include in your report')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pe-4">
                    {COLUMN_CATEGORIES.map(category => (
                      <div key={category.id} className="mb-6">
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">
                          {t(`assets.reports.category.${category.id}`, category.label)}
                        </h4>
                        <div className="grid gap-2">
                          {AVAILABLE_COLUMNS
                            .filter(col => col.category === category.id)
                            .map(column => (
                              <div
                                key={column.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                                onClick={() => toggleColumn(column.id)}
                              >
                                <Checkbox
                                  checked={selectedColumns.includes(column.id)}
                                  onCheckedChange={() => toggleColumn(column.id)}
                                />
                                <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                                <span className="text-sm">
                                  {t(`assets.fields.${column.id}`, column.label)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="filters" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{t('assets.reports.configureFilters', 'Configure Filters')}</CardTitle>
                      <CardDescription>
                        {t('assets.reports.configureFiltersDescription', 'Add conditions to filter your report data')}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={addFilter} className="gap-2">
                      <Plus className="h-4 w-4" />
                      {t('assets.reports.addFilter', 'Add Filter')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {filters.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FilterIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{t('assets.reports.noFilters', 'No filters added yet')}</p>
                      <Button variant="link" onClick={addFilter}>
                        {t('assets.reports.addFirstFilter', 'Add your first filter')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filters.map((filter, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                          <Select
                            value={filter.field}
                            onValueChange={(value) => updateFilter(index, { field: value })}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AVAILABLE_COLUMNS.map(col => (
                                <SelectItem key={col.id} value={col.id}>
                                  {t(`assets.fields.${col.id}`, col.label)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={filter.operator}
                            onValueChange={(value) => updateFilter(index, { operator: value as ReportFilter['operator'] })}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="eq">{t('assets.reports.operators.eq', 'Equals')}</SelectItem>
                              <SelectItem value="neq">{t('assets.reports.operators.neq', 'Not equals')}</SelectItem>
                              <SelectItem value="contains">{t('assets.reports.operators.contains', 'Contains')}</SelectItem>
                              <SelectItem value="gt">{t('assets.reports.operators.gt', 'Greater than')}</SelectItem>
                              <SelectItem value="lt">{t('assets.reports.operators.lt', 'Less than')}</SelectItem>
                              <SelectItem value="is_null">{t('assets.reports.operators.isNull', 'Is empty')}</SelectItem>
                              <SelectItem value="not_null">{t('assets.reports.operators.notNull', 'Is not empty')}</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {!['is_null', 'not_null'].includes(filter.operator) && (
                            <Input
                              value={filter.value}
                              onChange={(e) => updateFilter(index, { value: e.target.value })}
                              placeholder={t('assets.reports.filterValue', 'Value')}
                              className="flex-1"
                            />
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFilter(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Separator className="my-4" />

                  {/* Sort Options */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-sm">{t('assets.reports.sortBy', 'Sort By')}</Label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedColumns.map(colId => {
                            const col = AVAILABLE_COLUMNS.find(c => c.id === colId);
                            return col ? (
                              <SelectItem key={col.id} value={col.id}>
                                {t(`assets.fields.${col.id}`, col.label)}
                              </SelectItem>
                            ) : null;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm">{t('assets.reports.sortOrder', 'Order')}</Label>
                      <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">{t('assets.reports.ascending', 'Ascending')}</SelectItem>
                          <SelectItem value="desc">{t('assets.reports.descending', 'Descending')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Templates & Preview */}
        <div className="space-y-6">
          {/* Saved Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                {t('assets.reports.savedTemplates', 'Saved Templates')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : !savedTemplates || savedTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('assets.reports.noTemplates', 'No saved templates yet')}
                </p>
              ) : (
                <div className="space-y-2">
                  {savedTemplates.map(template => (
                    <Button
                      key={template.id}
                      variant="ghost"
                      className="w-full justify-start gap-2"
                      onClick={() => loadTemplate(template)}
                    >
                      <FileText className="h-4 w-4" />
                      {template.name}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {t('assets.reports.preview', 'Preview')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    {t('assets.reports.selectedColumns', 'Selected Columns')}
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedColumns.map(colId => {
                      const col = AVAILABLE_COLUMNS.find(c => c.id === colId);
                      return (
                        <Badge key={colId} variant="secondary" className="text-xs">
                          {col ? t(`assets.fields.${col.id}`, col.label) : colId}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-sm text-muted-foreground">
                    {t('assets.reports.activeFilters', 'Active Filters')}
                  </Label>
                  {filters.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('assets.reports.allRecords', 'All records (no filters)')}
                    </p>
                  ) : (
                    <div className="space-y-1 mt-2">
                      {filters.map((filter, i) => (
                        <Badge key={i} variant="outline" className="text-xs block w-fit">
                          {filter.field} {filter.operator} {filter.value || '(any)'}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
