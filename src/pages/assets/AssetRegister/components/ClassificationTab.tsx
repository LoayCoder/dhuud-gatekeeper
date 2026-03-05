import { useTranslation } from 'react-i18next';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Info } from 'lucide-react';
import { AssetFormValues } from '../types';

export function ClassificationTab({ state }: { state: ReturnType<typeof import('../hooks/useAssetRegisterState').useAssetRegisterState> }) {
  const { t, direction, isArabic, editId, categories, types, subtypes, bulkQuantity, form, selectedCategoryId, setSelectedCategoryId, setSelectedTypeId, previewCodes, generateSequentialCodes, setBulkQuantity } = state;
  return (
    <TabsContent value="classification">
      <Card>
        <CardHeader>
          <CardTitle>{t('assets.classificationTitle')}</CardTitle>
          <CardDescription>{t('assets.classificationDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.category')} *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      setSelectedCategoryId(v);
                      setSelectedTypeId(null);
                      form.setValue('type_id', '');
                      form.setValue('subtype_id', null);
                    }}
                    dir={direction}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('assets.selectCategory')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {isArabic && cat.name_ar ? cat.name_ar : cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.type')} *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      setSelectedTypeId(v);
                      form.setValue('subtype_id', null);
                    }}
                    disabled={!selectedCategoryId}
                    dir={direction}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('assets.selectType')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {types?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {isArabic && type.name_ar ? type.name_ar : type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {subtypes && subtypes.length > 0 && (
              <FormField
                control={form.control}
                name="subtype_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assets.subtype')}</FormLabel>
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      dir={direction}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('assets.selectSubtype')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subtypes.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {isArabic && sub.name_ar ? sub.name_ar : sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="asset_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{bulkQuantity > 1 ? t('assets.startTagNumber') : t('assets.assetCode')} *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="FE-2025-0001"
                      className="font-mono bg-muted cursor-not-allowed"
                      disabled
                      readOnly
                    />
                  </FormControl>
                  <FormDescription className="flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    {t('assets.autoGeneratedCode', { defaultValue: 'Auto-generated based on category' })}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Bulk Registration Section - Only show in create mode */}
          {!editId && (
            <Card className="border-dashed bg-muted/30">
              <CardHeader className="py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  {t('assets.bulkRegistration')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel>{t('assets.quantity')}: {bulkQuantity}</FormLabel>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={bulkQuantity}
                      onChange={(e) => setBulkQuantity(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-20 h-8 text-center"
                    />
                  </div>
                  <Slider
                    value={[bulkQuantity]}
                    onValueChange={(val) => setBulkQuantity(val[0])}
                    min={1}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('assets.quantityHint')}
                  </p>
                </div>

                {/* Bulk Preview */}
                {bulkQuantity > 1 && form.watch('asset_code') && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="space-y-2">
                      <p className="font-medium">{t('assets.bulkPreview')}</p>
                      <div className="text-xs space-y-1">
                        <p>• {form.watch('name') || t('assets.name')} (×{bulkQuantity})</p>
                        <p>• {t('assets.tagRange')}: <span className="font-mono">{previewCodes[0]}</span> → <span className="font-mono">{generateSequentialCodes(form.watch('asset_code'), bulkQuantity).slice(-1)[0]}</span></p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Asset Name is auto-generated from Category + Type + Code */}

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('assets.descriptionLabel')}</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder={t('assets.descriptionPlaceholder')} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-6 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="serial_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.serialNumber')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="manufacturer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.manufacturer')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.model')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
