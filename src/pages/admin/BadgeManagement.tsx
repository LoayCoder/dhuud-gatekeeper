import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnterprisePage } from '@/components/layout/EnterprisePage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BadgeDefinitionsTab } from '@/features/admin';
import { ChallengesTab } from '@/features/admin';
import { BadgeStatisticsTab } from '@/features/admin';

export default function BadgeManagement() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('credentials');

  return (
    <EnterprisePage
      title={t('admin.badges.title', 'Credential Management')}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="credentials">
            {t('admin.badges.credentials', 'Credentials')}
          </TabsTrigger>
          <TabsTrigger value="objectives">
            {t('admin.badges.objectives', 'Objectives')}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            {t('admin.badges.analytics', 'Analytics')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="credentials">
          <BadgeDefinitionsTab />
        </TabsContent>

        <TabsContent value="objectives">
          <ChallengesTab />
        </TabsContent>

        <TabsContent value="analytics">
          <BadgeStatisticsTab />
        </TabsContent>
      </Tabs>
    </EnterprisePage>
  );
}

