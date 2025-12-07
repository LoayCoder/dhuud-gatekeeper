import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, GripVertical, Trash2, Edit, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  TemplateItem,
  useTemplateItems,
  useCreateTemplateItem,
  useUpdateTemplateItem,
  useDeleteTemplateItem,
} from '@/hooks/use-inspections';
import i18n from '@/i18n';

interface TemplateItemBuilderProps {
  templateId: string;
}

const RESPONSE_TYPES = [
  { value: 'pass_fail', label: 'inspections.responseTypes.pass_fail' },
  { value: 'yes_no', label: 'inspections.responseTypes.yes_no' },
  { value: 'rating', label: 'inspections.responseTypes.rating' },
  { value: 'numeric', label: 'inspections.responseTypes.numeric' },
  { value: 'text', label: 'inspections.responseTypes.text' },
];

export function TemplateItemBuilder({ templateId }: TemplateItemBuilderProps) {
  const { t } = useTranslation();
  const direction = i18n.dir();
  
  const { data: items, isLoading } = useTemplateItems(templateId);
  const createItem = useCreateTemplateItem();
  const updateItem = useUpdateTemplateItem();
  const deleteItem = useDeleteTemplateItem();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  
  // Form state for new/edit item
  const [formData, setFormData] = useState({
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
  
  const resetForm = () => {
    setFormData({
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
    setEditingItem(null);
  };
  
  const handleOpenAdd = () => {
    resetForm();
    setEditDialogOpen(true);
  };
  
  const handleOpenEdit = (item: TemplateItem) => {
    setEditingItem(item);
    setFormData({
      question: item.question,
      question_ar: item.question_ar || '',
      response_type: item.response_type,
      min_value: item.min_value?.toString() || '',
      max_value: item.max_value?.toString() || '',
      rating_scale: item.rating_scale?.toString() || '5',
      is_critical: item.is_critical,
      is_required: item.is_required,
      instructions: item.instructions || '',
      instructions_ar: item.instructions_ar || '',
    });
    setEditDialogOpen(true);
  };
  
  const handleSave = async () => {
    const data = {
      question: formData.question,
      question_ar: formData.question_ar || undefined,
      response_type: formData.response_type,
      min_value: formData.min_value ? parseFloat(formData.min_value) : undefined,
      max_value: formData.max_value ? parseFloat(formData.max_value) : undefined,
      rating_scale: parseInt(formData.rating_scale) || 5,
      is_critical: formData.is_critical,
      is_required: formData.is_required,
      instructions: formData.instructions || undefined,
      instructions_ar: formData.instructions_ar || undefined,
    };
    
    if (editingItem) {
      await updateItem.mutateAsync({
        id: editingItem.id,
        template_id: templateId,
        ...data,
      });
    } else {
      await createItem.mutateAsync({
        template_id: templateId,
        sort_order: (items?.length || 0) + 1,
        ...data,
      });
    }
    
    setEditDialogOpen(false);
    resetForm();
  };
  
  const handleDelete = async () => {
    if (deletingItemId) {
      await deleteItem.mutateAsync({ id: deletingItemId, template_id: templateId });
      setDeleteDialogOpen(false);
      setDeletingItemId(null);
    }
  };
  
  const getResponseTypeLabel = (type: string) => {
    const found = RESPONSE_TYPES.find(rt => rt.value === type);
    return found ? t(found.label) : type;
  };
  
  if (isLoading) {
    return <div className="p-4 text-muted-foreground">{t('common.loading')}</div>;
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{t('inspections.items')}</CardTitle>
        <Button size="sm" onClick={handleOpenAdd}>
          <Plus className="h-4 w-4 me-1" />
          {t('inspections.addItem')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {items?.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">
            {t('inspections.noItems')}
          </p>
        ) : (
          items?.map((item, index) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <GripVertical className="h-4 w-4" />
                <span className="text-sm font-medium">{index + 1}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <p className="font-medium text-sm">
                    {direction === 'rtl' && item.question_ar ? item.question_ar : item.question}
                  </p>
                  {item.is_critical && (
                    <Badge variant="destructive" className="shrink-0">
                      <AlertTriangle className="h-3 w-3 me-1" />
                      {t('inspections.critical')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Badge variant="outline">{getResponseTypeLabel(item.response_type)}</Badge>
                  {item.is_required && <Badge variant="secondary">{t('common.required')}</Badge>}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleOpenEdit(item)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    setDeletingItemId(item.id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
      
      {/* Edit/Add Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir={direction}>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? t('inspections.editItem') : t('inspections.addItem')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('inspections.question')} (EN)</Label>
                <Textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('inspections.question')} (AR)</Label>
                <Textarea
                  value={formData.question_ar}
                  onChange={(e) => setFormData({ ...formData, question_ar: e.target.value })}
                  rows={2}
                  dir="rtl"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{t('inspections.responseType')}</Label>
              <Select
                value={formData.response_type}
                onValueChange={(val) => setFormData({ ...formData, response_type: val })}
                dir={direction}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSE_TYPES.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>
                      {t(rt.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {formData.response_type === 'numeric' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('inspections.minValue')}</Label>
                  <Input
                    type="number"
                    value={formData.min_value}
                    onChange={(e) => setFormData({ ...formData, min_value: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('inspections.maxValue')}</Label>
                  <Input
                    type="number"
                    value={formData.max_value}
                    onChange={(e) => setFormData({ ...formData, max_value: e.target.value })}
                  />
                </div>
              </div>
            )}
            
            {formData.response_type === 'rating' && (
              <div className="space-y-2">
                <Label>{t('inspections.ratingScale')}</Label>
                <Select
                  value={formData.rating_scale}
                  onValueChange={(val) => setFormData({ ...formData, rating_scale: val })}
                  dir={direction}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">1-3</SelectItem>
                    <SelectItem value="5">1-5</SelectItem>
                    <SelectItem value="10">1-10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('inspections.instructions')} (EN)</Label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={2}
                  placeholder={t('inspections.instructionsPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('inspections.instructions')} (AR)</Label>
                <Textarea
                  value={formData.instructions_ar}
                  onChange={(e) => setFormData({ ...formData, instructions_ar: e.target.value })}
                  rows={2}
                  dir="rtl"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label>{t('inspections.critical')}</Label>
              <Switch
                checked={formData.is_critical}
                onCheckedChange={(val) => setFormData({ ...formData, is_critical: val })}
              />
            </div>
            
            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label>{t('common.required')}</Label>
              <Switch
                checked={formData.is_required}
                onCheckedChange={(val) => setFormData({ ...formData, is_required: val })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.question || createItem.isPending || updateItem.isPending}
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inspections.deleteItemConfirm')}
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
    </Card>
  );
}
