import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isPast, isFuture, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Target, Calendar, Trophy, Trash2 } from 'lucide-react';
import { useAdminChallenges, useDeleteChallenge, type AdminChallenge } from '@/hooks/use-challenges';
import { ChallengeFormDialog } from './ChallengeFormDialog';
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

const statusColors = {
  active: 'bg-green-100 text-green-700 border-green-200',
  upcoming: 'bg-blue-100 text-blue-700 border-blue-200',
  ended: 'bg-gray-100 text-gray-600 border-gray-200',
  unknown: 'bg-gray-100 text-gray-600 border-gray-200',
};

const typeColors = {
  weekly: 'bg-purple-100 text-purple-700',
  monthly: 'bg-indigo-100 text-indigo-700',
  custom: 'bg-orange-100 text-orange-700',
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
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
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
        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => handleEdit(challenge)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">
                {isRTL && challenge.title_ar ? challenge.title_ar : challenge.title}
              </span>
              <Badge className={statusColors[status]} variant="outline">
                {status}
              </Badge>
              <Badge className={typeColors[challenge.challenge_type as keyof typeof typeColors]}>
                {challenge.challenge_type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t('admin.challenges.target', 'Target')}: {challenge.target_count}{' '}
              {challenge.metric_type}
            </p>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(challenge.start_date), 'MMM d')} -{' '}
                {format(new Date(challenge.end_date), 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                {challenge.points_reward} pts
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteId(challenge.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {t('admin.challenges.activeChallenges', 'Active Challenges')}
              <Badge variant="secondary">{activeChallenges?.length || 0}</Badge>
            </CardTitle>
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 me-2" />
              {t('admin.challenges.createChallenge', 'Create Challenge')}
            </Button>
          </CardHeader>
          <CardContent>
            {activeChallenges && activeChallenges.length > 0 ? (
              <div className="space-y-3">
                {activeChallenges.map(renderChallenge)}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                {t('admin.challenges.noActive', 'No active challenges')}
              </p>
            )}
          </CardContent>
        </Card>

        {upcomingChallenges && upcomingChallenges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {t('admin.challenges.upcomingChallenges', 'Upcoming Challenges')}
                <Badge variant="secondary">{upcomingChallenges.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingChallenges.map(renderChallenge)}
              </div>
            </CardContent>
          </Card>
        )}

        {pastChallenges && pastChallenges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {t('admin.challenges.pastChallenges', 'Past Challenges')}
                <Badge variant="secondary">{pastChallenges.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pastChallenges.slice(0, 5).map(renderChallenge)}
              </div>
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
              {t('admin.challenges.deleteTitle', 'Delete Challenge?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'admin.challenges.deleteDescription',
                'This will permanently delete this challenge. This action cannot be undone.'
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
