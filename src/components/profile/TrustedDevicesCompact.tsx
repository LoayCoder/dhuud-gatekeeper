import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTrustedDevice } from "@/hooks/use-trusted-device";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Monitor, Smartphone, Tablet, Trash2 } from "lucide-react";
import { format, isPast } from "date-fns";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface TrustedDevice {
  id: string;
  device_name: string | null;
  trusted_until: string;
  created_at: string;
  last_used_at: string;
}

interface TrustedDevicesCompactProps {
  onDeviceCountChange?: (count: number) => void;
}

export function TrustedDevicesCompact({ onDeviceCountChange }: TrustedDevicesCompactProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { getTrustedDevices, revokeDevice, revokeAllDevices } = useTrustedDevice();
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    onDeviceCountChange?.(devices.length);
  }, [devices.length, onDeviceCountChange]);

  const loadDevices = async () => {
    try {
      const data = await getTrustedDevices();
      setDevices(data || []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    setRevokingId(deviceId);
    try {
      const success = await revokeDevice(deviceId);
      if (success) {
        setDevices(prev => prev.filter(d => d.id !== deviceId));
        toast({
          title: t('trustedDevices.revoked'),
          description: t('trustedDevices.revokedDescription'),
        });
      }
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    setIsRevokingAll(true);
    try {
      const success = await revokeAllDevices();
      if (success) {
        setDevices([]);
        toast({
          title: t('trustedDevices.allRevoked'),
          description: t('trustedDevices.allRevokedDescription'),
        });
      }
    } finally {
      setIsRevokingAll(false);
    }
  };

  const getDeviceIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('phone') || lower.includes('mobile') || lower.includes('iphone') || lower.includes('android')) {
      return Smartphone;
    }
    if (lower.includes('tablet') || lower.includes('ipad')) {
      return Tablet;
    }
    return Monitor;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('trustedDevices.noDevices')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" dir={direction}>
      {devices.map((device) => {
        const DeviceIcon = getDeviceIcon(device.device_name || '');
        const isExpired = isPast(new Date(device.trusted_until));

        return (
          <div
            key={device.id}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-lg border transition-colors",
              isExpired ? "bg-muted/30 border-dashed" : "bg-muted/30"
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "rounded-lg p-1.5",
                isExpired ? "bg-muted" : "bg-primary/10"
              )}>
                <DeviceIcon className={cn(
                  "h-3.5 w-3.5",
                  isExpired ? "text-muted-foreground" : "text-primary"
                )} />
              </div>
              <div className="text-start">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-xs">{device.device_name || t('trustedDevices.unknownDevice')}</p>
                  {isExpired && (
                    <Badge variant="secondary" className="h-4 text-[9px]">
                      {t('trustedDevices.expired')}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {isExpired 
                    ? t('trustedDevices.expiredOn', { date: format(new Date(device.trusted_until), 'MMM d') })
                    : t('trustedDevices.validUntil', { date: format(new Date(device.trusted_until), 'MMM d') })
                  }
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => handleRevoke(device.id)}
              disabled={revokingId === device.id}
            >
              {revokingId === device.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        );
      })}

      {devices.length > 1 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2 text-destructive hover:text-destructive h-8"
              disabled={isRevokingAll}
            >
              {isRevokingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 me-1.5" />
              )}
              {t('trustedDevices.revokeAll')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('trustedDevices.revokeAllTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('trustedDevices.revokeAllDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevokeAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('trustedDevices.revokeAll')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
