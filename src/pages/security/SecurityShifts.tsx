import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Plus, Clock, Pencil, Trash2, Sun, Moon, Sunset } from 'lucide-react';
import { useSecurityShifts, useCreateSecurityShift, useUpdateSecurityShift, useDeleteSecurityShift } from '@/features/security';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { securityShiftFormSchema, type SecurityShiftFormValues } from './SecurityShiftsSchema';

const defaultValues: SecurityShiftFormValues = {
  shift_name: '', shift_code: '', start_time: '08:00', end_time: '16:00',
  is_overnight: false, break_duration_minutes: 60, is_active: true,
};

export default function SecurityShifts() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<string | null>(null);

  const form = useForm<SecurityShiftFormValues>({
    resolver: zodResolver(securityShiftFormSchema),
    defaultValues,
  });

  const { data: shifts, isLoading } = useSecurityShifts();
  const createShift = useCreateSecurityShift();
  const updateShift = useUpdateSecurityShift();
  const deleteShift = useDeleteSecurityShift();

  const onSubmit = async (values: SecurityShiftFormValues) => {
    if (editingShift) {
      await updateShift.mutateAsync({ id: editingShift, ...values } as any);
    } else {
      await createShift.mutateAsync(values as any);
    }
    setDialogOpen(false);
    form.reset(defaultValues);
    setEditingShift(null);
  };

  const handleEdit = (shift: any) => {
    setEditingShift(shift.id);
    form.reset({
      shift_name: shift.shift_name || '', shift_code: shift.shift_code || '',
      start_time: shift.start_time, end_time: shift.end_time,
      is_overnight: shift.is_overnight || false, break_duration_minutes: shift.break_duration_minutes || 60,
      is_active: shift.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const getShiftIcon = (startTime: string) => {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour >= 6 && hour < 14) return <Sun className="h-4 w-4 text-yellow-500" />;
    if (hour >= 14 && hour < 22) return <Sunset className="h-4 w-4 text-orange-500" />;
    return <Moon className="h-4 w-4 text-blue-500" />;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('security.shifts.title', 'Security Shifts')}</h1>
          <p className="text-muted-foreground">{t('security.shifts.description', 'Manage shift schedules')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingShift(null); form.reset(defaultValues); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 me-2" />{t('security.shifts.addShift', 'Add Shift')}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingShift ? t('security.shifts.editShift', 'Edit Shift') : t('security.shifts.addShift', 'Add Shift')}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="shift_name" render={({ field }) => (
                    <FormItem><FormLabel>{t('security.shifts.shiftName', 'Name')}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="shift_code" render={({ field }) => (
                    <FormItem><FormLabel>{t('security.shifts.shiftCode', 'Code')}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="start_time" render={({ field }) => (
                    <FormItem><FormLabel>{t('security.shifts.startTime', 'Start')}</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="end_time" render={({ field }) => (
                    <FormItem><FormLabel>{t('security.shifts.endTime', 'End')}</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="flex items-center gap-6">
                  <FormField control={form.control} name="is_overnight" render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel>{t('security.shifts.isOvernight', 'Overnight')}</FormLabel>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="is_active" render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel>{t('common.active', 'Active')}</FormLabel>
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                  <Button type="submit" disabled={createShift.isPending || updateShift.isPending}>{editingShift ? t('common.save', 'Save') : t('common.create', 'Create')}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />{t('security.shifts.shiftSchedule', 'Shift Schedule')}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="animate-pulse space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted rounded" />)}</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('security.shifts.shift', 'Shift')}</TableHead>
                  <TableHead>{t('security.shifts.code', 'Code')}</TableHead>
                  <TableHead>{t('security.shifts.startTime', 'Start')}</TableHead>
                  <TableHead>{t('security.shifts.endTime', 'End')}</TableHead>
                  <TableHead>{t('common.status', 'Status')}</TableHead>
                  <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts?.map(shift => (
                  <TableRow key={shift.id} className={!shift.is_active ? 'opacity-60' : ''}>
                    <TableCell><div className="flex items-center gap-2">{getShiftIcon(shift.start_time)}<span className="font-medium">{shift.shift_name}</span></div></TableCell>
                    <TableCell className="text-muted-foreground">{shift.shift_code}</TableCell>
                    <TableCell>{formatTime(shift.start_time)}</TableCell>
                    <TableCell><div className="flex items-center gap-1">{formatTime(shift.end_time)}{shift.is_overnight && <Moon className="h-3 w-3 text-muted-foreground" />}</div></TableCell>
                    <TableCell><Badge variant={shift.is_active ? 'default' : 'secondary'}>{shift.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}</Badge></TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(shift)}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('security.shifts.deleteConfirm', 'Delete Shift?')}</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteShift.mutate(shift.id)} className="bg-destructive text-destructive-foreground">{t('common.delete', 'Delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && !shifts?.length && <div className="flex flex-col items-center py-12"><Clock className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">{t('security.shifts.noShifts', 'No shifts configured')}</p></div>}
        </CardContent>
      </Card>
    </div>
  );
}
