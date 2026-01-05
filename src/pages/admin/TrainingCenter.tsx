import React from 'react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { allTrainingGuides, RoleTrainingGuide } from '@/data/training';
import { 
  User, UserCheck, Briefcase, Shield, ShieldCheck, Search, ShieldAlert, 
  FileText, Settings, ChevronRight, BookOpen, Download, CheckCircle2,
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
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <Button variant="ghost" onClick={() => setSelectedGuide(null)} className="mb-4">
          <ChevronRight className={cn("h-4 w-4 me-2", isRtl && "rotate-180")} />
          {isRtl ? 'العودة للقائمة' : 'Back to List'}
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={cn("p-3 rounded-lg", `bg-${selectedGuide.color}-100 dark:bg-${selectedGuide.color}-900/20`)}>
                {iconMap[selectedGuide.icon] && 
                  React.createElement(iconMap[selectedGuide.icon], { className: `h-6 w-6 text-${selectedGuide.color}-600` })}
              </div>
              <div>
                <CardTitle className="text-2xl">{getText(selectedGuide.roleName)}</CardTitle>
                <CardDescription>{getText(selectedGuide.overview).slice(0, 150)}...</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="responsibilities">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="responsibilities">{isRtl ? 'المسؤوليات' : 'Responsibilities'}</TabsTrigger>
                <TabsTrigger value="incidents">{isRtl ? 'الحوادث' : 'Incidents'}</TabsTrigger>
                <TabsTrigger value="observations">{isRtl ? 'الملاحظات' : 'Observations'}</TabsTrigger>
                <TabsTrigger value="faqs">{isRtl ? 'الأسئلة الشائعة' : 'FAQs'}</TabsTrigger>
              </TabsList>

              <TabsContent value="responsibilities" className="mt-4">
                <div className="space-y-4">
                  {selectedGuide.responsibilities.map((resp) => (
                    <Card key={resp.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Badge variant={resp.priority === 'critical' ? 'destructive' : resp.priority === 'high' ? 'default' : 'secondary'}>
                            {resp.priority}
                          </Badge>
                          <div>
                            <h4 className="font-semibold">{getText(resp.title)}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{getText(resp.description)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="incidents" className="mt-4">
                {selectedGuide.incidentWorkflow.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">{isRtl ? 'لا توجد إجراءات حوادث لهذا الدور' : 'No incident workflow actions for this role'}</p>
                ) : (
                  <div className="space-y-4">
                    {selectedGuide.incidentWorkflow.map((step, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-primary/10 p-2 rounded-full">
                              <FileWarning className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{getText(step.statusLabel)}</Badge>
                                {step.timeLimit && <Badge variant="secondary"><Clock className="h-3 w-3 me-1" />{step.timeLimit}</Badge>}
                              </div>
                              <h4 className="font-semibold">{getText(step.action)}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{getText(step.howTo)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="observations" className="mt-4">
                {selectedGuide.observationWorkflow.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">{isRtl ? 'لا توجد إجراءات ملاحظات لهذا الدور' : 'No observation workflow actions for this role'}</p>
                ) : (
                  <div className="space-y-4">
                    {selectedGuide.observationWorkflow.map((step, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-amber-500/10 p-2 rounded-full">
                              <AlertTriangle className="h-5 w-5 text-amber-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{getText(step.statusLabel)}</Badge>
                                {step.timeLimit && <Badge variant="secondary"><Clock className="h-3 w-3 me-1" />{step.timeLimit}</Badge>}
                              </div>
                              <h4 className="font-semibold">{getText(step.action)}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{getText(step.howTo)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="faqs" className="mt-4">
                <div className="space-y-4">
                  {selectedGuide.faqs.map((faq, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          {getText(faq.question)}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-2 ps-6">{getText(faq.answer)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          {isRtl ? 'مركز التدريب' : 'Training Center'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isRtl ? 'أدلة تدريبية شاملة لكل دور في نظام الصحة والسلامة والأمن والبيئة' : 'Comprehensive training guides for each role in the HSSE system'}
        </p>
      </div>

      <div className="grid gap-6">
        {Object.entries(groupedGuides).map(([category, guides]) => (
          <div key={category}>
            <h2 className="text-xl font-semibold mb-4">
              {getText(categoryLabels[category as keyof typeof categoryLabels] || { en: category, ar: category })}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {guides.map((guide) => {
                const IconComponent = iconMap[guide.icon] || User;
                return (
                  <Card key={guide.roleCode} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedGuide(guide)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg bg-muted")}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-lg">{getText(guide.roleName)}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">{getText(guide.overview)}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="outline">{guide.responsibilities.length} {isRtl ? 'مسؤوليات' : 'responsibilities'}</Badge>
                        {guide.incidentWorkflow.length > 0 && <Badge variant="secondary">{isRtl ? 'حوادث' : 'Incidents'}</Badge>}
                        {guide.observationWorkflow.length > 0 && <Badge variant="secondary">{isRtl ? 'ملاحظات' : 'Observations'}</Badge>}
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
