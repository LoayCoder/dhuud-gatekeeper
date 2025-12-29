import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateInspectionCategory, type InspectionTemplateCategory } from '@/hooks/use-inspection-categories';

interface EditInspectionCategoryDialogProps {
  category: InspectionTemplateCategory;
}

export default function EditInspectionCategoryDialog({ category }: EditInspectionCategoryDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || '');
  const [icon, setIcon] = useState(category.icon || '');
  const [color, setColor] = useState(category.color || '#3b82f6');
  const [sortOrder, setSortOrder] = useState(category.sort_order);

  const updateCategory = useUpdateInspectionCategory();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(category.name);
      setDescription(category.description || '');
      setIcon(category.icon || '');
      setColor(category.color || '#3b82f6');
      setSortOrder(category.sort_order);
    }
  }, [open, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t('common.requiredFields'));
      return;
    }

    try {
      await updateCategory.mutateAsync({
        id: category.id,
        name: name.trim(),
        name_ar: category.name_ar || null, // Preserve existing value
        description: description.trim() || null,
        description_ar: category.description_ar || null, // Preserve existing value
        icon: icon.trim() || null,
        color: color || null,
        sort_order: sortOrder,
      });
      
      setOpen(false);
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('settings.inspectionCategories.editCategory')}</DialogTitle>
            <DialogDescription>
              {t('settings.inspectionCategories.editCategoryDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('common.code')}</Label>
                <Input
                  value={category.code}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sortOrder">{t('common.sortOrder')}</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  min={1}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="name">{t('common.nameEn')} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category Name (English)"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">{t('common.description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('common.descriptionPlaceholder', 'Description')}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="icon">{t('common.icon')}</Label>
                <Input
                  id="icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="e.g., Flame, Shield"
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.inspectionCategories.iconHelp')}
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="color">{t('common.color')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateCategory.isPending}>
              {updateCategory.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
