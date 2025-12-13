import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { User, Building, Mail, CreditCard, Calendar, QrCode } from 'lucide-react';
import { useVisitor } from '@/hooks/use-visitors';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';

interface VisitorDetailDialogProps {
  visitorId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VisitorDetailDialog({ visitorId, open, onOpenChange }: VisitorDetailDialogProps) {
  const { t } = useTranslation();
  const { data: visitor, isLoading } = useVisitor(visitorId ?? undefined);

  if (!visitor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('visitors.details.title')}</DialogTitle>
          <DialogDescription>{t('visitors.details.description')}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
        ) : (
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg inline-block">
                <QRCodeSVG value={visitor.qr_code_token} size={180} />
              </div>
            </div>

            {/* Visitor Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{visitor.full_name}</h3>
                <Badge variant={visitor.is_active ? 'default' : 'secondary'}>
                  {visitor.is_active ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>

              {visitor.company_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{visitor.company_name}</span>
                </div>
              )}

              {visitor.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{visitor.email}</span>
                </div>
              )}

              {visitor.national_id && (
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>{visitor.national_id}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {t('visitors.fields.lastVisit')}: {' '}
                  {visitor.last_visit_at 
                    ? format(new Date(visitor.last_visit_at), 'PPp')
                    : t('visitors.list.neverVisited')}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <QrCode className="h-4 w-4" />
                <span className="font-mono text-xs">{visitor.qr_code_token}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
