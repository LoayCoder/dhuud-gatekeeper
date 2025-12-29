import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
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
import { useCreateEventCategory } from '@/hooks/use-active-event-categories';

export default function AddCategoryDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [icon, setIcon] = useState('');
  const [sortOrder, setSortOrder] = useState(100);

  const createCategory = useCreateEventCategory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim() || !nameEn.trim()) {
      toast.error(t('settings.eventCategories.crud.validationError'));
      return;
    }

    try {
      await createCategory.mutateAsync({
        code: code.trim().toLowerCase().replace(/\s+/g, '_'),
        name_key: `hsse.categories.custom.${code.trim().toLowerCase().replace(/\s+/g, '_')}`,
        icon: icon.trim() || undefined,
        sort_order: sortOrder,
      });
      
      toast.success(t('settings.eventCategories.crud.categoryCreated'));
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const resetForm = () => {
    setCode('');
    setNameEn('');
    setIcon('');
    setSortOrder(100);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          {t('settings.eventCategories.crud.addCategory')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('settings.eventCategories.crud.addCategory')}</DialogTitle>
            <DialogDescription>
              {t('settings.eventCategories.crud.addCategoryDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">{t('settings.eventCategories.crud.code')}</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., custom_category"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="nameEn">{t('settings.eventCategories.crud.nameEn')}</Label>
              <Input
                id="nameEn"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Category Name (English)"
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
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createCategory.isPending}>
              {createCategory.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
