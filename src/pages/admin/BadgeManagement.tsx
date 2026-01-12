import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnterprisePage } from '@/components/layout/EnterprisePage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Target, BarChart3 } from 'lucide-react';
import { BadgeDefinitionsTab } from '@/components/admin/badges/BadgeDefinitionsTab';
import { ChallengesTab } from '@/components/admin/badges/ChallengesTab';
import { BadgeStatisticsTab } from '@/components/admin/badges/BadgeStatisticsTab';

export default function BadgeManagement() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('badges');
  const isRTL = i18n.language === 'ar';

  return (
    <EnterprisePage
      title={t('admin.badges.title', 'Badge Management')}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="badges" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t('admin.badges.badgeDefinitions', 'Badge Definitions')}
            </span>
            <span className="sm:hidden">
              {t('admin.badges.badges', 'Badges')}
            </span>
          </TabsTrigger>
          <TabsTrigger value="challenges" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t('admin.badges.challengesTab', 'Challenges')}
            </span>
            <span className="sm:hidden">
              {t('admin.badges.challenges', 'Challenges')}
            </span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t('admin.badges.statisticsTab', 'Statistics')}
            </span>
            <span className="sm:hidden">
              {t('admin.badges.stats', 'Stats')}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="badges">
          <BadgeDefinitionsTab />
        </TabsContent>

        <TabsContent value="challenges">
          <ChallengesTab />
        </TabsContent>

        <TabsContent value="statistics">
          <BadgeStatisticsTab />
        </TabsContent>
      </Tabs>
    </EnterprisePage>
  );
}
