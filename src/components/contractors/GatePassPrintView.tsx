import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { Printer, Download } from "lucide-react";
import { format } from "date-fns";

interface GatePassPrintViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gatePass: {
    id: string;
    reference_number: string;
    qr_code_token: string | null;
    pass_type: string;
    pass_date: string;
    time_window_start: string | null;
    time_window_end: string | null;
    material_description: string;
    quantity: string | null;
    vehicle_plate: string | null;
    driver_name: string | null;
    driver_mobile: string | null;
    pm_approved_by: string | null;
    pm_approved_at: string | null;
    safety_approved_by: string | null;
    safety_approved_at: string | null;
    project?: { project_name: string; company?: { company_name: string } } | null;
    company?: { company_name: string } | null;
  } | null;
}

export function GatePassPrintView({ open, onOpenChange, gatePass }: GatePassPrintViewProps) {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);

  if (!gatePass || !gatePass.qr_code_token) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gate Pass - ${gatePass.reference_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .container { max-width: 400px; margin: 0 auto; border: 2px solid #333; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 15px; }
            .title { font-size: 24px; font-weight: bold; }
            .ref { font-size: 18px; color: #666; margin-top: 5px; }
            .qr-section { text-align: center; margin: 20px 0; }
            .qr-section svg { border: 1px solid #ddd; padding: 10px; }
            .details { margin: 15px 0; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .label { font-weight: bold; color: #555; }
            .value { text-align: end; }
            .pass-type { text-align: center; font-size: 20px; font-weight: bold; padding: 10px; background: #f5f5f5; margin: 15px 0; text-transform: uppercase; }
            .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 2px solid #333; font-size: 12px; color: #666; }
            .approvals { margin: 15px 0; padding: 10px; background: #f9f9f9; }
            .approval-row { font-size: 12px; margin: 5px 0; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const passTypeLabel = {
    material_in: t("contractors.gatePasses.materialIn", "Material In"),
    material_out: t("contractors.gatePasses.materialOut", "Material Out"),
    equipment_in: t("contractors.gatePasses.equipmentIn", "Equipment In"),
    equipment_out: t("contractors.gatePasses.equipmentOut", "Equipment Out"),
  }[gatePass.pass_type] || gatePass.pass_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t("contractors.gatePasses.printPass", "Print Gate Pass")}</span>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 me-2" />
              {t("common.print", "Print")}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="border-2 border-border p-4 rounded-lg bg-background">
          {/* Header */}
          <div className="text-center border-b-2 border-border pb-4 mb-4">
            <h1 className="text-2xl font-bold">{t("contractors.gatePasses.gatePass", "GATE PASS")}</h1>
            <p className="text-lg text-muted-foreground mt-1">{gatePass.reference_number}</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center my-6">
            <div className="p-3 border rounded-lg bg-white">
              <QRCodeSVG value={gatePass.qr_code_token} size={150} level="H" />
            </div>
          </div>

          {/* Pass Type */}
          <div className="text-center bg-muted p-3 rounded-lg mb-4">
            <Badge variant="outline" className="text-lg px-4 py-1">
              {passTypeLabel}
            </Badge>
          </div>

          {/* Details */}
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium text-muted-foreground">{t("contractors.gatePasses.project", "Project")}</span>
              <span className="text-end">{gatePass.project?.project_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium text-muted-foreground">{t("contractors.gatePasses.company", "Company")}</span>
              <span className="text-end">{gatePass.project?.company?.company_name || gatePass.company?.company_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium text-muted-foreground">{t("contractors.gatePasses.date", "Date")}</span>
              <span>{format(new Date(gatePass.pass_date), "dd/MM/yyyy")}</span>
            </div>
            {gatePass.time_window_start && gatePass.time_window_end && (
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium text-muted-foreground">{t("contractors.gatePasses.timeWindow", "Time Window")}</span>
                <span>{gatePass.time_window_start} - {gatePass.time_window_end}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium text-muted-foreground">{t("contractors.gatePasses.materials", "Materials")}</span>
              <span className="text-end max-w-[60%]">{gatePass.material_description}</span>
            </div>
            {gatePass.vehicle_plate && (
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium text-muted-foreground">{t("contractors.gatePasses.vehicle", "Vehicle")}</span>
                <span>{gatePass.vehicle_plate}</span>
              </div>
            )}
            {gatePass.driver_name && (
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium text-muted-foreground">{t("contractors.gatePasses.driver", "Driver")}</span>
                <span>{gatePass.driver_name}</span>
              </div>
            )}
          </div>

          {/* Approvals */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">{t("contractors.gatePasses.approvals", "Approvals")}:</p>
            {gatePass.pm_approved_at && (
              <p className="text-xs">✓ PM: {format(new Date(gatePass.pm_approved_at), "dd/MM/yyyy HH:mm")}</p>
            )}
            {gatePass.safety_approved_at && (
              <p className="text-xs">✓ Safety: {format(new Date(gatePass.safety_approved_at), "dd/MM/yyyy HH:mm")}</p>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-4 pt-4 border-t-2 border-border">
            <p className="text-xs text-muted-foreground">
              {t("contractors.gatePasses.scanToVerify", "Scan QR code to verify at gate")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
