import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Languages, 
  Sparkles, 
  Save, 
  Eye, 
  RefreshCw, 
  Trash2, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { usePageContentVersions, type PageType, type PageStatus } from '@/hooks/usePageContentVersions';
import { getSupportedLanguagesForPageType, getLanguageDisplayName, type SupportedLanguage } from '@/lib/language-resolver';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Default content templates for each page type
const DEFAULT_CONTENT: Record<PageType, Record<string, string>> = {
  visitor_badge: {
    page_title: 'Visitor Badge',
    visitor_name_label: 'Visitor Name',
    company_label: 'Company',
    host_label: 'Host',
    destination_label: 'Destination',
    valid_until_label: 'Valid Until',
    status_active: 'Active',
    status_expired: 'Expired',
    status_inactive: 'Inactive',
    safety_title: 'Safety Instructions',
    emergency_label: 'Emergency Contact',
    qr_instruction: 'Please present this QR code at the gate for entry',
    save_badge: 'Save Badge',
    share: 'Share',
  },
  worker_pass: {
    page_title: 'Worker Access Pass',
    worker_name_label: 'Worker Name',
    company_label: 'Company',
    project_label: 'Project',
    valid_until_label: 'Valid Until',
    status_active: 'Active',
    status_expired: 'Expired',
    status_revoked: 'Revoked',
    safety_title: 'Safety Instructions',
    emergency_label: 'Emergency Contact',
    qr_instruction: 'Please present this QR code at the gate for entry',
    save_pass: 'Save Pass',
    share: 'Share',
  },
  worker_induction: {
    // Page headers
    page_title: 'Safety Induction',
    page_subtitle: 'Complete the safety video before starting work',
    
    // Worker info section
    worker_name_label: 'Worker',
    project_label: 'Project',
    company_label: 'Company',
    
    // Video section
    video_section_title: 'Induction Video',
    video_duration_label: 'Duration',
    video_progress_label: 'Progress',
    watch_instruction: 'Please watch the video completely before proceeding',
    
    // Acknowledgment section
    acknowledgment_title: 'Safety Acknowledgment',
    acknowledgment_warning: 'Please watch the entire video and then agree to the terms below.',
    acknowledgment_text: 'I confirm that I have watched the entire safety video, understand all required safety procedures, and agree to comply with them.',
    submit_button: 'Submit Acknowledgment',
    
    // Success section
    success_title: 'Success!',
    success_message: 'Safety induction completed successfully. You can now start work.',
    
    // Certificate/ID section
    save_certificate: 'Save Certificate',
    share: 'Share',
    id_card_sent: 'Your ID Card has been sent via WhatsApp/Email',
    view_id_card: 'View ID Card Now',
    id_card_pending: 'ID card will be sent after your approval is confirmed',
    
    // Error states
    error_title: 'Error',
    not_found_title: 'Induction Not Found',
    not_found_message: 'This induction link is invalid or has expired.',
    expired_message: 'This induction link has expired',
    loading_failed: 'Failed to load induction data',
    submit_failed: 'Failed to submit acknowledgment',
  },
};

export default function PageContentEditor() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { profile } = useAuth();
  
  const [activePageType, setActivePageType] = useState<PageType>('visitor_badge');
  const [selectedLanguages, setSelectedLanguages] = useState<SupportedLanguage[]>([]);
  const [editingContent, setEditingContent] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<string | null>(null);
  
  const {
    versions,
    mainVersion,
    translatedVersions,
    isLoading,
    createVersion,
    updateVersion,
    deleteVersion,
    translate,
    isCreating,
    isUpdating,
    isDeleting,
    isTranslating,
  } = usePageContentVersions(activePageType);
  
  const { user } = useAuth();
  const tenantId = profile?.tenant_id;
  const userId = user?.id || null;
  const supportedLanguages = getSupportedLanguagesForPageType(activePageType);
  
  // Initialize editing content when main version loads
  useEffect(() => {
    if (mainVersion) {
      setEditingContent(mainVersion.content);
    } else {
      setEditingContent(DEFAULT_CONTENT[activePageType]);
    }
  }, [mainVersion, activePageType]);
  
  // Reset selected languages when page type changes
  useEffect(() => {
    setSelectedLanguages([]);
  }, [activePageType]);
  
  const handleCreateMainPage = async () => {
    if (!tenantId) return;
    
    try {
      await createVersion({
        tenant_id: tenantId,
        page_type: activePageType,
        language: 'en', // Main page is always English first
        is_main: true,
        status: 'draft',
        content: DEFAULT_CONTENT[activePageType],
        created_by: userId,
        updated_by: userId,
      });
      toast.success(t('pageEditor.mainPageCreated'));
    } catch (error) {
      console.error('Failed to create main page:', error);
    }
  };
  
  const handleSaveMainPage = async () => {
    if (!mainVersion) return;
    
    try {
      await updateVersion({
        id: mainVersion.id,
        content: editingContent,
      });
      toast.success(t('pageEditor.saved'));
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };
  
  const handlePublish = async (versionId: string) => {
    try {
      await updateVersion({
        id: versionId,
        status: 'published',
      });
      toast.success(t('pageEditor.published'));
    } catch (error) {
      console.error('Failed to publish:', error);
    }
  };
  
  const handleTranslate = async () => {
    if (!tenantId || !mainVersion || selectedLanguages.length === 0) return;
    
    const targetLangs = selectedLanguages.filter(lang => lang !== mainVersion.language);
    if (targetLangs.length === 0) {
      toast.error(t('pageEditor.noTargetLanguages'));
      return;
    }
    
    try {
      const translations = await translate({
        content: mainVersion.content,
        sourceLanguage: mainVersion.language,
        targetLanguages: targetLangs,
        tenantId,
      });
      
      // Create version for each translation
      for (const [lang, content] of Object.entries(translations)) {
        const existingVersion = translatedVersions.find(v => v.language === lang);
        
        if (existingVersion) {
          // Update existing
          await updateVersion({
            id: existingVersion.id,
            content: content as Record<string, string>,
            status: 'draft',
          });
        } else {
          // Create new
          await createVersion({
            tenant_id: tenantId,
            page_type: activePageType,
            language: lang as SupportedLanguage,
            is_main: false,
            status: 'draft',
            content: content as Record<string, string>,
            created_by: userId,
            updated_by: userId,
          });
        }
      }
      
      toast.success(t('pageEditor.translationComplete', { count: Object.keys(translations).length }));
      setSelectedLanguages([]);
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };
  
  const handleDeleteVersion = async () => {
    if (!versionToDelete) return;
    
    try {
      await deleteVersion(versionToDelete);
      setDeleteDialogOpen(false);
      setVersionToDelete(null);
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };
  
  const toggleLanguage = (lang: SupportedLanguage) => {
    setSelectedLanguages(prev => 
      prev.includes(lang) 
        ? prev.filter(l => l !== lang)
        : [...prev, lang]
    );
  };
  
  const getStatusBadge = (status: PageStatus) => {
    if (status === 'published') {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="h-3 w-3 me-1" />
          {t('pageEditor.published')}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <FileText className="h-3 w-3 me-1" />
        {t('pageEditor.draft')}
      </Badge>
    );
  };

  const pageTypes: { value: PageType; label: string }[] = [
    { value: 'visitor_badge', label: t('pageEditor.visitorBadge') },
    { value: 'worker_pass', label: t('pageEditor.workerPass') },
    { value: 'worker_induction', label: t('pageEditor.workerInduction') },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            {t('pageEditor.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('pageEditor.description')}
          </p>
        </div>
      </div>

      {/* Page Type Tabs */}
      <Tabs value={activePageType} onValueChange={(v) => setActivePageType(v as PageType)}>
        <TabsList className="grid w-full grid-cols-3">
          {pageTypes.map((pt) => (
            <TabsTrigger key={pt.value} value={pt.value}>
              {pt.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {pageTypes.map((pt) => (
          <TabsContent key={pt.value} value={pt.value} className="space-y-6 mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Main Page Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {t('pageEditor.mainPage')}
                  </CardTitle>
                  <CardDescription>
                    {t('pageEditor.mainPageDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!mainVersion ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        {t('pageEditor.noMainPage')}
                      </p>
                      <Button onClick={handleCreateMainPage} disabled={isCreating}>
                        {isCreating && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                        {t('pageEditor.createMainPage')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        {getStatusBadge(mainVersion.status)}
                        <Badge variant="outline">
                          {getLanguageDisplayName(mainVersion.language as SupportedLanguage)}
                        </Badge>
                      </div>
                      
                      <ScrollArea className="h-[400px] rounded-md border p-4">
                        <div className="space-y-4">
                          {Object.entries(editingContent).map(([key, value]) => (
                            <div key={key} className="space-y-2">
                              <Label htmlFor={key} className="text-xs text-muted-foreground">
                                {key.replace(/_/g, ' ')}
                              </Label>
                              {value.length > 100 ? (
                                <Textarea
                                  id={key}
                                  value={value}
                                  onChange={(e) => setEditingContent(prev => ({
                                    ...prev,
                                    [key]: e.target.value
                                  }))}
                                  rows={3}
                                />
                              ) : (
                                <Input
                                  id={key}
                                  value={value}
                                  onChange={(e) => setEditingContent(prev => ({
                                    ...prev,
                                    [key]: e.target.value
                                  }))}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSaveMainPage} 
                          disabled={isUpdating}
                          className="flex-1"
                        >
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 me-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 me-2" />
                          )}
                          {t('common.save')}
                        </Button>
                        {mainVersion.status === 'draft' && (
                          <Button 
                            variant="secondary"
                            onClick={() => handlePublish(mainVersion.id)}
                            disabled={isUpdating}
                          >
                            <CheckCircle2 className="h-4 w-4 me-2" />
                            {t('pageEditor.publish')}
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Language & Translation Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    {t('pageEditor.languageTranslation')}
                  </CardTitle>
                  <CardDescription>
                    {t('pageEditor.languageTranslationDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Language Selection */}
                  <div className="space-y-3">
                    <Label>{t('pageEditor.selectLanguages')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {supportedLanguages
                        .filter(lang => lang !== mainVersion?.language)
                        .map((lang) => {
                          const hasVersion = translatedVersions.some(v => v.language === lang);
                          return (
                            <div
                              key={lang}
                              className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                                selectedLanguages.includes(lang)
                                  ? 'bg-primary/10 border-primary'
                                  : 'hover:bg-muted'
                              }`}
                              onClick={() => toggleLanguage(lang)}
                            >
                              <Checkbox
                                checked={selectedLanguages.includes(lang)}
                                onCheckedChange={() => toggleLanguage(lang)}
                              />
                              <span>{getLanguageDisplayName(lang)}</span>
                              {hasVersion && (
                                <Badge variant="outline" className="text-xs">
                                  {t('pageEditor.exists')}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Translate Button */}
                  <Button
                    onClick={handleTranslate}
                    disabled={!mainVersion || selectedLanguages.length === 0 || isTranslating}
                    className="w-full"
                  >
                    {isTranslating ? (
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 me-2" />
                    )}
                    {t('pageEditor.aiTranslate')}
                  </Button>

                  {/* Translated Versions List */}
                  {translatedVersions.length > 0 && (
                    <div className="space-y-3">
                      <Label>{t('pageEditor.translatedVersions')}</Label>
                      <div className="space-y-2">
                        {translatedVersions.map((version) => (
                          <div
                            key={version.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {getLanguageDisplayName(version.language as SupportedLanguage)}
                              </span>
                              {getStatusBadge(version.status)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" title={t('pageEditor.preview')}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                title={t('pageEditor.retranslate')}
                                onClick={() => {
                                  setSelectedLanguages([version.language as SupportedLanguage]);
                                }}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              {version.status === 'draft' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handlePublish(version.id)}
                                  disabled={isUpdating}
                                  title={t('pageEditor.publish')}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setVersionToDelete(version.id);
                                  setDeleteDialogOpen(true);
                                }}
                                title={t('common.delete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pageEditor.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pageEditor.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVersion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
