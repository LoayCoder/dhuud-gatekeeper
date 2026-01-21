import { useTheme } from '@/contexts/ThemeContext';
import { WelcomeCompact } from '@/components/home/WelcomeCompact';
import { HSSEContactCompact } from '@/components/home/HSSEContactCompact';
import { RoleBasedActionGrid } from '@/components/home/RoleBasedActionGrid';
import { HeaderControls } from '@/components/home/HeaderControls';

export default function Home() {
  const { activeLogoUrl, tenantName } = useTheme();

  // Version 3.0 - Logo Top, Content Below (Split Left/Right)
  return (
    <div 
      className="flex flex-col bg-background"
      data-version="3.0"
      style={{
        minHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Main Content Container with max width for responsiveness */}
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-4 flex flex-col gap-4 min-h-0">

        {/* Top Header Section */}
        <div className="flex flex-col gap-2 w-full">
          {/* 1. App Logo - Aligned to top, start (left) */}
          <div className="shrink-0 flex items-center justify-start h-12">
            {activeLogoUrl && (
              <img
                src={activeLogoUrl}
                alt={tenantName || 'Logo'}
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>

          {/* 2. Info Row - Directly under logo */}
          {/* justify-between pushes Welcome to Start and Controls to End */}
          <div className="flex flex-row items-center justify-between gap-4">
            {/* Welcome Message & Date/Time - Aligned Start */}
            <WelcomeCompact className="text-start" />

            {/* Controls (Language, Theme, Logout) - Aligned End */}
            {/* No flex-col here, so they remain horizontal */}
            <HeaderControls showLogout />
          </div>
        </div>

        {/* HSSE Contact - Compact version (Existing) */}
        <HSSEContactCompact className="shrink-0" />
        
        {/* Role-Based Action Cards Grid (Existing) */}
        <RoleBasedActionGrid className="flex-1" />
      </main>
    </div>
  );
}
