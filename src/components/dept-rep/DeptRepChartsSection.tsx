import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DeptRepComplianceChart } from './DeptRepComplianceChart';
import { DeptRepTrendChart } from './DeptRepTrendChart';
import { useDeptRepSLAAnalytics } from '@/hooks/use-dept-rep-sla-analytics';

export function DeptRepChartsSection() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  
  const { data, isLoading } = useDeptRepSLAAnalytics({ period });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {t('sla.analytics', 'SLA Analytics')}
          </h2>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent>
        <div className="grid gap-4 md:grid-cols-2">
          <DeptRepComplianceChart 
            data={data?.compliance_stats} 
            isLoading={isLoading} 
          />
          <DeptRepTrendChart 
            data={data?.trend_data} 
            isLoading={isLoading}
            period={period}
            onPeriodChange={setPeriod}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
