import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateEventCategory, useDeleteEventCategory, type EventCategoryWithStatus } from '@/hooks/use-active-event-categories';

interface EditCategoryDialogProps {
  category: EventCategoryWithStatus;
}

export default function EditCategoryDialog({ category }: EditCategoryDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [nameKey, setNameKey] = useState(category.name_key);
  const [icon, setIcon] = useState(category.icon || '');
  const [sortOrder, setSortOrder] = useState(category.sort_order);

  const updateCategory = useUpdateEventCategory();
  const deleteCategory = useDeleteEventCategory();

  useEffect(() => {
    setNameKey(category.name_key);
    setIcon(category.icon || '');
    setSortOrder(category.sort_order);
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateCategory.mutateAsync({
        categoryId: category.id,
        data: {
          name_key: nameKey,
          icon: icon || undefined,
          sort_order: sortOrder,
        },
      });
      
      toast.success(t('settings.eventCategories.crud.categoryUpdated'));
      setOpen(false);
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCategory.mutateAsync(category.id);
      toast.success(t('settings.eventCategories.crud.categoryDeleted'));
      setOpen(false);
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('settings.eventCategories.crud.editCategory')}</DialogTitle>
            <DialogDescription>
              {t('settings.eventCategories.crud.editCategoryDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">{t('settings.eventCategories.crud.code')}</Label>
              <Input
                id="code"
                value={category.code}
                disabled
                className="bg-muted"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="nameKey">{t('settings.eventCategories.crud.nameKey')}</Label>
              <Input
                id="nameKey"
                value={nameKey}
                onChange={(e) => setNameKey(e.target.value)}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="icon">{t('settings.eventCategories.crud.icon')}</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="e.g., AlertTriangle"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="sortOrder">{t('settings.eventCategories.crud.sortOrder')}</Label>
              <Input
                id="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                min={1}
              />
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 me-1" />
                  {t('common.delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('settings.eventCategories.crud.deleteConfirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('settings.eventCategories.crud.deleteConfirmDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    {t('common.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateCategory.isPending}>
                {updateCategory.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
