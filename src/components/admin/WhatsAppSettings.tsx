import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Send, CheckCircle2, XCircle, Loader2, MessageSquare, Settings2 } from "lucide-react";

export function WhatsAppSettings() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [phoneNumber, setPhoneNumber] = useState("");
  const [testMessage, setTestMessage] = useState(
    isRTL 
      ? "مرحباً! هذه رسالة اختبار من نظام HSSE." 
      : "Hello! This is a test message from the HSSE system."
  );
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    provider: string;
    messageId?: string;
    error?: string;
  } | null>(null);

  const handleSendTest = async () => {
    if (!phoneNumber.trim()) {
      toast.error(isRTL ? "الرجاء إدخال رقم الهاتف" : "Please enter a phone number");
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-whatsapp', {
        body: {
          phone_number: phoneNumber.trim(),
          message: testMessage.trim(),
        },
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setLastResult({
          success: true,
          provider: data.provider,
          messageId: data.messageId,
        });
        toast.success(
          isRTL 
            ? `تم إرسال الرسالة بنجاح عبر ${data.provider}` 
            : `Message sent successfully via ${data.provider}`
        );
      } else {
        setLastResult({
          success: false,
          provider: data.provider || 'unknown',
          error: data.error,
        });
        toast.error(data.error || (isRTL ? "فشل إرسال الرسالة" : "Failed to send message"));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setLastResult({
        success: false,
        provider: 'unknown',
        error: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {isRTL ? "إعدادات مزود الواتساب" : "WhatsApp Provider Settings"}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? "يتم اكتشاف المزود النشط تلقائياً بناءً على المفاتيح المُعدة" 
              : "Active provider is auto-detected based on configured API keys"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <Badge variant="outline" className="font-mono">WaSender</Badge>
                <span className="text-sm text-muted-foreground">
                  {isRTL ? "يتطلب" : "Requires"}: <code className="text-xs">WASENDER_API_KEY</code>
                </span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <Badge variant="outline" className="font-mono">Twilio</Badge>
                <span className="text-sm text-muted-foreground">
                  {isRTL ? "يتطلب" : "Requires"}: <code className="text-xs">TWILIO_*</code>
                </span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {isRTL 
                ? "إذا تم إعداد WASENDER_API_KEY، سيتم استخدام WaSender. خلاف ذلك، سيتم استخدام Twilio." 
                : "If WASENDER_API_KEY is configured, WaSender will be used. Otherwise, Twilio is used."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Test Message Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {isRTL ? "اختبار رسالة واتساب" : "Test WhatsApp Message"}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? "أرسل رسالة اختبار للتحقق من إعداد الواتساب" 
              : "Send a test message to verify WhatsApp configuration"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">
                {isRTL ? "رقم الهاتف" : "Phone Number"}
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+966501234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                dir="ltr"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {isRTL 
                  ? "أدخل الرقم مع رمز الدولة (مثال: +966)" 
                  : "Enter number with country code (e.g., +966)"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">
                {isRTL ? "نص الرسالة" : "Message Text"}
              </Label>
              <Textarea
                id="message"
                placeholder={isRTL ? "أدخل رسالة الاختبار..." : "Enter test message..."}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <Button 
              onClick={handleSendTest} 
              disabled={sending || !phoneNumber.trim()}
              className="w-full sm:w-auto"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  {isRTL ? "جارٍ الإرسال..." : "Sending..."}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 me-2" />
                  {isRTL ? "إرسال رسالة اختبار" : "Send Test Message"}
                </>
              )}
            </Button>

            {lastResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                lastResult.success 
                  ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400' 
                  : 'bg-destructive/10 border-destructive/30 text-destructive'
              }`}>
                {lastResult.success ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0" />
                )}
                <div className="text-sm">
                  {lastResult.success ? (
                    <>
                      <span className="font-medium">
                        {isRTL ? "تم الإرسال عبر" : "Sent via"} {lastResult.provider}
                      </span>
                      {lastResult.messageId && (
                        <span className="block text-xs opacity-75 font-mono">
                          ID: {lastResult.messageId.substring(0, 20)}...
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="font-medium">
                        {isRTL ? "فشل الإرسال" : "Failed to send"}
                      </span>
                      {lastResult.error && (
                        <span className="block text-xs opacity-75">
                          {lastResult.error}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Help */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isRTL ? "كيفية إعداد المزود" : "How to Configure Provider"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-1">WaSender</h4>
            <ol className="list-decimal list-inside space-y-1 ps-2">
              <li>{isRTL ? "احصل على مفتاح API من حساب WaSender" : "Get API key from your WaSender account"}</li>
              <li>{isRTL ? "أضف WASENDER_API_KEY في الإعدادات السرية" : "Add WASENDER_API_KEY in secrets settings"}</li>
              <li>{isRTL ? "سيتم استخدام WaSender تلقائياً" : "WaSender will be used automatically"}</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">Twilio</h4>
            <ol className="list-decimal list-inside space-y-1 ps-2">
              <li>{isRTL ? "أضف المفاتيح المطلوبة" : "Add required keys"}:
                <code className="text-xs bg-muted px-1 rounded ms-1">TWILIO_ACCOUNT_SID</code>,
                <code className="text-xs bg-muted px-1 rounded ms-1">TWILIO_AUTH_TOKEN</code>,
                <code className="text-xs bg-muted px-1 rounded ms-1">TWILIO_WHATSAPP_NUMBER</code>
              </li>
              <li>{isRTL ? "اختيارياً، أضف" : "Optionally, add"} <code className="text-xs bg-muted px-1 rounded">WHATSAPP_PROVIDER=twilio</code> {isRTL ? "لإجبار استخدام Twilio" : "to force Twilio"}</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
