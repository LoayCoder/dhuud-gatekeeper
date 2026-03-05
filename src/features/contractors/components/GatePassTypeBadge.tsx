import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

interface GatePassTypeBadgeProps {
  isInternal: boolean | null | undefined;
}

export function GatePassTypeBadge({ isInternal }: GatePassTypeBadgeProps) {
  const { t } = useTranslation();

  return isInternal ? (
    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
      {t("gatePasses.type.internal", "Internal")}
    </Badge>
  ) : (
    <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
      {t("gatePasses.type.external", "External")}
    </Badge>
  );
}
