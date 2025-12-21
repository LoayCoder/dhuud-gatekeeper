import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { WhatsAppSettings } from "@/components/admin/WhatsAppSettings";

export default function WhatsAppSettingsPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {isRTL ? "إعدادات واتساب" : t('navigation.whatsappSettings', 'WhatsApp Settings')}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? "تكوين مزود خدمة واتساب وإرسال رسائل الاختبار" 
              : "Configure your WhatsApp provider and send test messages"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WhatsAppSettings />
        </CardContent>
      </Card>
    </div>
  );
}
