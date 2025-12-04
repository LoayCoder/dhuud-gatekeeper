import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileInputButton } from '@/components/ui/file-input-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Palette, Image as ImageIcon, Layout, Upload, Save, Loader2, Sun, Moon } from 'lucide-react';
import { BrandingPreviewPanel } from '@/components/branding/BrandingPreviewPanel';
import { HslColorPicker } from '@/components/branding/HslColorPicker';
import { useBrandAssets, AssetType } from '@/hooks/use-brand-assets';
import { useTheme } from '@/contexts/ThemeContext';
export default function AdminBranding() {
  const {
    t
  } = useTranslation();
  const {
    refreshTenantData
  } = useTheme();
  const {
    uploadAsset,
    uploading
  } = useBrandAssets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<any>(null);

  // Light mode colors
  const [brandColorLight, setBrandColorLight] = useState('');
  const [secondaryColorLight, setSecondaryColorLight] = useState('');
  // Dark mode colors
  const [brandColorDark, setBrandColorDark] = useState('');
  const [secondaryColorDark, setSecondaryColorDark] = useState('');

  // Background settings
  const [bgTheme, setBgTheme] = useState<'color' | 'image'>('color');
  const [bgColor, setBgColor] = useState('');

  // Light mode assets
  const [logoLightPreview, setLogoLightPreview] = useState<string | null>(null);
  const [logoDarkPreview, setLogoDarkPreview] = useState<string | null>(null);
  const [sidebarIconLightPreview, setSidebarIconLightPreview] = useState<string | null>(null);
  const [sidebarIconDarkPreview, setSidebarIconDarkPreview] = useState<string | null>(null);
  const [iconLightPreview, setIconLightPreview] = useState<string | null>(null);
  const [iconDarkPreview, setIconDarkPreview] = useState<string | null>(null);

  // Shared assets
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(null);

  // Preview mode toggle
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    loadTenantData();
  }, []);
  const loadTenantData = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        setError(t('adminBranding.errors.notAuthenticated'));
        setLoading(false);
        return;
      }
      const {
        data: profile
      } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) {
        setError(t('adminBranding.errors.noTenant'));
        setLoading(false);
        return;
      }
      const {
        data: tenantData,
        error: tenantError
      } = await supabase.from('tenants').select(`
        id, name,
        brand_color, secondary_color, brand_color_dark, secondary_color_dark,
        background_theme, background_color, background_image_url,
        logo_light_url, logo_dark_url,
        sidebar_icon_light_url, sidebar_icon_dark_url,
        app_icon_light_url, app_icon_dark_url,
        favicon_url
      `).eq('id', profile.tenant_id).single();
      if (tenantError) throw tenantError;
      setTenant(tenantData);

      // Colors
      setBrandColorLight(tenantData.brand_color || '');
      setSecondaryColorLight(tenantData.secondary_color || '');
      setBrandColorDark(tenantData.brand_color_dark || '');
      setSecondaryColorDark(tenantData.secondary_color_dark || '');

      // Background
      setBgTheme(tenantData.background_theme as any || 'color');
      setBgColor(tenantData.background_color || '');
      setBgPreview(tenantData.background_image_url);

      // Light mode assets
      setLogoLightPreview(tenantData.logo_light_url);
      setSidebarIconLightPreview(tenantData.sidebar_icon_light_url);
      setIconLightPreview(tenantData.app_icon_light_url);

      // Dark mode assets
      setLogoDarkPreview(tenantData.logo_dark_url);
      setSidebarIconDarkPreview(tenantData.sidebar_icon_dark_url);
      setIconDarkPreview(tenantData.app_icon_dark_url);

      // Favicon
      setFaviconPreview(tenantData.favicon_url);
    } catch (err) {
      console.error(err);
      setError(t('adminBranding.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: AssetType) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!tenant?.id) {
      toast({
        title: t('auth.error'),
        description: t('adminBranding.errors.noTenantConfigured'),
        variant: 'destructive'
      });
      return;
    }
    const file = e.target.files[0];
    const url = await uploadAsset(file, type, tenant.id);
    if (url) {
      switch (type) {
        case 'logo-light':
          setLogoLightPreview(url);
          break;
        case 'logo-dark':
          setLogoDarkPreview(url);
          break;
        case 'sidebar-icon-light':
          setSidebarIconLightPreview(url);
          break;
        case 'sidebar-icon-dark':
          setSidebarIconDarkPreview(url);
          break;
        case 'icon-light':
          setIconLightPreview(url);
          break;
        case 'icon-dark':
          setIconDarkPreview(url);
          break;
        case 'favicon':
          setFaviconPreview(url);
          break;
        case 'background':
          setBgPreview(url);
          break;
      }
      toast({
        title: t('adminBranding.toast.assetUploaded'),
        description: t('adminBranding.toast.dontForgetSave')
      });
    }
  };
  const handleSave = async () => {
    if (!tenant?.id) {
      toast({
        title: t('auth.error'),
        description: t('adminBranding.errors.noTenantConfigured'),
        variant: 'destructive'
      });
      return;
    }
    setSaving(true);
    try {
      const updates = {
        // Light mode colors
        brand_color: brandColorLight,
        secondary_color: secondaryColorLight,
        // Dark mode colors
        brand_color_dark: brandColorDark,
        secondary_color_dark: secondaryColorDark,
        // Background
        background_theme: bgTheme,
        background_color: bgColor,
        background_image_url: bgPreview,
        // Light mode assets
        logo_light_url: logoLightPreview,
        sidebar_icon_light_url: sidebarIconLightPreview,
        app_icon_light_url: iconLightPreview,
        // Dark mode assets
        logo_dark_url: logoDarkPreview,
        sidebar_icon_dark_url: sidebarIconDarkPreview,
        app_icon_dark_url: iconDarkPreview,
        // Favicon
        favicon_url: faviconPreview
      };
      const {
        error: saveError
      } = await supabase.from('tenants').update(updates).eq('id', tenant.id);
      if (saveError) throw saveError;
      await refreshTenantData();
      toast({
        title: t('adminBranding.toast.brandingUpdated'),
        description: t('adminBranding.toast.changesApplied')
      });
    } catch (err) {
      toast({
        title: t('auth.error'),
        description: t('adminBranding.toast.saveFailed'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (error) {
    return <div className="flex h-screen items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t('adminBranding.errors.configError')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="p-6 space-y-6 max-w-7xl mx-auto text-start">
      <div className="flex flex-row-reverse justify-between items-center">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
          {saving ? t('adminBranding.saving') : t('adminBranding.saveChanges')}
        </Button>
        <div className="ltr:text-left rtl:text-right">
          <h1 className="text-3xl font-bold">{t('adminBranding.title')}</h1>
          <p className="text-muted-foreground">{t('adminBranding.subtitle')} {tenant?.name}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <Tabs defaultValue="visuals" className="w-full flex flex-col rtl:items-end">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="visuals" className="gap-2 ltr:flex-row rtl:flex-row-reverse"><Palette className="h-4 w-4" /> {t('adminBranding.tabs.colors')}</TabsTrigger>
          <TabsTrigger value="assets" className="gap-2 ltr:flex-row rtl:flex-row-reverse"><ImageIcon className="h-4 w-4" /> {t('adminBranding.tabs.assets')}</TabsTrigger>
          <TabsTrigger value="theme" className="gap-2 ltr:flex-row rtl:flex-row-reverse"><Layout className="h-4 w-4" /> {t('adminBranding.tabs.theme')}</TabsTrigger>
        </TabsList>

        <TabsContent value="visuals" className="w-full">
          <Card>
            <CardHeader>
              <CardTitle className="ltr:text-left rtl:text-right">{t('adminBranding.colors.title')}</CardTitle>
              <CardDescription className="ltr:text-left rtl:text-right">{t('adminBranding.colors.description')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-8 rtl:items-end">
              {/* Light Mode Colors */}
              <div className="flex flex-col space-y-4 w-full rtl:items-end">
                <div className="gap-2 text-lg font-semibold flex items-center ltr:justify-start rtl:justify-end ltr:flex-row rtl:flex-row-reverse">
                  <Sun className="h-5 w-5 text-amber-500" />
                  <span>{t('adminBranding.colors.lightMode')}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-6 w-full">
                  <HslColorPicker label={t('adminBranding.colors.primaryColor')} value={brandColorLight} onChange={setBrandColorLight} />
                  <HslColorPicker label={t('adminBranding.colors.secondaryColor')} value={secondaryColorLight} onChange={setSecondaryColorLight} />
                </div>
              </div>

              <Separator className="w-full" />

              {/* Dark Mode Colors */}
              <div className="flex flex-col space-y-4 w-full rtl:items-end">
                <div className="gap-2 text-lg font-semibold flex items-center ltr:justify-start rtl:justify-end ltr:flex-row rtl:flex-row-reverse">
                  <Moon className="h-5 w-5 text-blue-400" />
                  <span>{t('adminBranding.colors.darkMode')}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-6 w-full">
                  <HslColorPicker label={t('adminBranding.colors.primaryColor')} value={brandColorDark} onChange={setBrandColorDark} />
                  <HslColorPicker label={t('adminBranding.colors.secondaryColor')} value={secondaryColorDark} onChange={setSecondaryColorDark} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="w-full">
          <div className="flex flex-col space-y-6 rtl:items-end">
            {/* Login Page Logos */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="ltr:text-left rtl:text-right">{t('adminBranding.assets.loginLogos.title')}</CardTitle>
                <CardDescription className="ltr:text-left rtl:text-right">{t('adminBranding.assets.loginLogos.description')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col rtl:items-end">
                <div className="grid md:grid-cols-2 gap-6 w-full">
                  <div className="flex flex-col space-y-3 rtl:items-end">
                    <div className="flex items-center gap-2 text-sm font-medium ltr:flex-row rtl:flex-row-reverse">
                      <Sun className="h-4 w-4 text-amber-500" />
                      <span>{t('adminBranding.assets.loginLogos.lightMode')}</span>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center bg-background min-h-[100px] w-full">
                      {logoLightPreview ? <img src={logoLightPreview} alt="Logo Light" className="h-10 object-contain" /> : <span className="text-muted-foreground text-sm">{t('adminBranding.assets.loginLogos.noLogo')}</span>}
                    </div>
                    <FileInputButton accept=".png,.svg" onChange={e => handleFileUpload(e, 'logo-light')} disabled={uploading} className="w-full" />
                  </div>
                  <div className="flex flex-col space-y-3 rtl:items-end">
                    <div className="flex items-center gap-2 text-sm font-medium ltr:flex-row rtl:flex-row-reverse">
                      <Moon className="h-4 w-4 text-blue-400" />
                      <span>{t('adminBranding.assets.loginLogos.darkMode')}</span>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center bg-slate-900 min-h-[100px] w-full">
                      {logoDarkPreview ? <img src={logoDarkPreview} alt="Logo Dark" className="h-10 object-contain" /> : <span className="text-slate-400 text-sm">{t('adminBranding.assets.loginLogos.noLogo')}</span>}
                    </div>
                    <FileInputButton accept=".png,.svg" onChange={e => handleFileUpload(e, 'logo-dark')} disabled={uploading} className="w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sidebar Icons */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="ltr:text-left rtl:text-right">{t('adminBranding.assets.sidebarIcons.title')}</CardTitle>
                <CardDescription className="ltr:text-left rtl:text-right">{t('adminBranding.assets.sidebarIcons.description')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col rtl:items-end">
                <div className="grid md:grid-cols-2 gap-6 w-full">
                  <div className="flex flex-col space-y-3 rtl:items-end">
                    <div className="flex items-center gap-2 text-sm font-medium ltr:flex-row rtl:flex-row-reverse">
                      <Sun className="h-4 w-4 text-amber-500" />
                      <span>{t('adminBranding.colors.lightMode')}</span>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center bg-background min-h-[100px] w-full">
                      {sidebarIconLightPreview ? <img src={sidebarIconLightPreview} alt="Sidebar Icon Light" className="h-12 w-12 object-contain" /> : <span className="text-muted-foreground text-sm">{t('adminBranding.assets.sidebarIcons.noIcon')}</span>}
                    </div>
                    <FileInputButton accept=".png,.svg" onChange={e => handleFileUpload(e, 'sidebar-icon-light')} disabled={uploading} className="w-full" />
                  </div>
                  <div className="flex flex-col space-y-3 rtl:items-end">
                    <div className="flex items-center gap-2 text-sm font-medium ltr:flex-row rtl:flex-row-reverse">
                      <Moon className="h-4 w-4 text-blue-400" />
                      <span>{t('adminBranding.colors.darkMode')}</span>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center bg-slate-900 min-h-[100px] w-full">
                      {sidebarIconDarkPreview ? <img src={sidebarIconDarkPreview} alt="Sidebar Icon Dark" className="h-12 w-12 object-contain" /> : <span className="text-slate-400 text-sm">{t('adminBranding.assets.sidebarIcons.noIcon')}</span>}
                    </div>
                    <FileInputButton accept=".png,.svg" onChange={e => handleFileUpload(e, 'sidebar-icon-dark')} disabled={uploading} className="w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* App Icons (PWA) */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="ltr:text-left rtl:text-right">{t('adminBranding.assets.appIcons.title')}</CardTitle>
                <CardDescription className="ltr:text-left rtl:text-right">{t('adminBranding.assets.appIcons.description')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col rtl:items-end">
                <div className="grid md:grid-cols-2 gap-6 w-full">
                  <div className="flex flex-col space-y-3 rtl:items-end">
                    <div className="flex items-center gap-2 text-sm font-medium ltr:flex-row rtl:flex-row-reverse">
                      <Sun className="h-4 w-4 text-amber-500" />
                      <span>{t('adminBranding.colors.lightMode')}</span>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center bg-background min-h-[100px] w-full">
                      {iconLightPreview ? <img src={iconLightPreview} alt="App Icon Light" className="h-16 w-16 object-contain rounded-xl" /> : <span className="text-muted-foreground text-sm">{t('adminBranding.assets.sidebarIcons.noIcon')}</span>}
                    </div>
                    <FileInputButton accept=".png" onChange={e => handleFileUpload(e, 'icon-light')} disabled={uploading} className="w-full" />
                  </div>
                  <div className="flex flex-col space-y-3 rtl:items-end">
                    <div className="flex items-center gap-2 text-sm font-medium ltr:flex-row rtl:flex-row-reverse">
                      <Moon className="h-4 w-4 text-blue-400" />
                      <span>{t('adminBranding.colors.darkMode')}</span>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center bg-slate-900 min-h-[100px] w-full">
                      {iconDarkPreview ? <img src={iconDarkPreview} alt="App Icon Dark" className="h-16 w-16 object-contain rounded-xl" /> : <span className="text-slate-400 text-sm">{t('adminBranding.assets.sidebarIcons.noIcon')}</span>}
                    </div>
                    <FileInputButton accept=".png" onChange={e => handleFileUpload(e, 'icon-dark')} disabled={uploading} className="w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Favicon */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="ltr:text-left rtl:text-right">
                   {t('adminBranding.assets.favicon.title')}
                </CardTitle>
                <CardDescription className="ltr:text-left rtl:text-right">{t('adminBranding.assets.favicon.description')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col space-y-4 rtl:items-end">
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/10 min-h-[120px] w-full">
                  {faviconPreview ? <img src={faviconPreview} alt="Favicon" className="h-16 w-16 object-contain" /> : <span className="text-muted-foreground text-sm">{t('adminBranding.assets.favicon.noFavicon')}</span>}
                </div>
                <FileInputButton accept=".png,.ico" onChange={e => handleFileUpload(e, 'favicon')} disabled={uploading} className="w-full" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="theme" className="w-full">
          <Card>
            <CardHeader>
              <CardTitle className="ltr:text-left rtl:text-right">{t('adminBranding.theme.title')}</CardTitle>
              <CardDescription className="ltr:text-left rtl:text-right">{t('adminBranding.theme.description')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-6 rtl:items-end">
              <RadioGroup value={bgTheme} onValueChange={v => setBgTheme(v as 'color' | 'image')} className="flex gap-6 ltr:flex-row rtl:flex-row-reverse">
                <div className="flex items-center gap-2 ltr:flex-row rtl:flex-row-reverse">
                  <RadioGroupItem value="color" id="r-color" />
                  <Label htmlFor="r-color">{t('adminBranding.theme.solidColor')}</Label>
                </div>
                <div className="flex items-center gap-2 ltr:flex-row rtl:flex-row-reverse">
                  <RadioGroupItem value="image" id="r-image" />
                  <Label htmlFor="r-image">{t('adminBranding.theme.customImage')}</Label>
                </div>
              </RadioGroup>

              <Separator className="w-full" />

              {bgTheme === 'color' ? <div className="flex flex-col space-y-4 w-full rtl:items-end">
                  <HslColorPicker label={t('adminBranding.theme.backgroundColor')} value={bgColor} onChange={setBgColor} />
                </div> : <div className="flex flex-col space-y-4 w-full rtl:items-end">
                  <Label className="ltr:text-left rtl:text-right block">{t('adminBranding.theme.backgroundImage')}</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 min-h-[200px] bg-cover bg-center relative group w-full" style={{
                  backgroundImage: bgPreview ? `url(${bgPreview})` : 'none'
                }}>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                    <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileUpload(e, 'background')} disabled={uploading} />
                    {!bgPreview && <div className="flex items-center justify-center h-full">
                        <span className="text-muted-foreground text-sm">{t('adminBranding.theme.noImage')}</span>
                      </div>}
                  </div>
                  <p className="text-xs text-muted-foreground ltr:text-left rtl:text-right w-full">{t('adminBranding.theme.imageDescription')}</p>
                </div>}
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>

        {/* Live Preview Panel */}
        <div className="hidden lg:block">
          <BrandingPreviewPanel primaryColorLight={brandColorLight} primaryColorDark={brandColorDark} logoLightUrl={logoLightPreview} logoDarkUrl={logoDarkPreview} sidebarIconLightUrl={sidebarIconLightPreview} sidebarIconDarkUrl={sidebarIconDarkPreview} tenantName={tenant?.name || ''} previewMode={previewMode} onPreviewModeChange={setPreviewMode} />
        </div>
      </div>
    </div>;
}