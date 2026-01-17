/**
 * Quick Check-in Card Component
 * Displays visitor info with quick check-in/check-out actions.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { User, Phone, Building, QrCode, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Visitor } from '@/hooks/use-visitors';
import { VisitorDetailDialog } from '@/components/visitors/VisitorDetailDialog';

interface QuickCheckinCardProps {
  visitor: Visitor;
  showActions?: boolean;
}

export function QuickCheckinCard({ visitor, showActions = true }: QuickCheckinCardProps) {
  const { t } = useTranslation();
  const [detailOpen, setDetailOpen] = useState(false);

  const isCheckedIn = visitor.is_active;

  return (
    <>
      <div 
        className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => setDetailOpen(true)}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>

          {/* Info */}
          <div>
            <div className="font-medium flex items-center gap-2">
              {visitor.full_name}
              {isCheckedIn && (
                <Badge className="bg-green-500 text-xs">{t('reception.onSite', 'On Site')}</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {visitor.company_name && (
                <span className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {visitor.company_name}
                </span>
              )}
              {visitor.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {visitor.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm">
              <QrCode className="h-4 w-4 me-1" />
              {t('reception.viewQR', 'QR')}
            </Button>
            {!isCheckedIn ? (
              <Button size="sm">
                <LogIn className="h-4 w-4 me-1" />
                {t('reception.checkIn', 'Check In')}
              </Button>
            ) : (
              <Button size="sm" variant="secondary">
                <LogOut className="h-4 w-4 me-1" />
                {t('reception.checkOut', 'Check Out')}
              </Button>
            )}
          </div>
        )}
      </div>

      <VisitorDetailDialog
        visitorId={visitor.id}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
