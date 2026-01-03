import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  FileText, 
  Loader2, 
  MessageSquare, 
  Mail,
  ToggleLeft,
  ToggleRight 
} from 'lucide-react';
import { TemplateEditor } from '@/components/admin/TemplateEditor';
import { TemplateTestConsole } from '@/components/admin/TemplateTestConsole';
import { TemplateBulkActionsToolbar } from '@/components/admin/TemplateBulkActionsToolbar';
import {
  useNotificationTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useBulkDeleteTemplates,
  useBulkUpdateTemplateStatus,
  NotificationTemplate,
  CreateTemplateInput,
} from '@/hooks/useNotificationTemplates';
import { cn } from '@/lib/utils';

export default function NotificationTemplates() {
  const { t } = useTranslation();
  const { data: templates = [], isLoading } = useNotificationTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const bulkDelete = useBulkDeleteTemplates();
  const bulkUpdateStatus = useBulkUpdateTemplateStatus();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Selection helpers
  const allSelected = useMemo(
    () => templates.length > 0 && selectedIds.size === templates.length,
    [templates.length, selectedIds.size]
  );

  const someSelected = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < templates.length,
    [templates.length, selectedIds.size]
  );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(templates.map((t) => t.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleCreate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleSave = (data: CreateTemplateInput) => {
    if (editingTemplate) {
      updateTemplate.mutate(
        { id: editingTemplate.id, ...data },
        { onSuccess: () => setEditorOpen(false) }
      );
    } else {
      createTemplate.mutate(data, { onSuccess: () => setEditorOpen(false) });
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteTemplate.mutate(deletingId, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setDeletingId(null);
        },
      });
    }
  };

  const handleToggleActive = (template: NotificationTemplate) => {
    updateTemplate.mutate({
      id: template.id,
      is_active: !template.is_active,
    });
  };

  // Bulk actions
  const handleBulkActivate = () => {
    bulkUpdateStatus.mutate(
      { ids: Array.from(selectedIds), is_active: true },
      { onSuccess: clearSelection }
    );
  };

  const handleBulkDeactivate = () => {
    bulkUpdateStatus.mutate(
      { ids: Array.from(selectedIds), is_active: false },
      { onSuccess: clearSelection }
    );
  };

  const confirmBulkDelete = () => {
    bulkDelete.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        setBulkDeleteDialogOpen(false);
        clearSelection();
      },
    });
  };

  const activeTemplates = templates.filter((t) => t.is_active);

  const getChannelBadge = (channelType: string) => {
    switch (channelType) {
      case 'whatsapp':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            WhatsApp
          </Badge>
        );
      case 'email':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            Email
          </Badge>
        );
      case 'both':
        return (
          <div className="flex gap-1">
            <Badge variant="secondary" className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
            </Badge>
          </div>
        );
      default:
        return <Badge variant="outline">{channelType}</Badge>;
    }
  };

  const getLanguageBadge = (lang: string) => {
    const langColors: Record<string, string> = {
      ar: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      en: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      ur: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      hi: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      fil: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      zh: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return (
      <Badge variant="outline" className={cn('uppercase font-mono', langColors[lang])}>
        {lang}
      </Badge>
    );
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('Notification Templates Generator')}</h1>
          <p className="text-muted-foreground">
            {t('Create and manage notification templates for WhatsApp and Email channels')}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 me-2" />
          {t('Create Template')}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Bulk actions toolbar */}
          <TemplateBulkActionsToolbar
            selectedCount={selectedIds.size}
            onClearSelection={clearSelection}
            onActivate={handleBulkActivate}
            onDeactivate={handleBulkDeactivate}
            onDelete={() => setBulkDeleteDialogOpen(true)}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('Templates')}
              </CardTitle>
              <CardDescription>
                {templates.length} {t('templates configured')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('No templates yet')}</p>
                  <Button variant="link" onClick={handleCreate}>
                    {t('Create your first template')}
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={allSelected}
                            // @ts-ignore - indeterminate is valid
                            indeterminate={someSelected}
                            onCheckedChange={toggleSelectAll}
                            aria-label={t('Select all')}
                          />
                        </TableHead>
                        <TableHead className="w-16 text-center">{t('templates.srNo')}</TableHead>
                        <TableHead>{t('Slug')}</TableHead>
                        <TableHead>{t('templates.language')}</TableHead>
                        <TableHead>{t('Channel')}</TableHead>
                        <TableHead>{t('Category')}</TableHead>
                        <TableHead>{t('templates.status')}</TableHead>
                        <TableHead className="w-16">{t('Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template, index) => (
                        <TableRow 
                          key={template.id}
                          className={cn(selectedIds.has(template.id) && 'bg-muted/50')}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(template.id)}
                              onCheckedChange={() => toggleSelect(template.id)}
                              aria-label={t('Select template')}
                            />
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground font-mono">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {template.slug}
                          </TableCell>
                          <TableCell>
                            {getLanguageBadge(template.language)}
                          </TableCell>
                          <TableCell>
                            {getChannelBadge(template.channel_type)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{template.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={template.is_active ? 'default' : 'secondary'}
                              className={cn(
                                template.is_active
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {template.is_active ? t('templates.active') : t('templates.inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(template)}>
                                  <Pencil className="h-4 w-4 me-2" />
                                  {t('Edit')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleActive(template)}>
                                  {template.is_active ? (
                                    <>
                                      <ToggleLeft className="h-4 w-4 me-2" />
                                      {t('templates.deactivate')}
                                    </>
                                  ) : (
                                    <>
                                      <ToggleRight className="h-4 w-4 me-2" />
                                      {t('templates.activate')}
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(template.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 me-2" />
                                  {t('Delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <TemplateTestConsole templates={activeTemplates} />
        </div>
      </div>

      <TemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        onSave={handleSave}
        isLoading={createTemplate.isPending || updateTemplate.isPending}
      />

      {/* Single delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete Template')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Are you sure you want to delete this template? This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {t('Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('templates.deleteMultiple')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('templates.deleteMultipleConfirm', { count: selectedIds.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {t('Delete')} ({selectedIds.size})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
