import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Eye, GitBranch } from 'lucide-react';
import { WorkflowDefinition } from '@/lib/workflow-definitions';

interface WorkflowListProps {
  workflows: WorkflowDefinition[];
  selectedWorkflow: WorkflowDefinition | null;
  selectedForExport: Set<string>;
  onSelectWorkflow: (workflow: WorkflowDefinition) => void;
  onToggleExport: (workflowId: string) => void;
  className?: string;
}

export function WorkflowList({
  workflows,
  selectedWorkflow,
  selectedForExport,
  onSelectWorkflow,
  onToggleExport,
  className,
}: WorkflowListProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  return (
    <ScrollArea className={cn('h-[350px]', className)}>
      <div className="space-y-1.5 pe-3">
        {workflows.map((workflow) => {
          const isSelected = selectedWorkflow?.id === workflow.id;
          const isChecked = selectedForExport.has(workflow.id);

          return (
            <div
              key={workflow.id}
              className={cn(
                'group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
                isSelected
                  ? 'bg-primary/10 border border-primary/30 shadow-sm'
                  : 'hover:bg-muted/80 border border-transparent'
              )}
              onClick={() => onSelectWorkflow(workflow)}
            >
              {/* Checkbox */}
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => onToggleExport(workflow.id)}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0"
              />

              {/* Icon */}
              <div className={cn(
                'shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors',
                isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground group-hover:bg-muted-foreground/20'
              )}>
                <GitBranch className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'font-medium text-sm truncate transition-colors',
                  isSelected && 'text-primary'
                )}>
                  {isRtl ? workflow.nameAr : workflow.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    {workflow.steps.length} {t('workflowDiagrams.steps', 'steps')}
                  </Badge>
                </div>
              </div>

              {/* View indicator */}
              {isSelected && (
                <Eye className="h-4 w-4 text-primary shrink-0 animate-in fade-in duration-200" />
              )}
            </div>
          );
        })}

        {workflows.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('workflowDiagrams.noWorkflows', 'No workflows in this category')}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
