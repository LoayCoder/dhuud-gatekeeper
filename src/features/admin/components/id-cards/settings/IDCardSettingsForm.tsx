/**
 * ID Card Settings Form Component
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FieldSelector } from "./FieldSelector";
import { Loader2, RotateCcw, Save, Copy } from "lucide-react";
import type { 
  TenantIDCardSettings, 
  IDCardType,
  FrontFieldKey,
  BackFieldKey,
  QRPosition,
  LogoPosition,
  CardOrientation,
  TemplatePreset,
} from "@/types/id-card.types";

// Available front fields per card type
const FRONT_FIELDS_BY_TYPE: Record<IDCardType, FrontFieldKey[]> = {
  visitor: ['full_name', 'full_name_ar', 'company', 'destination', 'host_name', 'valid_until', 'entry_date', 'badge_number'],
  visitor_vip: ['full_name', 'full_name_ar', 'company', 'destination', 'host_name', 'valid_until'],
  worker: ['full_name', 'full_name_ar', 'company', 'role', 'project', 'valid_until', 'badge_number', 'national_id'],
  employee: ['full_name', 'full_name_ar', 'department', 'role', 'employee_id', 'badge_number'],
  contractor_rep: ['full_name', 'full_name_ar', 'company', 'role', 'valid_until', 'badge_number'],
};

const BACK_FIELDS: BackFieldKey[] = [
  'emergency_contact',
  'safety_instructions',
  'induction_status',
  'contract_validity',
  'company_contact',
  'office_location',
  'custom_text',
];

const formSchema = z.object({
  template_preset: z.enum(['standard', 'minimal', 'corporate', 'safety']),
  card_orientation: z.enum(['portrait', 'landscape']),
  front_bg_color: z.string(),
  front_accent_color: z.string(),
  front_text_color: z.string(),
  show_photo: z.boolean(),
  show_qr_code: z.boolean(),
  qr_position: z.enum(['left', 'right', 'bottom']),
  front_fields: z.array(z.string()),
  show_logo: z.boolean(),
  logo_position: z.enum(['top-left', 'top-right', 'top-center']),
  show_tenant_name: z.boolean(),
  back_enabled: z.boolean(),
  back_bg_color: z.string(),
  back_fields: z.array(z.string()),
  back_custom_text: z.string().nullable(),
  back_custom_text_ar: z.string().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface IDCardSettingsFormProps {
  settings: Partial<TenantIDCardSettings>;
  cardType: IDCardType;
  onSave: (values: Partial<TenantIDCardSettings>) => void;
  onReset: () => void;
  onDuplicateClick: () => void;
  onChange: (values: Partial<TenantIDCardSettings>) => void;
  isSaving?: boolean;
}

// Preset configurations
const PRESET_CONFIGS: Record<TemplatePreset, Partial<FormValues>> = {
  standard: {
    front_bg_color: '#FFFFFF',
    front_accent_color: '#3b82f6',
    front_text_color: '#1f2937',
    back_bg_color: '#f9fafb',
  },
  minimal: {
    front_bg_color: '#FFFFFF',
    front_accent_color: '#6b7280',
    front_text_color: '#374151',
    back_bg_color: '#FFFFFF',
  },
  corporate: {
    front_bg_color: '#FFFFFF',
    front_accent_color: '#1e40af',
    front_text_color: '#1e3a5f',
    back_bg_color: '#f0f4f8',
  },
  safety: {
    front_bg_color: '#FFFFFF',
    front_accent_color: '#ea580c',
    front_text_color: '#1f2937',
    back_bg_color: '#fef3c7',
  },
};

export function IDCardSettingsForm({
  settings,
  cardType,
  onSave,
  onReset,
  onDuplicateClick,
  onChange,
  isSaving = false,
}: IDCardSettingsFormProps) {
  const { t } = useTranslation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      template_preset: (settings.template_preset as TemplatePreset) || 'standard',
      card_orientation: (settings.card_orientation as CardOrientation) || 'portrait',
      front_bg_color: settings.front_bg_color || '#FFFFFF',
      front_accent_color: settings.front_accent_color || '#3b82f6',
      front_text_color: settings.front_text_color || '#1f2937',
      show_photo: settings.show_photo ?? true,
      show_qr_code: settings.show_qr_code ?? true,
      qr_position: (settings.qr_position as QRPosition) || 'bottom',
      front_fields: (settings.front_fields as string[]) || ['full_name', 'company', 'role'],
      show_logo: settings.show_logo ?? true,
      logo_position: (settings.logo_position as LogoPosition) || 'top-left',
      show_tenant_name: settings.show_tenant_name ?? true,
      back_enabled: settings.back_enabled ?? false,
      back_bg_color: settings.back_bg_color || '#f9fafb',
      back_fields: (settings.back_fields as string[]) || ['emergency_contact', 'safety_instructions'],
      back_custom_text: settings.back_custom_text || '',
      back_custom_text_ar: settings.back_custom_text_ar || '',
    },
  });

  // Watch form values and notify parent
  const watchedValues = form.watch();
  
  useEffect(() => {
    onChange(watchedValues as Partial<TenantIDCardSettings>);
  }, [JSON.stringify(watchedValues)]);

  // Apply preset when changed
  const handlePresetChange = (preset: TemplatePreset) => {
    const presetConfig = PRESET_CONFIGS[preset];
    Object.entries(presetConfig).forEach(([key, value]) => {
      form.setValue(key as keyof FormValues, value as unknown);
    });
  };

  const handleSubmit = (values: FormValues) => {
    onSave(values as Partial<TenantIDCardSettings>);
  };

  const availableFrontFields = FRONT_FIELDS_BY_TYPE[cardType];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Template Preset */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("idCard.settings.templatePreset", "Template Preset")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="template_preset"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        handlePresetChange(value as TemplatePreset);
                      }}
                      value={field.value}
                      className="grid grid-cols-2 gap-3"
                    >
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="standard" id="preset-standard" />
                        <label htmlFor="preset-standard" className="text-sm cursor-pointer">
                          {t("idCard.presets.standard", "Standard")}
                        </label>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="minimal" id="preset-minimal" />
                        <label htmlFor="preset-minimal" className="text-sm cursor-pointer">
                          {t("idCard.presets.minimal", "Minimal")}
                        </label>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="corporate" id="preset-corporate" />
                        <label htmlFor="preset-corporate" className="text-sm cursor-pointer">
                          {t("idCard.presets.corporate", "Corporate")}
                        </label>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="safety" id="preset-safety" />
                        <label htmlFor="preset-safety" className="text-sm cursor-pointer">
                          {t("idCard.presets.safety", "Safety")}
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Card Orientation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("idCard.settings.cardLayout", "Card Layout")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="card_orientation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("idCard.settings.orientation", "Orientation")}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="portrait" id="orient-portrait" />
                        <label htmlFor="orient-portrait" className="text-sm cursor-pointer">
                          {t("idCard.orientation.portrait", "Portrait")}
                        </label>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value="landscape" id="orient-landscape" />
                        <label htmlFor="orient-landscape" className="text-sm cursor-pointer">
                          {t("idCard.orientation.landscape", "Landscape")}
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="show_photo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="text-sm">{t("idCard.settings.showPhoto", "Show Photo")}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="show_qr_code"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="text-sm">{t("idCard.settings.showQR", "Show QR Code")}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {form.watch('show_qr_code') && (
              <FormField
                control={form.control}
                name="qr_position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("idCard.settings.qrPosition", "QR Code Position")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="left">{t("idCard.position.left", "Left")}</SelectItem>
                        <SelectItem value="right">{t("idCard.position.right", "Right")}</SelectItem>
                        <SelectItem value="bottom">{t("idCard.position.bottom", "Bottom")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("idCard.settings.colors", "Colors")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="front_bg_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t("idCard.colors.background", "Background")}</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          {...field}
                          className="w-10 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          {...field}
                          placeholder="#FFFFFF"
                          className="flex-1 font-mono text-xs"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="front_accent_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t("idCard.colors.accent", "Accent")}</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          {...field}
                          className="w-10 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          {...field}
                          placeholder="#3b82f6"
                          className="flex-1 font-mono text-xs"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="front_text_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t("idCard.colors.text", "Text")}</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          {...field}
                          className="w-10 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          {...field}
                          placeholder="#1f2937"
                          className="flex-1 font-mono text-xs"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("idCard.settings.branding", "Branding")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="show_logo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="text-sm">{t("idCard.settings.showLogo", "Show Logo")}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="show_tenant_name"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="text-sm">{t("idCard.settings.showTenantName", "Show Company Name")}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {form.watch('show_logo') && (
              <FormField
                control={form.control}
                name="logo_position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("idCard.settings.logoPosition", "Logo Position")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="top-left">{t("idCard.position.topLeft", "Top Left")}</SelectItem>
                        <SelectItem value="top-center">{t("idCard.position.topCenter", "Top Center")}</SelectItem>
                        <SelectItem value="top-right">{t("idCard.position.topRight", "Top Right")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Front Fields */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("idCard.settings.frontFields", "Front Fields")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="front_fields"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FieldSelector
                      title=""
                      availableFields={availableFrontFields}
                      selectedFields={field.value as FrontFieldKey[]}
                      onChange={(fields) => field.onChange(fields)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Back Side */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("idCard.settings.backSide", "Back Side")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="back_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>{t("idCard.settings.enableBack", "Enable Back Side")}</FormLabel>
                    <FormDescription className="text-xs">
                      {t("idCard.settings.enableBackDesc", "Print additional information on the back of the card")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch('back_enabled') && (
              <>
                <FormField
                  control={form.control}
                  name="back_bg_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">{t("idCard.colors.backBackground", "Back Background Color")}</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            {...field}
                            className="w-10 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            {...field}
                            placeholder="#f9fafb"
                            className="flex-1 font-mono text-sm"
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="back_fields"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FieldSelector
                          title={t("idCard.settings.backFields", "Back Fields")}
                          availableFields={BACK_FIELDS}
                          selectedFields={field.value as BackFieldKey[]}
                          onChange={(fields) => field.onChange(fields)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Separator />

                <FormField
                  control={form.control}
                  name="back_custom_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("idCard.settings.customTextEn", "Custom Text (English)")}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ''}
                          placeholder={t("idCard.settings.customTextPlaceholder", "Enter custom text to display on the back...")}
                          rows={2}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="back_custom_text_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("idCard.settings.customTextAr", "Custom Text (Arabic)")}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ''}
                          placeholder="أدخل النص المخصص للعرض على الظهر..."
                          rows={2}
                          dir="rtl"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onDuplicateClick}>
              <Copy className="h-4 w-4 me-2" />
              {t("idCard.settings.duplicateFrom", "Duplicate From...")}
            </Button>
            <Button type="button" variant="ghost" onClick={onReset}>
              <RotateCcw className="h-4 w-4 me-2" />
              {t("idCard.settings.resetDefault", "Reset to Default")}
            </Button>
          </div>
          
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin me-2" />
                {t("common.saving", "Saving...")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 me-2" />
                {t("common.saveChanges", "Save Changes")}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
