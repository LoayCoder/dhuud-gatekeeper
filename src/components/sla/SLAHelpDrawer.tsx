import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  Clock, 
  AlertTriangle, 
  ArrowUp, 
  Siren, 
  CheckCircle,
  Settings,
  BarChart3,
  Mail,
  Users,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SLAHelpDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SLAHelpDrawer({ open, onOpenChange }: SLAHelpDrawerProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const sections = [
    {
      id: 'overview',
      title: t('sla.help.overviewTitle', 'SLA Overview'),
      icon: HelpCircle,
      content: t('sla.help.overviewContent', 'Service Level Agreements (SLAs) ensure corrective actions are completed within defined timeframes. The system automatically tracks deadlines, sends warnings, and escalates overdue actions to appropriate stakeholders.'),
    },
    {
      id: 'phases',
      title: t('sla.help.phasesTitle', 'SLA Phases'),
      icon: Clock,
      content: (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-green-700 dark:text-green-400">
                {t('sla.normal', 'Normal')}
              </span>
              <p className="text-sm text-green-600 dark:text-green-400/80">
                {t('sla.help.normalDesc', 'Action is within acceptable timeframe with no concerns.')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
            <Clock className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-yellow-700 dark:text-yellow-400">
                {t('sla.warning', 'Warning')}
              </span>
              <p className="text-sm text-yellow-600 dark:text-yellow-400/80">
                {t('sla.help.warningDesc', 'Approaching due date. Assignee receives email reminder.')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
            <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-orange-700 dark:text-orange-400">
                {t('sla.overdue', 'Overdue')}
              </span>
              <p className="text-sm text-orange-600 dark:text-orange-400/80">
                {t('sla.help.overdueDesc', 'Past due date but not yet escalated.')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <ArrowUp className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-red-600 dark:text-red-400">
                {t('sla.escalatedL1', 'Escalated L1')}
              </span>
              <p className="text-sm text-red-600 dark:text-red-400/80">
                {t('sla.help.escalatedL1Desc', 'Manager notified. Requires immediate attention.')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-100 dark:bg-red-900/40">
            <Siren className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-red-700 dark:text-red-300">
                {t('sla.escalatedL2', 'Escalated L2')}
              </span>
              <p className="text-sm text-red-700 dark:text-red-300/80">
                {t('sla.help.escalatedL2Desc', 'HSSE Manager notified. Critical priority.')}
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'configuration',
      title: t('sla.help.configurationTitle', 'Configuring SLAs'),
      icon: Settings,
      content: (
        <div className="space-y-3 text-sm">
          <p>{t('sla.help.configIntro', 'SLA thresholds are configured per priority level:')}</p>
          <ul className="space-y-2 ps-4">
            <li className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">Critical</Badge>
              <span className="text-muted-foreground">{t('sla.help.criticalDesc', 'Shortest timeframes, fastest escalation')}</span>
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs bg-orange-500">High</Badge>
              <span className="text-muted-foreground">{t('sla.help.highDesc', 'Urgent but less critical')}</span>
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">Medium</Badge>
              <span className="text-muted-foreground">{t('sla.help.mediumDesc', 'Standard timeframes')}</span>
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Low</Badge>
              <span className="text-muted-foreground">{t('sla.help.lowDesc', 'Extended timeframes')}</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'notifications',
      title: t('sla.help.notificationsTitle', 'Notifications'),
      icon: Mail,
      content: (
        <div className="space-y-2 text-sm">
          <p>{t('sla.help.notificationsIntro', 'Automatic email notifications are sent at key stages:')}</p>
          <ul className="space-y-1.5 ps-4 list-disc text-muted-foreground">
            <li>{t('sla.help.notif1', 'Warning reminder to assignee before due date')}</li>
            <li>{t('sla.help.notif2', 'Escalation L1 alert to department manager')}</li>
            <li>{t('sla.help.notif3', 'Escalation L2 alert to HSSE Manager')}</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'analytics',
      title: t('sla.help.analyticsTitle', 'Analytics & Reporting'),
      icon: BarChart3,
      content: t('sla.help.analyticsContent', 'The analytics page provides insights into SLA compliance rates, escalation trends, and department performance. Export reports for management reviews and audits.'),
    },
  ];

  const faqs = [
    {
      q: t('sla.faq.q1', 'How do I extend a deadline?'),
      a: t('sla.faq.a1', 'Click on the action and use the "Request Extension" button. This requires manager approval.'),
    },
    {
      q: t('sla.faq.q2', 'Can I manually escalate an action?'),
      a: t('sla.faq.a2', 'Yes, from the SLA Dashboard, select actions and use the bulk "Escalate" action.'),
    },
    {
      q: t('sla.faq.q3', 'What happens when an action is escalated?'),
      a: t('sla.faq.a3', 'The responsible manager receives an email notification and the action is flagged in the dashboard.'),
    },
    {
      q: t('sla.faq.q4', 'How are SLA thresholds calculated?'),
      a: t('sla.faq.a4', 'Thresholds are based on calendar days from the action due date. Weekends are included.'),
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={direction === 'rtl' ? 'left' : 'right'} className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-start">
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {t('sla.help.title', 'SLA Help Guide')}
          </SheetTitle>
          <SheetDescription>
            {t('sla.help.subtitle', 'Learn how Service Level Agreements work in this system')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Main Sections */}
          <Accordion type="single" collapsible defaultValue="overview" className="w-full">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-primary" />
                      <span>{section.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="ps-7 text-sm text-muted-foreground">
                      {typeof section.content === 'string' ? (
                        <p>{section.content}</p>
                      ) : (
                        section.content
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* FAQ Section */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {t('sla.faq.title', 'Frequently Asked Questions')}
            </h3>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-sm text-start hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground ps-1">
                      {faq.a}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
