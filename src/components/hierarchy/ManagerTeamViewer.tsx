import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, User, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TeamHierarchyNode, useManagerTeam } from '@/hooks/use-manager-team';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ManagerTeamViewerProps {
  managerId: string;
  managerName?: string;
  compact?: boolean;
}

export function ManagerTeamViewer({ managerId, managerName, compact }: ManagerTeamViewerProps) {
  const { t, i18n } = useTranslation();
  const { teamHierarchy, teamMembers, isLoading, isManager } = useManagerTeam(managerId);
  const [open, setOpen] = useState(false);
  const isRTL = i18n.dir() === 'rtl';

  if (!isManager && !isLoading) {
    return null;
  }

  if (compact) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="h-4 w-4" />
            {t('hierarchy.viewTeam')}
            {teamMembers.length > 0 && (
              <Badge variant="secondary" className="ms-1">
                {teamMembers.length}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className={cn(isRTL && "text-right")}>
              {t('hierarchy.teamStructure')}
            </DialogTitle>
            <DialogDescription className={cn(isRTL && "text-right")}>
              {managerName && t('hierarchy.teamOf', { name: managerName })}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : teamHierarchy.length === 0 ? (
              <p className={cn(
                "text-muted-foreground text-center py-8",
                isRTL && "text-right"
              )}>
                {t('hierarchy.noTeamMembers')}
              </p>
            ) : (
              <div className="space-y-1 p-2">
                {teamHierarchy.map(node => (
                  <TreeNode key={node.id} node={node} depth={0} isRTL={isRTL} />
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn("text-lg flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <Users className="h-5 w-5" />
          {t('hierarchy.teamStructure')}
        </CardTitle>
        <CardDescription className={cn(isRTL && "text-right")}>
          {t('hierarchy.readOnlyView')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : teamHierarchy.length === 0 ? (
          <p className={cn(
            "text-muted-foreground text-center py-8",
            isRTL && "text-right"
          )}>
            {t('hierarchy.noTeamMembers')}
          </p>
        ) : (
          <div className="space-y-1">
            {teamHierarchy.map(node => (
              <TreeNode key={node.id} node={node} depth={0} isRTL={isRTL} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TreeNodeProps {
  node: TeamHierarchyNode;
  depth: number;
  isRTL: boolean;
}

function TreeNode({ node, depth, isRTL }: TreeNodeProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  
  const paddingStart = depth * 24;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors",
          isRTL && "flex-row-reverse"
        )}
        style={{ 
          [isRTL ? 'paddingRight' : 'paddingLeft']: `${paddingStart}px` 
        }}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              isRTL ? <ChevronRight className="h-4 w-4 rotate-180" /> : <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <div className="w-5" />
        )}
        
        <div className={cn(
          "flex items-center gap-2 min-w-0 flex-1",
          isRTL && "flex-row-reverse"
        )}>
          <div className={cn(
            "p-1.5 rounded-full",
            node.is_active ? "bg-primary/10" : "bg-muted"
          )}>
            <User className={cn(
              "h-4 w-4",
              node.is_active ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          
          <div className={cn("flex flex-col min-w-0", isRTL && "items-end")}>
            <span className={cn(
              "font-medium truncate",
              !node.is_active && "text-muted-foreground"
            )}>
              {node.full_name || t('common.unknown')}
            </span>
            {node.job_title && (
              <span className="text-xs text-muted-foreground truncate">
                {node.job_title}
              </span>
            )}
          </div>
          
          {!node.is_active && (
            <Badge variant="outline" className="text-xs ms-auto">
              {t('userManagement.inactive')}
            </Badge>
          )}
          
          {hasChildren && (
            <Badge variant="secondary" className="text-xs">
              {node.children.length}
            </Badge>
          )}
        </div>
      </div>
      
      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} isRTL={isRTL} />
          ))}
        </div>
      )}
    </div>
  );
}
