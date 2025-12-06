import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X, CheckCircle2, Send, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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

export interface ImmediateActionData {
  description: string;
  photo?: File;
  is_closed: boolean;
  closed_by_reporter: boolean;
  hsse_action_required: boolean;
}

interface ImmediateActionSectionProps {
  value: string;
  onChange: (value: string) => void;
  onPhotoChange: (photo: File | null) => void;
  photo: File | null;
  direction: string;
}

export function ImmediateActionSection({ 
  value, 
  onChange, 
  onPhotoChange, 
  photo,
  direction 
}: ImmediateActionSectionProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return;
      }
      onPhotoChange(file);
    }
  };

  const handleRemovePhoto = () => {
    onPhotoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <FormItem>
      <FormLabel>{t('incidents.immediateActions')}</FormLabel>
      <FormControl>
        <div className="space-y-3">
          <Textarea
            placeholder={t('incidents.immediateActionsPlaceholder')}
            className="min-h-[100px]"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          
          {/* Photo Upload Section */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            
            {!photo ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                {t('incidents.immediateAction.addPhoto')}
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <Image className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate max-w-[200px]">{photo.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePhoto}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          {photo && (
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
              <img
                src={URL.createObjectURL(photo)}
                alt={t('incidents.immediateAction.photoPreview')}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </FormControl>
      <FormDescription>{t('incidents.immediateAction.description')}</FormDescription>
      <FormMessage />
    </FormItem>
  );
}

interface ImmediateActionStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionClosed: () => void;
  onSubmitToHSSE: () => void;
  direction: string;
}

export function ImmediateActionStatusDialog({
  open,
  onOpenChange,
  onActionClosed,
  onSubmitToHSSE,
  direction,
}: ImmediateActionStatusDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir={direction}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('incidents.immediateAction.confirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('incidents.immediateAction.confirmMessage')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onActionClosed}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            {t('incidents.immediateAction.actionClosed')}
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onSubmitToHSSE}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {t('incidents.immediateAction.submitToHSSE')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
