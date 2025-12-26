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
import { useUpdateEventSubtype, useDeleteEventSubtype, type EventSubtypeWithStatus } from '@/hooks/use-active-event-subtypes';

interface EditSubtypeDialogProps {
  subtype: EventSubtypeWithStatus;
}

export default function EditSubtypeDialog({ subtype }: EditSubtypeDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [nameKey, setNameKey] = useState(subtype.name_key);
  const [sortOrder, setSortOrder] = useState(subtype.sort_order);

  const updateSubtype = useUpdateEventSubtype();
  const deleteSubtype = useDeleteEventSubtype();

  useEffect(() => {
    setNameKey(subtype.name_key);
    setSortOrder(subtype.sort_order);
  }, [subtype]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateSubtype.mutateAsync({
        subtypeId: subtype.id,
        data: {
          name_key: nameKey,
          sort_order: sortOrder,
        },
      });
      
      toast.success(t('settings.eventCategories.crud.subtypeUpdated'));
      setOpen(false);
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSubtype.mutateAsync(subtype.id);
      toast.success(t('settings.eventCategories.crud.subtypeDeleted'));
      setOpen(false);
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('settings.eventCategories.crud.editSubtype')}</DialogTitle>
            <DialogDescription>
              {t('settings.eventCategories.crud.editSubtypeDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">{t('settings.eventCategories.crud.code')}</Label>
              <Input
                id="code"
                value={subtype.code}
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
                  <AlertDialogTitle>{t('settings.eventCategories.crud.deleteSubtypeConfirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('settings.eventCategories.crud.deleteSubtypeConfirmDescription')}
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
              <Button type="submit" disabled={updateSubtype.isPending}>
                {updateSubtype.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
