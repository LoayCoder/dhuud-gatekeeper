import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { useSecurityBlacklist, useAddToBlacklist, useRemoveFromBlacklist } from '@/hooks/use-security-blacklist';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const addSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  national_id: z.string().min(1, 'National ID is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

type AddFormValues = z.infer<typeof addSchema>;

export default function BlacklistManagement() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: blacklist, isLoading } = useSecurityBlacklist({ search: search || undefined });
  const addMutation = useAddToBlacklist();
  const removeMutation = useRemoveFromBlacklist();

  const form = useForm<AddFormValues>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      full_name: '',
      national_id: '',
      reason: '',
    },
  });

  const onSubmit = async (values: AddFormValues) => {
    await addMutation.mutateAsync(values);
    form.reset();
    setAddDialogOpen(false);
  };

  const handleRemove = async () => {
    if (!deleteId) return;
    await removeMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            {t('visitors.blacklist.title')}
          </h1>
          <p className="text-muted-foreground">{t('visitors.blacklist.description')}</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Plus className="me-2 h-4 w-4" />
              {t('visitors.blacklist.add')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('visitors.blacklist.addTitle')}</DialogTitle>
              <DialogDescription>{t('visitors.blacklist.addDescription')}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('visitors.fields.name')} *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('visitors.placeholders.name')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="national_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('visitors.fields.nationalId')} *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('visitors.placeholders.nationalId')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('visitors.blacklist.reasonLabel')} *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder={t('visitors.blacklist.reasonPlaceholder')} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" variant="destructive" disabled={addMutation.isPending}>
                    {addMutation.isPending ? t('common.loading') : t('visitors.blacklist.add')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t('visitors.blacklist.allEntries')}</CardTitle>
              <CardDescription>{t('visitors.blacklist.allEntriesDescription')}</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('visitors.blacklist.searchPlaceholder')}
                className="ps-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
          ) : blacklist?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldAlert className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>{t('visitors.blacklist.noEntries')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('visitors.fields.name')}</TableHead>
                    <TableHead>{t('visitors.fields.nationalId')}</TableHead>
                    <TableHead>{t('visitors.blacklist.reasonLabel')}</TableHead>
                    <TableHead>{t('visitors.blacklist.listedAt')}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blacklist?.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.full_name}</TableCell>
                      <TableCell>{entry.national_id}</TableCell>
                      <TableCell className="max-w-xs truncate">{entry.reason}</TableCell>
                      <TableCell>
                        {entry.listed_at ? format(new Date(entry.listed_at), 'PP') : '-'}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setDeleteId(entry.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('visitors.blacklist.removeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('visitors.blacklist.removeDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>
              {removeMutation.isPending ? t('common.loading') : t('visitors.blacklist.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
