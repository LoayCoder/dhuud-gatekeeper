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
import { useCreateEventSubtype } from '@/hooks/use-active-event-subtypes';

interface AddSubtypeDialogProps {
  categoryId: string;
  categoryName: string;
}

export default function AddSubtypeDialog({ categoryId, categoryName }: AddSubtypeDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [sortOrder, setSortOrder] = useState(100);

  const createSubtype = useCreateEventSubtype();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim() || !nameEn.trim()) {
      toast.error(t('settings.eventCategories.crud.validationError'));
      return;
    }

    try {
      await createSubtype.mutateAsync({
        category_id: categoryId,
        code: code.trim().toLowerCase().replace(/\s+/g, '_'),
        name_key: `hsse.subtypes.custom.${code.trim().toLowerCase().replace(/\s+/g, '_')}`,
        name_ar: nameAr.trim() || undefined,
        sort_order: sortOrder,
      });
      
      toast.success(t('settings.eventCategories.crud.subtypeCreated'));
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const resetForm = () => {
    setCode('');
    setNameEn('');
    setNameAr('');
    setSortOrder(100);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
          <Plus className="h-3 w-3" />
          {t('settings.eventCategories.crud.addSubtype')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('settings.eventCategories.crud.addSubtype')}</DialogTitle>
            <DialogDescription>
              {t('settings.eventCategories.crud.addSubtypeDescription', { category: categoryName })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">{t('settings.eventCategories.crud.code')}</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., custom_subtype"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="nameEn">{t('settings.eventCategories.crud.nameEn')}</Label>
              <Input
                id="nameEn"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Subtype Name (English)"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="nameAr">{t('settings.eventCategories.crud.nameAr')}</Label>
              <Input
                id="nameAr"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="اسم النوع الفرعي (عربي)"
                dir="rtl"
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
            <Button type="submit" disabled={createSubtype.isPending}>
              {createSubtype.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
