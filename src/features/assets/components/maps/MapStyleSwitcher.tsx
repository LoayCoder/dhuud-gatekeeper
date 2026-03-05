import { useTranslation } from 'react-i18next';
import { MapPin, Satellite, Mountain, Moon, Sun } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type MapStyleKey = 'street' | 'satellite' | 'terrain' | 'dark' | 'light';

export interface MapStyleConfig {
  name: string;
  url: string;
  attribution: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const MAP_STYLES: Record<MapStyleKey, MapStyleConfig> = {
  street: {
    name: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    icon: MapPin,
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    icon: Satellite,
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
    icon: Mountain,
  },
  dark: {
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB',
    icon: Moon,
  },
  light: {
    name: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB',
    icon: Sun,
  },
};

interface MapStyleSwitcherProps {
  value: MapStyleKey;
  onChange: (style: MapStyleKey) => void;
  className?: string;
  compact?: boolean;
}

export function MapStyleSwitcher({
  value,
  onChange,
  className,
  compact = false,
}: MapStyleSwitcherProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const CurrentIcon = MAP_STYLES[value].icon;

  return (
    <Select value={value} onValueChange={(v) => onChange(v as MapStyleKey)} dir={direction}>
      <SelectTrigger 
        className={cn(
          "bg-background/90 backdrop-blur-sm border-border",
          compact ? "w-[120px]" : "w-[140px]",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <CurrentIcon className="h-4 w-4 shrink-0" />
          {!compact && <SelectValue placeholder={t('map.style', 'Map Style')} />}
        </div>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((styleKey) => {
          const style = MAP_STYLES[styleKey];
          const Icon = style.icon;
          return (
            <SelectItem key={styleKey} value={styleKey}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{t(`map.styles.${styleKey}`, style.name)}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
