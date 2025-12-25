import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Timer, ChevronDown } from "lucide-react";

interface Props {
  onRefresh: () => void;
  disabled?: boolean;
}

const INTERVALS = [
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
  { value: 300, label: '5m' },
  { value: 600, label: '10m' },
  { value: 900, label: '15m' },
  { value: 1800, label: '30m' },
  { value: 3600, label: '1h' },
];

export function AutoRefreshToggle({ onRefresh, disabled }: Props) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [interval, setInterval_] = useState(60);
  const [countdown, setCountdown] = useState(interval);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onRefreshRef = useRef(onRefresh);

  // Keep onRefresh ref updated to avoid stale closures
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Clear existing timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start timer effect
  useEffect(() => {
    clearTimer();
    setCountdown(interval);

    if (enabled && !disabled) {
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            onRefreshRef.current();
            return interval;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return clearTimer;
  }, [enabled, interval, disabled, clearTimer]);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
  };

  const handleIntervalChange = (value: number) => {
    setInterval_(value);
  };

  const formatCountdown = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  const currentIntervalLabel = INTERVALS.find(i => i.value === interval)?.label || '1m';

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-background">
      <Timer className="h-3.5 w-3.5 text-muted-foreground" />
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={disabled}
        className="scale-75"
      />
      
      {enabled && (
        <span className="text-xs text-muted-foreground tabular-nums min-w-[36px]">
          {formatCountdown(countdown)}
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-1.5 text-xs"
            disabled={disabled}
          >
            {currentIntervalLabel}
            <ChevronDown className="h-3 w-3 ms-0.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {INTERVALS.map((item) => (
            <DropdownMenuItem
              key={item.value}
              onClick={() => handleIntervalChange(item.value)}
              className={interval === item.value ? 'bg-accent' : ''}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
