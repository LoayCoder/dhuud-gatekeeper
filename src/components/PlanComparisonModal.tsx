import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Scale } from "lucide-react";
import { ModuleCode } from "@/hooks/use-module-access";

interface PlanComparisonModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ALL_MODULES: { code: ModuleCode; key: string }[] = [
  { code: 'hsse_core', key: 'modules.hsse_core' },
  { code: 'visitor_management', key: 'modules.visitor_management' },
  { code: 'incidents', key: 'modules.incidents' },
  { code: 'audits', key: 'modules.audits' },
  { code: 'reports_analytics', key: 'modules.reports_analytics' },
  { code: 'api_access', key: 'modules.api_access' },
  { code: 'priority_support', key: 'modules.priority_support' },
];

export function PlanComparisonModal({ trigger, open, onOpenChange }: PlanComparisonModalProps) {
  const { t } = useTranslation();

  const { data: plans = [] } = useQuery({
    queryKey: ['plans-with-modules'],
    queryFn: async () => {
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (plansError) throw plansError;

      const { data: modulesData, error: modulesError } = await supabase
        .from('plan_modules')
        .select('plan_id, module');
      
      if (modulesError) throw modulesError;

      return plansData.map(plan => ({
        ...plan,
        modules: modulesData
          .filter(m => m.plan_id === plan.id)
          .map(m => m.module as ModuleCode)
      }));
    },
  });

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Scale className="h-4 w-4" />
      {t('subscription.comparePlans')}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('subscription.planComparison')}</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-start p-3 border-b font-medium text-muted-foreground">
                  {t('subscription.features')}
                </th>
                {plans.map(plan => (
                  <th key={plan.id} className="p-3 border-b text-center">
                    <div className="font-semibold">{plan.display_name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${plan.price_monthly}/{t('subscription.perMonth')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* User Limit Row */}
              <tr className="border-b">
                <td className="p-3 font-medium">{t('subscription.maxUsers')}</td>
                {plans.map(plan => (
                  <td key={plan.id} className="p-3 text-center">
                    <Badge variant="secondary">{plan.max_users}</Badge>
                  </td>
                ))}
              </tr>
              
              {/* Module Rows */}
              {ALL_MODULES.map(module => (
                <tr key={module.code} className="border-b hover:bg-muted/50">
                  <td className="p-3">{t(module.key)}</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="p-3 text-center">
                      {plan.modules?.includes(module.code) ? (
                        <Check className="h-5 w-5 text-primary mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
