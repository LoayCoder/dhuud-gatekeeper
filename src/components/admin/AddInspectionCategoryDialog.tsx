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
import { Textarea } from '@/components/ui/textarea';
import { useCreateInspectionCategory } from '@/hooks/use-inspection-categories';

export default function AddInspectionCategoryDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [sortOrder, setSortOrder] = useState(100);

  const createCategory = useCreateInspectionCategory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim() || !name.trim()) {
      toast.error(t('common.requiredFields'));
      return;
    }

    try {
      await createCategory.mutateAsync({
        code: code.trim().toUpperCase().replace(/\s+/g, '-'),
        name: name.trim(),
        name_ar: nameAr.trim() || null,
        description: description.trim() || null,
        description_ar: descriptionAr.trim() || null,
        icon: icon.trim() || null,
        color: color || null,
        sort_order: sortOrder,
        is_active: true,
        tenant_id: null, // Will be set by the hook
      });
      
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const resetForm = () => {
    setCode('');
    setName('');
    setNameAr('');
    setDescription('');
    setDescriptionAr('');
    setIcon('');
    setColor('#3b82f6');
    setSortOrder(100);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          {t('settings.inspectionCategories.addCategory')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('settings.inspectionCategories.addCategory')}</DialogTitle>
            <DialogDescription>
              {t('settings.inspectionCategories.addCategoryDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code">{t('common.code')} *</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g., FIRE-SAFETY"
                  required
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
              <Label htmlFor="nameAr">{t('common.nameAr')}</Label>
              <Input
                id="nameAr"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="اسم الفئة (عربي)"
                dir="rtl"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{t('common.descriptionEn')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (English)"
                rows={2}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="descriptionAr">{t('common.descriptionAr')}</Label>
              <Textarea
                id="descriptionAr"
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                placeholder="الوصف (عربي)"
                dir="rtl"
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
            <Button type="submit" disabled={createCategory.isPending}>
              {createCategory.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
