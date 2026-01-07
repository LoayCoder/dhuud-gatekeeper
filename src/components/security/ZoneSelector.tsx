import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Shield, AlertTriangle, Locate, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSecurityZones } from '@/hooks/use-security-zones';
import { useCurrentZone } from '@/hooks/use-current-zone';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const ZONE_STORAGE_KEY = 'gate_selected_zone';

interface ZoneSelectorProps {
  siteId?: string;
  onZoneChange?: (zoneId: string | null) => void;
  className?: string;
  showDetectButton?: boolean;
}

export function ZoneSelector({ siteId, onZoneChange, className, showDetectButton = true }: ZoneSelectorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: zones = [], isLoading } = useSecurityZones({ siteId, isActive: true });
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const { currentZone, nearestZone, isLocating, error, detectZone } = useCurrentZone();

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(ZONE_STORAGE_KEY);
    if (stored) {
      setSelectedZone(stored);
      onZoneChange?.(stored);
    }
  }, []);

  // Auto-select detected zone
  useEffect(() => {
    if (currentZone?.zone) {
      handleZoneChange(currentZone.zone.id);
      toast({
        title: t('security.zones.zoneDetected', 'Zone Detected'),
        description: currentZone.zone.zone_name,
      });
    } else if (nearestZone?.zone) {
      toast({
        title: t('security.zones.nearestZone', 'Nearest Zone'),
        description: `${nearestZone.zone.zone_name} (${Math.round(nearestZone.distanceToCenter)}m)`,
      });
    }
  }, [currentZone, nearestZone]);

  useEffect(() => {
    if (error) {
      toast({
        title: t('security.zones.locationError', 'Location Error'),
        description: error,
        variant: 'destructive',
      });
    }
  }, [error]);

  const handleZoneChange = (value: string) => {
    const zoneId = value === 'all' ? null : value;
    setSelectedZone(zoneId);
    
    if (zoneId) {
      localStorage.setItem(ZONE_STORAGE_KEY, zoneId);
    } else {
      localStorage.removeItem(ZONE_STORAGE_KEY);
    }
    
    onZoneChange?.(zoneId);
  };

  const selectedZoneData = zones.find(z => z.id === selectedZone);

  const getRiskBadge = (riskLevel: string | null) => {
    switch (riskLevel) {
      case 'high':
        return (
          <Badge variant="destructive" className="text-[10px] px-1 py-0">
            <AlertTriangle className="h-2.5 w-2.5 me-0.5" />
            {t('security.zones.highRisk', 'High')}
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-amber-500/20 text-amber-700 dark:text-amber-300">
            {t('security.zones.mediumRisk', 'Medium')}
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <MapPin className="h-4 w-4 animate-pulse" />
        <span>{t('common.loading', 'Loading...')}</span>
      </div>
    );
  }

  if (zones.length === 0) {
    return null; // Don't show if no zones configured
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span className="hidden sm:inline">{t('security.zones.currentZone', 'Zone')}:</span>
      </div>
      <Select value={selectedZone || 'all'} onValueChange={handleZoneChange}>
        <SelectTrigger className="w-auto min-w-[100px] max-w-[180px] h-8 text-sm">
          <SelectValue placeholder={t('security.zones.selectZone', 'Select zone')} className="truncate" />
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg z-50">
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{t('security.zones.allZones', 'All Zones')}</span>
            </div>
          </SelectItem>
          {zones.map((zone) => (
            <SelectItem key={zone.id} value={zone.id}>
              <div className="flex items-center gap-2 max-w-[200px]">
                <span className="truncate flex-1">{zone.zone_name}</span>
                {getRiskBadge(zone.risk_level)}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedZoneData && getRiskBadge(selectedZoneData.risk_level)}
      
      {showDetectButton && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={detectZone} 
          disabled={isLocating}
          className="h-8 px-2"
          title={t('security.zones.detectMyZone', 'Detect Zone')}
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Locate className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
// Hook to get current selected zone
export function useSelectedZone() {
  const [zoneId, setZoneId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(ZONE_STORAGE_KEY);
    setZoneId(stored);

    // Listen for storage changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ZONE_STORAGE_KEY) {
        setZoneId(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return zoneId;
}
