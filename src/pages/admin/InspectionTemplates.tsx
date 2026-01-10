import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Edit, Trash2, ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useInspectionTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useBulkUpdateTemplateStatus,
  useBulkDeleteTemplates,
  InspectionTemplate,
} from '@/hooks/use-inspections';
import { InspectionTemplateForm, TemplateItemBuilder } from '@/components/inspections';
import { TemplateBulkActionsToolbar } from '@/components/admin/TemplateBulkActionsToolbar';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';

export default function InspectionTemplates() {
  const { t } = useTranslation();
  const direction = i18n.dir();
  
  const { data: templates, isLoading } = useInspectionTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const bulkUpdateStatus = useBulkUpdateTemplateStatus();
  const bulkDelete = useBulkDeleteTemplates();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InspectionTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  
  const filteredTemplates = templates?.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.code.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Selection helpers
  const allSelected = (filteredTemplates?.length ?? 0) > 0 && selectedIds.size === filteredTemplates?.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < (filteredTemplates?.length || 0);
  
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTemplates?.map((t) => t.id)));
    }
  };
  
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };
  
  const clearSelection = () => setSelectedIds(new Set());
  
  const handleCreate = async (data: any) => {
    await createTemplate.mutateAsync(data);
    setFormOpen(false);
  };
  
  const handleUpdate = async (data: any) => {
    if (editingTemplate) {
      await updateTemplate.mutateAsync({ id: editingTemplate.id, ...data });
      setEditingTemplate(null);
    }
  };
  
  const handleDelete = async () => {
    if (deletingId) {
      await deleteTemplate.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };
  
  // Bulk action handlers
  const handleBulkActivate = async () => {
    await bulkUpdateStatus.mutateAsync({ ids: Array.from(selectedIds), is_active: true });
    clearSelection();
  };
  
  const handleBulkDeactivate = async () => {
    await bulkUpdateStatus.mutateAsync({ ids: Array.from(selectedIds), is_active: false });
    clearSelection();
  };
  
  const handleBulkDelete = async () => {
    await bulkDelete.mutateAsync(Array.from(selectedIds));
    clearSelection();
    setBulkDeleteDialogOpen(false);
  };
  
  const getTemplateName = (template: InspectionTemplate) => 
    direction === 'rtl' && template.name_ar ? template.name_ar : template.name;
  
  const getCategoryName = (template: InspectionTemplate) => {
    if (!template.category?.name) return null;
    return direction === 'rtl' && template.category.name_ar
      ? template.category.name_ar
      : template.category.name;
  };
  
  const getTypeName = (template: InspectionTemplate) => {
    if (!template.type?.name) return null;
    return direction === 'rtl' && template.type.name_ar
      ? template.type.name_ar
      : template.type.name;
  };
  
  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 space-y-4 sm:space-y-6 pb-24 sm:pb-6" dir={direction}>
      {/* Responsive Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t('inspections.templates')}</h1>
          <p className="text-sm text-muted-foreground">{t('inspections.templatesDescription')}</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto min-h-[44px]">
          <Plus className="h-4 w-4 me-2" />
          {t('inspections.createTemplate')}
        </Button>
      </div>
      
      {/* Bulk Actions Toolbar - Desktop (sticky top) */}
      {selectedIds.size > 0 && (
        <div className="hidden sm:block sticky top-0 z-10">
          <TemplateBulkActionsToolbar
            selectedCount={selectedIds.size}
            onClearSelection={clearSelection}
            onActivate={handleBulkActivate}
            onDeactivate={handleBulkDeactivate}
            onDelete={() => setBulkDeleteDialogOpen(true)}
          />
        </div>
      )}
      
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            {/* Select All Checkbox */}
            {filteredTemplates && filteredTemplates.length > 0 && (
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label={t('common.selectAll')}
                className={cn(
                  "h-5 w-5",
                  someSelected && "data-[state=checked]:bg-primary/50"
                )}
                data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
              />
            )}
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9 min-h-[44px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredTemplates?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t('inspections.noTemplates')}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredTemplates?.map((template) => (
                <Collapsible
                  key={template.id}
                  open={expandedId === template.id}
                  onOpenChange={(open) => setExpandedId(open ? template.id : null)}
                >
                  <div 
                    className={cn(
                      "border-2 rounded-xl transition-all",
                      selectedIds.has(template.id) 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    )}
                  >
                    {/* Mobile Card Layout */}
                    <div className="flex items-start gap-3 p-4 sm:hidden">
                      <Checkbox
                        checked={selectedIds.has(template.id)}
                        onCheckedChange={() => toggleSelect(template.id)}
                        aria-label={t('common.select')}
                        className="mt-1 h-5 w-5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-base truncate">
                              {getTemplateName(template)}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{template.code}</Badge>
                              <Badge variant="secondary" className="text-xs">v{template.version}</Badge>
                              {!template.is_active && (
                                <Badge variant="destructive" className="text-xs">{t('common.inactive')}</Badge>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] shrink-0">
                                <MoreVertical className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                                <Edit className="h-4 w-4 me-2" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeletingId(template.id)} 
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 me-2" />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {getCategoryName(template)}
                          {getTypeName(template) && ` → ${getTypeName(template)}`}
                        </p>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="mt-2 min-h-[44px] w-full justify-start">
                            {expandedId === template.id ? (
                              <>
                                <ChevronUp className="h-4 w-4 me-2" />
                                {t('common.collapse')}
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 me-2" />
                                {t('inspections.viewItems')}
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                    
                    {/* Desktop Row Layout */}
                    <div className="hidden sm:flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedIds.has(template.id)}
                          onCheckedChange={() => toggleSelect(template.id)}
                          aria-label={t('common.select')}
                          className="h-5 w-5"
                        />
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9">
                            {expandedId === template.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {getTemplateName(template)}
                            </span>
                            <Badge variant="outline">{template.code}</Badge>
                            {!template.is_active && (
                              <Badge variant="secondary">{t('common.inactive')}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getCategoryName(template)}
                            {getTypeName(template) && (
                              <span className="ms-2">→ {getTypeName(template)}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">v{template.version}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTemplate(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingId(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <CollapsibleContent>
                      <div className="border-t p-4">
                        <TemplateItemBuilder templateId={template.id} />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Fixed Bottom Toolbar for Mobile (PWA Pattern) */}
      {selectedIds.size > 0 && (
        <div className="sm:hidden fixed bottom-0 start-0 end-0 p-4 bg-background border-t z-50 safe-area-pb">
          <TemplateBulkActionsToolbar
            selectedCount={selectedIds.size}
            onClearSelection={clearSelection}
            onActivate={handleBulkActivate}
            onDeactivate={handleBulkDeactivate}
            onDelete={() => setBulkDeleteDialogOpen(true)}
          />
        </div>
      )}
      
      {/* Create/Edit Form */}
      <InspectionTemplateForm
        open={formOpen || !!editingTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false);
            setEditingTemplate(null);
          }
        }}
        template={editingTemplate}
        onSubmit={editingTemplate ? handleUpdate : handleCreate}
        isLoading={createTemplate.isPending || updateTemplate.isPending}
      />
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inspections.deleteTemplateConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inspections.bulkDeleteConfirm', { count: selectedIds.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
              disabled={bulkDelete.isPending}
            >
              {t('common.delete')} ({selectedIds.size})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
