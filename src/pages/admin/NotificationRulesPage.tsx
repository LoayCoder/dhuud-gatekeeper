import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Bell, Users, Building2, MessageSquare } from 'lucide-react';
import { 
  useNotificationRules, 
  useCreateNotificationRule, 
  useDeleteNotificationRule, 
  useToggleNotificationRule,
  EVENT_TYPE_OPTIONS,
  ROLE_OPTIONS,
  type NotificationEventType,
} from '@/hooks/useNotificationRules';
import { useBranches } from '@/hooks/use-branches';

export default function NotificationRulesPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const { data: rules, isLoading } = useNotificationRules();
  const { data: branches } = useBranches();
  const createRule = useCreateNotificationRule();
  const deleteRule = useDeleteNotificationRule();
  const toggleRule = useToggleNotificationRule();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    event_type: 'incident_created' as NotificationEventType,
    role_code: '',
    branch_id: '',
  });

  const handleCreateRule = async () => {
    await createRule.mutateAsync({
      event_type: newRule.event_type,
      role_code: newRule.role_code || null,
      branch_id: newRule.branch_id || null,
      channel: 'whatsapp',
    });
    setIsDialogOpen(false);
    setNewRule({ event_type: 'incident_created', role_code: '', branch_id: '' });
  };

  const getEventLabel = (eventType: string) => {
    const event = EVENT_TYPE_OPTIONS.find(e => e.value === eventType);
    return event ? (isRTL ? event.labelAr : event.labelEn) : eventType;
  };

  const getRoleLabel = (roleCode: string) => {
    const role = ROLE_OPTIONS.find(r => r.value === roleCode);
    return role ? (isRTL ? role.labelAr : role.labelEn) : roleCode;
  };

  // Group rules by event type
  const groupedRules = rules?.reduce((acc, rule) => {
    if (!acc[rule.event_type]) {
      acc[rule.event_type] = [];
    }
    acc[rule.event_type].push(rule);
    return acc;
  }, {} as Record<string, typeof rules>);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            {isRTL ? 'إعدادات الإشعارات التلقائية' : 'Automatic Notification Settings'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL 
              ? 'حدد من يتلقى إشعارات WhatsApp عند حدوث أحداث معينة'
              : 'Define who receives WhatsApp notifications when specific events occur'}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 me-2" />
              {isRTL ? 'إضافة قاعدة' : 'Add Rule'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isRTL ? 'إضافة قاعدة إشعار' : 'Add Notification Rule'}</DialogTitle>
              <DialogDescription>
                {isRTL 
                  ? 'حدد الحدث والمستلمين للإشعار التلقائي'
                  : 'Select the event and recipients for automatic notification'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{isRTL ? 'الحدث' : 'Event'}</Label>
                <Select 
                  value={newRule.event_type} 
                  onValueChange={(value: NotificationEventType) => setNewRule(prev => ({ ...prev, event_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPE_OPTIONS.map(event => (
                      <SelectItem key={event.value} value={event.value}>
                        {isRTL ? event.labelAr : event.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? 'الدور' : 'Role'}</Label>
                <Select 
                  value={newRule.role_code} 
                  onValueChange={(value) => setNewRule(prev => ({ ...prev, role_code: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? 'اختر الدور...' : 'Select role...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {isRTL ? role.labelAr : role.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? 'الفرع (اختياري)' : 'Branch (Optional)'}</Label>
                <Select 
                  value={newRule.branch_id} 
                  onValueChange={(value) => setNewRule(prev => ({ ...prev, branch_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? 'جميع الفروع' : 'All branches'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{isRTL ? 'جميع الفروع' : 'All branches'}</SelectItem>
                    {branches?.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button 
                onClick={handleCreateRule} 
                disabled={!newRule.role_code || createRule.isPending}
              >
                {createRule.isPending 
                  ? (isRTL ? 'جاري الإضافة...' : 'Adding...') 
                  : (isRTL ? 'إضافة' : 'Add')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !rules?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">
              {isRTL ? 'لا توجد قواعد إشعارات' : 'No Notification Rules'}
            </h3>
            <p className="text-muted-foreground mt-2">
              {isRTL 
                ? 'أضف قواعد لإرسال إشعارات WhatsApp تلقائياً عند حدوث أحداث معينة'
                : 'Add rules to automatically send WhatsApp notifications when events occur'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {EVENT_TYPE_OPTIONS.map(event => {
            const eventRules = groupedRules?.[event.value] || [];
            if (eventRules.length === 0) return null;

            return (
              <Card key={event.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    {isRTL ? event.labelAr : event.labelEn}
                  </CardTitle>
                  <CardDescription>
                    {isRTL 
                      ? `${eventRules.length} ${eventRules.length === 1 ? 'مستلم' : 'مستلمين'}` 
                      : `${eventRules.length} ${eventRules.length === 1 ? 'recipient' : 'recipients'}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {eventRules.map(rule => (
                      <div 
                        key={rule.id} 
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {rule.role_code ? getRoleLabel(rule.role_code) : (rule.user?.full_name || '-')}
                            </span>
                          </div>
                          
                          {rule.branch && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {rule.branch.name}
                            </Badge>
                          )}
                          
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            WhatsApp
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3">
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, is_active: checked })}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteRule.mutate(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Add Section for Common Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isRTL ? 'سيناريوهات شائعة' : 'Common Scenarios'}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? 'أضف قواعد إشعارات سريعة للسيناريوهات الشائعة'
              : 'Quickly add notification rules for common scenarios'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Button 
              variant="outline" 
              className="justify-start h-auto py-3 px-4"
              onClick={() => {
                setNewRule({ event_type: 'incident_created', role_code: 'hsse_manager', branch_id: '' });
                setIsDialogOpen(true);
              }}
            >
              <div className="text-start">
                <div className="font-medium">
                  {isRTL ? 'إشعار مدير السلامة بالحوادث' : 'Notify HSSE Manager of Incidents'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {isRTL ? 'عند الإبلاغ عن أي حادثة' : 'When any incident is reported'}
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="justify-start h-auto py-3 px-4"
              onClick={() => {
                setNewRule({ event_type: 'incident_critical', role_code: 'admin', branch_id: '' });
                setIsDialogOpen(true);
              }}
            >
              <div className="text-start">
                <div className="font-medium">
                  {isRTL ? 'إشعار المدير بالحوادث الخطيرة' : 'Notify Admin of Critical Incidents'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {isRTL ? 'عند الإبلاغ عن حادثة خطيرة' : 'When critical incident is reported'}
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="justify-start h-auto py-3 px-4"
              onClick={() => {
                setNewRule({ event_type: 'action_overdue', role_code: 'manager', branch_id: '' });
                setIsDialogOpen(true);
              }}
            >
              <div className="text-start">
                <div className="font-medium">
                  {isRTL ? 'إشعار المديرين بالإجراءات المتأخرة' : 'Notify Managers of Overdue Actions'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {isRTL ? 'عند تأخر إجراء تصحيحي' : 'When corrective action is overdue'}
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
