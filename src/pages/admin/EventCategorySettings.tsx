import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EventCategoryManagement from '@/components/admin/EventCategoryManagement';
import NotificationMatrixManagement from '@/components/admin/NotificationMatrixManagement';

export default function EventCategorySettings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2 mb-4"
        >
          <ArrowLeft className={`h-4 w-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
          {t('common.back')}
        </Button>
        <h1 className="text-2xl font-bold">{t('settings.eventCategories.pageTitle')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('settings.eventCategories.pageDescription')}
        </p>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="categories">
            {t('settings.notificationMatrix.tabs.categories')}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            {t('settings.notificationMatrix.tabs.notifications')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories">
          <EventCategoryManagement />
        </TabsContent>
        
        <TabsContent value="notifications">
          <NotificationMatrixManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
