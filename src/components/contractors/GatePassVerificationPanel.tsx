import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  useVerifyGatePassQR, 
  useConfirmGatePassEntry, 
  useConfirmGatePassExit,
  GatePassVerificationResult 
} from "@/hooks/contractor-management/use-gate-pass-verification";
import { useGatePassItems, useGatePassPhotos } from "@/hooks/contractor-management/use-gate-pass-details";
import { 
  FullScreenScanner,
  VerificationResult,
  VehicleVerification,
  ItemsConfirmationList,
  GatePassItem,
  ItemVerificationState,
} from "./gate-pass-verification";
import { 
  QrCode, 
  Search, 
  LogIn, 
  LogOut,
  Package,
  RotateCcw,
  Loader2,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

export function GatePassVerificationPanel() {
  const { t } = useTranslation();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [verificationResult, setVerificationResult] = useState<GatePassVerificationResult | null>(null);
  const [vehicleVerified, setVehicleVerified] = useState({ plateMatches: false, driverVerified: false });
  const [itemsVerified, setItemsVerified] = useState(false);
  const [itemStates, setItemStates] = useState<ItemVerificationState[]>([]);

  const verifyQR = useVerifyGatePassQR();
  const confirmEntry = useConfirmGatePassEntry();
  const confirmExit = useConfirmGatePassExit();

  const isLoading = verifyQR.isPending || confirmEntry.isPending || confirmExit.isPending;

  // Fetch real items and photos after QR verification
  const verifiedPassId = verificationResult?.valid ? verificationResult.gatePass?.id || null : null;
  const isPublic = verificationResult?.gatePass?.is_public_request || false;
  const { data: rawItems, isLoading: itemsLoading } = useGatePassItems(verifiedPassId, isPublic);
  const { data: photos, isLoading: photosLoading } = useGatePassPhotos(verifiedPassId, isPublic);

  // Map fetched items to GatePassItem format with photo URLs
  const realItems: GatePassItem[] = useMemo(() => {
    if (!rawItems || rawItems.length === 0) {
      // Fallback: create a single item from material_description if no items table data
      if (verificationResult?.gatePass) {
        return [{
          id: 'fallback-1',
          sr_number: '001',
          item_name: verificationResult.gatePass.material_description?.split(';')[0]?.split('(')[0]?.trim() || 'Material',
          description: verificationResult.gatePass.material_description,
          quantity: parseInt(verificationResult.gatePass.quantity || '1') || 1,
          unit: 'pcs',
          photos: [],
        }];
      }
      return [];
    }
    return rawItems.map((item, idx) => {
      // Find photos for this item
      const itemPhotos = (photos || [])
        .filter(p => p.item_id === item.id)
        .map(p => p.signedUrl)
        .filter(Boolean) as string[];

      return {
        id: item.id,
        sr_number: item.sr_number || String(idx + 1).padStart(3, '0'),
        item_name: item.item_name,
        description: item.description,
        quantity: parseInt(item.quantity || '1') || 1,
        unit: item.unit || 'pcs',
        photos: itemPhotos,
      };
    });
  }, [rawItems, photos, verificationResult]);

  const handleScan = useCallback(async (code: string) => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    setScannerOpen(false);
    
    try {
      const result = await verifyQR.mutateAsync(code);
      setVerificationResult(result);
      
      // Stronger haptic for result
      if (navigator.vibrate) {
        navigator.vibrate(result.valid ? [50, 50, 50] : [200]);
      }
    } catch (error) {
      console.error('Verification failed:', error);
    }
  }, [verifyQR]);

  const handleManualSearch = async () => {
    if (!manualCode.trim()) return;
    await handleScan(manualCode.trim());
  };

  const handleConfirmEntry = async () => {
    if (!verificationResult?.gatePass) return;
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 100]);
    }
    
    await confirmEntry.mutateAsync(verificationResult.gatePass.id);
    setVerificationResult({
      ...verificationResult,
      gatePass: {
        ...verificationResult.gatePass,
        entry_time: new Date().toISOString(),
      },
    });
  };

  const handleConfirmExit = async () => {
    if (!verificationResult?.gatePass) return;
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 100]);
    }
    
    await confirmExit.mutateAsync(verificationResult.gatePass.id);
    setVerificationResult({
      ...verificationResult,
      gatePass: {
        ...verificationResult.gatePass,
        exit_time: new Date().toISOString(),
        status: "completed",
      },
    });
  };

  const clearResult = useCallback(() => {
    setVerificationResult(null);
    setManualCode("");
    setVehicleVerified({ plateMatches: false, driverVerified: false });
    setItemsVerified(false);
    setItemStates([]);
  }, []);

  const handleScanAnother = useCallback(() => {
    clearResult();
    setScannerOpen(true);
  }, [clearResult]);

  const handleVehicleVerificationChange = useCallback((verified: { plateMatches: boolean; driverVerified: boolean }) => {
    setVehicleVerified(verified);
  }, []);

  const handleItemsVerified = useCallback((verified: boolean, states: ItemVerificationState[]) => {
    setItemsVerified(verified);
    setItemStates(states);
  }, []);

  // Check if all verifications are complete
  const hasVehicle = verificationResult?.gatePass?.vehicle_plate || verificationResult?.gatePass?.driver_name;
  const allVehicleChecks = !hasVehicle || (vehicleVerified.plateMatches && vehicleVerified.driverVerified);
  const allItemChecks = realItems.length === 0 || itemsVerified;
  const canConfirmEntry = verificationResult?.valid && !verificationResult.gatePass?.entry_time && allVehicleChecks && allItemChecks && !itemsLoading;
  const canConfirmExit = verificationResult?.valid && verificationResult.gatePass?.entry_time && !verificationResult.gatePass?.exit_time;

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)]">
      {/* Header Card */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("contractors.gatePasses.verification", "Gate Pass Verification")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Main Scan Button */}
          <Button 
            onClick={() => setScannerOpen(true)} 
            className="w-full h-14 text-lg gap-3 rounded-xl"
            disabled={isLoading}
          >
            <QrCode className="h-6 w-6" />
            {t("contractors.gatePasses.scanQR", "Scan QR Code")}
          </Button>

          {/* Manual Entry */}
          <div className="flex gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder={t("contractors.gatePasses.enterCode", "Enter QR token...")}
              onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
              className="h-12"
              disabled={isLoading}
            />
            <Button 
              variant="outline" 
              onClick={handleManualSearch} 
              disabled={isLoading || !manualCode.trim()}
              className="h-12 w-12 p-0"
            >
              {verifyQR.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Verification Result */}
      {verificationResult && (
        <div className="flex-1 space-y-4">
          <VerificationResult result={verificationResult} itemCount={realItems.length} />

          {/* Vehicle Verification - Only for valid passes with vehicle info */}
          {verificationResult.valid && verificationResult.gatePass && !verificationResult.gatePass.entry_time && (
            <VehicleVerification
              vehiclePlate={verificationResult.gatePass.vehicle_plate}
              driverName={verificationResult.gatePass.driver_name}
              driverMobile={verificationResult.gatePass.driver_mobile}
              onVerificationChange={handleVehicleVerificationChange}
            />
          )}

          {/* Items Confirmation - Only for valid passes before entry */}
          {verificationResult.valid && verificationResult.gatePass && !verificationResult.gatePass.entry_time && (
            <>
              {(itemsLoading || photosLoading) ? (
                <Card>
                  <CardContent className="p-6 flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">{t("common.loading", "Loading items...")}</span>
                  </CardContent>
                </Card>
              ) : realItems.length > 0 ? (
                <ItemsConfirmationList
                  items={realItems}
                  onAllVerified={handleItemsVerified}
                />
              ) : null}
            </>
          )}
        </div>
      )}

      {/* Sticky Action Footer */}
      {verificationResult && (
        <div 
          className="sticky bottom-0 mt-4 -mx-4 px-4 py-4 bg-background/95 backdrop-blur border-t"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="flex flex-col gap-3">
            {/* Entry/Exit Actions */}
            {verificationResult.valid && verificationResult.gatePass && (
              <div className="flex gap-3">
                {/* Entry Button */}
                {!verificationResult.gatePass.entry_time && (
                  <Button 
                    onClick={handleConfirmEntry} 
                    disabled={confirmEntry.isPending || !canConfirmEntry}
                    className={cn(
                      "flex-1 h-14 text-lg gap-2 rounded-xl",
                      canConfirmEntry ? "bg-green-600 hover:bg-green-700" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {confirmEntry.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <LogIn className="h-5 w-5" />
                    )}
                    {t("contractors.gatePasses.confirmEntry", "Confirm Entry")}
                  </Button>
                )}

                {/* Exit Button */}
                {verificationResult.gatePass.entry_time && !verificationResult.gatePass.exit_time && (
                  <Button 
                    onClick={handleConfirmExit} 
                    disabled={confirmExit.isPending}
                    className="flex-1 h-14 text-lg gap-2 rounded-xl bg-orange-600 hover:bg-orange-700"
                  >
                    {confirmExit.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <LogOut className="h-5 w-5" />
                    )}
                    {t("contractors.gatePasses.confirmExit", "Confirm Exit")}
                  </Button>
                )}
              </div>
            )}

            {/* Secondary Actions */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleScanAnother}
                className="flex-1 h-12 gap-2 rounded-xl"
              >
                <RotateCcw className="h-4 w-4" />
                {t("contractors.gatePasses.scanAnother", "Scan Another")}
              </Button>
              <Button 
                variant="ghost" 
                onClick={clearResult}
                className="h-12 px-4 rounded-xl"
              >
                {t("common.clear", "Clear")}
              </Button>
            </div>

            {/* Status Indicators */}
            {verificationResult.valid && verificationResult.gatePass && !verificationResult.gatePass.entry_time && (
              <div className="flex flex-wrap gap-2 justify-center">
                {hasVehicle && (
                  <Badge 
                    variant={allVehicleChecks ? "default" : "secondary"}
                    className={cn(
                      "gap-1",
                      allVehicleChecks && "bg-green-600"
                    )}
                  >
                    {allVehicleChecks ? "✓" : "○"} Vehicle
                  </Badge>
                )}
                {realItems.length > 0 && (
                  <Badge 
                    variant={allItemChecks ? "default" : "secondary"}
                    className={cn(
                      "gap-1",
                      allItemChecks && "bg-green-600"
                    )}
                  >
                    {allItemChecks ? "✓" : "○"} Items ({realItems.length})
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Screen Scanner */}
      <FullScreenScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        title={t("contractors.gatePasses.scanTitle", "Gate Pass Scan")}
        description={t("contractors.gatePasses.scanDescription", "Point camera at QR code")}
      />
    </div>
  );
}
