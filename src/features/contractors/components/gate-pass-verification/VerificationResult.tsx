import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Package, 
  Truck, 
  Calendar,
  User,
  Building2,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GatePassVerificationResult } from '@/features/contractors/hooks/use-gate-pass-verification';

interface VerificationResultProps {
  result: GatePassVerificationResult;
  itemCount?: number;
  className?: string;
}

type StatusType = 'valid' | 'invalid' | 'expired' | 'pending';

function getStatusConfig(valid: boolean, status?: string): {
  icon: typeof CheckCircle2;
  color: string;
  bg: string;
  border: string;
  label: string;
  type: StatusType;
} {
  if (valid) {
    return {
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-green-500',
      label: 'VERIFIED',
      type: 'valid',
    };
  }

  if (status?.includes('expired')) {
    return {
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-500',
      label: 'EXPIRED',
      type: 'expired',
    };
  }

  if (status?.includes('pending')) {
    return {
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-500',
      label: 'PENDING APPROVAL',
      type: 'pending',
    };
  }

  return {
    icon: XCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive',
    label: 'INVALID',
    type: 'invalid',
  };
}

export function VerificationResult({ result, itemCount, className }: VerificationResultProps) {
  const { t } = useTranslation();
  const statusConfig = getStatusConfig(result.valid, result.message);
  const StatusIcon = statusConfig.icon;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Status Banner */}
      <Card className={cn(
        "border-2 overflow-hidden",
        statusConfig.border,
        statusConfig.bg
      )}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-4 rounded-2xl",
              statusConfig.type === 'valid' ? 'bg-green-100 dark:bg-green-900/50' :
              statusConfig.type === 'expired' ? 'bg-amber-100 dark:bg-amber-900/50' :
              statusConfig.type === 'pending' ? 'bg-amber-100 dark:bg-amber-900/50' :
              'bg-destructive/20'
            )}>
              <StatusIcon className={cn("h-10 w-10", statusConfig.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={cn("text-2xl font-bold tracking-wide", statusConfig.color)}>
                {statusConfig.label}
              </h2>
              <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                {result.message}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pass Details - Only show if valid */}
      {result.valid && result.gatePass && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Reference Number */}
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  {t('contractors.gatePasses.reference', 'Reference')}
                </span>
              </div>
              <span className="font-bold text-lg font-mono">
                {result.gatePass.reference_number}
              </span>
            </div>

            {/* Pass Type & Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-sm">
                {result.gatePass.pass_type === 'in' && t('contractors.gatePasses.passTypeIn', 'Material In')}
                {result.gatePass.pass_type === 'out' && t('contractors.gatePasses.passTypeOut', 'Material Out')}
                {result.gatePass.pass_type === 'in_out' && t('contractors.gatePasses.passTypeInOut', 'Entry & Exit')}
                {result.gatePass.pass_type === 'material_in' && t('contractors.gatePasses.materialIn', 'Material In')}
                {result.gatePass.pass_type === 'material_out' && t('contractors.gatePasses.materialOut', 'Material Out')}
                {result.gatePass.pass_type === 'equipment_in' && t('contractors.gatePasses.equipmentIn', 'Equipment In')}
                {result.gatePass.pass_type === 'equipment_out' && t('contractors.gatePasses.equipmentOut', 'Equipment Out')}
              </Badge>
              {typeof itemCount === 'number' && itemCount > 0 && (
                <Badge variant="outline" className="text-sm gap-1">
                  <Package className="h-3 w-3" />
                  {itemCount} {t('contractors.gatePasses.items', 'items')}
                </Badge>
              )}
              {result.gatePass.entry_time && (
                <Badge variant="outline" className="text-sm gap-1 text-green-600 border-green-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Entry: {format(new Date(result.gatePass.entry_time), 'HH:mm')}
                </Badge>
              )}
              {result.gatePass.exit_time && (
                <Badge variant="outline" className="text-sm gap-1 text-orange-600 border-orange-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Exit: {format(new Date(result.gatePass.exit_time), 'HH:mm')}
                </Badge>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 gap-3 text-sm">
              {/* Project */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs mb-0.5">
                    {t('contractors.gatePasses.project', 'Project')}
                  </p>
                  <p className="font-medium truncate">{result.gatePass.project_name}</p>
                </div>
              </div>

              {/* Company */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Truck className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs mb-0.5">
                    {t('contractors.gatePasses.company', 'Company')}
                  </p>
                  <p className="font-medium truncate">{result.gatePass.company_name}</p>
                </div>
              </div>

              {/* Date & Time Window */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs mb-0.5">
                    {t('contractors.gatePasses.dateTime', 'Date & Time')}
                  </p>
                  <p className="font-medium">
                    {format(new Date(result.gatePass.pass_date), 'dd MMM yyyy')}
                    {result.gatePass.time_window_start && result.gatePass.time_window_end && (
                      <span className="text-muted-foreground ms-2">
                        ({result.gatePass.time_window_start} - {result.gatePass.time_window_end})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Materials */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Package className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs mb-0.5">
                    {t('contractors.gatePasses.materials', 'Materials')}
                  </p>
                  <p className="font-medium">{result.gatePass.material_description}</p>
                  {result.gatePass.quantity && (
                    <p className="text-muted-foreground text-xs mt-1">
                      Qty: {result.gatePass.quantity}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
