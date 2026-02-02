import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ItemVerificationCard, GatePassItem, ItemVerificationState } from './ItemVerificationCard';
import { cn } from '@/lib/utils';

interface ItemsConfirmationListProps {
  items: GatePassItem[];
  onAllVerified?: (verified: boolean, states: ItemVerificationState[]) => void;
  className?: string;
}

export function ItemsConfirmationList({
  items,
  onAllVerified,
  className,
}: ItemsConfirmationListProps) {
  const { t } = useTranslation();
  const [verificationStates, setVerificationStates] = useState<Map<string, ItemVerificationState>>(new Map());

  const handleVerificationChange = useCallback((state: ItemVerificationState) => {
    setVerificationStates(prev => {
      const next = new Map(prev);
      next.set(state.itemId, state);
      
      // Check if all items are verified
      const allStates = Array.from(next.values());
      const allVerified = items.every(item => {
        const itemState = next.get(item.id);
        return itemState?.itemMatches && itemState?.quantityVerified;
      });
      
      onAllVerified?.(allVerified, allStates);
      return next;
    });
  }, [items, onAllVerified]);

  // Calculate progress
  const verifiedCount = items.filter(item => {
    const state = verificationStates.get(item.id);
    return state?.itemMatches && state?.quantityVerified;
  }).length;
  const progressPercent = items.length > 0 ? (verifiedCount / items.length) * 100 : 0;
  const hasDiscrepancies = Array.from(verificationStates.values()).some(
    state => state.discrepancyNotes && state.discrepancyNotes.length > 0
  );

  if (items.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>{t('contractors.gatePasses.noItems', 'No items to verify')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              {t('contractors.gatePasses.itemsToConfirm', 'Items to Confirm')}
            </div>
            <div className="flex items-center gap-2">
              {hasDiscrepancies && (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                  <AlertTriangle className="h-3 w-3" />
                  {t('contractors.gatePasses.hasDiscrepancies', 'Discrepancies')}
                </Badge>
              )}
              <Badge 
                variant={verifiedCount === items.length ? "default" : "secondary"}
                className={cn(
                  "gap-1",
                  verifiedCount === items.length && "bg-green-600"
                )}
              >
                {verifiedCount === items.length && <CheckCircle2 className="h-3 w-3" />}
                {verifiedCount}/{items.length}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {verifiedCount === items.length 
              ? t('contractors.gatePasses.allItemsVerified', 'All items verified')
              : t('contractors.gatePasses.verifyAllItems', 'Verify each item below')
            }
          </p>
        </CardContent>
      </Card>

      {/* Item Cards */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <ItemVerificationCard
            key={item.id}
            item={item}
            index={index}
            totalItems={items.length}
            verification={verificationStates.get(item.id)}
            onVerificationChange={handleVerificationChange}
          />
        ))}
      </div>
    </div>
  );
}
