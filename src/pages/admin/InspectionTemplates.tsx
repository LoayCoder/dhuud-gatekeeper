import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Edit, Trash2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  useInspectionTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  InspectionTemplate,
} from '@/hooks/use-inspections';
import { InspectionTemplateForm, TemplateItemBuilder } from '@/components/inspections';
import i18n from '@/i18n';

export default function InspectionTemplates() {
  const { t } = useTranslation();
  const direction = i18n.dir();
  
  const { data: templates, isLoading } = useInspectionTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InspectionTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const filteredTemplates = templates?.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.code.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
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
  
  return (
    <div className="container mx-auto py-6 space-y-6" dir={direction}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('inspections.templates')}</h1>
          <p className="text-muted-foreground">{t('inspections.templatesDescription')}</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 me-2" />
          {t('inspections.createTemplate')}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTemplates?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t('inspections.noTemplates')}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredTemplates?.map((template) => (
                <Collapsible
                  key={template.id}
                  open={expandedId === template.id}
                  onOpenChange={(open) => setExpandedId(open ? template.id : null)}
                >
                  <div className="border rounded-lg">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
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
                              {direction === 'rtl' && template.name_ar ? template.name_ar : template.name}
                            </span>
                            <Badge variant="outline">{template.code}</Badge>
                            {!template.is_active && (
                              <Badge variant="secondary">{t('common.inactive')}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {template.category?.name && (
                              <span>
                                {direction === 'rtl' && template.category.name_ar
                                  ? template.category.name_ar
                                  : template.category.name}
                              </span>
                            )}
                            {template.type?.name && (
                              <span className="ms-2">
                                → {direction === 'rtl' && template.type.name_ar
                                  ? template.type.name_ar
                                  : template.type.name}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">v{template.version}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingTemplate(template);
                          }}
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
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
