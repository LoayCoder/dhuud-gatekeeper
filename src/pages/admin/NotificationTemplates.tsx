import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Plus, MoreHorizontal, Pencil, Trash2, FileText, Loader2, MessageSquare, Mail } from 'lucide-react';
import { TemplateEditor } from '@/components/admin/TemplateEditor';
import { TemplateTestConsole } from '@/components/admin/TemplateTestConsole';
import {
  useNotificationTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  NotificationTemplate,
  CreateTemplateInput,
} from '@/hooks/useNotificationTemplates';

export default function NotificationTemplates() {
  const { t } = useTranslation();
  const { data: templates = [], isLoading } = useNotificationTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        <div className="lg:col-span-2">
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Slug')}</TableHead>
                      <TableHead>{t('Channel')}</TableHead>
                      <TableHead>{t('Category')}</TableHead>
                      <TableHead>{t('Variables')}</TableHead>
                      <TableHead>{t('Active')}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-mono text-sm">
                          {template.slug}
                        </TableCell>
                        <TableCell>
                          {getChannelBadge(template.channel_type)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{template.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(template.variable_keys || []).slice(0, 3).map((key, i) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {`{{${i + 1}}}`}={key}
                              </Badge>
                            ))}
                            {(template.variable_keys || []).length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.variable_keys.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={template.is_active}
                            onCheckedChange={() => handleToggleActive(template)}
                          />
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
    </div>
  );
}
