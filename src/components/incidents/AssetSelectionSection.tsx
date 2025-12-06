import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode, Search, X, Package, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AssetQRScanner } from '@/components/assets/AssetQRScanner';
import { useDebounce, useSearchAssetsForLinking } from '@/hooks/use-incident-assets';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface SelectedAsset {
  id: string;
  asset_code: string;
  name: string;
  site_id: string | null;
  branch_id: string | null;
  site?: { id: string; name: string } | null;
  building?: { name: string } | null;
  category?: { name: string; name_ar: string | null } | null;
}

interface AssetSelectionSectionProps {
  selectedAssetId: string | null;
  onAssetSelect: (asset: SelectedAsset | null) => void;
}

export function AssetSelectionSection({ selectedAssetId, onAssetSelect }: AssetSelectionSectionProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const direction = i18n.dir();
  
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: searchResults, isLoading: isSearching } = useSearchAssetsForLinking(debouncedSearch, []);

  // Fetch selected asset details
  const { data: selectedAsset } = useQuery({
    queryKey: ['selected-asset-for-incident', selectedAssetId],
    queryFn: async () => {
      if (!selectedAssetId) return null;
      const { data, error } = await supabase
        .from('hsse_assets')
        .select(`
          id,
          asset_code,
          name,
          site_id,
          branch_id,
          site:sites(id, name),
          building:buildings(name),
          category:asset_categories(name, name_ar)
        `)
        .eq('id', selectedAssetId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as SelectedAsset;
    },
    enabled: !!selectedAssetId,
  });

  const handleScanSuccess = async (assetId: string) => {
    setShowScanner(false);
    // Fetch the asset and select it
    const { data, error } = await supabase
      .from('hsse_assets')
      .select(`
        id,
        asset_code,
        name,
        site_id,
        branch_id,
        site:sites(id, name),
        building:buildings(name),
        category:asset_categories(name, name_ar)
      `)
      .eq('id', assetId)
      .is('deleted_at', null)
      .single();

    if (!error && data) {
      onAssetSelect(data as SelectedAsset);
      setSearchQuery('');
    }
  };

  const handleSelectFromSearch = (asset: any) => {
    onAssetSelect(asset as SelectedAsset);
    setSearchQuery('');
  };

  const handleClear = () => {
    onAssetSelect(null);
  };

  const getCategoryName = (asset: SelectedAsset) => {
    return isArabic && asset.category?.name_ar 
      ? asset.category.name_ar 
      : asset.category?.name;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5" />
            {t('incidents.linkedAsset')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedAsset ? (
            // Selected Asset Display
            <div className="flex items-start justify-between gap-3 p-3 bg-muted rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{selectedAsset.asset_code}</span>
                </div>
                <p className="text-sm truncate">{selectedAsset.name}</p>
                {(selectedAsset.site?.name || selectedAsset.building?.name) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {[selectedAsset.site?.name, selectedAsset.building?.name].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            // Search and Scan Options
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('incidents.searchAsset')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-9"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => setShowScanner(true)}>
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>

              {/* Search Results */}
              {debouncedSearch.length >= 2 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : searchResults && searchResults.length > 0 ? (
                    searchResults.map((asset: any) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleSelectFromSearch(asset)}
                        className="w-full p-3 text-start hover:bg-muted transition-colors border-b last:border-b-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium text-sm">{asset.asset_code}</span>
                              {getCategoryName(asset) && (
                                <Badge variant="outline" className="text-xs">
                                  {getCategoryName(asset)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm truncate">{asset.name}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="p-3 text-center text-sm text-muted-foreground">
                      {t('common.noResults')}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {t('incidents.assetSelectionHint')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-md" dir={direction}>
          <DialogHeader>
            <DialogTitle>{t('assets.scanQRCode')}</DialogTitle>
          </DialogHeader>
          <AssetQRScanner 
            onScanSuccess={handleScanSuccess} 
            autoNavigate={false} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
