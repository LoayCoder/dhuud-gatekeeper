import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ClipboardCheck, 
  Search, 
  AlertTriangle, 
  ListTodo,
  FileText,
  Calendar,
  ExternalLink
} from "lucide-react";
import { useQuickActionDrilldown, QuickActionType, QuickActionItem } from "@/hooks/use-quick-action-drilldown";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface QuickActionDrilldownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: QuickActionType | null;
}

const ACTION_CONFIG: Record<QuickActionType, { 
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  color: string;
}> = {
  pending_approvals: {
    icon: ClipboardCheck,
    titleKey: 'hsseDashboard.pendingApprovals',
    color: 'text-warning',
  },
  open_investigations: {
    icon: Search,
    titleKey: 'hsseDashboard.openInvestigations',
    color: 'text-primary',
  },
  overdue_actions: {
    icon: AlertTriangle,
    titleKey: 'hsseDashboard.overdueActions',
    color: 'text-destructive',
  },
  my_actions: {
    icon: ListTodo,
    titleKey: 'hsseDashboard.myActions',
    color: 'text-primary',
  },
};

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status.includes('overdue') || status.includes('critical')) return 'destructive';
  if (status.includes('pending') || status.includes('in_progress')) return 'secondary';
  return 'outline';
}

function getSeverityColor(severity?: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'text-destructive';
    case 'medium':
      return 'text-warning';
    case 'low':
      return 'text-muted-foreground';
    default:
      return 'text-foreground';
  }
}

function ItemCard({ item, onClick }: { item: QuickActionItem; onClick: () => void }) {
  const { i18n, t } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const locale = isRTL ? ar : enUS;

  const isOverdue = item.due_date && new Date(item.due_date) < new Date();

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-start p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
        "flex flex-col gap-2 group"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">{item.reference_id}</span>
        </div>
        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
      
      <p className="text-sm font-medium line-clamp-2">{item.title}</p>
      
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge variant={getStatusBadgeVariant(item.status)} className="text-xs">
          {t(`incidentStatus.${item.status}`, item.status.replace(/_/g, ' '))}
        </Badge>
        
        {item.severity && (
          <span className={cn("text-xs font-medium", getSeverityColor(item.severity))}>
            {t(`common.priority${item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}`, item.severity)}
          </span>
        )}
        
        {item.due_date && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            isOverdue ? "text-destructive" : "text-muted-foreground"
          )}>
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(item.due_date), 'dd MMM yyyy', { locale })}</span>
          </div>
        )}
      </div>
    </button>
  );
}

export function QuickActionDrilldownModal({ 
  open, 
  onOpenChange, 
  actionType 
}: QuickActionDrilldownModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: items, isLoading } = useQuickActionDrilldown(open ? actionType : null);

  if (!actionType) return null;

  const config = ACTION_CONFIG[actionType];
  const Icon = config.icon;

  const handleItemClick = (item: QuickActionItem) => {
    onOpenChange(false);
    if (item.type === 'incident') {
      navigate(`/incidents/${item.id}`);
    } else {
      navigate(`/incidents/my-actions?action=${item.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", config.color)} />
            {t(config.titleKey)}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : items && items.length > 0 ? (
            <div className="space-y-2 pb-4">
              {items.map((item) => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Icon className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {t('hsseDashboard.quickActionModal.noItems', 'No items to display')}
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
