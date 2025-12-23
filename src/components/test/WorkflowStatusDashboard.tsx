/**
 * Workflow Status Dashboard
 * Overview of HSSE event workflow with test scenarios
 */

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Circle,
  ArrowRight,
  FileText,
  Eye,
  UserCheck,
  Search,
  ClipboardCheck,
  Wrench,
  BarChart3,
  Users,
  MessageSquare,
  Mail,
  Smartphone
} from 'lucide-react';

// Workflow steps
const WORKFLOW_STEPS = [
  { 
    id: 'report', 
    label: { en: 'Report Submitted', ar: 'تقديم التقرير' },
    icon: FileText,
    color: 'text-blue-500',
    actors: ['reporter'],
    triggers: ['push', 'email']
  },
  { 
    id: 'screen', 
    label: { en: 'HSSE Screening', ar: 'فحص السلامة' },
    icon: Eye,
    color: 'text-amber-500',
    actors: ['hsse_expert'],
    triggers: ['push', 'email', 'whatsapp']
  },
  { 
    id: 'approve', 
    label: { en: 'Dept. Approval', ar: 'موافقة القسم' },
    icon: UserCheck,
    color: 'text-purple-500',
    actors: ['dept_representative'],
    triggers: ['push', 'email']
  },
  { 
    id: 'investigate', 
    label: { en: 'Investigation', ar: 'التحقيق' },
    icon: Search,
    color: 'text-orange-500',
    actors: ['investigator'],
    triggers: ['push', 'email']
  },
  { 
    id: 'review', 
    label: { en: 'Review Findings', ar: 'مراجعة النتائج' },
    icon: ClipboardCheck,
    color: 'text-teal-500',
    actors: ['hsse_expert', 'dept_representative'],
    triggers: ['push', 'email']
  },
  { 
    id: 'actions', 
    label: { en: 'Corrective Actions', ar: 'الإجراءات التصحيحية' },
    icon: Wrench,
    color: 'text-green-500',
    actors: ['action_owner'],
    triggers: ['push', 'email']
  },
  { 
    id: 'close', 
    label: { en: 'Closure', ar: 'الإغلاق' },
    icon: CheckCircle2,
    color: 'text-green-600',
    actors: ['hsse_expert'],
    triggers: ['push', 'email']
  },
];

// Test scenarios
const TEST_SCENARIOS = [
  {
    id: 'observation',
    title: { en: 'Scenario 1: Observation → Action', ar: 'السيناريو 1: ملاحظة → إجراء' },
    description: { 
      en: 'Level 1-2 observation goes directly to action creation, no investigation needed.',
      ar: 'المستوى 1-2 ملاحظة تذهب مباشرة لإنشاء الإجراء، لا حاجة للتحقيق.'
    },
    steps: ['report', 'screen', 'actions', 'close'],
    notifications: {
      whatsapp: false,
      expected: ['HSSE Expert receives push/email on submission']
    }
  },
  {
    id: 'incident_full',
    title: { en: 'Scenario 2: Full Investigation Cycle', ar: 'السيناريو 2: دورة التحقيق الكاملة' },
    description: { 
      en: 'Level 3+ incident requires department approval and full investigation.',
      ar: 'حادثة المستوى 3+ تتطلب موافقة القسم والتحقيق الكامل.'
    },
    steps: ['report', 'screen', 'approve', 'investigate', 'review', 'actions', 'close'],
    notifications: {
      whatsapp: true,
      expected: ['HSSE Manager + Expert receive WhatsApp', 'Dept Rep receives approval request']
    }
  },
  {
    id: 'rejection',
    title: { en: 'Scenario 3: Rejection → Escalation', ar: 'السيناريو 3: الرفض → التصعيد' },
    description: { 
      en: 'Dept representative rejects, escalates to HSSE Manager for final decision.',
      ar: 'ممثل القسم يرفض، يتم التصعيد لمدير السلامة للقرار النهائي.'
    },
    steps: ['report', 'screen', 'approve', 'approve'], // Second approve = escalation
    notifications: {
      whatsapp: true,
      expected: ['HSSE Manager receives escalation notification']
    }
  },
  {
    id: 'return',
    title: { en: 'Scenario 4: Return to Reporter', ar: 'السيناريو 4: إعادة للمُبلِّغ' },
    description: { 
      en: 'HSSE Expert returns report for more information.',
      ar: 'خبير السلامة يعيد التقرير لمزيد من المعلومات.'
    },
    steps: ['report', 'screen', 'report', 'screen'],
    notifications: {
      whatsapp: false,
      expected: ['Reporter receives push notification to update report']
    }
  },
  {
    id: 'erp',
    title: { en: 'Scenario 5: ERP Activation', ar: 'السيناريو 5: تفعيل ERP' },
    description: { 
      en: 'Emergency Response Plan activated, upgrades to Level 4+ with full WhatsApp notifications.',
      ar: 'تفعيل خطة الاستجابة للطوارئ، يرتقي للمستوى 4+ مع إشعارات واتساب كاملة.'
    },
    steps: ['report', 'screen', 'approve', 'investigate', 'review', 'actions', 'close'],
    notifications: {
      whatsapp: true,
      expected: ['BC Team receives WhatsApp', 'All stakeholders notified via WhatsApp', 'Security receives alert']
    }
  },
];

// Role assignments for testing
const ROLE_ASSIGNMENTS = [
  { role: 'reporter', label: { en: 'Reporter (Normal User)', ar: 'المُبلِّغ (مستخدم عادي)' }, user: 'Abdullah' },
  { role: 'hsse_expert', label: { en: 'HSSE Expert', ar: 'خبير السلامة' }, user: 'loay.smartphoto@gmail.com' },
  { role: 'dept_representative', label: { en: 'Dept. Representative', ar: 'ممثل القسم' }, user: 'loay.smartphoto@gmail.com' },
  { role: 'investigator', label: { en: 'HSSE Investigator', ar: 'محقق السلامة' }, user: '1st.arabcoder@gmail.com' },
  { role: 'hsse_manager', label: { en: 'HSSE Manager', ar: 'مدير السلامة' }, user: 'luay@dhuud.com' },
];

export function WorkflowStatusDashboard() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  return (
    <div className="space-y-6">
      {/* Workflow Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {isRTL ? 'نظرة عامة على سير العمل' : 'Workflow Overview'}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? 'دورة حياة حدث HSSE من التقرير إلى الإغلاق'
              : 'HSSE event lifecycle from report to closure'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {WORKFLOW_STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-card">
                    <Icon className={`h-4 w-4 ${step.color}`} />
                    <span className="text-sm font-medium">
                      {step.label[isRTL ? 'ar' : 'en']}
                    </span>
                  </div>
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block rtl:rotate-180" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Channel Legend */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Push</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Email</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">
                WhatsApp {isRTL ? '(المستوى 3+)' : '(Level 3+)'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isRTL ? 'توزيع الأدوار المُقترح' : 'Suggested Role Assignments'}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? 'الأدوار المطلوبة لاختبار سير العمل الكامل'
              : 'Roles needed to test the complete workflow'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROLE_ASSIGNMENTS.map((assignment) => (
              <div 
                key={assignment.role}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <span className="text-sm font-medium">
                  {assignment.label[isRTL ? 'ar' : 'en']}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {assignment.user}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            {isRTL ? 'سيناريوهات الاختبار' : 'Test Scenarios'}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? 'اتبع هذه السيناريوهات للتحقق من سير العمل والإشعارات'
              : 'Follow these scenarios to verify workflow and notifications'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {TEST_SCENARIOS.map((scenario, idx) => (
            <div 
              key={scenario.id}
              className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h4 className="font-medium">
                    {scenario.title[isRTL ? 'ar' : 'en']}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {scenario.description[isRTL ? 'ar' : 'en']}
                  </p>
                </div>
                {scenario.notifications.whatsapp && (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                    <MessageSquare className="h-3 w-3 me-1" />
                    WhatsApp
                  </Badge>
                )}
              </div>

              {/* Steps */}
              <div className="flex flex-wrap gap-2 mb-3">
                {scenario.steps.map((stepId, stepIdx) => {
                  const step = WORKFLOW_STEPS.find(s => s.id === stepId);
                  if (!step) return null;
                  const Icon = step.icon;
                  
                  return (
                    <div key={`${stepId}-${stepIdx}`} className="flex items-center gap-1">
                      <div className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted">
                        <Icon className={`h-3 w-3 ${step.color}`} />
                        <span>{step.label[isRTL ? 'ar' : 'en']}</span>
                      </div>
                      {stepIdx < scenario.steps.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground rtl:rotate-180" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Expected notifications */}
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">{isRTL ? 'الإشعارات المتوقعة:' : 'Expected notifications:'}</span>
                <ul className="list-disc list-inside mt-1">
                  {scenario.notifications.expected.map((notif, nIdx) => (
                    <li key={nIdx}>{notif}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
