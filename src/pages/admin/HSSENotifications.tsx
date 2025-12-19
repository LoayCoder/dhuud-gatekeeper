import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Bell, Send, Eye, Trash2, CloudSun, Gavel, ShieldAlert, BookOpen, GraduationCap, Users, Building2, MapPin, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminRoute } from '@/components/AdminRoute';
import { useHSSENotificationsAdmin, useNotificationStats, CreateNotificationData, HSSENotification } from '@/hooks/use-hsse-notifications';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const CATEGORY_OPTIONS = [
  { value: 'weather_risk', icon: CloudSun, color: 'text-blue-500' },
  { value: 'regulation', icon: Gavel, color: 'text-purple-500' },
  { value: 'safety_alert', icon: ShieldAlert, color: 'text-red-500' },
  { value: 'policy_update', icon: BookOpen, color: 'text-green-500' },
  { value: 'training', icon: GraduationCap, color: 'text-orange-500' },
  { value: 'general', icon: Bell, color: 'text-gray-500' },
];

const PRIORITY_OPTIONS = [
  { value: 'critical', color: 'bg-destructive text-destructive-foreground' },
  { value: 'high', color: 'bg-orange-500 text-white' },
  { value: 'medium', color: 'bg-yellow-500 text-black' },
  { value: 'low', color: 'bg-muted text-muted-foreground' },
];

const TARGET_OPTIONS = [
  { value: 'all_users', icon: Users },
  { value: 'specific_roles', icon: Users },
  { value: 'specific_branches', icon: Building2 },
  { value: 'specific_sites', icon: MapPin },
];

function CreateNotificationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const { createNotification } = useHSSENotificationsAdmin();
  
  const [formData, setFormData] = useState<CreateNotificationData>({
    title_en: '',
    title_ar: '',
    body_en: '',
    body_ar: '',
    category: 'general',
    priority: 'medium',
    notification_type: 'informational',
    target_audience: 'all_users',
    send_push_notification: true,
    publish_immediately: true,
  });

  const handleSubmit = async () => {
    await createNotification.mutateAsync(formData);
    onOpenChange(false);
    setFormData({
      title_en: '',
      title_ar: '',
      body_en: '',
      body_ar: '',
      category: 'general',
      priority: 'medium',
      notification_type: 'informational',
      target_audience: 'all_users',
      send_push_notification: true,
      publish_immediately: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('hsseNotifications.createNotification')}</DialogTitle>
          <DialogDescription>
            {t('hsseNotifications.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Title EN */}
          <div className="space-y-2">
            <Label htmlFor="title_en">{t('hsseNotifications.titleEn')} *</Label>
            <Input
              id="title_en"
              value={formData.title_en}
              onChange={(e) => setFormData(prev => ({ ...prev, title_en: e.target.value }))}
              placeholder={t('hsseNotifications.titlePlaceholder')}
            />
          </div>

          {/* Title AR */}
          <div className="space-y-2">
            <Label htmlFor="title_ar">{t('hsseNotifications.titleAr')}</Label>
            <Input
              id="title_ar"
              dir="rtl"
              value={formData.title_ar}
              onChange={(e) => setFormData(prev => ({ ...prev, title_ar: e.target.value }))}
              placeholder={t('hsseNotifications.titlePlaceholderAr')}
            />
          </div>

          {/* Body EN */}
          <div className="space-y-2">
            <Label htmlFor="body_en">{t('hsseNotifications.bodyEn')} *</Label>
            <Textarea
              id="body_en"
              rows={4}
              value={formData.body_en}
              onChange={(e) => setFormData(prev => ({ ...prev, body_en: e.target.value }))}
              placeholder={t('hsseNotifications.bodyPlaceholder')}
            />
          </div>

          {/* Body AR */}
          <div className="space-y-2">
            <Label htmlFor="body_ar">{t('hsseNotifications.bodyAr')}</Label>
            <Textarea
              id="body_ar"
              dir="rtl"
              rows={4}
              value={formData.body_ar}
              onChange={(e) => setFormData(prev => ({ ...prev, body_ar: e.target.value }))}
              placeholder={t('hsseNotifications.bodyPlaceholderAr')}
            />
          </div>

          {/* Category & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('hsseNotifications.category')}</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as CreateNotificationData['category'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", cat.color)} />
                          {t(`hsseNotifications.category.${cat.value}`)}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('hsseNotifications.priorityLabel')}</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as CreateNotificationData['priority'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(pri => (
                    <SelectItem key={pri.value} value={pri.value}>
                      <Badge className={cn(pri.color, "text-xs")}>
                        {t(`hsseNotifications.priority.${pri.value}`)}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notification Type */}
          <div className="space-y-2">
            <Label>{t('hsseNotifications.notificationType')}</Label>
            <Select
              value={formData.notification_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, notification_type: value as 'mandatory' | 'informational' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="informational">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    {t('hsseNotifications.informational')}
                  </div>
                </SelectItem>
                <SelectItem value="mandatory">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    {t('hsseNotifications.mandatoryType')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {formData.notification_type === 'mandatory' && (
              <p className="text-xs text-muted-foreground">
                {t('hsseNotifications.mandatoryHint')}
              </p>
            )}
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label>{t('hsseNotifications.targetAudience')}</Label>
            <Select
              value={formData.target_audience}
              onValueChange={(value) => setFormData(prev => ({ ...prev, target_audience: value as CreateNotificationData['target_audience'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGET_OPTIONS.map(target => {
                  const Icon = target.icon;
                  return (
                    <SelectItem key={target.value} value={target.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {t(`hsseNotifications.target.${target.value}`)}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Options Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="push"
                checked={formData.send_push_notification}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, send_push_notification: checked }))}
              />
              <Label htmlFor="push" className="text-sm">
                {t('hsseNotifications.sendPush')}
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="publish"
                checked={formData.publish_immediately}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, publish_immediately: checked }))}
              />
              <Label htmlFor="publish" className="text-sm">
                {t('hsseNotifications.publishImmediately')}
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.title_en || !formData.body_en || createNotification.isPending}
          >
            {createNotification.isPending ? t('common.creating') : t('hsseNotifications.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotificationStatsCard({ notificationId }: { notificationId: string }) {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useNotificationStats(notificationId);

  if (isLoading) {
    return <Skeleton className="h-4 w-24" />;
  }

  if (!stats) return null;

  return (
    <div className="flex items-center gap-2">
      <Progress value={stats.percentage} className="h-2 w-20" />
      <span className="text-xs text-muted-foreground">
        {stats.acknowledged}/{stats.total_target}
      </span>
    </div>
  );
}

function NotificationsTable() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? ar : enUS;
  const { notifications, isLoading, publishNotification, deactivateNotification, deleteNotification } = useHSSENotificationsAdmin();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!notifications?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Bell className="h-12 w-12 mb-4 opacity-50" />
        <p>{t('hsseNotifications.noNotifications')}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-start">{t('hsseNotifications.titleLabel')}</TableHead>
          <TableHead className="text-start">{t('hsseNotifications.category')}</TableHead>
          <TableHead className="text-start">{t('hsseNotifications.type')}</TableHead>
          <TableHead className="text-start">{t('hsseNotifications.status')}</TableHead>
          <TableHead className="text-start">{t('hsseNotifications.acknowledgments')}</TableHead>
          <TableHead className="text-start">{t('hsseNotifications.createdAt')}</TableHead>
          <TableHead className="text-end">{t('common.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notifications.map(notification => {
          const CategoryIcon = CATEGORY_OPTIONS.find(c => c.value === notification.category)?.icon || Bell;
          const categoryColor = CATEGORY_OPTIONS.find(c => c.value === notification.category)?.color || 'text-gray-500';
          const priorityConfig = PRIORITY_OPTIONS.find(p => p.value === notification.priority);
          const isPublished = !!notification.published_at;
          const isActive = notification.is_active;

          return (
            <TableRow key={notification.id}>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium line-clamp-1">
                    {i18n.language === 'ar' && notification.title_ar ? notification.title_ar : notification.title_en}
                  </span>
                  <Badge className={cn(priorityConfig?.color, "text-xs w-fit")}>
                    {t(`hsseNotifications.priority.${notification.priority}`)}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <CategoryIcon className={cn("h-4 w-4", categoryColor)} />
                  <span className="text-sm">{t(`hsseNotifications.category.${notification.category}`)}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={notification.notification_type === 'mandatory' ? 'destructive' : 'secondary'}>
                  {notification.notification_type === 'mandatory' ? t('hsseNotifications.mandatory') : t('hsseNotifications.informational')}
                </Badge>
              </TableCell>
              <TableCell>
                {!isActive ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    {t('hsseNotifications.inactive')}
                  </Badge>
                ) : isPublished ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 me-1" />
                    {t('hsseNotifications.published')}
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 me-1" />
                    {t('hsseNotifications.draft')}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {notification.notification_type === 'mandatory' && isPublished && (
                  <NotificationStatsCard notificationId={notification.id} />
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {format(new Date(notification.created_at), 'PP', { locale })}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {!isPublished && isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => publishNotification.mutate(notification.id)}
                      title={t('hsseNotifications.publish')}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  {isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deactivateNotification.mutate(notification.id)}
                      title={t('hsseNotifications.deactivate')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('hsseNotifications.deleteConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('hsseNotifications.deleteConfirmDescription')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteNotification.mutate(notification.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('common.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function HSSENotificationsContent() {
  const { t } = useTranslation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { notifications } = useHSSENotificationsAdmin();

  // Stats
  const totalNotifications = notifications?.length || 0;
  const publishedCount = notifications?.filter(n => n.published_at && n.is_active).length || 0;
  const mandatoryCount = notifications?.filter(n => n.notification_type === 'mandatory' && n.is_active).length || 0;
  const draftCount = notifications?.filter(n => !n.published_at && n.is_active).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('hsseNotifications.pageTitle')}</h1>
          <p className="text-muted-foreground">{t('hsseNotifications.pageDescription')}</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 me-2" />
          {t('hsseNotifications.createNotification')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('hsseNotifications.totalNotifications')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNotifications}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('hsseNotifications.publishedCount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{publishedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('hsseNotifications.mandatoryCount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{mandatoryCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('hsseNotifications.draftCount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{draftCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('hsseNotifications.allNotifications')}</CardTitle>
          <CardDescription>{t('hsseNotifications.manageNotifications')}</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationsTable />
        </CardContent>
      </Card>

      <CreateNotificationDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </div>
  );
}

export default function HSSENotifications() {
  return (
    <AdminRoute>
      <HSSENotificationsContent />
    </AdminRoute>
  );
}
