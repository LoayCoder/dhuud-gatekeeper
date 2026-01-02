import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, 
  HardHat, 
  Download, 
  Share2, 
  MessageSquare,
  Save,
  Info
} from "lucide-react";
import { useWebpageNotificationSettings, useUpdateWebpageNotificationSettings } from "@/hooks/useWebpageNotificationSettings";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function WebpageNotificationSettings() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const { data: settings, isLoading } = useWebpageNotificationSettings();
  const updateSettings = useUpdateWebpageNotificationSettings();

  const [formState, setFormState] = useState({
    visitor_webpage_enabled: true,
    visitor_message_template: '',
    visitor_message_template_ar: '',
    visitor_allow_download: true,
    visitor_allow_share: true,
    worker_webpage_enabled: true,
    worker_message_template: '',
    worker_message_template_ar: '',
    worker_allow_download: true,
    worker_allow_share: true,
  });

  useEffect(() => {
    if (settings) {
      setFormState({
        visitor_webpage_enabled: settings.visitor_webpage_enabled,
        visitor_message_template: settings.visitor_message_template,
        visitor_message_template_ar: settings.visitor_message_template_ar,
        visitor_allow_download: settings.visitor_allow_download,
        visitor_allow_share: settings.visitor_allow_share,
        worker_webpage_enabled: settings.worker_webpage_enabled,
        worker_message_template: settings.worker_message_template,
        worker_message_template_ar: settings.worker_message_template_ar,
        worker_allow_download: settings.worker_allow_download,
        worker_allow_share: settings.worker_allow_share,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(formState);
  };

  const visitorVariables = [
    { name: '{{visitor_name}}', desc: isRTL ? 'اسم الزائر' : 'Visitor name' },
    { name: '{{badge_url}}', desc: isRTL ? 'رابط البطاقة' : 'Badge URL' },
    { name: '{{host_name}}', desc: isRTL ? 'اسم المضيف' : 'Host name' },
    { name: '{{destination}}', desc: isRTL ? 'الوجهة' : 'Destination' },
    { name: '{{valid_until}}', desc: isRTL ? 'صالحة حتى' : 'Valid until' },
  ];

  const workerVariables = [
    { name: '{{worker_name}}', desc: isRTL ? 'اسم العامل' : 'Worker name' },
    { name: '{{pass_url}}', desc: isRTL ? 'رابط التصريح' : 'Pass URL' },
    { name: '{{project_name}}', desc: isRTL ? 'اسم المشروع' : 'Project name' },
    { name: '{{company_name}}', desc: isRTL ? 'اسم الشركة' : 'Company name' },
    { name: '{{valid_until}}', desc: isRTL ? 'صالح حتى' : 'Valid until' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isRTL ? 'إعدادات إشعارات الصفحات' : 'Webpage Notification Settings'}
          </h1>
          <p className="text-muted-foreground">
            {isRTL 
              ? 'تكوين إشعارات WhatsApp للزوار والعمال مع روابط البطاقات'
              : 'Configure WhatsApp notifications for visitors and workers with badge links'}
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          <Save className="h-4 w-4 me-2" />
          {updateSettings.isPending 
            ? (isRTL ? 'جاري الحفظ...' : 'Saving...') 
            : (isRTL ? 'حفظ الإعدادات' : 'Save Settings')}
        </Button>
      </div>

      <Tabs defaultValue="visitor" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="visitor" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {isRTL ? 'الزوار' : 'Visitors'}
          </TabsTrigger>
          <TabsTrigger value="worker" className="flex items-center gap-2">
            <HardHat className="h-4 w-4" />
            {isRTL ? 'العمال' : 'Workers'}
          </TabsTrigger>
        </TabsList>

        {/* Visitor Settings */}
        <TabsContent value="visitor" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {isRTL ? 'إشعارات بطاقة الزائر' : 'Visitor Badge Notifications'}
                  </CardTitle>
                  <CardDescription>
                    {isRTL 
                      ? 'إرسال رسالة WhatsApp للزائر عند الموافقة على زيارته'
                      : 'Send WhatsApp message to visitor when visit is approved'}
                  </CardDescription>
                </div>
                <Switch
                  checked={formState.visitor_webpage_enabled}
                  onCheckedChange={(checked) => 
                    setFormState(prev => ({ ...prev, visitor_webpage_enabled: checked }))
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Message Templates */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <Label>{isRTL ? 'قوالب الرسائل' : 'Message Templates'}</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isRTL ? 'استخدم المتغيرات أدناه في رسالتك' : 'Use variables below in your message'}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Variables reference */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {visitorVariables.map((v) => (
                    <Badge key={v.name} variant="secondary" className="text-xs">
                      <code>{v.name}</code>
                      <span className="ms-1 text-muted-foreground">- {v.desc}</span>
                    </Badge>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{isRTL ? 'الرسالة (English)' : 'Message (English)'}</Label>
                    <Textarea
                      value={formState.visitor_message_template}
                      onChange={(e) => 
                        setFormState(prev => ({ ...prev, visitor_message_template: e.target.value }))
                      }
                      rows={4}
                      placeholder="Welcome {{visitor_name}}! View your visitor badge here: {{badge_url}}"
                      disabled={!formState.visitor_webpage_enabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? 'الرسالة (العربية)' : 'Message (Arabic)'}</Label>
                    <Textarea
                      value={formState.visitor_message_template_ar}
                      onChange={(e) => 
                        setFormState(prev => ({ ...prev, visitor_message_template_ar: e.target.value }))
                      }
                      rows={4}
                      dir="rtl"
                      placeholder="مرحباً {{visitor_name}}! اطلع على بطاقة الزائر الخاصة بك هنا: {{badge_url}}"
                      disabled={!formState.visitor_webpage_enabled}
                    />
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-4 pt-4 border-t">
                <Label>{isRTL ? 'صلاحيات صفحة البطاقة' : 'Badge Page Permissions'}</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Download className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {isRTL ? 'السماح بالتحميل' : 'Allow Download'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'حفظ البطاقة كصورة' : 'Save badge as image'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formState.visitor_allow_download}
                      onCheckedChange={(checked) => 
                        setFormState(prev => ({ ...prev, visitor_allow_download: checked }))
                      }
                      disabled={!formState.visitor_webpage_enabled}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Share2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {isRTL ? 'السماح بالمشاركة' : 'Allow Share'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'مشاركة عبر WhatsApp وغيره' : 'Share via WhatsApp, etc.'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formState.visitor_allow_share}
                      onCheckedChange={(checked) => 
                        setFormState(prev => ({ ...prev, visitor_allow_share: checked }))
                      }
                      disabled={!formState.visitor_webpage_enabled}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Worker Settings */}
        <TabsContent value="worker" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <HardHat className="h-5 w-5" />
                    {isRTL ? 'إشعارات تصريح العامل' : 'Worker Pass Notifications'}
                  </CardTitle>
                  <CardDescription>
                    {isRTL 
                      ? 'إرسال رسالة WhatsApp للعامل عند إصدار تصريح الدخول'
                      : 'Send WhatsApp message to worker when access pass is issued'}
                  </CardDescription>
                </div>
                <Switch
                  checked={formState.worker_webpage_enabled}
                  onCheckedChange={(checked) => 
                    setFormState(prev => ({ ...prev, worker_webpage_enabled: checked }))
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Message Templates */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <Label>{isRTL ? 'قوالب الرسائل' : 'Message Templates'}</Label>
                </div>

                {/* Variables reference */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {workerVariables.map((v) => (
                    <Badge key={v.name} variant="secondary" className="text-xs">
                      <code>{v.name}</code>
                      <span className="ms-1 text-muted-foreground">- {v.desc}</span>
                    </Badge>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{isRTL ? 'الرسالة (English)' : 'Message (English)'}</Label>
                    <Textarea
                      value={formState.worker_message_template}
                      onChange={(e) => 
                        setFormState(prev => ({ ...prev, worker_message_template: e.target.value }))
                      }
                      rows={4}
                      placeholder="Your access pass for {{project_name}} is ready: {{pass_url}}"
                      disabled={!formState.worker_webpage_enabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? 'الرسالة (العربية)' : 'Message (Arabic)'}</Label>
                    <Textarea
                      value={formState.worker_message_template_ar}
                      onChange={(e) => 
                        setFormState(prev => ({ ...prev, worker_message_template_ar: e.target.value }))
                      }
                      rows={4}
                      dir="rtl"
                      placeholder="تصريح الدخول الخاص بك لمشروع {{project_name}} جاهز: {{pass_url}}"
                      disabled={!formState.worker_webpage_enabled}
                    />
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-4 pt-4 border-t">
                <Label>{isRTL ? 'صلاحيات صفحة التصريح' : 'Pass Page Permissions'}</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Download className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {isRTL ? 'السماح بالتحميل' : 'Allow Download'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'حفظ التصريح كصورة' : 'Save pass as image'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formState.worker_allow_download}
                      onCheckedChange={(checked) => 
                        setFormState(prev => ({ ...prev, worker_allow_download: checked }))
                      }
                      disabled={!formState.worker_webpage_enabled}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Share2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {isRTL ? 'السماح بالمشاركة' : 'Allow Share'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'مشاركة عبر WhatsApp وغيره' : 'Share via WhatsApp, etc.'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formState.worker_allow_share}
                      onCheckedChange={(checked) => 
                        setFormState(prev => ({ ...prev, worker_allow_share: checked }))
                      }
                      disabled={!formState.worker_webpage_enabled}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
