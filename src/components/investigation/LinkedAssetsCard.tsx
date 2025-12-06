import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { Package, MapPin, Link2, Trash2, Plus, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useIncidentAssets, useUnlinkAssetFromIncident } from '@/hooks/use-incident-assets';
import { AssetLinkSelector } from './AssetLinkSelector';

interface LinkedAssetsCardProps {
  incidentId: string;
  canEdit?: boolean;
}

export function LinkedAssetsCard({ incidentId, canEdit = false }: LinkedAssetsCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: linkedAssets = [], isLoading, refetch } = useIncidentAssets(incidentId);
  const unlinkMutation = useUnlinkAssetFromIncident();

  const handleUnlink = (linkId: string, assetId: string) => {
    unlinkMutation.mutate({ linkId, incidentId, assetId });
  };

  const getLinkTypeBadge = (linkType: string) => {
    const variants: Record<string, 'destructive' | 'secondary' | 'outline' | 'default'> = {
      damaged: 'destructive',
      caused_by: 'destructive',
      involved: 'secondary',
      affected: 'outline',
    };
    return variants[linkType] || 'outline';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'destructive' | 'secondary' | 'outline' | 'default'> = {
      active: 'default',
      inactive: 'secondary',
      under_maintenance: 'outline',
      disposed: 'destructive',
    };
    return variants[status] || 'outline';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Package className="h-4 w-4" />
          {t('assetManagement.linkedAssets')}
        </CardTitle>
        {canEdit && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 me-1" />
                {t('assetManagement.linkAsset')}
              </Button>
            </DialogTrigger>
            <DialogContent dir={direction}>
              <DialogHeader>
                <DialogTitle>{t('assetManagement.linkAssetToIncident')}</DialogTitle>
              </DialogHeader>
              <AssetLinkSelector
                incidentId={incidentId}
                linkedAssetIds={linkedAssets.map((l) => l.asset_id)}
                onLinked={() => {
                  setShowAddDialog(false);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">{t('common.loading')}...</div>
        ) : linkedAssets.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            {t('assetManagement.noLinkedAssets')}
          </div>
        ) : (
          <div className="space-y-3">
            {linkedAssets.map((link) => (
              <div
                key={link.id}
                className="flex items-start justify-between gap-2 p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{link.asset?.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {link.asset?.asset_code}
                    </Badge>
                    <Badge variant={getLinkTypeBadge(link.link_type)} className="text-xs">
                      {t(`assetManagement.linkTypes.${link.link_type}`)}
                    </Badge>
                  </div>
                  
                  {link.asset?.category?.name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {direction === 'rtl' && link.asset.category.name_ar
                        ? link.asset.category.name_ar
                        : link.asset.category.name}
                    </p>
                  )}

                  {(link.asset?.site?.name || link.asset?.building?.name) && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {[link.asset?.site?.name, link.asset?.building?.name].filter(Boolean).join(' / ')}
                      </span>
                    </div>
                  )}

                  {link.notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">{link.notes}</p>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getStatusBadge(link.asset?.status || 'active')} className="text-xs">
                      {t(`assetManagement.status.${link.asset?.status || 'active'}`)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <RouterLink to={`/assets/${link.asset_id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </RouterLink>
                  </Button>
                  
                  {canEdit && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir={direction}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('assetManagement.unlinkAsset')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('assetManagement.unlinkAssetConfirm')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleUnlink(link.id, link.asset_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t('assetManagement.unlink')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
