import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Users, Pencil, Trash2, BellOff, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SEVERITY_LEVELS, CHANNELS, hasChannel, NotificationMatrixRule } from '@/features/notifications';
import { RuleFormState } from '../types';
import { SEVERITY_COLORS } from '../utils';
import { ChannelIcon } from './ChannelIcon';

export interface RulesTableProps {
  groupedRules: Record<string, NotificationMatrixRule[]>;
  getUserName: (userId: string | null) => string;
  getRoleLabel: (role: string) => string;
  handleChannelToggle: (rule: NotificationMatrixRule, channel: string) => void;
  handleEditGroup: (groupKey: string) => void;
  handleDeleteGroup: (groupKey: string) => void;
  onAddFirstRule: () => void;
}

export function RulesTable({
  groupedRules,
  getUserName,
  getRoleLabel,
  handleChannelToggle,
  handleEditGroup,
  handleDeleteGroup,
  onAddFirstRule
}: RulesTableProps) {
  const { t } = useTranslation();
  return (
    <>
      {Object.keys(groupedRules).length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <BellOff className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground mb-2">
            {t('settings.notificationMatrix.noRules', 'No notification rules configured')}
          </p>
          <p className="text-sm text-muted-foreground/70 mb-6 max-w-sm mx-auto">
            {t('settings.notificationMatrix.noRulesDesc', 'Add rules to define who gets notified for each incident severity level')}
          </p>
          <Button
            onClick={() => {
              onAddFirstRule();
            }}
          >
            <Plus className="h-4 w-4 me-2" />
            {t('settings.notificationMatrix.addFirstRule', 'Add Your First Rule')}
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[200px] font-semibold">
                  {t('settings.notificationMatrix.stakeholder')}
                </TableHead>
                {SEVERITY_LEVELS.map((level) => {
                  const colors = SEVERITY_COLORS[level];
                  const levelNum = level.replace('level_', '');
                  return (
                    <TableHead key={level} className="text-center min-w-[100px] p-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'font-medium text-xs px-2 py-0.5',
                          colors.bg,
                          colors.text,
                          'border-0'
                        )}
                      >
                        L{levelNum}
                      </Badge>
                    </TableHead>
                  );
                })}
                <TableHead className="w-[80px] text-center">
                  {t('settings.notificationMatrix.condition', 'Cond.')}
                </TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedRules).map(([key, groupRules]) => {
                const isUserSpecific = key.startsWith('user_');
                const firstRule = groupRules[0];
                const displayName = isUserSpecific
                  ? getUserName(firstRule.user_id)
                  : getRoleLabel(firstRule.stakeholder_role);

                return (
                  <TableRow key={key} className="hover:bg-muted/20">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "p-1.5 rounded-md",
                          isUserSpecific ? "bg-blue-100 dark:bg-blue-900/30" : "bg-muted"
                        )}>
                          {isUserSpecific ? (
                            <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-sm">{displayName}</span>
                      </div>
                    </TableCell>
                    {SEVERITY_LEVELS.map((level) => {
                      const rule = groupRules.find(r => r.severity_level === level);
                      if (!rule) {
                        return (
                          <TableCell key={level} className="text-center p-2">
                            <span className="text-muted-foreground/30">&mdash;</span>
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={level} className="text-center p-2">
                          <div className="inline-flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
                            {CHANNELS.map((channel) => {
                              const isActive = hasChannel(rule.channels, channel);
                              return (
                                <button
                                  key={channel}
                                  onClick={() => handleChannelToggle(rule, channel)}
                                  className={cn(
                                    "p-1.5 rounded transition-all",
                                    isActive && "bg-background shadow-sm"
                                  )}
                                  title={t(`settings.notificationMatrix.channels.${channel}`)}
                                >
                                  <ChannelIcon channel={channel} active={isActive} />
                                </button>
                              );
                            })}
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center p-2">
                      {firstRule.condition_type ? (
                        <Badge variant="outline" className="text-xs font-normal">
                          {t(`settings.notificationMatrix.conditions.${firstRule.condition_type}`)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/30">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditGroup(key)}
                          title={t('common.edit')}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteGroup(key)}
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
