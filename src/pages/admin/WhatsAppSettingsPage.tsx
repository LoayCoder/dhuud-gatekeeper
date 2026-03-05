import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { WhatsAppSettings } from '@/features/admin';

export default function WhatsAppSettingsPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {isRTL ? "Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª ÙˆØ§ØªØ³Ø§Ø¨" : t('navigation.whatsappSettings', 'WhatsApp Settings')}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? "ØªÙƒÙˆÙŠÙ† Ù…Ø²ÙˆØ¯ Ø®Ø¯Ù…Ø© ÙˆØ§ØªØ³Ø§Ø¨ ÙˆØ¥Ø±Ø³Ø§Ù„ Ø±Ø³Ø§Ø¦Ù„ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±" 
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

