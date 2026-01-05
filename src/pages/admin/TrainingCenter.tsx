import React from 'react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { allTrainingGuides, RoleTrainingGuide } from '@/data/training';
import { 
  User, UserCheck, Briefcase, Shield, ShieldCheck, Search, ShieldAlert, 
  FileText, Settings, ChevronRight, BookOpen, CheckCircle2,
  AlertTriangle, Clock, FileWarning
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, any> = {
  User, UserCheck, Briefcase, Shield, ShieldCheck, Search, ShieldAlert, 
  FileText, Settings, FileContract: FileText
};

const categoryLabels = {
  reporter: { en: 'Reporters', ar: 'المُبلِّغون' },
  department: { en: 'Department', ar: 'القسم' },
  management: { en: 'Management', ar: 'الإدارة' },
  hsse: { en: 'HSSE Team', ar: 'فريق السلامة' },
  admin: { en: 'Administration', ar: 'الإدارة' },
};

export default function TrainingCenter() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [selectedGuide, setSelectedGuide] = useState<RoleTrainingGuide | null>(null);

  const getText = (text: { en: string; ar: string }) => isRtl ? text.ar : text.en;

  const groupedGuides = allTrainingGuides.reduce((acc, guide) => {
    if (!acc[guide.category]) acc[guide.category] = [];
    acc[guide.category].push(guide);
    return acc;
  }, {} as Record<string, RoleTrainingGuide[]>);

  if (selectedGuide) {
    const IconComponent = iconMap[selectedGuide.icon] || User;
    
    return (
      <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6">
        {/* Back Button - larger touch target */}
        <Button 
          variant="ghost" 
          onClick={() => setSelectedGuide(null)} 
          className="mb-4 gap-2 min-h-[44px] px-3"
        >
          <ChevronRight className={cn("h-5 w-5", !isRtl && "rotate-180")} />
          <span>{isRtl ? 'العودة للقائمة' : 'Back to List'}</span>
        </Button>

        <Card className="overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            {/* Stack header on mobile */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                  <IconComponent className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl sm:text-2xl leading-tight">
                  {getText(selectedGuide.roleName)}
                </CardTitle>
              </div>
              <CardDescription className="text-sm leading-relaxed sm:ms-auto sm:text-end sm:max-w-xs">
                {getText(selectedGuide.overview).slice(0, 100)}...
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <Tabs defaultValue="responsibilities" className="w-full">
              {/* Scrollable tabs on mobile */}
              <div className="border-b sm:border-0">
                <ScrollArea className="w-full">
                  <TabsList className="inline-flex h-12 w-max min-w-full justify-start rounded-none bg-muted/50 p-1 sm:grid sm:w-full sm:grid-cols-4 sm:rounded-lg sm:bg-muted">
                    <TabsTrigger 
                      value="responsibilities" 
                      className="min-w-max px-4 text-sm sm:px-2"
                    >
                      {isRtl ? 'المسؤوليات' : 'Responsibilities'}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="incidents" 
                      className="min-w-max px-4 text-sm sm:px-2"
                    >
                      {isRtl ? 'الحوادث' : 'Incidents'}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="observations" 
                      className="min-w-max px-4 text-sm sm:px-2"
                    >
                      {isRtl ? 'الملاحظات' : 'Observations'}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="faqs" 
                      className="min-w-max px-4 text-sm sm:px-2"
                    >
                      {isRtl ? 'الأسئلة' : 'FAQs'}
                    </TabsTrigger>
                  </TabsList>
                  <ScrollBar orientation="horizontal" className="sm:hidden" />
                </ScrollArea>
              </div>

              <div className="p-4 sm:p-0 sm:pt-4">
                <TabsContent value="responsibilities" className="mt-0 space-y-3">
                  {selectedGuide.responsibilities.map((resp) => (
                    <Card key={resp.id} className="shadow-sm">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                          <Badge 
                            variant={resp.priority === 'critical' ? 'destructive' : resp.priority === 'high' ? 'default' : 'secondary'}
                            className="w-fit shrink-0"
                          >
                            {resp.priority}
                          </Badge>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm sm:text-base">{getText(resp.title)}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                              {getText(resp.description)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="incidents" className="mt-0 space-y-3">
                  {selectedGuide.incidentWorkflow.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8 text-sm">
                      {isRtl ? 'لا توجد إجراءات حوادث لهذا الدور' : 'No incident workflow actions for this role'}
                    </p>
                  ) : (
                    selectedGuide.incidentWorkflow.map((step, idx) => (
                      <Card key={idx} className="shadow-sm">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-primary/10 p-2 rounded-full shrink-0">
                              <FileWarning className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">{getText(step.statusLabel)}</Badge>
                                {step.timeLimit && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Clock className="h-3 w-3 me-1" />{step.timeLimit}
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-semibold text-sm sm:text-base">{getText(step.action)}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                                {getText(step.howTo)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="observations" className="mt-0 space-y-3">
                  {selectedGuide.observationWorkflow.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8 text-sm">
                      {isRtl ? 'لا توجد إجراءات ملاحظات لهذا الدور' : 'No observation workflow actions for this role'}
                    </p>
                  ) : (
                    selectedGuide.observationWorkflow.map((step, idx) => (
                      <Card key={idx} className="shadow-sm">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-amber-500/10 p-2 rounded-full shrink-0">
                              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">{getText(step.statusLabel)}</Badge>
                                {step.timeLimit && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Clock className="h-3 w-3 me-1" />{step.timeLimit}
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-semibold text-sm sm:text-base">{getText(step.action)}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                                {getText(step.howTo)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="faqs" className="mt-0 space-y-3">
                  {selectedGuide.faqs.map((faq, idx) => (
                    <Card key={idx} className="shadow-sm">
                      <CardContent className="p-3 sm:p-4">
                        <h4 className="font-semibold text-sm sm:text-base flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{getText(faq.question)}</span>
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2 ps-6 leading-relaxed">
                          {getText(faq.answer)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6">
      {/* Header - mobile friendly */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
          <span>{isRtl ? 'مركز التدريب' : 'Training Center'}</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
          {isRtl ? 'أدلة تدريبية شاملة لكل دور في نظام الصحة والسلامة والأمن والبيئة' : 'Comprehensive training guides for each role in the HSSE system'}
        </p>
      </div>

      {/* Role Cards - stacked on mobile */}
      <div className="space-y-6">
        {Object.entries(groupedGuides).map(([category, guides]) => (
          <div key={category}>
            <h2 className="text-lg sm:text-xl font-semibold mb-3">
              {getText(categoryLabels[category as keyof typeof categoryLabels] || { en: category, ar: category })}
            </h2>
            <div className="space-y-3 sm:grid sm:gap-4 sm:space-y-0 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((guide) => {
                const IconComponent = iconMap[guide.icon] || User;
                return (
                  <Card 
                    key={guide.roleCode} 
                    className="cursor-pointer hover:border-primary active:scale-[0.98] transition-all shadow-sm"
                    onClick={() => setSelectedGuide(guide)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted shrink-0">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base sm:text-lg leading-tight">
                          {getText(guide.roleName)}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {getText(guide.overview)}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        <Badge variant="outline" className="text-xs">
                          {guide.responsibilities.length} {isRtl ? 'مسؤوليات' : 'responsibilities'}
                        </Badge>
                        {guide.incidentWorkflow.length > 0 && (
                          <Badge variant="secondary" className="text-xs">{isRtl ? 'حوادث' : 'Incidents'}</Badge>
                        )}
                        {guide.observationWorkflow.length > 0 && (
                          <Badge variant="secondary" className="text-xs">{isRtl ? 'ملاحظات' : 'Observations'}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
