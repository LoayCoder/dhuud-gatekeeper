import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { useRequestExtension } from '@/features/incidents/hooks/use-action-extensions';
import type { ActionForDialog } from './types';

interface ExtensionRequestDialogProps {
  action: ActionForDialog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExtensionRequestDialog({ action, open, onOpenChange }: ExtensionRequestDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [requestedDate, setRequestedDate] = useState('');
  const [reason, setReason] = useState('');
  const requestExtension = useRequestExtension();

  const handleSubmit = async () => {
    if (!action?.due_date || !requestedDate || !reason.trim()) return;
    await requestExtension.mutateAsync({
      actionId: action.id,
      currentDueDate: action.due_date,
      requestedDueDate: requestedDate,
      reason: reason.trim(),
    });
    resetAndClose();
  };

  const resetAndClose = () => {
    setRequestedDate('');
    setReason('');
    onOpenChange(false);
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); else onOpenChange(o); }}>
      <DialogContent dir={direction} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            {t('actions.requestExtension', 'Request Extension')}
          </DialogTitle>
          <DialogDescription>{action.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current due date */}
          <div className="space-y-1">
            <Label>{t('actions.currentDueDate', 'Current Due Date')}</Label>
            <p className="text-sm font-medium">
              {action.due_date ? new Date(action.due_date).toLocaleDateString(i18n.language) : '—'}
            </p>
          </div>

          {/* Requested new date */}
          <div className="space-y-2">
            <Label htmlFor="ext-date">{t('actions.requestedDueDate', 'Requested New Due Date')} *</Label>
            <Input
              id="ext-date"
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="ext-reason">{t('actions.extensionReason', 'Reason for Extension')} *</Label>
            <Textarea
              id="ext-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('actions.explainExtensionNeed', 'Explain why an extension is needed...')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={requestExtension.isPending}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={requestExtension.isPending || !requestedDate || !reason.trim()}
          >
            {requestExtension.isPending && <Loader2 className="h-4 w-4 me-1 animate-spin" />}
            {t('actions.submitRequest', 'Submit Request')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
