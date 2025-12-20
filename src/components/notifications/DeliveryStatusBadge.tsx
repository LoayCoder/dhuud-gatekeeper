import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Send, 
  CheckCircle2, 
  Eye, 
  XCircle, 
  AlertTriangle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced' | 'complained';

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig: Record<DeliveryStatus, {
  label: string;
  labelAr: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  pending: {
    label: 'Pending',
    labelAr: 'قيد الانتظار',
    icon: Loader2,
    variant: 'secondary',
    className: 'bg-warning/20 text-warning-foreground border-warning/30',
  },
  sent: {
    label: 'Sent',
    labelAr: 'تم الإرسال',
    icon: Send,
    variant: 'outline',
    className: 'bg-info/20 text-info-foreground border-info/30',
  },
  delivered: {
    label: 'Delivered',
    labelAr: 'تم التسليم',
    icon: CheckCircle2,
    variant: 'default',
    className: 'bg-success/20 text-success-foreground border-success/30',
  },
  read: {
    label: 'Read',
    labelAr: 'مقروء',
    icon: Eye,
    variant: 'default',
    className: 'bg-success/20 text-success-foreground border-success/30',
  },
  failed: {
    label: 'Failed',
    labelAr: 'فشل',
    icon: XCircle,
    variant: 'destructive',
    className: 'bg-destructive/20 text-destructive border-destructive/30',
  },
  bounced: {
    label: 'Bounced',
    labelAr: 'مرتد',
    icon: AlertTriangle,
    variant: 'destructive',
    className: 'bg-destructive/20 text-destructive border-destructive/30',
  },
  complained: {
    label: 'Complained',
    labelAr: 'شكوى',
    icon: AlertTriangle,
    variant: 'destructive',
    className: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  },
};

export function DeliveryStatusBadge({ 
  status, 
  showLabel = true, 
  size = 'md',
  className 
}: DeliveryStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const isPending = status === 'pending';

  return (
    <Badge 
      variant="outline"
      className={cn(
        "gap-1.5 font-medium",
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
        config.className,
        className
      )}
    >
      <Icon className={cn(iconSize, isPending && 'animate-spin')} />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}

export function getStatusLabel(status: DeliveryStatus, lang: 'en' | 'ar' = 'en'): string {
  const config = statusConfig[status];
  return lang === 'ar' ? config?.labelAr : config?.label || status;
}
