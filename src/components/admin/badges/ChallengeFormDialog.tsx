import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateChallenge, useUpdateChallenge, type AdminChallenge } from '@/hooks/use-challenges';
import { useBadgeDefinitions } from '@/hooks/use-badge-admin';

const challengeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  title_ar: z.string().optional(),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  challenge_type: z.enum(['weekly', 'monthly', 'custom']),
  metric_type: z.enum(['incidents', 'observations', 'total_reports', 'actions']),
  target_count: z.coerce.number().min(1, 'Target must be at least 1'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  badge_id: z.string().optional(),
  points_reward: z.coerce.number().min(0, 'Points must be 0 or greater'),
});

type ChallengeFormData = z.infer<typeof challengeSchema>;

interface ChallengeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: AdminChallenge | null;
}

export function ChallengeFormDialog({ open, onOpenChange, challenge }: ChallengeFormDialogProps) {
  const { t } = useTranslation();
  const { mutate: createChallenge, isPending: isCreating } = useCreateChallenge();
  const { mutate: updateChallenge, isPending: isUpdating } = useUpdateChallenge();
  const { data: badges } = useBadgeDefinitions();

  const form = useForm<ChallengeFormData>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: '',
      title_ar: '',
      description: '',
      description_ar: '',
      challenge_type: 'weekly',
      metric_type: 'observations',
      target_count: 5,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      badge_id: '',
      points_reward: 50,
    },
  });

  useEffect(() => {
    if (challenge) {
      form.reset({
        title: challenge.title,
        title_ar: challenge.title_ar || '',
        description: challenge.description || '',
        description_ar: challenge.description_ar || '',
        challenge_type: challenge.challenge_type as 'weekly' | 'monthly' | 'custom',
        metric_type: challenge.metric_type as 'incidents' | 'observations' | 'total_reports' | 'actions',
        target_count: challenge.target_count,
        start_date: format(new Date(challenge.start_date), 'yyyy-MM-dd'),
        end_date: format(new Date(challenge.end_date), 'yyyy-MM-dd'),
        badge_id: challenge.badge_id || '',
        points_reward: challenge.points_reward,
      });
    } else {
      form.reset();
    }
  }, [challenge, form]);

  const onSubmit = (data: ChallengeFormData) => {
    const payload = {
      ...data,
      start_date: new Date(data.start_date).toISOString(),
      end_date: new Date(data.end_date).toISOString(),
      badge_id: data.badge_id || undefined,
    };

    if (challenge) {
      updateChallenge({ ...payload, id: challenge.id }, { onSuccess: () => onOpenChange(false) });
    } else {
      createChallenge(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {challenge
              ? t('admin.challenges.editChallenge', 'Edit Challenge')
              : t('admin.challenges.createChallenge', 'Create Challenge')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.challenges.titleEn', 'Title (English)')}</FormLabel>
                    <FormControl>
                      <Input placeholder="Report 5 observations this week" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.challenges.titleAr', 'Title (Arabic)')}</FormLabel>
                    <FormControl>
                      <Input dir="rtl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="challenge_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.challenges.type', 'Type')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="metric_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.challenges.metric', 'Metric')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="incidents">Incidents</SelectItem>
                        <SelectItem value="observations">Observations</SelectItem>
                        <SelectItem value="total_reports">Total Reports</SelectItem>
                        <SelectItem value="actions">Actions</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="target_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.challenges.target', 'Target')}</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.challenges.startDate', 'Start Date')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.challenges.endDate', 'End Date')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="points_reward"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.challenges.points', 'Points Reward')}</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="badge_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.challenges.badge', 'Reward Badge')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Optional badge reward" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {badges?.map((badge) => (
                          <SelectItem key={badge.id} value={badge.id}>
                            {badge.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {challenge ? t('common.save', 'Save') : t('admin.challenges.create', 'Create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
