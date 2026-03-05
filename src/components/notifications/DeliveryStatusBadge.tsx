import { Badge } from '@/components/ui/badge';

export function DeliveryStatusBadge({ status }: { status: string }) {
  const variant = status === 'delivered' ? 'success' : status === 'failed' ? 'destructive' : 'secondary';
  return <Badge variant={variant as any}>{status}</Badge>;
}
