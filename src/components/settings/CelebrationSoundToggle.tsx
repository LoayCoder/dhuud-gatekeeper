import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Volume2, VolumeX } from 'lucide-react';
import { useCelebration } from '@/hooks/use-celebration';
import { initializeCelebrationAudio } from '@/lib/celebration-sounds';

export function CelebrationSoundToggle() {
  const { t } = useTranslation();
  const { getSoundEnabled, setSoundEnabled, celebrateBadge } = useCelebration();
  const [enabled, setEnabled] = useState(getSoundEnabled);

  useEffect(() => {
    setEnabled(getSoundEnabled());
  }, [getSoundEnabled]);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    setSoundEnabled(checked);
    
    // Play a preview sound when enabling
    if (checked) {
      initializeCelebrationAudio();
      celebrateBadge({ sound: true, intensity: 'low' });
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        {enabled ? (
          <Volume2 className="h-5 w-5 text-primary" />
        ) : (
          <VolumeX className="h-5 w-5 text-muted-foreground" />
        )}
        <div className="space-y-0.5">
          <Label htmlFor="celebration-sound" className="text-base font-medium">
            {t('settings.celebrationSound', 'Celebration Sounds')}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t('settings.celebrationSoundDesc', 'Play sounds when earning badges or completing challenges')}
          </p>
        </div>
      </div>
      <Switch
        id="celebration-sound"
        checked={enabled}
        onCheckedChange={handleToggle}
      />
    </div>
  );
}
