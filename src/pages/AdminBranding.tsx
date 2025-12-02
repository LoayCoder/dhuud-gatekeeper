import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Palette, Image as ImageIcon, Layout, Upload, Save, Loader2, Globe, Sun, Moon } from 'lucide-react';
import { BrandingPreviewPanel } from '@/components/branding/BrandingPreviewPanel';
import { HslColorPicker } from '@/components/branding/HslColorPicker';
import { useBrandAssets, AssetType } from '@/hooks/use-brand-assets';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminBranding() {
  const { refreshTenantData } = useTheme();
  const { uploadAsset, uploading } = useBrandAssets();
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) {
        setError('Your account is not linked to any organization. Please contact support.');
        setLoading(false);
        return;
      }

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single();

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
      setError('Failed to load branding data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: AssetType) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!tenant?.id) {
      toast({ title: 'Error', description: 'No tenant configured', variant: 'destructive' });
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
      
      toast({ title: 'Asset Uploaded', description: 'Don\'t forget to save your changes.' });
    }
  };

  const handleSave = async () => {
    if (!tenant?.id) {
      toast({ title: 'Error', description: 'No tenant configured', variant: 'destructive' });
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
        favicon_url: faviconPreview,
      };

      const { error: saveError } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenant.id);

      if (saveError) throw saveError;

      await refreshTenantData(); 
      
      toast({ title: 'Branding Updated', description: 'Your changes have been applied live.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Configuration Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Brand Management Console</h1>
          <p className="text-muted-foreground">Customize the visual identity for {tenant?.name}</p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <Tabs defaultValue="visuals" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="visuals" className="gap-2"><Palette className="h-4 w-4"/> Colors</TabsTrigger>
          <TabsTrigger value="assets" className="gap-2"><ImageIcon className="h-4 w-4"/> Assets</TabsTrigger>
          <TabsTrigger value="theme" className="gap-2"><Layout className="h-4 w-4"/> Theme</TabsTrigger>
        </TabsList>

        <TabsContent value="visuals">
          <Card>
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
              <CardDescription>Define separate colors for light and dark modes to ensure proper contrast.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Light Mode Colors */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Sun className="h-5 w-5 text-amber-500" />
                  <span>Light Mode</span>
                </div>
                <div className="grid md:grid-cols-2 gap-6 pl-7">
                  <HslColorPicker
                    label="Primary Color"
                    value={brandColorLight}
                    onChange={setBrandColorLight}
                  />
                  <HslColorPicker
                    label="Secondary Color"
                    value={secondaryColorLight}
                    onChange={setSecondaryColorLight}
                  />
                </div>
              </div>

              <Separator />

              {/* Dark Mode Colors */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Moon className="h-5 w-5 text-blue-400" />
                  <span>Dark Mode</span>
                </div>
                <div className="grid md:grid-cols-2 gap-6 pl-7">
                  <HslColorPicker
                    label="Primary Color"
                    value={brandColorDark}
                    onChange={setBrandColorDark}
                  />
                  <HslColorPicker
                    label="Secondary Color"
                    value={secondaryColorDark}
                    onChange={setSecondaryColorDark}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets">
          <div className="space-y-6">
            {/* Login Page Logos */}
            <Card>
              <CardHeader>
                <CardTitle>Login Page Logos</CardTitle>
                <CardDescription>Full brand logos displayed on the login page. PNG/SVG, Min 200x50px</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Sun className="h-4 w-4 text-amber-500" />
                      <span>Light Mode (dark logo)</span>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center bg-background min-h-[100px]">
                      {logoLightPreview ? (
                        <img src={logoLightPreview} alt="Logo Light" className="h-10 object-contain" />
                      ) : (
                        <span className="text-muted-foreground text-sm">No logo</span>
                      )}
                    </div>
                    <Input 
                      type="file" 
                      accept=".png,.svg" 
                      onChange={(e) => handleFileUpload(e, 'logo-light')}
                      disabled={uploading}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Moon className="h-4 w-4 text-blue-400" />
                      <span>Dark Mode (light logo)</span>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center bg-slate-900 min-h-[100px]">
                      {logoDarkPreview ? (
                        <img src={logoDarkPreview} alt="Logo Dark" className="h-10 object-contain" />
                      ) : (
                        <span className="text-slate-400 text-sm">No logo</span>
                      )}
                    </div>
                    <Input 
                      type="file" 
                      accept=".png,.svg" 
                      onChange={(e) => handleFileUpload(e, 'logo-dark')}
                      disabled={uploading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sidebar Icons */}
            <Card>
              <CardHeader>
                <CardTitle>Sidebar Icons</CardTitle>
                <CardDescription>Small icons for sidebar header. PNG/SVG, Square, Min 64x64px</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Sun className="h-4 w-4 text-amber-500" />
                      <span>Light Mode</span>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center bg-background min-h-[100px]">
                      {sidebarIconLightPreview ? (
                        <img src={sidebarIconLightPreview} alt="Sidebar Icon Light" className="h-12 w-12 object-contain" />
                      ) : (
                        <span className="text-muted-foreground text-sm">No icon</span>
                      )}
                    </div>
                    <Input 
                      type="file" 
                      accept=".png,.svg" 
                      onChange={(e) => handleFileUpload(e, 'sidebar-icon-light')}
                      disabled={uploading}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Moon className="h-4 w-4 text-blue-400" />
                      <span>Dark Mode</span>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center bg-slate-900 min-h-[100px]">
                      {sidebarIconDarkPreview ? (
                        <img src={sidebarIconDarkPreview} alt="Sidebar Icon Dark" className="h-12 w-12 object-contain" />
                      ) : (
                        <span className="text-slate-400 text-sm">No icon</span>
                      )}
                    </div>
                    <Input 
                      type="file" 
                      accept=".png,.svg" 
                      onChange={(e) => handleFileUpload(e, 'sidebar-icon-dark')}
                      disabled={uploading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* App Icons (PWA) */}
            <Card>
              <CardHeader>
                <CardTitle>App Icons (PWA)</CardTitle>
                <CardDescription>Mobile home screen icons. PNG only, exactly 512x512px</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Sun className="h-4 w-4 text-amber-500" />
                      <span>Light Mode</span>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center bg-background min-h-[100px]">
                      {iconLightPreview ? (
                        <img src={iconLightPreview} alt="App Icon Light" className="h-16 w-16 object-contain rounded-xl" />
                      ) : (
                        <span className="text-muted-foreground text-sm">No icon</span>
                      )}
                    </div>
                    <Input 
                      type="file" 
                      accept=".png" 
                      onChange={(e) => handleFileUpload(e, 'icon-light')}
                      disabled={uploading}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Moon className="h-4 w-4 text-blue-400" />
                      <span>Dark Mode</span>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center bg-slate-900 min-h-[100px]">
                      {iconDarkPreview ? (
                        <img src={iconDarkPreview} alt="App Icon Dark" className="h-16 w-16 object-contain rounded-xl" />
                      ) : (
                        <span className="text-slate-400 text-sm">No icon</span>
                      )}
                    </div>
                    <Input 
                      type="file" 
                      accept=".png" 
                      onChange={(e) => handleFileUpload(e, 'icon-dark')}
                      disabled={uploading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Favicon */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" /> Browser Favicon
                </CardTitle>
                <CardDescription>Displayed in browser tabs. PNG/ICO, Max 128x128px</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/10 min-h-[120px]">
                  {faviconPreview ? (
                    <img src={faviconPreview} alt="Favicon" className="h-16 w-16 object-contain" />
                  ) : (
                    <span className="text-muted-foreground text-sm">No favicon uploaded</span>
                  )}
                </div>
                <Input 
                  type="file" 
                  accept=".png,.ico" 
                  onChange={(e) => handleFileUpload(e, 'favicon')}
                  disabled={uploading}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="theme">
          <Card>
            <CardHeader>
              <CardTitle>Background Customization</CardTitle>
              <CardDescription>Choose between a solid color or a custom image for special occasions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={bgTheme} onValueChange={(v) => setBgTheme(v as 'color' | 'image')} className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="color" id="r-color" />
                  <Label htmlFor="r-color">Solid Color</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="image" id="r-image" />
                  <Label htmlFor="r-image">Custom Image</Label>
                </div>
              </RadioGroup>

              <Separator />

              {bgTheme === 'color' ? (
                <div className="space-y-4">
                  <Label>Background Color</Label>
                  <div className="flex gap-4 items-center">
                    <div 
                      className="h-12 w-12 rounded-lg border shadow-sm" 
                      style={{ backgroundColor: `hsl(${bgColor})` }} 
                    />
                    <Input 
                      value={bgColor} 
                      onChange={(e) => setBgColor(e.target.value)}
                      placeholder="HSL Value (e.g. 0 0% 98%)"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Label>Upload Background Image (HD)</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 min-h-[200px] bg-cover bg-center relative group" style={{ backgroundImage: bgPreview ? `url(${bgPreview})` : 'none' }}>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                    <Input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={(e) => handleFileUpload(e, 'background')}
                      disabled={uploading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Recommended: 1920x1080px, JPG/PNG</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>

        {/* Live Preview Panel */}
        <div className="hidden lg:block">
          <BrandingPreviewPanel
            primaryColorLight={brandColorLight}
            primaryColorDark={brandColorDark}
            logoLightUrl={logoLightPreview}
            logoDarkUrl={logoDarkPreview}
            sidebarIconLightUrl={sidebarIconLightPreview}
            sidebarIconDarkUrl={sidebarIconDarkPreview}
            tenantName={tenant?.name || ''}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
          />
        </div>
      </div>
    </div>
  );
}
