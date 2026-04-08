import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApprovalFlowPreviewProps {
  approverName: string;
  approverTitle?: string | null;
}

const APPROVAL_STEPS = [
  { key: "dept_manager", labelEn: "Department Approval", labelAr: "موافقة القسم" },
  { key: "acknowledgment", labelEn: "Gate Pass Acknowledgment", labelAr: "إقرار تصريح البوابة" },
  { key: "security", labelEn: "Security Supervisor", labelAr: "مشرف الأمن" },
];

export function ApprovalFlowPreview({ approverName, approverTitle }: ApprovalFlowPreviewProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <p className="text-sm font-medium text-muted-foreground">
        {t("gatePasses.approvalFlowPreview", "Approval Flow Preview")}
      </p>
      <div className="space-y-1">
        {APPROVAL_STEPS.map((step, index) => (
          <div key={step.key}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                index === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", index > 0 && "text-muted-foreground")}>
                  {isRTL ? step.labelAr : step.labelEn}
                </p>
                {index === 0 && (
                  <p className="text-xs text-primary truncate">
                    {approverName}
                    {approverTitle && ` — ${approverTitle}`}
                  </p>
                )}
              </div>
            </div>
            {index < APPROVAL_STEPS.length - 1 && (
              <div className="flex items-center gap-3 py-0.5">
                <div className="h-7 w-7 flex items-center justify-center flex-shrink-0">
                  <ArrowDown className="h-3 w-3 text-muted-foreground/50" />
                </div>
              </div>
            )}
          </div>
        ))}
        {/* Final state */}
        <div className="flex items-center gap-3 pt-1">
          <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 bg-success/10">
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <p className="text-sm font-medium text-success">
            {t("gatePasses.approvedQrGenerated", "Approved → QR Generated")}
          </p>
        </div>
      </div>
    </div>
  );
}
