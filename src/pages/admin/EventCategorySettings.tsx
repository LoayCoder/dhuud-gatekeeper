import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EventCategoryManagement from '@/components/admin/EventCategoryManagement';
import NotificationMatrixManagement from '@/components/admin/NotificationMatrixManagement';
import { HSSETestDocumentButton } from '@/components/incidents/HSSETestDocumentButton';

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
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="categories">
            {t('settings.notificationMatrix.tabs.categories')}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            {t('settings.notificationMatrix.tabs.notifications')}
          </TabsTrigger>
          <TabsTrigger value="testing">
            {t('settings.eventCategories.tabs.testing', 'Testing')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories">
          <EventCategoryManagement />
        </TabsContent>
        
        <TabsContent value="notifications">
          <NotificationMatrixManagement />
        </TabsContent>

        <TabsContent value="testing">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.eventCategories.testing.title', 'HSSE Event Testing')}</CardTitle>
              <CardDescription>
                {t('settings.eventCategories.testing.description', 'Download test documentation and resources for HSSE event workflow testing')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <h4 className="font-medium text-sm">
                  {t('settings.eventCategories.testing.functionalTestDoc', 'Functional Test Document')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t('settings.eventCategories.testing.functionalTestDocDesc', 'Complete test scenarios covering the entire HSSE incident lifecycle from reporting to closure.')}
                </p>
                <div className="mt-2">
                  <HSSETestDocumentButton />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
