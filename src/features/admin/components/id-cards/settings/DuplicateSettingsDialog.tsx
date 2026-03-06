/**
 * Dialog for duplicating ID card settings from one card type to another
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { duplicateSettingsSchema, DuplicateSettingsValues } from "./DuplicateSettingsSchema";
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

  const form = useForm<DuplicateSettingsValues>({
    resolver: zodResolver(duplicateSettingsSchema),
    defaultValues: {
      sourceCardType: '',
      includeFields: true,
      includeColors: true,
      includeBackSettings: true,
      includeBranding: true,
    }
  });

  const availableTypes = CARD_TYPES.filter(type => type !== currentCardType);

  const onSubmit = form.handleSubmit(async (data) => {
    if (!data.sourceCardType) return;

    await onDuplicate({
      sourceCardType: data.sourceCardType as IDCardType,
      includeFields: data.includeFields,
      includeColors: data.includeColors,
      includeBackSettings: data.includeBackSettings,
      includeBranding: data.includeBranding,
    });

    onOpenChange(false);
    // Reset state
    form.reset();
  });

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
            <Controller
              name="sourceCardType"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
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
              )}
            />
          </div>

          {/* Options checkboxes */}
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">
              {t("idCard.settings.includeSections", "Include sections")}
            </Label>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Controller
                  name="includeFields"
                  control={form.control}
                  render={({ field }) => (
                    <Checkbox
                      id="include-fields"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="include-fields" className="text-sm cursor-pointer">
                  {t("idCard.settings.includeFields", "Field selection (front & back)")}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Controller
                  name="includeColors"
                  control={form.control}
                  render={({ field }) => (
                    <Checkbox
                      id="include-colors"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="include-colors" className="text-sm cursor-pointer">
                  {t("idCard.settings.includeColors", "Colors (background, accent, text)")}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Controller
                  name="includeBackSettings"
                  control={form.control}
                  render={({ field }) => (
                    <Checkbox
                      id="include-back"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="include-back" className="text-sm cursor-pointer">
                  {t("idCard.settings.includeBack", "Back side settings")}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Controller
                  name="includeBranding"
                  control={form.control}
                  render={({ field }) => (
                    <Checkbox
                      id="include-branding"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
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
            onClick={onSubmit}
            disabled={!form.watch('sourceCardType') || isLoading}
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
