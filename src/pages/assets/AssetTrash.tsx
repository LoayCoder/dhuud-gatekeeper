import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  Clock, 
  Package,
  ChevronLeft,
  Search,
  CheckSquare,
  Square
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  useTrashAssets, 
  useRestoreAsset, 
  usePermanentDelete,
  useBulkRestore,
  useEmptyTrash,
  type TrashAsset
} from '@/hooks/use-asset-trash';

export default function AssetTrash() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  const dateLocale = isRTL ? ar : enUS;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: trashAssets, isLoading } = useTrashAssets();
  const restoreAsset = useRestoreAsset();
  const permanentDelete = usePermanentDelete();
  const bulkRestore = useBulkRestore();
  const emptyTrash = useEmptyTrash();

  // Filter by search
  const filteredAssets = trashAssets?.filter(asset => 
    asset.asset_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredAssets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const handleBulkRestore = () => {
    bulkRestore.mutate(Array.from(selectedIds), {
      onSuccess: () => setSelectedIds(new Set())
    });
  };

  // Get urgency badge color based on days remaining
  const getUrgencyVariant = (daysRemaining: number) => {
    if (daysRemaining <= 1) return 'destructive';
    if (daysRemaining <= 3) return 'warning';
    return 'secondary';
  };

  const getCategoryName = (asset: TrashAsset) => {
    return isRTL && asset.category_name_ar ? asset.category_name_ar : asset.category_name;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/assets')}
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trash2 className="h-6 w-6 text-muted-foreground" />
              {t('assets.trash.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('assets.trash.description')}
            </p>
          </div>
        </div>

        {filteredAssets.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 me-2" />
                {t('assets.trash.emptyTrash')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('assets.trash.confirmEmptyTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('assets.trash.confirmEmptyDescription', { count: filteredAssets.length })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => emptyTrash.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('assets.trash.emptyTrash')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Info Banner */}
      <Card className="border-warning bg-warning/5">
        <CardContent className="flex items-center gap-3 py-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <p className="text-sm text-muted-foreground">
            {t('assets.trash.autoDeleteWarning')}
          </p>
        </CardContent>
      </Card>

      {/* Search and Bulk Actions */}
      {filteredAssets.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('assets.trash.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>

          {selectedIds.size > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBulkRestore}
                disabled={bulkRestore.isPending}
              >
                <RotateCcw className="h-4 w-4 me-2" />
                {t('assets.trash.restoreSelected', { count: selectedIds.size })}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {filteredAssets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Trash2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('assets.trash.emptyTitle')}</h3>
            <p className="text-muted-foreground mb-4">{t('assets.trash.emptyDescription')}</p>
            <Button variant="outline" onClick={() => navigate('/assets')}>
              {t('assets.trash.backToAssets')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Trash Items List */}
      {filteredAssets.length > 0 && (
        <div className="space-y-3">
          {/* Select All Header */}
          <div className="flex items-center gap-3 px-2">
            <Checkbox
              checked={selectedIds.size === filteredAssets.length && filteredAssets.length > 0}
              onCheckedChange={selectAll}
            />
            <span className="text-sm text-muted-foreground">
              {t('common.selectAll')} ({filteredAssets.length})
            </span>
          </div>

          {/* Items */}
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <Checkbox
                    checked={selectedIds.has(asset.id)}
                    onCheckedChange={() => toggleSelect(asset.id)}
                    className="mt-1"
                  />

                  {/* Icon */}
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium">
                        {asset.asset_code}
                      </span>
                      <Badge variant={getUrgencyVariant(asset.days_remaining)}>
                        <Clock className="h-3 w-3 me-1" />
                        {asset.days_remaining === 0 
                          ? t('assets.trash.deletingToday')
                          : t('assets.trash.daysRemaining', { count: asset.days_remaining })
                        }
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {asset.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {getCategoryName(asset) && (
                        <span>{getCategoryName(asset)}</span>
                      )}
                      <span>•</span>
                      <span>
                        {t('assets.trash.deletedAt', { 
                          time: formatDistanceToNow(new Date(asset.deleted_at), { 
                            addSuffix: true, 
                            locale: dateLocale 
                          })
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreAsset.mutate(asset.id)}
                      disabled={restoreAsset.isPending}
                    >
                      <RotateCcw className="h-4 w-4 me-2" />
                      {t('assets.trash.restore')}
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('assets.trash.confirmDeleteTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('assets.trash.confirmDeleteDescription', { code: asset.asset_code })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => permanentDelete.mutate(asset.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t('assets.trash.deletePermanently')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
