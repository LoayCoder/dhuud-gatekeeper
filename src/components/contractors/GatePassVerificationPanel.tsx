import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ContractorQRScanner } from "@/components/security/ContractorQRScanner";
import { 
  useVerifyGatePassQR, 
  useConfirmGatePassEntry, 
  useConfirmGatePassExit,
  GatePassVerificationResult 
} from "@/hooks/contractor-management/use-gate-pass-verification";
import { 
  QrCode, 
  Search, 
  CheckCircle, 
  XCircle, 
  LogIn, 
  LogOut,
  Package,
  Truck,
  Calendar,
  Clock
} from "lucide-react";
import { format } from "date-fns";

export function GatePassVerificationPanel() {
  const { t } = useTranslation();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [verificationResult, setVerificationResult] = useState<GatePassVerificationResult | null>(null);

  const verifyQR = useVerifyGatePassQR();
  const confirmEntry = useConfirmGatePassEntry();
  const confirmExit = useConfirmGatePassExit();

  const handleScan = async (code: string) => {
    const result = await verifyQR.mutateAsync(code);
    setVerificationResult(result);
  };

  const handleManualSearch = async () => {
    if (!manualCode.trim()) return;
    const result = await verifyQR.mutateAsync(manualCode.trim());
    setVerificationResult(result);
  };

  const handleConfirmEntry = async () => {
    if (!verificationResult?.gatePass) return;
    await confirmEntry.mutateAsync(verificationResult.gatePass.id);
    setVerificationResult({
      ...verificationResult,
      gatePass: {
        ...verificationResult.gatePass,
        entry_confirmed_at: new Date().toISOString(),
      },
    });
  };

  const handleConfirmExit = async () => {
    if (!verificationResult?.gatePass) return;
    await confirmExit.mutateAsync(verificationResult.gatePass.id);
    setVerificationResult({
      ...verificationResult,
      gatePass: {
        ...verificationResult.gatePass,
        exit_confirmed_at: new Date().toISOString(),
        status: "completed",
      },
    });
  };

  const clearResult = () => {
    setVerificationResult(null);
    setManualCode("");
  };

  const passTypeLabel = verificationResult?.gatePass ? {
    material_in: t("contractors.gatePasses.materialIn", "Material In"),
    material_out: t("contractors.gatePasses.materialOut", "Material Out"),
    equipment_in: t("contractors.gatePasses.equipmentIn", "Equipment In"),
    equipment_out: t("contractors.gatePasses.equipmentOut", "Equipment Out"),
  }[verificationResult.gatePass.pass_type] || verificationResult.gatePass.pass_type : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t("contractors.gatePasses.verification", "Gate Pass Verification")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scan/Search Controls */}
        <div className="flex gap-2">
          <Button onClick={() => setScannerOpen(true)} className="flex-1">
            <QrCode className="h-4 w-4 me-2" />
            {t("contractors.gatePasses.scanQR", "Scan QR Code")}
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder={t("contractors.gatePasses.enterCode", "Enter QR code manually...")}
            onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
          />
          <Button variant="outline" onClick={handleManualSearch} disabled={verifyQR.isPending}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Verification Result */}
        {verificationResult && (
          <div className="mt-4">
            {verificationResult.valid && verificationResult.gatePass ? (
              <div className="space-y-4">
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-700 dark:text-green-400">
                    {t("contractors.gatePasses.verified", "Pass Verified")}
                  </AlertTitle>
                  <AlertDescription className="text-green-600 dark:text-green-500">
                    {verificationResult.message}
                  </AlertDescription>
                </Alert>

                {/* Pass Details */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">{verificationResult.gatePass.reference_number}</span>
                    <Badge variant="outline">{passTypeLabel}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>{t("contractors.gatePasses.project", "Project")}:</span>
                    </div>
                    <span>{verificationResult.gatePass.project_name}</span>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Truck className="h-4 w-4" />
                      <span>{t("contractors.gatePasses.company", "Company")}:</span>
                    </div>
                    <span>{verificationResult.gatePass.company_name}</span>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{t("contractors.gatePasses.date", "Date")}:</span>
                    </div>
                    <span>{format(new Date(verificationResult.gatePass.pass_date), "dd/MM/yyyy")}</span>

                    {verificationResult.gatePass.time_window_start && (
                      <>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{t("contractors.gatePasses.timeWindow", "Time")}:</span>
                        </div>
                        <span>
                          {verificationResult.gatePass.time_window_start} - {verificationResult.gatePass.time_window_end}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">{t("contractors.gatePasses.materials", "Materials")}:</p>
                    <p className="text-sm">{verificationResult.gatePass.material_description}</p>
                  </div>

                  {verificationResult.gatePass.vehicle_plate && (
                    <div className="pt-2 border-t">
                      <p className="text-sm">
                        <span className="text-muted-foreground">{t("contractors.gatePasses.vehicle", "Vehicle")}:</span>{" "}
                        {verificationResult.gatePass.vehicle_plate}
                      </p>
                      {verificationResult.gatePass.driver_name && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">{t("contractors.gatePasses.driver", "Driver")}:</span>{" "}
                          {verificationResult.gatePass.driver_name}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Entry/Exit Status */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      {verificationResult.gatePass.entry_confirmed_at ? (
                        <Badge variant="secondary" className="gap-1">
                          <LogIn className="h-3 w-3" />
                          {t("contractors.gatePasses.entryConfirmed", "Entry")}: {format(new Date(verificationResult.gatePass.entry_confirmed_at), "HH:mm")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          <LogIn className="h-3 w-3" />
                          {t("contractors.gatePasses.noEntry", "No Entry")}
                        </Badge>
                      )}
                      {verificationResult.gatePass.exit_confirmed_at ? (
                        <Badge variant="secondary" className="gap-1">
                          <LogOut className="h-3 w-3" />
                          {t("contractors.gatePasses.exitConfirmed", "Exit")}: {format(new Date(verificationResult.gatePass.exit_confirmed_at), "HH:mm")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          <LogOut className="h-3 w-3" />
                          {t("contractors.gatePasses.noExit", "No Exit")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {!verificationResult.gatePass.entry_confirmed_at && (
                    <Button 
                      onClick={handleConfirmEntry} 
                      disabled={confirmEntry.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <LogIn className="h-4 w-4 me-2" />
                      {t("contractors.gatePasses.confirmEntry", "Confirm Entry")}
                    </Button>
                  )}
                  {verificationResult.gatePass.entry_confirmed_at && !verificationResult.gatePass.exit_confirmed_at && (
                    <Button 
                      onClick={handleConfirmExit} 
                      disabled={confirmExit.isPending}
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                      <LogOut className="h-4 w-4 me-2" />
                      {t("contractors.gatePasses.confirmExit", "Confirm Exit")}
                    </Button>
                  )}
                  <Button variant="outline" onClick={clearResult}>
                    {t("common.clear", "Clear")}
                  </Button>
                </div>
              </div>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>{t("contractors.gatePasses.invalid", "Invalid Pass")}</AlertTitle>
                <AlertDescription>{verificationResult.message}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* QR Scanner Dialog */}
        <ContractorQRScanner
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onScan={handleScan}
        />
      </CardContent>
    </Card>
  );
}
