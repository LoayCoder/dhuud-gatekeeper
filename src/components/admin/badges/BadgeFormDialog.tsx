import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { useCreateBadge, useUpdateBadge, type BadgeDefinition } from '@/hooks/use-badge-admin';
import { IconPicker } from './IconPicker';

const badgeSchema = z.object({
  badge_key: z.string().min(1, 'Badge key is required').regex(/^[a-z_]+$/, 'Use lowercase with underscores'),
  name: z.string().min(1, 'Name is required'),
  name_ar: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  description_ar: z.string().optional(),
  icon_name: z.string().min(1, 'Icon is required'),
  color_scheme: z.string().min(1, 'Color is required'),
  category: z.string().min(1, 'Category is required'),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']),
  points: z.coerce.number().min(0, 'Points must be 0 or greater'),
});

type BadgeFormData = z.infer<typeof badgeSchema>;

interface BadgeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badge: BadgeDefinition | null;
}

const categories = ['reporting', 'quality', 'streak', 'milestone', 'special'];
const tiers = ['bronze', 'silver', 'gold', 'platinum'] as const;
const colorOptions = [
  { value: '#CD7F32', label: 'Bronze' },
  { value: '#C0C0C0', label: 'Silver' },
  { value: '#FFD700', label: 'Gold' },
  { value: '#9B7DFF', label: 'Platinum' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
];

export function BadgeFormDialog({ open, onOpenChange, badge }: BadgeFormDialogProps) {
  const { t } = useTranslation();
  const { mutate: createBadge, isPending: isCreating } = useCreateBadge();
  const { mutate: updateBadge, isPending: isUpdating } = useUpdateBadge();

  const form = useForm<BadgeFormData>({
    resolver: zodResolver(badgeSchema),
    defaultValues: {
      badge_key: '',
      name: '',
      name_ar: '',
      description: '',
      description_ar: '',
      icon_name: 'Award',
      color_scheme: '#FFD700',
      category: 'milestone',
      tier: 'bronze',
      points: 10,
    },
  });

  useEffect(() => {
    if (badge) {
      form.reset({
        badge_key: badge.badge_key,
        name: badge.name,
        name_ar: badge.name_ar || '',
        description: badge.description,
        description_ar: badge.description_ar || '',
        icon_name: badge.icon_name,
        color_scheme: badge.color_scheme,
        category: badge.category,
        tier: badge.tier,
        points: badge.points,
      });
    } else {
      form.reset({
        badge_key: '',
        name: '',
        name_ar: '',
        description: '',
        description_ar: '',
        icon_name: 'Award',
        color_scheme: '#FFD700',
        category: 'milestone',
        tier: 'bronze',
        points: 10,
      });
    }
  }, [badge, form]);

  const onSubmit = (data: BadgeFormData) => {
    if (badge) {
      updateBadge(
        { ...data, id: badge.id },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createBadge(data, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {badge
              ? t('admin.badges.editBadge', 'Edit Badge')
              : t('admin.badges.createBadge', 'Create Badge')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="badge_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.badges.badgeKey', 'Badge Key')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="first_report"
                        {...field}
                        disabled={!!badge}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.badges.points', 'Points')}</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.badges.nameEn', 'Name (English)')}</FormLabel>
                    <FormControl>
                      <Input placeholder="First Reporter" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.badges.nameAr', 'Name (Arabic)')}</FormLabel>
                    <FormControl>
                      <Input placeholder="أول مُبلّغ" dir="rtl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.badges.descEn', 'Description (English)')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Awarded for submitting your first report"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.badges.descAr', 'Description (Arabic)')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="يُمنح لتقديم أول تقرير"
                        dir="rtl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="tier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.badges.tier', 'Tier')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tiers.map((tier) => (
                          <SelectItem key={tier} value={tier}>
                            {tier.charAt(0).toUpperCase() + tier.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.badges.category', 'Category')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color_scheme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.badges.color', 'Color')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {colorOptions.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: color.value }}
                              />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="icon_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.badges.icon', 'Icon')}</FormLabel>
                  <FormControl>
                    <IconPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {badge
                  ? t('common.save', 'Save')
                  : t('admin.badges.create', 'Create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
