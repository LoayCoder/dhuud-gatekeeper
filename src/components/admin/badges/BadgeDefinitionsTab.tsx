import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Circle } from 'lucide-react';
import { useBadgeDefinitions, useToggleBadgeActive, type BadgeDefinition } from '@/hooks/use-badge-admin';
import { BadgeFormDialog } from './BadgeFormDialog';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

// Professional muted tier styling
const tierStyles: Record<string, string> = {
  bronze: 'bg-muted text-muted-foreground',
  silver: 'bg-secondary text-secondary-foreground',
  gold: 'bg-secondary text-secondary-foreground',
  platinum: 'bg-primary/10 text-primary',
};

// Professional category labels
const categoryStyles: Record<string, string> = {
  reporting: 'bg-muted text-muted-foreground',
  quality: 'bg-muted text-muted-foreground',
  streak: 'bg-muted text-muted-foreground',
  milestone: 'bg-muted text-muted-foreground',
  special: 'bg-muted text-muted-foreground',
};

function BadgeIcon({ iconName }: { iconName: string }) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>>;
  const IconComponent = icons[iconName];
  if (!IconComponent) return <Circle className="h-4 w-4" strokeWidth={1.5} />;
  return <IconComponent className="h-4 w-4" strokeWidth={1.5} />;
}

export function BadgeDefinitionsTab() {
  const { t, i18n } = useTranslation();
  const { data: badges, isLoading } = useBadgeDefinitions();
  const { mutate: toggleActive } = useToggleBadgeActive();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeDefinition | null>(null);
  const isRTL = i18n.language === 'ar';

  const handleEdit = (badge: BadgeDefinition) => {
    setEditingBadge(badge);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingBadge(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingBadge(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium">
              {t('admin.badges.credentialDefinitions', 'Credential Definitions')}
            </CardTitle>
            <CardDescription>
              {t('admin.badges.manageCredentials', 'Manage credential types and their criteria')}
            </CardDescription>
          </div>
          <Button onClick={handleCreate} size="sm" variant="outline">
            <Plus className="h-4 w-4 me-2" />
            {t('admin.badges.addCredential', 'Add Credential')}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
            <div className="col-span-4">{t('admin.badges.name', 'Name')}</div>
            <div className="col-span-2">{t('admin.badges.level', 'Level')}</div>
            <div className="col-span-2">{t('admin.badges.category', 'Category')}</div>
            <div className="col-span-1">{t('admin.badges.points', 'Points')}</div>
            <div className="col-span-2">{t('admin.badges.status', 'Status')}</div>
            <div className="col-span-1"></div>
          </div>

          <div className="divide-y">
            {badges?.map((badge) => (
              <div
                key={badge.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-4 py-4 hover:bg-muted/50 transition-colors"
              >
                {/* Name and description */}
                <div className="md:col-span-4 flex items-center gap-3">
                  <div className="flex items-center justify-center h-9 w-9 rounded-md border bg-muted/50">
                    <BadgeIcon iconName={badge.icon_name} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {isRTL && badge.name_ar ? badge.name_ar : badge.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {badge.badge_key}
                    </p>
                  </div>
                </div>

                {/* Level/Tier */}
                <div className="md:col-span-2">
                  <Badge className={cn('capitalize text-xs font-normal', tierStyles[badge.tier])} variant="secondary">
                    {badge.tier}
                  </Badge>
                </div>

                {/* Category */}
                <div className="md:col-span-2">
                  <Badge className={cn('capitalize text-xs font-normal', categoryStyles[badge.category])} variant="secondary">
                    {badge.category}
                  </Badge>
                </div>

                {/* Points */}
                <div className="md:col-span-1 text-sm tabular-nums text-muted-foreground">
                  {badge.points}
                </div>

                {/* Status */}
                <div className="md:col-span-2 flex items-center gap-2">
                  <Switch
                    checked={badge.is_active}
                    onCheckedChange={(checked) =>
                      toggleActive({ id: badge.id, is_active: checked })
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {badge.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                  </span>
                </div>

                {/* Actions */}
                <div className="md:col-span-1 flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(badge)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {(!badges || badges.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <Circle className="h-10 w-10 mx-auto mb-4 opacity-30" strokeWidth={1} />
                <p className="text-sm">{t('admin.badges.noCredentials', 'No credentials defined')}</p>
                <Button onClick={handleCreate} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 me-2" />
                  {t('admin.badges.addFirst', 'Add your first credential')}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <BadgeFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        badge={editingBadge}
      />
    </>
  );
}
