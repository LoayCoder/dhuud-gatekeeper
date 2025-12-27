import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, AlertTriangle, ShoppingCart, History, Plus, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useMaintenanceParts } from '@/hooks/use-maintenance-parts';
import { useLowStockParts, usePurchaseOrders } from '@/hooks/use-parts-inventory';
import { LowStockAlertBanner } from '@/components/parts/LowStockAlertBanner';
import { StockAdjustmentDialog } from '@/components/parts/StockAdjustmentDialog';
import { PurchaseOrderDialog } from '@/components/parts/PurchaseOrderDialog';
import { StockHistoryDialog } from '@/components/parts/StockHistoryDialog';
import { PartStockLevelCard } from '@/components/parts/PartStockLevelCard';

export default function PartsInventoryPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [showPurchaseOrderDialog, setShowPurchaseOrderDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const { data: partsData, isLoading: partsLoading } = useMaintenanceParts();
  const parts = partsData?.data || [];
  const { data: lowStockParts, isLoading: lowStockLoading } = useLowStockParts();
  const { data: purchaseOrders, isLoading: ordersLoading } = usePurchaseOrders();

  const filteredParts = (parts || []).filter(
    (part) =>
      part.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.part_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingOrders = (purchaseOrders || []).filter(
    (po) => po.status === 'submitted' || po.status === 'approved'
  );

  const totalValue = (parts || []).reduce(
    (sum, part) => sum + (part.quantity_in_stock || 0) * (part.unit_cost || 0),
    0
  );

  const handleOpenHistory = (partId: string) => {
    setSelectedPartId(partId);
    setShowHistoryDialog(true);
  };

  const handleOpenAdjustment = (partId: string) => {
    setSelectedPartId(partId);
    setShowAdjustmentDialog(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Low Stock Alert */}
      <LowStockAlertBanner parts={lowStockParts || []} isLoading={lowStockLoading} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('parts.inventory.title', 'Parts Inventory')}</h1>
          <p className="text-muted-foreground">
            {t('parts.inventory.description', 'Manage spare parts stock and purchase orders')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPurchaseOrderDialog(true)}>
            <ShoppingCart className="h-4 w-4 me-2" />
            {t('parts.orders.create', 'Create PO')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('parts.inventory.totalParts', 'Total Parts')}</CardDescription>
            <CardTitle className="text-2xl">{parts?.length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('parts.inventory.lowStock', 'Low Stock Items')}</CardDescription>
            <CardTitle className="text-2xl text-amber-600">{lowStockParts?.length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('parts.inventory.pendingOrders', 'Pending Orders')}</CardDescription>
            <CardTitle className="text-2xl">{pendingOrders.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('parts.inventory.totalValue', 'Total Value')}</CardDescription>
            <CardTitle className="text-2xl">
              {totalValue.toLocaleString('en-SA', { style: 'currency', currency: 'SAR' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xs text-muted-foreground">SAR</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">
            <Package className="h-4 w-4 me-2" />
            {t('parts.inventory.tab', 'Inventory')}
          </TabsTrigger>
          <TabsTrigger value="low-stock">
            <AlertTriangle className="h-4 w-4 me-2" />
            {t('parts.lowStock.tab', 'Low Stock')}
            {(lowStockParts?.length || 0) > 0 && (
              <Badge variant="destructive" className="ms-2">
                {lowStockParts?.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart className="h-4 w-4 me-2" />
            {t('parts.orders.tab', 'Purchase Orders')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('parts.search', 'Search parts...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>

          {/* Parts Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('parts.partNumber', 'Part #')}</TableHead>
                  <TableHead>{t('parts.name', 'Name')}</TableHead>
                  <TableHead>{t('parts.category', 'Category')}</TableHead>
                  <TableHead className="text-end">{t('parts.inStock', 'In Stock')}</TableHead>
                  <TableHead className="text-end">{t('parts.reorderPoint', 'Reorder Point')}</TableHead>
                  <TableHead className="text-end">{t('parts.unitCost', 'Unit Cost')}</TableHead>
                  <TableHead>{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredParts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('parts.noParts', 'No parts found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell className="font-mono">{part.part_number}</TableCell>
                      <TableCell className="font-medium">{part.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{part.category || '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <PartStockLevelCard
                          current={part.quantity_in_stock || 0}
                          min={part.min_stock_level || 0}
                          max={part.max_stock_level || 100}
                          reorderPoint={part.reorder_point || 0}
                        />
                      </TableCell>
                      <TableCell className="text-end">{part.reorder_point || '-'}</TableCell>
                      <TableCell className="text-end">
                        {part.unit_cost
                          ? Number(part.unit_cost).toLocaleString('en-SA', { style: 'currency', currency: 'SAR' })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAdjustment(part.id)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenHistory(part.id)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('parts.lowStock.title', 'Low Stock Alerts')}</CardTitle>
              <CardDescription>
                {t('parts.lowStock.description', 'Parts that have reached or fallen below their reorder point')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('parts.partNumber', 'Part #')}</TableHead>
                    <TableHead>{t('parts.name', 'Name')}</TableHead>
                    <TableHead className="text-end">{t('parts.inStock', 'In Stock')}</TableHead>
                    <TableHead className="text-end">{t('parts.reorderPoint', 'Reorder Point')}</TableHead>
                    <TableHead className="text-end">{t('parts.shortage', 'Shortage')}</TableHead>
                    <TableHead>{t('common.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}><Skeleton className="h-4 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : (lowStockParts || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t('parts.lowStock.none', 'All parts are adequately stocked')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    (lowStockParts || []).map((part) => (
                      <TableRow key={part.id}>
                        <TableCell className="font-mono">{part.part_number}</TableCell>
                        <TableCell className="font-medium">{part.name}</TableCell>
                        <TableCell className="text-end text-destructive font-medium">
                          {part.quantity_in_stock || 0}
                        </TableCell>
                        <TableCell className="text-end">{part.reorder_point}</TableCell>
                        <TableCell className="text-end text-amber-600">
                          {(part.reorder_point || 0) - (part.quantity_in_stock || 0)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPartId(part.id);
                              setShowPurchaseOrderDialog(true);
                            }}
                          >
                            <ShoppingCart className="h-4 w-4 me-2" />
                            {t('parts.createOrder', 'Order')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('parts.orders.title', 'Purchase Orders')}</CardTitle>
                  <CardDescription>
                    {t('parts.orders.description', 'Track and manage purchase orders for parts')}
                  </CardDescription>
                </div>
                <Button onClick={() => setShowPurchaseOrderDialog(true)}>
                  <Plus className="h-4 w-4 me-2" />
                  {t('parts.orders.create', 'Create PO')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('parts.orders.poNumber', 'PO #')}</TableHead>
                    <TableHead>{t('parts.orders.supplier', 'Supplier')}</TableHead>
                    <TableHead>{t('parts.orders.status', 'Status')}</TableHead>
                    <TableHead>{t('parts.orders.orderDate', 'Order Date')}</TableHead>
                    <TableHead>{t('parts.orders.expectedDate', 'Expected')}</TableHead>
                    <TableHead className="text-end">{t('parts.orders.total', 'Total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}><Skeleton className="h-4 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : (purchaseOrders || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t('parts.orders.none', 'No purchase orders found')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    (purchaseOrders || []).map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-mono font-medium">{po.po_number}</TableCell>
                        <TableCell>{po.supplier_name || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              po.status === 'received'
                                ? 'default'
                                : po.status === 'cancelled'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {t(`parts.orders.statuses.${po.status}`, po.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{po.order_date || '-'}</TableCell>
                        <TableCell>{po.expected_delivery_date || '-'}</TableCell>
                        <TableCell className="text-end">
                          {po.total_amount
                            ? Number(po.total_amount).toLocaleString('en-SA', { style: 'currency', currency: po.currency })
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <StockAdjustmentDialog
        open={showAdjustmentDialog}
        onOpenChange={setShowAdjustmentDialog}
        partId={selectedPartId}
      />

      <PurchaseOrderDialog
        open={showPurchaseOrderDialog}
        onOpenChange={setShowPurchaseOrderDialog}
        preselectedPartId={selectedPartId}
      />

      <StockHistoryDialog
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        partId={selectedPartId}
      />
    </div>
  );
}
