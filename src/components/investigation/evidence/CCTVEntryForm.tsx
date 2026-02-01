import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Video } from 'lucide-react';
import type { CCTVCamera } from '@/hooks/use-evidence-items';

interface CCTVEntryFormProps {
  cameras: CCTVCamera[];
  onChange: (cameras: CCTVCamera[]) => void;
  maxCameras?: number;
}

const emptyCamera: CCTVCamera = {
  camera_id: '',
  location: '',
  date: '',
  start_time: '',
  end_time: '',
};

export function CCTVEntryForm({ cameras, onChange, maxCameras = 3 }: CCTVEntryFormProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const addCamera = () => {
    if (cameras.length < maxCameras) {
      onChange([...cameras, { ...emptyCamera }]);
    }
  };

  const removeCamera = (index: number) => {
    const updated = cameras.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateCamera = (index: number, field: keyof CCTVCamera, value: string) => {
    const updated = cameras.map((cam, i) => 
      i === index ? { ...cam, [field]: value } : cam
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4" dir={direction}>
      {cameras.length === 0 && (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
          <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t('investigation.evidence.cctv.noCameras', 'No cameras added yet')}</p>
        </div>
      )}

      {cameras.map((camera, index) => (
        <Card key={index}>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Video className="h-4 w-4" />
                {t('investigation.evidence.cctv.camera', 'Camera')} {index + 1}
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => removeCamera(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`camera-id-${index}`}>
                  {t('investigation.evidence.cctv.cameraId', 'Camera ID')} *
                </Label>
                <Input
                  id={`camera-id-${index}`}
                  value={camera.camera_id}
                  onChange={(e) => updateCamera(index, 'camera_id', e.target.value)}
                  placeholder={t('investigation.evidence.cctv.cameraIdPlaceholder', 'e.g., CAM-001')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`location-${index}`}>
                  {t('investigation.evidence.cctv.location', 'Location')} *
                </Label>
                <Input
                  id={`location-${index}`}
                  value={camera.location}
                  onChange={(e) => updateCamera(index, 'location', e.target.value)}
                  placeholder={t('investigation.evidence.cctv.locationPlaceholder', 'e.g., Main Entrance')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`date-${index}`}>
                  {t('investigation.evidence.cctv.date', 'Date')} *
                </Label>
                <Input
                  id={`date-${index}`}
                  type="date"
                  value={camera.date}
                  onChange={(e) => updateCamera(index, 'date', e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor={`start-time-${index}`}>
                    {t('investigation.evidence.cctv.startTime', 'Start Time')} *
                  </Label>
                  <Input
                    id={`start-time-${index}`}
                    type="time"
                    value={camera.start_time}
                    onChange={(e) => updateCamera(index, 'start_time', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`end-time-${index}`}>
                    {t('investigation.evidence.cctv.endTime', 'End Time')} *
                  </Label>
                  <Input
                    id={`end-time-${index}`}
                    type="time"
                    value={camera.end_time}
                    onChange={(e) => updateCamera(index, 'end_time', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {cameras.length < maxCameras && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={addCamera}
        >
          <Plus className="h-4 w-4 me-2" />
          {t('investigation.evidence.cctv.addCamera', 'Add Camera')} ({cameras.length}/{maxCameras})
        </Button>
      )}
    </div>
  );
}
