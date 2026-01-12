import { useTheme } from '@/contexts/ThemeContext';
import { WelcomeCompact } from '@/components/home/WelcomeCompact';
import { HSSEContactCompact } from '@/components/home/HSSEContactCompact';
import { RoleBasedActionGrid } from '@/components/home/RoleBasedActionGrid';
import { HeaderControls } from '@/components/home/HeaderControls';

export default function Home() {
  const { activeLogoUrl, tenantName } = useTheme();

  return (
    <div 
      className="flex flex-col bg-background"
      style={{
        minHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Compact Header with Logo */}
      <header className="shrink-0 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="shrink-0">
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

          {/* Compact Welcome - always visible */}
          <div className="flex-1 min-w-0">
            <WelcomeCompact />
          </div>

          {/* Header Controls (Language + Theme) */}
          <HeaderControls />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-4 flex flex-col gap-4 min-h-0">
        {/* HSSE Contact - Compact version */}
        <HSSEContactCompact className="shrink-0" />
        
        {/* Role-Based Action Cards Grid */}
        <RoleBasedActionGrid className="flex-1" />
      </main>
    </div>
  );
}
