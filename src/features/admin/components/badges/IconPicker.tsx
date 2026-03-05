import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

// Common icons for badges
const commonIcons = [
  'Award', 'Trophy', 'Medal', 'Star', 'Crown', 'Shield', 'Target', 'Zap',
  'Flame', 'Rocket', 'Heart', 'ThumbsUp', 'CheckCircle', 'Flag', 'Sparkles',
  'Gift', 'Gem', 'Diamond', 'Sun', 'Moon', 'Eye', 'FileCheck', 'ClipboardCheck',
  'AlertTriangle', 'AlertCircle', 'Bell', 'MessageCircle', 'Users', 'User',
  'Briefcase', 'Calendar', 'Clock', 'Timer', 'TrendingUp', 'BarChart',
  'Activity', 'Lightbulb', 'Brain', 'Compass', 'Map', 'Navigation',
];

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState('');

  const filteredIcons = search
    ? commonIcons.filter((icon) =>
        icon.toLowerCase().includes(search.toLowerCase())
      )
    : commonIcons;

  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search icons..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ScrollArea className="h-40 border rounded-md p-2">
        <div className="grid grid-cols-8 gap-1">
          {filteredIcons.map((iconName) => {
            const IconComponent = icons[iconName];
            if (!IconComponent) return null;

            return (
              <button
                key={iconName}
                type="button"
                onClick={() => onChange(iconName)}
                className={cn(
                  'p-2 rounded-md hover:bg-muted transition-colors flex items-center justify-center',
                  value === iconName && 'bg-primary/10 ring-2 ring-primary'
                )}
                title={iconName}
              >
                <IconComponent className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </ScrollArea>
      <p className="text-xs text-muted-foreground">Selected: {value}</p>
    </div>
  );
}
