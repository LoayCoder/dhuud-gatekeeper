import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Trash2, ShieldAlert, Users, HardHat, Building2 } from 'lucide-react';
import { useSecurityBlacklist, useAddToBlacklist, useRemoveFromBlacklist } from '@/hooks/use-security-blacklist';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';

const addSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  national_id: z.string().min(1, 'National ID is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  entity_type: z.enum(['visitor', 'worker', 'contractor']).default('visitor'),
});

type AddFormValues = z.infer<typeof addSchema>;

export default function BlacklistManagement() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<string>('all');
  
  const { data: blacklist, isLoading } = useSecurityBlacklist({ search: search || undefined });
  const addMutation = useAddToBlacklist();
  const removeMutation = useRemoveFromBlacklist();

  const form = useForm<AddFormValues>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      full_name: '',
      national_id: '',
      reason: '',
      entity_type: 'visitor',
    },
  });

  const onSubmit = async (values: AddFormValues) => {
    await addMutation.mutateAsync({
      full_name: values.full_name,
      national_id: values.national_id,
      reason: values.reason,
    });
    form.reset();
    setAddDialogOpen(false);
  };

  const handleRemove = async () => {
    if (!deleteId) return;
    await removeMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  // Filter by entity type
  const filteredBlacklist = blacklist?.filter(entry => {
    if (entityFilter === 'all') return true;
    return (entry as { entity_type?: string }).entity_type === entityFilter;
  });

  const entityTypeBadge = (type?: string) => {
    const config = {
      visitor: { label: isRTL ? 'زائر' : 'Visitor', icon: Users, color: 'bg-blue-500/10 text-blue-600' },
      worker: { label: isRTL ? 'عامل' : 'Worker', icon: HardHat, color: 'bg-amber-500/10 text-amber-600' },
      contractor: { label: isRTL ? 'مقاول' : 'Contractor', icon: Building2, color: 'bg-purple-500/10 text-purple-600' },
    };
    const c = config[type as keyof typeof config] || config.visitor;
    return (
      <Badge variant="secondary" className={cn('gap-1', c.color)}>
        <c.icon className="h-3 w-3" />
        {c.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            {isRTL ? 'إدارة القائمة السوداء' : 'Blacklist Management'}
          </h1>
          <p className="text-muted-foreground">
            {isRTL ? 'إدارة الزوار والعمال والمقاولين المحظورين' : 'Manage blocked visitors, workers, and contractors'}
          </p>
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
                  name="entity_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? 'نوع الكيان' : 'Entity Type'} *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="visitor">{isRTL ? 'زائر' : 'Visitor'}</SelectItem>
                          <SelectItem value="worker">{isRTL ? 'عامل' : 'Worker'}</SelectItem>
                          <SelectItem value="contractor">{isRTL ? 'مقاول' : 'Contractor'}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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

      {/* Entity Type Filter Tabs */}
      <Tabs value={entityFilter} onValueChange={setEntityFilter}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            {isRTL ? 'الكل' : 'All'}
          </TabsTrigger>
          <TabsTrigger value="visitor" className="gap-2">
            <Users className="h-4 w-4" />
            {isRTL ? 'زوار' : 'Visitors'}
          </TabsTrigger>
          <TabsTrigger value="worker" className="gap-2">
            <HardHat className="h-4 w-4" />
            {isRTL ? 'عمال' : 'Workers'}
          </TabsTrigger>
          <TabsTrigger value="contractor" className="gap-2">
            <Building2 className="h-4 w-4" />
            {isRTL ? 'مقاولون' : 'Contractors'}
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
          ) : filteredBlacklist?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldAlert className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>{t('visitors.blacklist.noEntries')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? 'النوع' : 'Type'}</TableHead>
                    <TableHead>{t('visitors.fields.name')}</TableHead>
                    <TableHead>{t('visitors.fields.nationalId')}</TableHead>
                    <TableHead>{t('visitors.blacklist.reasonLabel')}</TableHead>
                    <TableHead>{t('visitors.blacklist.listedAt')}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBlacklist?.map((entry) => (
                    <TableRow key={entry.id} className="bg-destructive/5 hover:bg-destructive/10">
                      <TableCell>{entityTypeBadge((entry as { entity_type?: string }).entity_type)}</TableCell>
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
