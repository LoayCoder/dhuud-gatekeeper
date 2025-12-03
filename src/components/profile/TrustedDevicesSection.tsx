import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useTrustedDevice } from '@/hooks/use-trusted-device';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
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
} from '@/components/ui/alert-dialog';

interface TrustedDevice {
  id: string;
  device_name: string | null;
  trusted_until: string;
  created_at: string;
  last_used_at: string;
}

export function TrustedDevicesSection() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const { getTrustedDevices, revokeDevice, revokeAllDevices } = useTrustedDevice();

  const fetchDevices = async () => {
    setLoading(true);
    const data = await getTrustedDevices();
    setDevices(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRevoke = async (deviceId: string) => {
    setRevoking(deviceId);
    const success = await revokeDevice(deviceId);
    
    if (success) {
      toast({
        title: t('trustedDevices.deviceRevoked'),
        description: t('trustedDevices.deviceRevokedMessage'),
      });
      fetchDevices();
    } else {
      toast({
        title: t('common.error'),
        description: t('trustedDevices.revokeFailed'),
        variant: 'destructive',
      });
    }
    setRevoking(null);
  };

  const handleRevokeAll = async () => {
    setRevoking('all');
    const success = await revokeAllDevices();
    
    if (success) {
      toast({
        title: t('trustedDevices.allDevicesRevoked'),
        description: t('trustedDevices.allDevicesRevokedMessage'),
      });
      fetchDevices();
    } else {
      toast({
        title: t('common.error'),
        description: t('trustedDevices.revokeFailed'),
        variant: 'destructive',
      });
    }
    setRevoking(null);
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {t('trustedDevices.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {t('trustedDevices.title')}
            </CardTitle>
            <CardDescription className="mt-1">
              {t('trustedDevices.description')}
            </CardDescription>
          </div>
          {devices.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={revoking === 'all'}>
                  {revoking === 'all' ? (
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 me-2" />
                  )}
                  {t('trustedDevices.revokeAll')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('trustedDevices.revokeAllConfirm')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('trustedDevices.revokeAllMessage')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRevokeAll} className="bg-destructive text-destructive-foreground">
                    {t('trustedDevices.revokeAll')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t('trustedDevices.noDevices')}</p>
            <p className="text-sm mt-1">{t('trustedDevices.noDevicesHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{device.device_name || t('trustedDevices.unknownDevice')}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{t('trustedDevices.lastUsed')}: {format(new Date(device.last_used_at), 'PPp')}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {isExpired(device.trusted_until) ? (
                        <Badge variant="destructive">{t('trustedDevices.expired')}</Badge>
                      ) : (
                        <Badge variant="secondary">
                          {t('trustedDevices.trustedUntil')}: {format(new Date(device.trusted_until), 'PP')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRevoke(device.id)}
                  disabled={revoking === device.id}
                >
                  {revoking === device.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
