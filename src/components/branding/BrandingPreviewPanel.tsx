import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SidebarPreview } from './SidebarPreview';
import { LoginPreview } from './LoginPreview';
import { Sun, Moon } from 'lucide-react';

interface BrandingPreviewPanelProps {
  primaryColorLight: string;
  primaryColorDark: string;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  sidebarIconLightUrl: string | null;
  sidebarIconDarkUrl: string | null;
  tenantName: string;
  previewMode: 'light' | 'dark';
  onPreviewModeChange: (mode: 'light' | 'dark') => void;
}

export function BrandingPreviewPanel({ 
  primaryColorLight, 
  primaryColorDark, 
  logoLightUrl, 
  logoDarkUrl,
  sidebarIconLightUrl, 
  sidebarIconDarkUrl, 
  tenantName,
  previewMode,
  onPreviewModeChange
}: BrandingPreviewPanelProps) {
  const { t } = useTranslation();
  const isDark = previewMode === 'dark';
  const activePrimaryColor = isDark ? primaryColorDark : primaryColorLight;
  const activeLogoUrl = isDark ? (logoDarkUrl || logoLightUrl) : logoLightUrl;
  const activeSidebarIconUrl = isDark ? (sidebarIconDarkUrl || sidebarIconLightUrl) : sidebarIconLightUrl;

  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            {t('adminBranding.preview.livePreview')}
          </CardTitle>
          <ToggleGroup 
            type="single" 
            value={previewMode} 
            onValueChange={(v) => v && onPreviewModeChange(v as 'light' | 'dark')}
            className="h-8"
          >
            <ToggleGroupItem value="light" aria-label={t('common.light')} className="h-8 w-8 p-0">
              <Sun className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label={t('common.dark')} className="h-8 w-8 p-0">
              <Moon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sidebar" className="w-full">
          <TabsList className="mb-4 ms-auto">
            <TabsTrigger value="sidebar" className="text-xs">{t('adminBranding.preview.sidebar')}</TabsTrigger>
            <TabsTrigger value="login" className="text-xs">{t('adminBranding.preview.loginPage')}</TabsTrigger>
          </TabsList>

          <TabsContent value="sidebar" className="mt-0">
            <SidebarPreview 
              sidebarIconUrl={activeSidebarIconUrl} 
              primaryColor={activePrimaryColor} 
              tenantName={tenantName}
              isDark={isDark}
            />
          </TabsContent>

          <TabsContent value="login" className="mt-0">
            <LoginPreview 
              logoUrl={activeLogoUrl} 
              primaryColor={activePrimaryColor} 
              tenantName={tenantName}
              isDark={isDark}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
