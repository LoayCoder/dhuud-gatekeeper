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

export function StatusTab({ state }: { state: ReturnType<typeof import('../hooks/useAssetRegisterState').useAssetRegisterState> }) {
  const { t, direction, form } = state;
  return (
    <TabsContent value="status">
      <Card>
        <CardHeader>
          <CardTitle>{t('assets.statusTitle')}</CardTitle>
          <CardDescription>{t('assets.statusDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.status.label')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">{t('assets.status.active')}</SelectItem>
                      <SelectItem value="inactive">{t('assets.status.inactive')}</SelectItem>
                      <SelectItem value="under_maintenance">{t('assets.status.under_maintenance')}</SelectItem>
                      <SelectItem value="out_of_service">{t('assets.status.out_of_service')}</SelectItem>
                      <SelectItem value="disposed">{t('assets.status.disposed')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="condition_rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.conditionLabel')}</FormLabel>
                  <Select value={field.value || ''} onValueChange={(v) => field.onChange(v || null)} dir={direction}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('assets.selectCondition')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="excellent">{t('assets.conditions.excellent')}</SelectItem>
                      <SelectItem value="good">{t('assets.conditions.good')}</SelectItem>
                      <SelectItem value="fair">{t('assets.conditions.fair')}</SelectItem>
                      <SelectItem value="poor">{t('assets.conditions.poor')}</SelectItem>
                      <SelectItem value="critical">{t('assets.conditions.critical')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="criticality_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.criticality.label')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">{t('assets.criticality.low')}</SelectItem>
                      <SelectItem value="medium">{t('assets.criticality.medium')}</SelectItem>
                      <SelectItem value="high">{t('assets.criticality.high')}</SelectItem>
                      <SelectItem value="critical">{t('assets.criticality.critical')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ownership"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.ownershipLabel')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="company">{t('assets.ownership.company')}</SelectItem>
                      <SelectItem value="leased">{t('assets.ownership.leased')}</SelectItem>
                      <SelectItem value="rented">{t('assets.ownership.rented')}</SelectItem>
                      <SelectItem value="contractor">{t('assets.ownership.contractor')}</SelectItem>
                    </SelectContent>
                  </Select>
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
