import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Smartphone,
  Shield,
  Flame,
  Heart,
  Users,
  Loader2,
  RefreshCw,
  Info,
  Send,
} from 'lucide-react';
import { usePushTest } from '@/hooks/use-push-test';
import { usePushSubscription } from '@/hooks/use-push-subscription';

type AlertType = 'panic' | 'fire' | 'medical' | 'security_breach' | 'evacuation';

const ALERT_TYPES: { type: AlertType; label: string; labelAr: string; icon: React.ReactNode; color: string }[] = [
  { type: 'panic', label: 'Panic Alert', labelAr: 'تنبيه ذعر', icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-red-500' },
  { type: 'fire', label: 'Fire Alert', labelAr: 'تنبيه حريق', icon: <Flame className="h-4 w-4" />, color: 'bg-orange-500' },
  { type: 'medical', label: 'Medical Emergency', labelAr: 'طوارئ طبية', icon: <Heart className="h-4 w-4" />, color: 'bg-pink-500' },
  { type: 'security_breach', label: 'Security Breach', labelAr: 'اختراق أمني', icon: <Shield className="h-4 w-4" />, color: 'bg-purple-500' },
  { type: 'evacuation', label: 'Evacuation', labelAr: 'إخلاء', icon: <Users className="h-4 w-4" />, color: 'bg-yellow-500' },
];

export default function TestPushNotifications() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const {
    getSystemStatus,
    isTestingPush,
    isCreatingAlert,
    lastTestResult,
    sendTestPush,
    createTestEmergencyAlert,
    verifyDatabaseSubscription,
    subscribeDevice,
    refreshSubscription,
  } = usePushTest();

  const { isSubscribed, isLoading: isSubscribing } = usePushSubscription();
  
  const [dbVerifyResult, setDbVerifyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const status = getSystemStatus();

  const handleVerifyDb = async () => {
    setIsVerifying(true);
    const result = await verifyDatabaseSubscription();
    setDbVerifyResult(result);
    setIsVerifying(false);
  };

  const handleSubscribe = async () => {
    await subscribeDevice();
    await refreshSubscription();
  };

  const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive" />
      )}
      <span className="text-sm">{label}</span>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">
            {isRTL ? 'اختبار الإشعارات الفورية' : 'Push Notification Testing'}
          </h1>
          <p className="text-muted-foreground">
            {isRTL 
              ? 'اختبر نظام الإشعارات الفورية وتنبيهات الطوارئ' 
              : 'Test push notification system and emergency alerts'}
          </p>
        </div>
      </div>

      {/* System Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {isRTL ? 'حالة النظام' : 'System Status'}
          </CardTitle>
          <CardDescription>
            {isRTL ? 'تحقق من جميع المتطلبات' : 'Check all requirements are met'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatusBadge 
              ok={status.browserSupport} 
              label={isRTL ? 'دعم المتصفح' : 'Browser Support'} 
            />
            <StatusBadge 
              ok={status.serviceWorkerActive} 
              label={isRTL ? 'عامل الخدمة نشط' : 'Service Worker Active'} 
            />
            <StatusBadge 
              ok={status.permissionStatus === 'granted'} 
              label={`${isRTL ? 'الإذن' : 'Permission'}: ${status.permissionStatus || 'unknown'}`} 
            />
            <StatusBadge 
              ok={status.isSubscribed} 
              label={isRTL ? 'مشترك في الإشعارات' : 'Subscribed to Push'} 
            />
            <StatusBadge 
              ok={!!status.userId} 
              label={isRTL ? 'المستخدم مسجل الدخول' : 'User Logged In'} 
            />
            <StatusBadge 
              ok={!!status.tenantId} 
              label={isRTL ? 'معرف المنظمة' : 'Tenant ID Present'} 
            />
          </div>

          {!status.isSubscribed && status.browserSupport && (
            <div className="mt-4">
              <Button onClick={handleSubscribe} disabled={isSubscribing}>
                {isSubscribing && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {isRTL ? 'تفعيل الإشعارات' : 'Enable Push Notifications'}
              </Button>
            </div>
          )}

          <Separator className="my-4" />

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleVerifyDb}
              disabled={isVerifying || !isSubscribed}
            >
              {isVerifying && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? 'تحقق من قاعدة البيانات' : 'Verify DB Subscription'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refreshSubscription()}
            >
              <RefreshCw className="h-4 w-4 me-2" />
              {isRTL ? 'تحديث الحالة' : 'Refresh Status'}
            </Button>
          </div>

          {dbVerifyResult && (
            <Alert className="mt-4" variant={dbVerifyResult.success ? 'default' : 'destructive'}>
              {dbVerifyResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{dbVerifyResult.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Push Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {isRTL ? 'اختبار الإشعار البسيط' : 'Simple Push Test'}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? 'أرسل إشعارًا تجريبيًا لهذا الجهاز' 
              : 'Send a test notification to this device'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={sendTestPush} 
            disabled={isTestingPush || !isSubscribed}
          >
            {isTestingPush && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            <Bell className="h-4 w-4 me-2" />
            {isRTL ? 'إرسال إشعار تجريبي' : 'Send Test Push'}
          </Button>

          {!isSubscribed && (
            <p className="text-sm text-muted-foreground mt-2">
              {isRTL 
                ? 'يجب تفعيل الإشعارات أولاً' 
                : 'Enable push notifications first'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Emergency Alert Test Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {isRTL ? 'اختبار تنبيه الطوارئ' : 'Emergency Alert Test'}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? 'إنشاء تنبيه طوارئ تجريبي لاختبار التدفق الكامل' 
              : 'Create a test emergency alert to test the full notification flow'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>{isRTL ? 'ملاحظة' : 'Note'}</AlertTitle>
            <AlertDescription>
              {isRTL 
                ? 'سيتم إرسال إشعارات لجميع أفراد الأمن المشتركين في هذه المنظمة' 
                : 'This will send notifications to all subscribed security personnel in this tenant'}
            </AlertDescription>
          </Alert>

          <div className="flex flex-wrap gap-2">
            {ALERT_TYPES.map(({ type, label, labelAr, icon, color }) => (
              <Button
                key={type}
                variant="outline"
                onClick={() => createTestEmergencyAlert(type)}
                disabled={isCreatingAlert}
                className="gap-2"
              >
                {isCreatingAlert ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className={`p-1 rounded ${color} text-white`}>{icon}</span>
                )}
                {isRTL ? labelAr : label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Last Test Result */}
      {lastTestResult && (
        <Alert variant={lastTestResult.success ? 'default' : 'destructive'}>
          {lastTestResult.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {lastTestResult.success 
              ? (isRTL ? 'نجاح' : 'Success') 
              : (isRTL ? 'فشل' : 'Failed')}
          </AlertTitle>
          <AlertDescription>
            {lastTestResult.message}
            {lastTestResult.details && (
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(lastTestResult.details, null, 2)}
              </pre>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Testing Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? 'تعليمات الاختبار' : 'Testing Instructions'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">
              {isRTL ? '1. اختبار التطبيق مغلق تمامًا' : '1. Test with app completely closed'}
            </h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ps-4">
              <li>{isRTL ? 'تأكد من تفعيل الإشعارات الفورية' : 'Ensure push notifications are enabled'}</li>
              <li>{isRTL ? 'أغلق التطبيق تمامًا' : 'Completely close the app'}</li>
              <li>{isRTL ? 'من جهاز آخر، أنشئ تنبيه طوارئ' : 'From another device, create an emergency alert'}</li>
              <li>{isRTL ? 'يجب أن تتلقى إشعارًا' : 'You should receive a notification'}</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">
              {isRTL ? '2. اختبار التطبيق في الخلفية' : '2. Test with app in background'}
            </h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ps-4">
              <li>{isRTL ? 'افتح التطبيق ثم صغره' : 'Open the app then minimize it'}</li>
              <li>{isRTL ? 'أنشئ تنبيه طوارئ من هذه الصفحة' : 'Create an emergency alert from this page'}</li>
              <li>{isRTL ? 'يجب أن يظهر الإشعار كراية' : 'Notification should appear as a banner'}</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">
              {isRTL ? '3. اختبار أزرار الإجراءات' : '3. Test action buttons'}
            </h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ps-4">
              <li>{isRTL ? 'اضغط على "إقرار" في الإشعار' : 'Tap "Acknowledge" on the notification'}</li>
              <li>{isRTL ? 'يجب أن يُحدث حالة التنبيه' : 'Should update alert status in database'}</li>
              <li>{isRTL ? 'اضغط على "عرض" لفتح التفاصيل' : 'Tap "View" to open alert details'}</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
