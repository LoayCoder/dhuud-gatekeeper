import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Users, PenTool } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SignaturePad, SignaturePadRef } from "@/components/ui/signature-pad";
import type { RiskAssessmentTeamMember } from "@/hooks/risk-assessment";

interface TeamSignatureSectionProps {
  teamMembers: RiskAssessmentTeamMember[];
  onSign: (memberId: string, signatureData: string) => Promise<void>;
  currentUserId?: string;
  isSubmitting?: boolean;
}

export function TeamSignatureSection({
  teamMembers,
  onSign,
  currentUserId,
  isSubmitting,
}: TeamSignatureSectionProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [signingMemberId, setSigningMemberId] = useState<string | null>(null);
  const signaturePadRef = useRef<SignaturePadRef>(null);

  const handleSaveSignature = async (memberId: string) => {
    const signatureData = signaturePadRef.current?.getSignatureDataUrl();
    if (signatureData) {
      await onSign(memberId, signatureData);
      setSigningMemberId(null);
    }
  };

  const signedCount = teamMembers.filter((m) => m.signed_at).length;
  const requiredCount = teamMembers.filter((m) => m.is_required).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("risk.team.signatures", "Team Signatures")}
          </CardTitle>
          <Badge variant={signedCount === requiredCount ? "default" : "secondary"}>
            {signedCount}/{requiredCount} {t("risk.team.signed", "Signed")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {teamMembers.map((member) => {
          const role = isRTL && member.role_ar ? member.role_ar : member.role;
          const canSign = member.user_id === currentUserId && !member.signed_at;
          const isSigning = signingMemberId === member.id;

          return (
            <div
              key={member.id}
              className={`border rounded-lg p-4 ${
                member.signed_at
                  ? "border-green-200 bg-green-50 dark:bg-green-950/20"
                  : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{role}</span>
                    {member.is_required && (
                      <Badge variant="outline" className="text-xs">
                        {t("risk.team.required", "Required")}
                      </Badge>
                    )}
                    {member.signed_at && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {t("risk.team.signatureNote", "By signing, I confirm participation in this risk assessment")}
                  </div>
                </div>

                {member.signed_at ? (
                  <div className="text-end">
                    <div className="border rounded bg-background p-2 w-48">
                      <img
                        src={member.signature_data || ""}
                        alt="Signature"
                        className="h-12 w-full object-contain"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(member.signed_at).toLocaleDateString()}
                    </div>
                  </div>
                ) : canSign ? (
                  <div>
                    {isSigning ? (
                      <div className="space-y-2">
                        <SignaturePad
                          ref={signaturePadRef}
                          height={100}
                          className="w-64"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSigningMemberId(null)}
                          >
                            {t("common.cancel", "Cancel")}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveSignature(member.id)}
                            disabled={isSubmitting}
                          >
                            {t("common.save", "Save")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setSigningMemberId(member.id)}
                        disabled={isSubmitting}
                      >
                        <PenTool className="h-4 w-4 me-2" />
                        {t("risk.team.sign", "Sign")}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {t("risk.team.awaitingSignature", "Awaiting signature")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
