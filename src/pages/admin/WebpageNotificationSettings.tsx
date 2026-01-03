import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, 
  HardHat, 
  Download, 
  Share2, 
  Globe,
  Save,
  ExternalLink,
  Languages,
  FileText
} from "lucide-react";
import { Link } from "react-router-dom";
import { useWebpageNotificationSettings, useUpdateWebpageNotificationSettings } from "@/hooks/useWebpageNotificationSettings";

export default function WebpageNotificationSettings() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const { data: settings, isLoading } = useWebpageNotificationSettings();
  const updateSettings = useUpdateWebpageNotificationSettings();

  const [formState, setFormState] = useState({
    visitor_webpage_enabled: true,
    visitor_allow_download: true,
    visitor_allow_share: true,
    worker_webpage_enabled: true,
    worker_allow_download: true,
    worker_allow_share: true,
  });

  useEffect(() => {
    if (settings) {
      setFormState({
        visitor_webpage_enabled: settings.visitor_webpage_enabled,
        visitor_allow_download: settings.visitor_allow_download,
        visitor_allow_share: settings.visitor_allow_share,
        worker_webpage_enabled: settings.worker_webpage_enabled,
        worker_allow_download: settings.worker_allow_download,
        worker_allow_share: settings.worker_allow_share,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(formState);
  };

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
            {isRTL ? 'إعدادات عرض الصفحات' : 'Webpage Display Settings'}
          </h1>
          <p className="text-muted-foreground">
            {isRTL 
              ? 'التحكم في الميزات المتاحة على صفحات البطاقات والتصاريح العامة'
              : 'Control what features appear on public badge and pass pages'}
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          <Save className="h-4 w-4 me-2" />
          {updateSettings.isPending 
            ? (isRTL ? 'جاري الحفظ...' : 'Saving...') 
            : (isRTL ? 'حفظ الإعدادات' : 'Save Settings')}
        </Button>
      </div>

      {/* Page Content Management Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {isRTL ? 'إدارة محتوى الصفحات' : 'Page Content Management'}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? 'تعديل محتوى الصفحات وإنشاء ترجمات بالذكاء الاصطناعي للزوار والعمال'
              : 'Edit page content and create AI translations for visitor and worker pages'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isRTL 
              ? 'استخدم محرر المحتوى لتخصيص النصوص المعروضة على صفحات البطاقات والتصاريح العامة. يدعم المحرر الترجمة التلقائية بالذكاء الاصطناعي لجميع اللغات المدعومة.'
              : 'Use the content editor to customize text displayed on public badge and pass pages. The editor supports AI-powered automatic translation for all supported languages.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {isRTL ? 'العربية' : 'Arabic'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {isRTL ? 'الإنجليزية' : 'English'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {isRTL ? 'الأردية' : 'Urdu'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {isRTL ? 'الهندية' : 'Hindi'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {isRTL ? 'الفلبينية' : 'Filipino'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {isRTL ? 'الصينية' : 'Chinese'}
            </Badge>
          </div>
          <Button asChild>
            <Link to="/admin/page-content-editor">
              <FileText className="h-4 w-4 me-2" />
              {isRTL ? 'فتح محرر المحتوى' : 'Open Content Editor'}
            </Link>
          </Button>
        </CardContent>
      </Card>

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
                    <Globe className="h-5 w-5" />
                    {isRTL ? 'صفحة بطاقة الزائر' : 'Visitor Badge Page'}
                  </CardTitle>
                  <CardDescription>
                    {isRTL 
                      ? 'التحكم في الميزات المتاحة على صفحة البطاقة الإلكترونية للزائر'
                      : 'Control features available on the visitor digital badge page'}
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
              {/* Page Status */}
              {!formState.visitor_webpage_enabled && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {isRTL 
                      ? 'صفحة بطاقة الزائر معطلة. سيرى الزوار رسالة خطأ.'
                      : 'Visitor badge page is disabled. Visitors will see an error message.'}
                  </p>
                </div>
              )}

              {/* Permissions */}
              <div className="space-y-4">
                <Label>{isRTL ? 'صلاحيات الصفحة' : 'Page Features'}</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Download className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {isRTL ? 'زر التحميل' : 'Download Button'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'السماح بحفظ البطاقة كصورة' : 'Allow saving badge as image'}
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
                          {isRTL ? 'زر المشاركة' : 'Share Button'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'السماح بمشاركة رابط البطاقة' : 'Allow sharing badge link'}
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

              {/* Preview Link */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  {isRTL ? 'معاينة الصفحة' : 'Page Preview'}
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="/visitor-badge/preview" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 me-2" />
                    {isRTL ? 'فتح صفحة تجريبية' : 'Open Sample Page'}
                  </a>
                </Button>
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
                    <Globe className="h-5 w-5" />
                    {isRTL ? 'صفحات العمال' : 'Worker Pages'}
                  </CardTitle>
                  <CardDescription>
                    {isRTL 
                      ? 'التحكم في الميزات المتاحة على صفحات التصريح والتدريب'
                      : 'Control features on access pass and induction pages'}
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
              {/* Page Status */}
              {!formState.worker_webpage_enabled && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {isRTL 
                      ? 'صفحات العمال معطلة. سيرى العمال رسالة خطأ.'
                      : 'Worker pages are disabled. Workers will see an error message.'}
                  </p>
                </div>
              )}

              {/* Permissions */}
              <div className="space-y-4">
                <Label>{isRTL ? 'صلاحيات الصفحة' : 'Page Features'}</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Download className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {isRTL ? 'زر التحميل' : 'Download Button'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'السماح بحفظ التصريح/الشهادة كصورة' : 'Allow saving pass/certificate as image'}
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
                          {isRTL ? 'زر المشاركة' : 'Share Button'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'السماح بمشاركة رابط التصريح' : 'Allow sharing pass link'}
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

              {/* Preview Links */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  {isRTL ? 'معاينة الصفحات' : 'Page Previews'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="/worker-access/preview" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 me-2" />
                      {isRTL ? 'صفحة التصريح' : 'Access Pass Page'}
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/worker-induction/preview" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 me-2" />
                      {isRTL ? 'صفحة التدريب' : 'Induction Page'}
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
