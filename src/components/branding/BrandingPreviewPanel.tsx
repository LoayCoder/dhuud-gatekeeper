import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarPreview } from './SidebarPreview';
import { LoginPreview } from './LoginPreview';

interface BrandingPreviewPanelProps {
  primaryColor: string;
  logoUrl: string | null;
  tenantName: string;
}

export function BrandingPreviewPanel({ primaryColor, logoUrl, tenantName }: BrandingPreviewPanelProps) {
  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Live Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sidebar" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="sidebar" className="text-xs">Sidebar</TabsTrigger>
            <TabsTrigger value="login" className="text-xs">Login Page</TabsTrigger>
          </TabsList>

          <TabsContent value="sidebar" className="mt-0">
            <SidebarPreview 
              logoUrl={logoUrl} 
              primaryColor={primaryColor} 
              tenantName={tenantName} 
            />
          </TabsContent>

          <TabsContent value="login" className="mt-0">
            <LoginPreview 
              logoUrl={logoUrl} 
              primaryColor={primaryColor} 
              tenantName={tenantName} 
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
