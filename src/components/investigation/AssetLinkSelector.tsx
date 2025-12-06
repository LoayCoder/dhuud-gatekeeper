import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Link2, Package, MapPin, AlertTriangle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSearchAssetsForLinking, useLinkAssetToIncident, type AssetLinkType, useDebounce } from '@/hooks/use-incident-assets';

interface AssetLinkSelectorProps {
  incidentId: string;
  linkedAssetIds: string[];
  onLinked?: () => void;
}

const LINK_TYPES: AssetLinkType[] = ['involved', 'damaged', 'caused_by', 'affected'];

export function AssetLinkSelector({ incidentId, linkedAssetIds, onLinked }: AssetLinkSelectorProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [linkType, setLinkType] = useState<AssetLinkType>('involved');
  const [notes, setNotes] = useState('');

  const debouncedSearch = useDebounce(search, 300);
  const { data: searchResults = [], isLoading } = useSearchAssetsForLinking(debouncedSearch, linkedAssetIds);
  const linkMutation = useLinkAssetToIncident();

  const handleSelectAsset = (asset: any) => {
    setSelectedAsset(asset);
    setSearch('');
  };

  const handleLink = () => {
    if (!selectedAsset) return;

    linkMutation.mutate(
      {
        incidentId,
        assetId: selectedAsset.id,
        linkType,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setSelectedAsset(null);
          setLinkType('involved');
          setNotes('');
          onLinked?.();
        },
      }
    );
  };

  const handleClearSelection = () => {
    setSelectedAsset(null);
    setLinkType('involved');
    setNotes('');
  };

  const getCriticalityColor = (level: string | null) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {!selectedAsset ? (
        <>
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('assetManagement.searchAssets')}
              className="ps-10"
            />
          </div>

          {/* Search Results */}
          {search.length >= 2 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('common.loading')}...
                </p>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('assetManagement.noAssetsFound')}
                </p>
              ) : (
                searchResults.map((asset: any) => (
                  <Card
                    key={asset.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectAsset(asset)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{asset.name}</p>
                            <p className="text-xs text-muted-foreground">{asset.asset_code}</p>
                          </div>
                        </div>
                        <Badge variant={getCriticalityColor(asset.criticality_level)} className="shrink-0">
                          {asset.criticality_level || 'medium'}
                        </Badge>
                      </div>
                      {(asset.site?.name || asset.building?.name) && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{[asset.site?.name, asset.building?.name].filter(Boolean).join(' / ')}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Selected Asset */}
          <Card className="border-primary">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{selectedAsset.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedAsset.asset_code}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClearSelection}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Link Type */}
          <div className="space-y-2">
            <Label>{t('assetManagement.linkType')}</Label>
            <Select value={linkType} onValueChange={(v) => setLinkType(v as AssetLinkType)} dir={direction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINK_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`assetManagement.linkTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t('assetManagement.linkNotes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('assetManagement.linkNotesPlaceholder')}
              rows={2}
            />
          </div>

          {/* Link Button */}
          <Button onClick={handleLink} disabled={linkMutation.isPending} className="w-full">
            <Link2 className="h-4 w-4 me-2" />
            {linkMutation.isPending ? t('common.saving') : t('assetManagement.linkAsset')}
          </Button>
        </>
      )}
    </div>
  );
}
