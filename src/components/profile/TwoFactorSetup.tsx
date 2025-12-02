import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Shield, Loader2 } from "lucide-react";
import { useMFA } from "@/hooks/useMFA";
import { MFAEnrollDialog } from "./MFAEnrollDialog";
import { MFADisableDialog } from "./MFADisableDialog";

export function TwoFactorSetup() {
  const { isEnabled, isLoading, factors, refreshFactors } = useMFA();
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Display */}
      <div className="flex items-start gap-4">
        <div className={`rounded-full p-3 ${isEnabled ? 'bg-green-500/10' : 'bg-muted'}`}>
          {isEnabled ? (
            <ShieldCheck className="h-6 w-6 text-green-600" />
          ) : (
            <Shield className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">Two-Factor Authentication</h4>
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {isEnabled
              ? "Your account is protected with two-factor authentication."
              : "Add an extra layer of security to your account by requiring a verification code from your authenticator app."}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end">
        {isEnabled ? (
          <Button
            variant="outline"
            onClick={() => setDisableDialogOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            Disable 2FA
          </Button>
        ) : (
          <Button onClick={() => setEnrollDialogOpen(true)}>
            Enable 2FA
          </Button>
        )}
      </div>

      {/* Dialogs */}
      <MFAEnrollDialog
        open={enrollDialogOpen}
        onOpenChange={setEnrollDialogOpen}
        onSuccess={refreshFactors}
      />
      
      <MFADisableDialog
        open={disableDialogOpen}
        onOpenChange={setDisableDialogOpen}
        factorId={factors[0]?.id}
        onSuccess={refreshFactors}
      />
    </div>
  );
}
