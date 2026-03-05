import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useWarrantyClaims } from '@/hooks/use-warranty-claims';
import { WarrantyStatusBadge } from './WarrantyStatusBadge';
import { WarrantyClaimDialog } from './WarrantyClaimDialog';
import { WarrantyClaimDetailDialog } from './WarrantyClaimDetailDialog';

interface WarrantyClaimsTabProps {
  assetId: string;
  assetName?: string;
  warrantyExpiryDate?: string | null;
}

export function WarrantyClaimsTab({ assetId, assetName, warrantyExpiryDate }: WarrantyClaimsTabProps) {
  const { t, i18n } = useTranslation();
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  const { data: claims, isLoading } = useWarrantyClaims(assetId);

  const hasActiveWarranty = warrantyExpiryDate && new Date(warrantyExpiryDate) >= new Date();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with file claim button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('assets.warranty.claimsHistory')}</h3>
          <p className="text-sm text-muted-foreground">
            {claims?.length === 0
              ? t('assets.warranty.noClaimsYet')
              : t('assets.warranty.claimsCount', { count: claims?.length })}
          </p>
        </div>
        {hasActiveWarranty && (
          <Button onClick={() => setClaimDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('assets.warranty.fileClaim')}
          </Button>
        )}
      </div>

      {/* Claims list */}
      {claims?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">{t('assets.warranty.noClaims')}</h3>
            <p className="text-muted-foreground text-sm text-center max-w-sm mb-4">
              {hasActiveWarranty
                ? t('assets.warranty.noClaimsDescription')
                : t('assets.warranty.warrantyExpiredDescription')}
            </p>
            {hasActiveWarranty && (
              <Button onClick={() => setClaimDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('assets.warranty.fileClaim')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {claims?.map((claim) => (
            <Card
              key={claim.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedClaimId(claim.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-medium">
                      {claim.claim_number}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(claim.claim_date), 'PPP')}
                    </CardDescription>
                  </div>
                  <WarrantyStatusBadge status={claim.claim_status} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {claim.issue_description}
                </p>
                {claim.repair_cost !== null && (
                  <div className="flex items-center gap-1 mt-2 text-sm">
                    <DollarSign className="h-3 w-3" />
                    <span>{claim.repair_cost.toLocaleString()} SAR</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <WarrantyClaimDialog
        open={claimDialogOpen}
        onOpenChange={setClaimDialogOpen}
        assetId={assetId}
        assetName={assetName}
      />

      {selectedClaimId && (
        <WarrantyClaimDetailDialog
          open={!!selectedClaimId}
          onOpenChange={(open) => !open && setSelectedClaimId(null)}
          claimId={selectedClaimId}
        />
      )}
    </div>
  );
}
