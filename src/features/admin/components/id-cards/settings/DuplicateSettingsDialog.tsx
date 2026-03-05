/**
 * Dialog for duplicating ID card settings from one card type to another
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Copy, Loader2 } from "lucide-react";
import { CARD_TYPE_LABELS, type IDCardType } from "@/types/id-card.types";

interface DuplicateSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCardType: IDCardType;
  onDuplicate: (options: DuplicateOptions) => Promise<void>;
  isLoading?: boolean;
}

export interface DuplicateOptions {
  sourceCardType: IDCardType;
  includeFields: boolean;
  includeColors: boolean;
  includeBackSettings: boolean;
  includeBranding: boolean;
}

const CARD_TYPES: IDCardType[] = ['visitor', 'visitor_vip', 'worker', 'employee', 'contractor_rep'];

export function DuplicateSettingsDialog({
  open,
  onOpenChange,
  currentCardType,
  onDuplicate,
  isLoading = false,
}: DuplicateSettingsDialogProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const lang = isRTL ? 'ar' : 'en';

  const [sourceCardType, setSourceCardType] = useState<IDCardType | ''>('');
  const [includeFields, setIncludeFields] = useState(true);
  const [includeColors, setIncludeColors] = useState(true);
  const [includeBackSettings, setIncludeBackSettings] = useState(true);
  const [includeBranding, setIncludeBranding] = useState(true);

  const availableTypes = CARD_TYPES.filter(type => type !== currentCardType);

  const handleDuplicate = async () => {
    if (!sourceCardType) return;

    await onDuplicate({
      sourceCardType,
      includeFields,
      includeColors,
      includeBackSettings,
      includeBranding,
    });

    onOpenChange(false);
    // Reset state
    setSourceCardType('');
    setIncludeFields(true);
    setIncludeColors(true);
    setIncludeBackSettings(true);
    setIncludeBranding(true);
  };

  const currentLabel = CARD_TYPE_LABELS[currentCardType][lang];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            {t("idCard.settings.duplicateTitle", "Duplicate Settings")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "idCard.settings.duplicateDescription",
              "Copy settings from another card type to {{cardType}}",
              { cardType: currentLabel }
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source card type selector */}
          <div className="space-y-2">
            <Label>{t("idCard.settings.copyFrom", "Copy from")}</Label>
            <Select
              value={sourceCardType}
              onValueChange={(value) => setSourceCardType(value as IDCardType)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("idCard.settings.selectCardType", "Select card type...")} />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {CARD_TYPE_LABELS[type][lang]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options checkboxes */}
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">
              {t("idCard.settings.includeSections", "Include sections")}
            </Label>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-fields"
                  checked={includeFields}
                  onCheckedChange={(checked) => setIncludeFields(!!checked)}
                />
                <Label htmlFor="include-fields" className="text-sm cursor-pointer">
                  {t("idCard.settings.includeFields", "Field selection (front & back)")}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-colors"
                  checked={includeColors}
                  onCheckedChange={(checked) => setIncludeColors(!!checked)}
                />
                <Label htmlFor="include-colors" className="text-sm cursor-pointer">
                  {t("idCard.settings.includeColors", "Colors (background, accent, text)")}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-back"
                  checked={includeBackSettings}
                  onCheckedChange={(checked) => setIncludeBackSettings(!!checked)}
                />
                <Label htmlFor="include-back" className="text-sm cursor-pointer">
                  {t("idCard.settings.includeBack", "Back side settings")}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-branding"
                  checked={includeBranding}
                  onCheckedChange={(checked) => setIncludeBranding(!!checked)}
                />
                <Label htmlFor="include-branding" className="text-sm cursor-pointer">
                  {t("idCard.settings.includeBranding", "Branding (logo, tenant name)")}
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={!sourceCardType || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin me-2" />
                {t("common.applying", "Applying...")}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 me-2" />
                {t("idCard.settings.applySettings", "Apply Settings")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
