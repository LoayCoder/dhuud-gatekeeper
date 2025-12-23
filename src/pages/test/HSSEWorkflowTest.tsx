/**
 * HSSE Event Workflow Test Page
 * Comprehensive testing UI for HSSE events with WhatsApp notifications
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TestTube2, 
  MessageSquare, 
  Users, 
  FileText, 
  Bell, 
  Settings,
  
  CheckCircle2
} from 'lucide-react';
import { WhatsAppConfigPanel } from '@/components/test/WhatsAppConfigPanel';
import { UserPhoneEditor } from '@/components/test/UserPhoneEditor';
import { SampleEventCreator } from '@/components/test/SampleEventCreator';
import { NotificationLogViewer } from '@/components/test/NotificationLogViewer';
import { WorkflowStatusDashboard } from '@/components/test/WorkflowStatusDashboard';

export default function HSSEWorkflowTest() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto py-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TestTube2 className="h-6 w-6 text-primary" />
            {isRTL ? 'اختبار سير عمل أحداث السلامة' : 'HSSE Event Workflow Test'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL 
              ? 'أدوات شاملة لاختبار الإشعارات وسير العمل'
              : 'Comprehensive testing tools for notifications and workflow'
            }
          </p>
        </div>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
          {isRTL ? 'وضع الاختبار' : 'Test Mode'}
        </Badge>
      </div>

      {/* Warning Alert */}
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <TestTube2 className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700">
          {isRTL 
            ? 'هذه الصفحة للاختبار فقط. الأحداث التي يتم إنشاؤها هنا ستكون حقيقية وستُرسل إشعارات فعلية.'
            : 'This page is for testing only. Events created here are real and will trigger actual notifications.'
          }
        </AlertDescription>
      </Alert>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isRTL ? 'نظرة عامة' : 'Overview'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isRTL ? 'إنشاء حدث' : 'Create Event'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isRTL ? 'الأرقام' : 'Phones'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isRTL ? 'واتساب' : 'WhatsApp'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isRTL ? 'السجلات' : 'Logs'}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <WorkflowStatusDashboard />
        </TabsContent>

        {/* Create Event Tab */}
        <TabsContent value="create" className="space-y-4">
          <SampleEventCreator />
        </TabsContent>

        {/* User Phone Editor Tab */}
        <TabsContent value="users" className="space-y-4">
          <UserPhoneEditor />
        </TabsContent>

        {/* WhatsApp Config Tab */}
        <TabsContent value="whatsapp" className="space-y-4">
          <WhatsAppConfigPanel />
        </TabsContent>

        {/* Notification Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <NotificationLogViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
