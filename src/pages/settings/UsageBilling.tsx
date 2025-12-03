import { useTranslation } from 'react-i18next';
import { ProfileUsageCard } from '@/components/billing/ProfileUsageCard';
import { LicensedUserQuotaCard } from '@/components/billing/LicensedUserQuotaCard';
import { useProfileUsage } from '@/hooks/use-profile-usage';
import { useLicensedUserQuota } from '@/hooks/use-licensed-user-quota';
import { useProfileBilling } from '@/hooks/use-profile-billing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { formatSAR } from '@/lib/pricing-engine';
import { History } from 'lucide-react';

export default function UsageBilling() {
  const { t } = useTranslation();
  const { usage, isLoading: usageLoading } = useProfileUsage();
  const { quota, breakdown, isLoading: quotaLoading } = useLicensedUserQuota();
  const { billingRecords, isLoading: billingLoading } = useProfileBilling();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('profileBilling.title')}</h1>
        <p className="text-muted-foreground">{t('profileBilling.description')}</p>
      </div>

      {/* Current Usage Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfileUsageCard usage={usage} isLoading={usageLoading} />
        <LicensedUserQuotaCard quota={quota} breakdown={breakdown} isLoading={quotaLoading} />
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('profileBilling.billingHistory')}
          </CardTitle>
          <CardDescription>{t('profileBilling.billingHistoryDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {billingLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          ) : billingRecords?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('profileBilling.month')}</TableHead>
                  <TableHead>{t('profileBilling.totalProfiles')}</TableHead>
                  <TableHead>{t('profileBilling.billableProfiles')}</TableHead>
                  <TableHead>{t('profileBilling.charges')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {format(new Date(record.billing_month), 'MMMM yyyy')}
                    </TableCell>
                    <TableCell>{record.total_profiles}</TableCell>
                    <TableCell>{record.billable_profiles}</TableCell>
                    <TableCell>{formatSAR(record.profile_charges)}</TableCell>
                    <TableCell>
                      <Badge variant={record.status === 'paid' ? 'default' : 'secondary'}>
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              {t('profileBilling.noHistory')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
