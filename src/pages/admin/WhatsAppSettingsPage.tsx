import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { WhatsAppSettings } from '@/features/admin';

export default function WhatsAppSettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('whatsappSettings.pageTitle')}
          </CardTitle>
          <CardDescription>
            {t('whatsappSettings.pageDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WhatsAppSettings />
        </CardContent>
      </Card>
    </div>
  );
}
