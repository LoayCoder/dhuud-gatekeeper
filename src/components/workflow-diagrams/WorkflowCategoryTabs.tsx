import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  AlertTriangle, 
  ClipboardCheck, 
  Shield, 
  Building2,
  HardHat
} from 'lucide-react';
import { WorkflowCategory, workflowCategories } from '@/lib/workflow-definitions';

interface WorkflowCategoryTabsProps {
  value: WorkflowCategory;
  onValueChange: (value: WorkflowCategory) => void;
  className?: string;
}

const categoryIcons: Record<WorkflowCategory, React.ComponentType<{ className?: string }>> = {
  hsse_events: AlertTriangle,
  inspections: ClipboardCheck,
  compliance: Shield,
  assets: Building2,
  contractor: HardHat,
};

export function WorkflowCategoryTabs({ value, onValueChange, className }: WorkflowCategoryTabsProps) {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const direction = i18n.dir();

  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(v as WorkflowCategory)}
      dir={direction}
      className={className}
    >
      <TabsList className="grid grid-cols-5 h-auto p-1">
        {workflowCategories.map((cat) => {
          const Icon = categoryIcons[cat.id];
          return (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className={cn(
                'flex flex-col gap-1 py-2 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{isRtl ? cat.nameAr : cat.name}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
