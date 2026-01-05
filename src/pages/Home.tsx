import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { HSSEContactCard } from '@/components/home/HSSEContactCard';
import { HomeQuickActions } from '@/components/home/HomeQuickActions';
import { OpenDashboardButton } from '@/components/home/OpenDashboardButton';

export default function Home() {
  const { t } = useTranslation();
  const { activeLogoUrl, tenantName } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Logo */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-lg mx-auto px-4 py-3 flex justify-center">
          {activeLogoUrl && (
            <img
              src={activeLogoUrl}
              alt={tenantName || 'Logo'}
              className="h-10 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <WelcomeHeader />

        {/* HSSE Contact Card */}
        <HSSEContactCard />

        {/* Quick Actions */}
        <HomeQuickActions />

        {/* Open Dashboard Button */}
        <div className="pt-2">
          <OpenDashboardButton />
        </div>
      </main>

      {/* Footer spacer for safe area */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}
