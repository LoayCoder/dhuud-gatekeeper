import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Palette, Building2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  brand_color: string;
  logo_url: string | null;
}

export default function AdminBranding() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [previewColor, setPreviewColor] = useState('221.2 83.2% 53.3%');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('name');

      if (error) throw error;
      setTenants(data || []);
      if (data && data.length > 0) {
        setSelectedTenant(data[0]);
        setPreviewColor(data[0].brand_color);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tenants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (color: string) => {
    setPreviewColor(color);
    if (selectedTenant) {
      setSelectedTenant({ ...selectedTenant, brand_color: color });
    }
  };

  const handleSave = async () => {
    if (!selectedTenant) return;

    try {
      const { error } = await supabase
        .from('tenants')
        .update({ brand_color: selectedTenant.brand_color, name: selectedTenant.name })
        .eq('id', selectedTenant.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Tenant branding updated successfully',
      });

      fetchTenants();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tenant',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Convert HSL string to hex for color picker
  const hslToHex = (hsl: string) => {
    const [h, s, l] = hsl.split(' ').map((v) => parseFloat(v));
    const lightness = l / 100;
    const saturation = s / 100;
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const hue = h / 60;
    const x = chroma * (1 - Math.abs((hue % 2) - 1));
    const m = lightness - chroma / 2;
    let r = 0,
      g = 0,
      b = 0;

    if (hue >= 0 && hue < 1) {
      r = chroma;
      g = x;
    } else if (hue >= 1 && hue < 2) {
      r = x;
      g = chroma;
    } else if (hue >= 2 && hue < 3) {
      g = chroma;
      b = x;
    } else if (hue >= 3 && hue < 4) {
      g = x;
      b = chroma;
    } else if (hue >= 4 && hue < 5) {
      r = x;
      b = chroma;
    } else {
      r = chroma;
      b = x;
    }

    const toHex = (n: number) =>
      Math.round((n + m) * 255)
        .toString(16)
        .padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Convert hex to HSL string
  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Brand Management Console</h1>
            <p className="mt-2 text-muted-foreground">
              Manage tenant branding and visual identity
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tenant Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Select Tenant
              </CardTitle>
              <CardDescription>Choose a tenant to edit their branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tenants.map((tenant) => (
                <Button
                  key={tenant.id}
                  variant={selectedTenant?.id === tenant.id ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedTenant(tenant);
                    setPreviewColor(tenant.brand_color);
                  }}
                >
                  <div
                    className="mr-3 h-4 w-4 rounded-full"
                    style={{ backgroundColor: `hsl(${tenant.brand_color})` }}
                  />
                  {tenant.name}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Brand Editor */}
          {selectedTenant && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Edit Branding
                </CardTitle>
                <CardDescription>Customize the tenant's visual identity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="tenant-name">Tenant Name</Label>
                  <Input
                    id="tenant-name"
                    value={selectedTenant.name}
                    onChange={(e) =>
                      setSelectedTenant({ ...selectedTenant, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand-color">Brand Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="brand-color"
                      type="color"
                      value={hslToHex(previewColor)}
                      onChange={(e) => handleColorChange(hexToHsl(e.target.value))}
                      className="h-12 w-20"
                    />
                    <Input
                      value={previewColor}
                      onChange={(e) => handleColorChange(e.target.value)}
                      placeholder="HSL format: 221.2 83.2% 53.3%"
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Live Preview */}
                <div className="space-y-2">
                  <Label>Live Preview</Label>
                  <div className="rounded-lg border p-6">
                    <Button
                      style={
                        {
                          '--primary': previewColor,
                          backgroundColor: `hsl(${previewColor})`,
                          color: 'white',
                        } as React.CSSProperties
                      }
                      className="w-full"
                    >
                      Preview Button
                    </Button>
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full">
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
