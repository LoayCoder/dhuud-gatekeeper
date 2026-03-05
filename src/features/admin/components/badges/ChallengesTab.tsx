import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isPast, isFuture, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Calendar, Trash2, Circle } from 'lucide-react';
import { useAdminChallenges, useDeleteChallenge, type AdminChallenge } from '@/hooks/use-challenges';
import { ChallengeFormDialog } from './ChallengeFormDialog';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function getChallengeStatus(challenge: AdminChallenge) {
  const now = new Date();
  const start = new Date(challenge.start_date);
  const end = new Date(challenge.end_date);

  if (isPast(end)) return 'ended';
  if (isFuture(start)) return 'upcoming';
  if (isWithinInterval(now, { start, end })) return 'active';
  return 'unknown';
}

// Professional muted status colors
const statusStyles = {
  active: 'bg-primary/10 text-primary',
  upcoming: 'bg-secondary text-secondary-foreground',
  ended: 'bg-muted text-muted-foreground',
  unknown: 'bg-muted text-muted-foreground',
};

// Professional type styling
const typeStyles = {
  weekly: 'bg-muted text-muted-foreground',
  monthly: 'bg-muted text-muted-foreground',
  custom: 'bg-muted text-muted-foreground',
};

export function ChallengesTab() {
  const { t, i18n } = useTranslation();
  const { data: challenges, isLoading } = useAdminChallenges();
  const { mutate: deleteChallenge } = useDeleteChallenge();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<AdminChallenge | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const isRTL = i18n.language === 'ar';

  const handleEdit = (challenge: AdminChallenge) => {
    setEditingChallenge(challenge);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingChallenge(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingChallenge(null);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteChallenge(deleteId);
      setDeleteId(null);
    }
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

  const activeChallenges = challenges?.filter(
    (c) => getChallengeStatus(c) === 'active'
  );
  const upcomingChallenges = challenges?.filter(
    (c) => getChallengeStatus(c) === 'upcoming'
  );
  const pastChallenges = challenges?.filter(
    (c) => getChallengeStatus(c) === 'ended'
  );

  const renderChallenge = (challenge: AdminChallenge) => {
    const status = getChallengeStatus(challenge);

    return (
      <div
        key={challenge.id}
        className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-4 py-4 hover:bg-muted/50 transition-colors cursor-pointer border-b last:border-b-0"
        onClick={() => handleEdit(challenge)}
      >
        {/* Title */}
        <div className="md:col-span-4">
          <p className="font-medium text-sm">
            {isRTL && challenge.title_ar ? challenge.title_ar : challenge.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('admin.challenges.target', 'Target')}: {challenge.target_count} {challenge.metric_type}
          </p>
        </div>

        {/* Status and Type */}
        <div className="md:col-span-2 flex items-center gap-2">
          <Badge className={cn('capitalize text-xs font-normal', statusStyles[status])} variant="secondary">
            {status}
          </Badge>
        </div>

        <div className="md:col-span-2">
          <Badge className={cn('capitalize text-xs font-normal', typeStyles[challenge.challenge_type as keyof typeof typeStyles])} variant="secondary">
            {challenge.challenge_type}
          </Badge>
        </div>

        {/* Date range */}
        <div className="md:col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            {format(new Date(challenge.start_date), 'MMM d')} – {format(new Date(challenge.end_date), 'MMM d')}
          </span>
        </div>

        {/* Points */}
        <div className="md:col-span-1 text-sm tabular-nums text-muted-foreground">
          {challenge.points_reward} pts
        </div>

        {/* Actions */}
        <div className="md:col-span-1 flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(challenge.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderSection = (title: string, items: AdminChallenge[] | undefined, count: number) => {
    if (!items || items.length === 0) return null;

    return (
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-medium">
            {title} ({count})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
            <div className="col-span-4">{t('admin.challenges.title', 'Title')}</div>
            <div className="col-span-2">{t('admin.challenges.status', 'Status')}</div>
            <div className="col-span-2">{t('admin.challenges.type', 'Type')}</div>
            <div className="col-span-2">{t('admin.challenges.period', 'Period')}</div>
            <div className="col-span-1">{t('admin.challenges.points', 'Points')}</div>
            <div className="col-span-1"></div>
          </div>
          <div>{items.map(renderChallenge)}</div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with add button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">{t('admin.challenges.objectives', 'Objectives')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('admin.challenges.manageObjectives', 'Manage time-bound objectives and targets')}
            </p>
          </div>
          <Button onClick={handleCreate} size="sm" variant="outline">
            <Plus className="h-4 w-4 me-2" />
            {t('admin.challenges.addObjective', 'Add Objective')}
          </Button>
        </div>

        {/* Active */}
        {renderSection(t('admin.challenges.activeObjectives', 'Active Objectives'), activeChallenges, activeChallenges?.length || 0)}

        {/* Upcoming */}
        {renderSection(t('admin.challenges.upcomingObjectives', 'Upcoming Objectives'), upcomingChallenges, upcomingChallenges?.length || 0)}

        {/* Past */}
        {renderSection(t('admin.challenges.pastObjectives', 'Past Objectives'), pastChallenges?.slice(0, 5), pastChallenges?.length || 0)}

        {/* Empty state */}
        {(!challenges || challenges.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <Circle className="h-10 w-10 mx-auto mb-4 opacity-30" strokeWidth={1} />
              <p className="text-sm text-muted-foreground">{t('admin.challenges.noObjectives', 'No objectives defined')}</p>
              <Button onClick={handleCreate} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 me-2" />
                {t('admin.challenges.addFirst', 'Add your first objective')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ChallengeFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        challenge={editingChallenge}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('admin.challenges.deleteTitle', 'Delete Objective?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'admin.challenges.deleteDescription',
                'This will permanently delete this objective. This action cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
