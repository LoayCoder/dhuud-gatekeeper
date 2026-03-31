import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, AlertTriangle, GripVertical, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import {
  useTemplateItems,
  useCreateTemplateItem,
  useUpdateTemplateItem,
  useDeleteTemplateItem,
} from '@/features/incidents/hooks/use-inspections/use-inspection-template-hooks';
import { templateItemSchema, type TemplateItemFormValues } from './TemplateItemBuilderSchema';

interface TemplateChecklistEditorProps {
  templateId: string;
}

const RESPONSE_TYPES = ['pass_fail', 'yes_no', 'rating', 'numeric', 'text'] as const;

export function TemplateChecklistEditor({ templateId }: TemplateChecklistEditorProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const { data: items, isLoading } = useTemplateItems(templateId);
  const createItem = useCreateTemplateItem();
  const updateItem = useUpdateTemplateItem();
  const deleteItem = useDeleteTemplateItem();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const form = useForm<TemplateItemFormValues>({
    resolver: zodResolver(templateItemSchema),
    defaultValues: {
      question: '',
      question_ar: '',
      response_type: 'pass_fail',
      min_value: '',
      max_value: '',
      rating_scale: '5',
      is_critical: false,
      is_required: true,
      instructions: '',
      instructions_ar: '',
    },
  });

  const responseType = form.watch('response_type');

  function openAddDialog() {
    setEditingItemId(null);
    form.reset({
      question: '',
      question_ar: '',
      response_type: 'pass_fail',
      min_value: '',
      max_value: '',
      rating_scale: '5',
      is_critical: false,
      is_required: true,
      instructions: '',
      instructions_ar: '',
    });
    setDialogOpen(true);
  }

  function openEditDialog(item: any) {
    setEditingItemId(item.id);
    form.reset({
      question: item.question ?? '',
      question_ar: item.question_ar ?? '',
      response_type: item.response_type ?? 'pass_fail',
      min_value: item.min_value != null ? String(item.min_value) : '',
      max_value: item.max_value != null ? String(item.max_value) : '',
      rating_scale: item.rating_scale != null ? String(item.rating_scale) : '5',
      is_critical: item.is_critical ?? false,
      is_required: item.is_required ?? true,
      instructions: item.instructions ?? '',
      instructions_ar: item.instructions_ar ?? '',
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: TemplateItemFormValues) {
    const payload = {
      template_id: templateId,
      question: values.question,
      question_ar: values.question_ar || undefined,
      response_type: values.response_type,
      min_value: values.min_value ? Number(values.min_value) : undefined,
      max_value: values.max_value ? Number(values.max_value) : undefined,
      rating_scale: values.rating_scale ? Number(values.rating_scale) : 5,
      is_critical: values.is_critical,
      is_required: values.is_required,
      instructions: values.instructions || undefined,
      instructions_ar: values.instructions_ar || undefined,
    };

    try {
      if (editingItemId) {
        await updateItem.mutateAsync({ id: editingItemId, ...payload });
        toast({ title: t('inspections.itemUpdated', 'Item updated successfully') });
      } else {
        const nextOrder = (items?.length ?? 0) + 1;
        await createItem.mutateAsync({ ...payload, sort_order: nextOrder });
        toast({ title: t('inspections.itemAdded', 'Item added successfully') });
      }
      setDialogOpen(false);
    } catch {
      // Error handled by hook
    }
  }

  async function handleDelete(itemId: string) {
    try {
      await deleteItem.mutateAsync({ id: itemId, template_id: templateId });
      toast({ title: t('inspections.itemDeleted', 'Item deleted successfully') });
    } catch {
      // Error handled by hook
    }
  }

  const responseTypeLabel = (type: string) =>
    t(`inspections.responseTypes.${type}`, type.replace('_', '/'));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            {t('inspections.items', 'Checklist Items')}
            {!isLoading && items && (
              <Badge variant="secondary" className="text-xs">
                {items.length}
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 me-1" />
            {t('inspections.addItem', 'Add Item')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {isLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {t('common.loading', 'Loading...')}
          </div>
        ) : !items?.length ? (
          <div className="py-6 text-center">
            <AlertTriangle className="h-5 w-5 text-warning mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">
              {t('inspections.noChecklistItems', 'No checklist items. Add items to define what inspectors will check.')}
            </p>
          </div>
        ) : (
          items.map((item: any, index: number) => (
            <div
              key={item.id}
              className="flex items-start gap-2 p-3 rounded-md border bg-card hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center text-muted-foreground mt-0.5 shrink-0">
                <GripVertical className="h-4 w-4" />
                <span className="text-xs w-5 text-center">{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium leading-tight">{item.question}</p>
                {item.question_ar && (
                  <p className="text-xs text-muted-foreground leading-tight" dir="rtl">
                    {item.question_ar}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {responseTypeLabel(item.response_type)}
                  </Badge>
                  {item.is_critical && (
                    <Badge variant="destructive" className="text-[10px]">
                      {t('inspections.critical', 'Critical')}
                    </Badge>
                  )}
                  {item.is_required && (
                    <Badge variant="secondary" className="text-[10px]">
                      {t('inspections.required', 'Required')}
                    </Badge>
                  )}
                  {item.response_type === 'numeric' && item.min_value != null && item.max_value != null && (
                    <Badge variant="outline" className="text-[10px]">
                      {item.min_value}–{item.max_value}
                    </Badge>
                  )}
                  {item.response_type === 'rating' && (
                    <Badge variant="outline" className="text-[10px]">
                      1–{item.rating_scale}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openEditDialog(item)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir={direction}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('common.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('inspections.deleteItemConfirm', 'Are you sure you want to delete this checklist item?')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(item.id)}>
                        {t('common.delete', 'Delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir={direction} className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItemId
                ? t('inspections.editChecklistItem', 'Edit Checklist Item')
                : t('inspections.addChecklistItem', 'Add Checklist Item')}
            </DialogTitle>
            <DialogDescription>
              {t('inspections.checklistItemDescription', 'Define a question for inspectors to answer during the inspection.')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Question EN */}
              <FormField
                control={form.control}
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.question', 'Question')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Question AR */}
              <FormField
                control={form.control}
                name="question_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.questionAr', 'Question (Arabic)')}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Response Type */}
              <FormField
                control={form.control}
                name="response_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.responseType', 'Response Type')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RESPONSE_TYPES.map((rt) => (
                          <SelectItem key={rt} value={rt}>
                            {responseTypeLabel(rt)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Numeric fields */}
              {responseType === 'numeric' && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="min_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('inspections.minValue', 'Min Value')}</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="max_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('inspections.maxValue', 'Max Value')}</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Rating scale */}
              {responseType === 'rating' && (
                <FormField
                  control={form.control}
                  name="rating_scale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inspections.ratingScale', 'Rating Scale')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={2} max={10} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Critical / Required toggles */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="is_critical"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="cursor-pointer !mt-0">
                        {t('inspections.critical', 'Critical')}
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_required"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="cursor-pointer !mt-0">
                        {t('inspections.required', 'Required')}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {/* Instructions EN */}
              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.instructions', 'Instructions')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Instructions AR */}
              <FormField
                control={form.control}
                name="instructions_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.instructionsAr', 'Instructions (Arabic)')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createItem.isPending || updateItem.isPending}
                >
                  {editingItemId
                    ? t('common.save', 'Save')
                    : t('inspections.addItem', 'Add Item')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
