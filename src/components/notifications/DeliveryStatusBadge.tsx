import { Badge } from '@/components/ui/badge';

export function DeliveryStatusBadge({ status, ...rest }: { status: string; [key: string]: any }) {
  const variant = status === 'delivered' ? 'success' : status === 'failed' ? 'destructive' : 'secondary';
  return <Badge variant={variant as any}>{status}</Badge>;
}
