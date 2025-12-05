import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Volume2, VolumeX, Play } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SoundSettings,
  SoundOption,
  NotificationSoundType,
  getSoundSettings,
  setSoundSettings,
  playNotificationSound,
} from "@/lib/notification-history";

const soundOptions: SoundOption[] = ['default', 'chime', 'bell', 'ping', 'none'];
const eventTypes: NotificationSoundType[] = ['sync', 'update', 'info', 'error'];

const RTL_LANGUAGES = ['ar', 'ur'];

interface SoundRowProps {
  type: NotificationSoundType;
  value: SoundOption;
  onChange: (type: NotificationSoundType, value: SoundOption) => void;
  direction: 'rtl' | 'ltr';
  t: (key: string) => string;
}

function SoundRow({ type, value, onChange, direction, t }: SoundRowProps) {
  const handlePreview = () => {
    if (value !== 'none') {
      playNotificationSound(type);
    }
  };

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        {value === 'none' ? (
          <VolumeX className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Volume2 className="h-4 w-4 text-muted-foreground" />
        )}
        <Label className="font-medium">
          {t(`notifications.soundType.${type}`)}
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={value}
          onValueChange={(v) => onChange(type, v as SoundOption)}
          dir={direction}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background" dir={direction}>
            {soundOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`notifications.sound.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handlePreview}
          disabled={value === 'none'}
        >
          <Play className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function NotificationSoundSettings() {
  const { t, i18n } = useTranslation();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);
  const direction = isRTL ? 'rtl' : 'ltr';
  const [settings, setSettings] = useState<SoundSettings>(getSoundSettings);

  useEffect(() => {
    setSettings(getSoundSettings());
  }, []);

  const handleChange = (type: NotificationSoundType, value: SoundOption) => {
    const newSettings = { ...settings, [type]: value };
    setSettings(newSettings);
    setSoundSettings(newSettings);
  };

  return (
    <div className="space-y-4" dir={direction}>
      <div>
        <h3 className="text-lg font-medium">{t('notifications.soundSettings')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('notifications.soundSettingsDescription')}
        </p>
      </div>

      <div className="rounded-lg border p-4">
        {eventTypes.map((type) => (
          <SoundRow
            key={type}
            type={type}
            value={settings[type]}
            onChange={handleChange}
            direction={direction}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
