/**
 * WhatsApp Configuration & Test Panel
 * Shows provider status and allows sending test messages
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Phone,
  Settings,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ProviderStatus {
  configured: boolean;
  provider: 'wasender' | 'twilio';
  missing: string[];
}

export function WhatsAppConfigPanel() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const isRTL = i18n.language === 'ar';
  
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [testMessage, setTestMessage] = useState('🧪 Test message from HSSE Platform');
  const [isSending, setIsSending] = useState(false);

  // Check provider status
  const checkProviderStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-whatsapp', {
        body: { 
          phone_number: '+966500000000', // Dummy number for status check
          message: 'STATUS_CHECK_ONLY',
          status_check: true 
        }
      });

      if (data?.provider_status) {
        setProviderStatus(data.provider_status);
      } else {
        // Default fallback
        setProviderStatus({
          configured: false,
          provider: 'wasender',
          missing: ['WASENDER_API_KEY']
        });
      }
    } catch (error) {
      console.error('Failed to check provider status:', error);
      toast.error(isRTL ? 'فشل في فحص حالة المزود' : 'Failed to check provider status');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Send test WhatsApp message
  const sendTestMessage = async () => {
    if (!phoneNumber.trim()) {
      toast.error(isRTL ? 'أدخل رقم الهاتف' : 'Enter phone number');
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-whatsapp', {
        body: { 
          phone_number: phoneNumber.trim(),
          message: testMessage,
          tenant_id: profile?.tenant_id
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(isRTL ? 'تم إرسال الرسالة بنجاح!' : 'Message sent successfully!');
      } else {
        toast.error(data?.error || (isRTL ? 'فشل في إرسال الرسالة' : 'Failed to send message'));
      }
    } catch (error: any) {
      console.error('Failed to send test message:', error);
      toast.error(error.message || (isRTL ? 'فشل في إرسال الرسالة' : 'Failed to send message'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Provider Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {isRTL ? 'حالة مزود الواتساب' : 'WhatsApp Provider Status'}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? 'فحص تكوين مزود الواتساب الحالي'
              : 'Check current WhatsApp provider configuration'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={checkProviderStatus} 
            disabled={isCheckingStatus}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isCheckingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <RefreshCw className="h-4 w-4 me-2" />
            )}
            {isRTL ? 'فحص الحالة' : 'Check Status'}
          </Button>

          {providerStatus && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {isRTL ? 'المزود:' : 'Provider:'}
                </span>
                <Badge variant="secondary" className="uppercase">
                  {providerStatus.provider}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {isRTL ? 'الحالة:' : 'Status:'}
                </span>
                {providerStatus.configured ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 me-1" />
                    {isRTL ? 'مُكوّن' : 'Configured'}
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 me-1" />
                    {isRTL ? 'غير مُكوّن' : 'Not Configured'}
                  </Badge>
                )}
              </div>

              {providerStatus.missing.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {isRTL ? 'متغيرات مفقودة: ' : 'Missing variables: '}
                    <code className="font-mono text-sm">
                      {providerStatus.missing.join(', ')}
                    </code>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Message Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {isRTL ? 'إرسال رسالة اختبار' : 'Send Test Message'}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? 'اختبر اتصال الواتساب عن طريق إرسال رسالة مباشرة'
              : 'Test WhatsApp connectivity by sending a direct message'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-phone">
              {isRTL ? 'رقم الهاتف (E.164)' : 'Phone Number (E.164)'}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="test-phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+966500000000"
                  className="ps-10"
                  dir="ltr"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {isRTL 
                ? 'مثال: +966500000000 (يجب أن يبدأ بـ + ورمز الدولة)'
                : 'Example: +966500000000 (must start with + and country code)'
              }
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-message">
              {isRTL ? 'الرسالة' : 'Message'}
            </Label>
            <Textarea
              id="test-message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder={isRTL ? 'أدخل رسالة الاختبار...' : 'Enter test message...'}
              rows={3}
            />
          </div>

          <Button 
            onClick={sendTestMessage} 
            disabled={isSending || !phoneNumber.trim()}
            className="w-full sm:w-auto"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <MessageSquare className="h-4 w-4 me-2" />
            )}
            {isRTL ? 'إرسال رسالة اختبار' : 'Send Test Message'}
          </Button>
        </CardContent>
      </Card>

      {/* Provider Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isRTL ? 'معلومات المزود' : 'Provider Information'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 p-4 rounded-lg border bg-card">
              <h4 className="font-medium text-green-600">WaSender</h4>
              <p className="text-sm text-muted-foreground">
                {isRTL 
                  ? 'يتطلب WASENDER_API_KEY فقط. أسرع وأرخص للرسائل البسيطة.'
                  : 'Requires only WASENDER_API_KEY. Faster and cheaper for simple messages.'
                }
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-lg border bg-card">
              <h4 className="font-medium text-blue-600">Twilio</h4>
              <p className="text-sm text-muted-foreground">
                {isRTL 
                  ? 'يتطلب TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER. يدعم القوالب.'
                  : 'Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER. Supports templates.'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
