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

export function LocationTab({ state }: { state: ReturnType<typeof import('../hooks/useAssetRegisterState').useAssetRegisterState> }) {
  const { t, direction, isArabic, form, branches, filteredSites, buildings, floorsZones, selectedBranchId, setSelectedBranchId, selectedSiteId, setSelectedSiteId, selectedBuildingId, setSelectedBuildingId } = state;
  return (
    <TabsContent value="location">
      <Card>
        <CardHeader>
          <CardTitle>{t('assets.locationTitle')}</CardTitle>
          <CardDescription>{t('assets.locationDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="branch_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('orgStructure.branch')}</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={(v) => {
                      field.onChange(v || null);
                      setSelectedBranchId(v || null);
                      form.setValue('site_id', null);
                      setSelectedSiteId(null);
                    }}
                    dir={direction}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('assets.selectBranch')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
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
              name="site_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('orgStructure.site')}</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={(v) => {
                      field.onChange(v || null);
                      setSelectedSiteId(v || null);
                      form.setValue('building_id', null);
                      setSelectedBuildingId(null);
                    }}
                    dir={direction}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('assets.selectSite')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredSites?.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
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
              name="building_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.building')}</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={(v) => {
                      field.onChange(v || null);
                      setSelectedBuildingId(v || null);
                      form.setValue('floor_zone_id', null);
                    }}
                    disabled={!selectedSiteId}
                    dir={direction}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('assets.selectBuilding')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {buildings?.map((bldg) => (
                        <SelectItem key={bldg.id} value={bldg.id}>
                          {isArabic && bldg.name_ar ? bldg.name_ar : bldg.name}
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
              name="floor_zone_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.floorZone')}</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={(v) => field.onChange(v || null)}
                    disabled={!selectedBuildingId}
                    dir={direction}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('assets.selectFloorZone')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {floorsZones?.map((fz) => (
                        <SelectItem key={fz.id} value={fz.id}>
                          {isArabic && fz.name_ar ? fz.name_ar : fz.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="location_details"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('assets.locationDetails')}</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder={t('assets.locationDetailsPlaceholder')} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </TabsContent>
  );
}
