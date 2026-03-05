import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import {
  useSpecialEvents,
  useCreateSpecialEvent,
  useUpdateSpecialEvent,
  useDeleteSpecialEvent,
  SpecialEvent,
  SpecialEventFormData,
} from '@/hooks/use-special-events';

type EventStatus = 'active' | 'upcoming' | 'archived';

function getEventStatus(event: SpecialEvent): EventStatus {
  const now = new Date();
  const startAt = parseISO(event.start_at);
  const endAt = parseISO(event.end_at);
  
  if (!event.is_active || isAfter(now, endAt)) {
    return 'archived';
  }
  if (isBefore(now, startAt)) {
    return 'upcoming';
  }
  return 'active';
}

function StatusBadge({ status }: { status: EventStatus }) {
  const { t } = useTranslation();
  
  const variants: Record<EventStatus, { variant: 'default' | 'secondary' | 'outline'; className: string }> = {
    active: { variant: 'default', className: 'bg-green-500 hover:bg-green-600' },
    upcoming: { variant: 'secondary', className: 'bg-yellow-500 hover:bg-yellow-600 text-primary-foreground' },
    archived: { variant: 'outline', className: '' },
  };
  
  return (
    <Badge variant={variants[status].variant} className={variants[status].className}>
      {t(`specialEvents.status${status.charAt(0).toUpperCase() + status.slice(1)}`)}
    </Badge>
  );
}

export function MajorEventsTab() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const { data: events = [], isLoading } = useSpecialEvents();
  const createEvent = useCreateSpecialEvent();
  const updateEvent = useUpdateSpecialEvent();
  const deleteEvent = useDeleteSpecialEvent();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SpecialEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<SpecialEventFormData>({
    name: '',
    description: '',
    start_at: '',
    end_at: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      start_at: '',
      end_at: '',
      is_active: true,
    });
    setFormErrors({});
    setEditingEvent(null);
  };
  
  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };
  
  const openEditDialog = (event: SpecialEvent) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      description: event.description || '',
      start_at: event.start_at.slice(0, 16), // Format for datetime-local input
      end_at: event.end_at.slice(0, 16),
      is_active: event.is_active,
    });
    setFormErrors({});
    setDialogOpen(true);
  };
  
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = t('specialEvents.validation.nameRequired');
    }
    if (!formData.start_at) {
      errors.start_at = t('specialEvents.validation.startRequired');
    }
    if (!formData.end_at) {
      errors.end_at = t('specialEvents.validation.endRequired');
    }
    if (formData.start_at && formData.end_at) {
      if (new Date(formData.end_at) <= new Date(formData.start_at)) {
        errors.end_at = t('specialEvents.validation.endAfterStart');
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    const payload: SpecialEventFormData = {
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
      start_at: new Date(formData.start_at).toISOString(),
      end_at: new Date(formData.end_at).toISOString(),
      is_active: formData.is_active,
    };
    
    if (editingEvent) {
      await updateEvent.mutateAsync({ id: editingEvent.id, data: payload });
    } else {
      await createEvent.mutateAsync(payload);
    }
    
    setDialogOpen(false);
    resetForm();
  };
  
  const handleDelete = async () => {
    if (!eventToDelete) return;
    await deleteEvent.mutateAsync(eventToDelete);
    setDeleteDialogOpen(false);
    setEventToDelete(null);
  };
  
  const confirmDelete = (id: string) => {
    setEventToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{t('specialEvents.manageEvents')}</h3>
        </div>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="h-4 w-4 me-2" />
          {t('specialEvents.addEvent')}
        </Button>
      </div>
      
      {/* Events Table */}
      {events.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('specialEvents.noEvents')}</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('specialEvents.eventName')}</TableHead>
                <TableHead>{t('specialEvents.startDate')}</TableHead>
                <TableHead>{t('specialEvents.endDate')}</TableHead>
                <TableHead>{t('specialEvents.status')}</TableHead>
                <TableHead className="text-end">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const status = getEventStatus(event);
                return (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" />
                        {event.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(parseISO(event.start_at), 'PP')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(parseISO(event.end_at), 'PP')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(event)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(event.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir={direction}>
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? t('specialEvents.editEvent') : t('specialEvents.addEvent')}
            </DialogTitle>
            <DialogDescription>
              {t('specialEvents.eventDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Event Name */}
            <div className="space-y-2">
              <Label htmlFor="event-name">{t('specialEvents.eventName')} *</Label>
              <Input
                id="event-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('specialEvents.eventNamePlaceholder')}
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="event-description">{t('specialEvents.description')}</Label>
              <Textarea
                id="event-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('specialEvents.descriptionPlaceholder')}
                rows={3}
              />
            </div>
            
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">{t('specialEvents.startDate')} *</Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={formData.start_at}
                  onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                />
                {formErrors.start_at && (
                  <p className="text-sm text-destructive">{formErrors.start_at}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">{t('specialEvents.endDate')} *</Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={formData.end_at}
                  onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                />
                {formErrors.end_at && (
                  <p className="text-sm text-destructive">{formErrors.end_at}</p>
                )}
              </div>
            </div>
            
            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('specialEvents.activeToggle')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('specialEvents.activeToggleDescription')}
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createEvent.isPending || updateEvent.isPending}
            >
              {createEvent.isPending || updateEvent.isPending
                ? t('common.saving')
                : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('specialEvents.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('specialEvents.deleteConfirmDescription')}
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
    </div>
  );
}
