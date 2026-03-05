import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Car, User, Phone, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface VehicleVerificationProps {
  vehiclePlate?: string | null;
  driverName?: string | null;
  driverMobile?: string | null;
  onVerificationChange?: (verified: { plateMatches: boolean; driverVerified: boolean }) => void;
  className?: string;
}

export function VehicleVerification({
  vehiclePlate,
  driverName,
  driverMobile,
  onVerificationChange,
  className,
}: VehicleVerificationProps) {
  const { t } = useTranslation();
  const [plateMatches, setPlateMatches] = useState(false);
  const [driverVerified, setDriverVerified] = useState(false);

  const handlePlateChange = (checked: boolean) => {
    setPlateMatches(checked);
    onVerificationChange?.({ plateMatches: checked, driverVerified });
  };

  const handleDriverChange = (checked: boolean) => {
    setDriverVerified(checked);
    onVerificationChange?.({ plateMatches, driverVerified: checked });
  };

  const allVerified = plateMatches && driverVerified;
  const hasVehicleInfo = vehiclePlate || driverName;

  if (!hasVehicleInfo) {
    return null;
  }

  return (
    <Card className={cn(
      "border-2 transition-colors duration-300",
      allVerified ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : "border-border",
      className
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-muted-foreground" />
            {t('contractors.gatePasses.vehicleCheck', 'Vehicle Check')}
          </div>
          {allVerified && (
            <Badge variant="outline" className="gap-1 text-green-600 border-green-300 bg-green-100">
              <CheckCircle2 className="h-3 w-3" />
              {t('contractors.gatePasses.verified', 'Verified')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vehicle Plate */}
        {vehiclePlate && (
          <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  {t('contractors.gatePasses.expectedPlate', 'Expected Plate')}
                </span>
              </div>
              <p className="font-mono font-bold text-lg tracking-wider">
                {vehiclePlate}
              </p>
            </div>
            <div className="flex items-center gap-2 min-h-[48px]">
              <Checkbox 
                id="plate-check" 
                checked={plateMatches}
                onCheckedChange={(checked) => handlePlateChange(checked === true)}
                className="h-6 w-6"
              />
              <Label 
                htmlFor="plate-check" 
                className="text-sm cursor-pointer select-none"
              >
                {t('contractors.gatePasses.plateMatches', 'Matches')}
              </Label>
            </div>
          </div>
        )}

        {/* Driver Info */}
        {driverName && (
          <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  {t('contractors.gatePasses.driver', 'Driver')}
                </span>
              </div>
              <p className="font-medium text-base">{driverName}</p>
              {driverMobile && (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span dir="ltr">{driverMobile}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 min-h-[48px]">
              <Checkbox 
                id="driver-check" 
                checked={driverVerified}
                onCheckedChange={(checked) => handleDriverChange(checked === true)}
                className="h-6 w-6"
              />
              <Label 
                htmlFor="driver-check" 
                className="text-sm cursor-pointer select-none"
              >
                {t('contractors.gatePasses.idVerified', 'ID Verified')}
              </Label>
            </div>
          </div>
        )}

        {/* Warning if not all verified */}
        {!allVerified && (
          <div className="flex items-center gap-2 text-amber-600 text-sm p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              {t('contractors.gatePasses.verifyBeforeEntry', 'Please verify vehicle and driver before allowing entry')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
