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

export function LifecycleTab({ state }: { state: ReturnType<typeof import('../hooks/useAssetRegisterState').useAssetRegisterState> }) {
  const { t, form } = state;
  return (
    <TabsContent value="lifecycle">
      <Card>
        <CardHeader>
          <CardTitle>{t('assets.lifecycleTitle')}</CardTitle>
          <CardDescription>{t('assets.lifecycleDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="installation_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.installationDate')}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commissioning_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.commissioningDate')}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="warranty_expiry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.warrantyExpiry')}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expected_lifespan_years"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.expectedLifespan')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormDescription>{t('assets.yearsUnit')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inspection_interval_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.inspectionInterval')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormDescription>{t('assets.daysUnit')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maintenance_vendor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.maintenanceVendor')}</FormLabel>
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
