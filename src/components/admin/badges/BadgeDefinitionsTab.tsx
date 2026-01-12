import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Award } from 'lucide-react';
import { useBadgeDefinitions, useToggleBadgeActive, type BadgeDefinition } from '@/hooks/use-badge-admin';
import { BadgeFormDialog } from './BadgeFormDialog';
import * as LucideIcons from 'lucide-react';

const tierColors = {
  bronze: 'bg-amber-600/20 text-amber-700 border-amber-600/30',
  silver: 'bg-slate-400/20 text-slate-600 border-slate-400/30',
  gold: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  platinum: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
};

const categoryColors: Record<string, string> = {
  reporting: 'bg-blue-100 text-blue-700',
  quality: 'bg-green-100 text-green-700',
  streak: 'bg-orange-100 text-orange-700',
  milestone: 'bg-indigo-100 text-indigo-700',
  special: 'bg-pink-100 text-pink-700',
};

function BadgeIcon({ iconName }: { iconName: string }) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const IconComponent = icons[iconName];
  if (!IconComponent) return <Award className="h-5 w-5" />;
  return <IconComponent className="h-5 w-5" />;
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
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
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
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {t('admin.badges.allBadges', 'All Badges')}
            <Badge variant="secondary">{badges?.length || 0}</Badge>
          </CardTitle>
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 me-2" />
            {t('admin.badges.createBadge', 'Create Badge')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {badges?.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: badge.color_scheme + '20' }}
                  >
                    <BadgeIcon iconName={badge.icon_name} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {isRTL && badge.name_ar ? badge.name_ar : badge.name}
                      </span>
                      <Badge className={tierColors[badge.tier]} variant="outline">
                        {badge.tier}
                      </Badge>
                      <Badge className={categoryColors[badge.category] || 'bg-gray-100'}>
                        {badge.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isRTL && badge.description_ar ? badge.description_ar : badge.description}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Key: {badge.badge_key}</span>
                      <span>Points: {badge.points}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {t('admin.badges.active', 'Active')}
                    </span>
                    <Switch
                      checked={badge.is_active}
                      onCheckedChange={(checked) =>
                        toggleActive({ id: badge.id, is_active: checked })
                      }
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(badge)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {(!badges || badges.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('admin.badges.noBadges', 'No badges defined yet')}</p>
                <Button onClick={handleCreate} className="mt-4">
                  <Plus className="h-4 w-4 me-2" />
                  {t('admin.badges.createFirst', 'Create your first badge')}
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
