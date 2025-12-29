import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const SEEN_VERSION_KEY = 'app-whats-new-seen';

interface WhatsNewDialogProps {
  version: string;
  releaseNotes: string[];
  onClose?: () => void;
}

export function WhatsNewDialog({ version, releaseNotes, onClose }: WhatsNewDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seenVersion = localStorage.getItem(SEEN_VERSION_KEY);
    
    // Show dialog if this version hasn't been seen yet
    if (version && version !== seenVersion && releaseNotes.length > 0) {
      // Small delay to let the app settle
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [version, releaseNotes]);

  const handleClose = () => {
    localStorage.setItem(SEEN_VERSION_KEY, version);
    setOpen(false);
    onClose?.();
  };

  if (!version || releaseNotes.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('pwa.whatsNew')}
          </DialogTitle>
          <DialogDescription>
            {t('pwa.version')} {version}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[300px] pe-4">
          <ul className="space-y-3">
            {releaseNotes.map((note, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground">{note}</span>
              </li>
            ))}
          </ul>
        </ScrollArea>
        
        <div className="flex justify-end pt-4">
          <Button onClick={handleClose}>
            {t('actions.close', 'Got it')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
