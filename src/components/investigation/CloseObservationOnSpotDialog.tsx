import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, Camera, X, Info } from "lucide-react";
import { useCloseObservationOnSpot } from "@/hooks/use-close-observation";

interface CloseObservationOnSpotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentId: string;
  incidentTitle?: string;
}

const MAX_PHOTOS = 2;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function CloseObservationOnSpotDialog({
  open,
  onOpenChange,
  incidentId,
  incidentTitle,
}: CloseObservationOnSpotDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeMutation = useCloseObservationOnSpot();

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_FILE_SIZE) continue;
      newPhotos.push(file);
    }

    const combinedPhotos = [...photos, ...newPhotos].slice(0, MAX_PHOTOS);
    setPhotos(combinedPhotos);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleClose = async () => {
    if (!notes.trim()) return;

    await closeMutation.mutateAsync({
      incidentId,
      notes: notes.trim(),
      photos,
    });

    // Reset and close on success
    setNotes("");
    setPhotos([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={direction} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            {t('incidents.closedOnSpot.label', 'Closed on the Spot')}
          </DialogTitle>
          <DialogDescription>
            {incidentTitle ? (
              <span className="font-medium text-foreground block mt-1">{incidentTitle}</span>
            ) : null}
            <span className="block mt-1">
              {t('incidents.closedOnSpot.description', 'Mark this observation as immediately resolved. This will close the observation without further investigation.')}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-info/30 bg-info/5">
          <Info className="h-4 w-4 text-info" />
          <AlertDescription>
            {t('investigation.closedOnSpot.info', 'Ensure you provide clear details of the immediate action taken and attach photo evidence if available.')}
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-2">
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="closure-notes">
              {t('incidents.immediateActions', 'Immediate Actions Taken')} *
            </Label>
            <Textarea
              id="closure-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('incidents.immediateActionsPlaceholder', 'Describe what was done to resolve the issue...')}
              rows={4}
            />
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>{t('investigation.tabs.evidence', 'Evidence Photos')}</Label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-3 mb-2">
              {photos.length < MAX_PHOTOS && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  {t('incidents.closedOnSpot.addPhotos', 'Add Photos')}
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {photos.length}/{MAX_PHOTOS} {t('incidents.closedOnSpot.photosAdded', 'photos added')}
              </span>
            </div>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 end-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemovePhoto(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleClose}
            disabled={!notes.trim() || closeMutation.isPending}
            className="bg-success hover:bg-success/90 text-white"
          >
            {closeMutation.isPending ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 me-2" />
            )}
            {t('common.confirm', 'Confirm Closure')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
