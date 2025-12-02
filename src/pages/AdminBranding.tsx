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
import { Palette, Image as ImageIcon, Smartphone, Layout, Upload, Save, Loader2, Globe, Shield } from 'lucide-react';
import { BrandingPreviewPanel } from '@/components/branding/BrandingPreviewPanel';
import { HslColorPicker } from '@/components/branding/HslColorPicker';
import { useBrandAssets, AssetType } from '@/hooks/use-brand-assets';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminBranding() {
  const { refreshTenantData } = useTheme();
  const { uploadAsset, uploading } = useBrandAssets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [tenant, setTenant] = useState<any>(null);

  const [brandColor, setBrandColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [bgTheme, setBgTheme] = useState<'color' | 'image'>('color');
  const [bgColor, setBgColor] = useState('');
  
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [sidebarIconPreview, setSidebarIconPreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(null);

  useEffect(() => {
    loadTenantData();
  }, []);

  const loadTenantData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile) return;

      const { data: tenantData, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single();

      if (error) throw error;

      setTenant(tenantData);
      setBrandColor(tenantData.brand_color || '');
      setSecondaryColor(tenantData.secondary_color || '');
      setBgTheme(tenantData.background_theme as any || 'color');
      setBgColor(tenantData.background_color || '');
      setLogoPreview(tenantData.logo_url);
      setSidebarIconPreview(tenantData.sidebar_icon_url);
      setIconPreview(tenantData.app_icon_url);
      setFaviconPreview(tenantData.favicon_url);
      setBgPreview(tenantData.background_image_url);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: AssetType) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const url = await uploadAsset(file, type, tenant.id);
    
    if (url) {
      if (type === 'logo') setLogoPreview(url);
      if (type === 'sidebar-icon') setSidebarIconPreview(url);
      if (type === 'icon') setIconPreview(url);
      if (type === 'favicon') setFaviconPreview(url);
      if (type === 'background') setBgPreview(url);
      
      toast({ title: 'Asset Uploaded', description: 'Don\'t forget to save your changes.' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        brand_color: brandColor,
        secondary_color: secondaryColor,
        background_theme: bgTheme,
        background_color: bgColor,
        logo_url: logoPreview,
        sidebar_icon_url: sidebarIconPreview,
        app_icon_url: iconPreview,
        favicon_url: faviconPreview,
        background_image_url: bgPreview
      };

      const { error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenant.id);

      if (error) throw error;

      await refreshTenantData(); 
      
      toast({ title: 'Branding Updated', description: 'Your changes have been applied live.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

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

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <Tabs defaultValue="visuals" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="visuals" className="gap-2"><Palette className="h-4 w-4"/> Visuals</TabsTrigger>
          <TabsTrigger value="assets" className="gap-2"><ImageIcon className="h-4 w-4"/> Assets</TabsTrigger>
          <TabsTrigger value="theme" className="gap-2"><Layout className="h-4 w-4"/> Theme</TabsTrigger>
        </TabsList>

        <TabsContent value="visuals">
          <Card>
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
              <CardDescription>Define the primary and secondary colors for your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <HslColorPicker
                  label="Primary Color (Buttons, Links, Active States)"
                  value={brandColor}
                  onChange={setBrandColor}
                />
                <HslColorPicker
                  label="Secondary Color (Accents, Highlights)"
                  value={secondaryColor}
                  onChange={setSecondaryColor}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" /> Login Page Logo
                </CardTitle>
                <CardDescription>
                  Full brand logo displayed on the login page.<br/>
                  <span className="text-xs font-mono text-muted-foreground">Req: PNG/SVG, Min 200x50px</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/10 min-h-[150px]">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-12 object-contain" />
                  ) : (
                    <span className="text-muted-foreground text-sm">No logo uploaded</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Input 
                    type="file" 
                    accept=".png,.svg" 
                    onChange={(e) => handleFileUpload(e, 'logo')}
                    disabled={uploading}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" /> Sidebar Icon
                </CardTitle>
                <CardDescription>
                  Small icon for sidebar header (icon only, no text).<br/>
                  <span className="text-xs font-mono text-muted-foreground">Req: PNG/SVG, Square, Min 64x64px</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/10 min-h-[150px]">
                  {sidebarIconPreview ? (
                    <img src={sidebarIconPreview} alt="Sidebar Icon" className="h-16 w-16 object-contain" />
                  ) : (
                    <span className="text-muted-foreground text-sm">No icon uploaded</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Input 
                    type="file" 
                    accept=".png,.svg" 
                    onChange={(e) => handleFileUpload(e, 'sidebar-icon')}
                    disabled={uploading}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" /> App Icon (PWA)
                </CardTitle>
                <CardDescription>
                  Used for mobile home screen installation.<br/>
                  <span className="text-xs font-mono text-muted-foreground">Req: PNG only, Exactly 512x512px</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/10 min-h-[150px]">
                  {iconPreview ? (
                    <img src={iconPreview} alt="Icon" className="h-20 w-20 object-contain rounded-xl shadow-sm" />
                  ) : (
                    <span className="text-muted-foreground text-sm">No icon uploaded</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Input 
                    type="file" 
                    accept=".png" 
                    onChange={(e) => handleFileUpload(e, 'icon')}
                    disabled={uploading}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" /> Browser Favicon
                </CardTitle>
                <CardDescription>
                  Displayed in browser tabs and bookmarks.<br/>
                  <span className="text-xs font-mono text-muted-foreground">Req: PNG/ICO, Max 128x128px</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/10 min-h-[150px]">
                  {faviconPreview ? (
                    <img src={faviconPreview} alt="Favicon" className="h-16 w-16 object-contain" />
                  ) : (
                    <span className="text-muted-foreground text-sm">No favicon uploaded</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Input 
                    type="file" 
                    accept=".png,.ico" 
                    onChange={(e) => handleFileUpload(e, 'favicon')}
                    disabled={uploading}
                  />
                </div>
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

        {/* Live Preview Panel - Hidden on mobile */}
        <div className="hidden lg:block">
          <BrandingPreviewPanel
            primaryColor={brandColor}
            logoUrl={logoPreview}
            sidebarIconUrl={sidebarIconPreview}
            tenantName={tenant?.name || ''}
          />
        </div>
      </div>
    </div>
  );
}
