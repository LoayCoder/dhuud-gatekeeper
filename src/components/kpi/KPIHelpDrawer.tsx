import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Target, TrendingDown, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface KPIHelpDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KPIHelpDrawer({ open, onOpenChange }: KPIHelpDrawerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const sections = [
    {
      id: 'overview',
      title: t('kpiHelp.overviewTitle', 'What are KPI Targets?'),
      icon: Target,
      content: t('kpiHelp.overviewContent', 
        'KPI (Key Performance Indicator) targets are measurable values that help track safety performance. ' +
        'They provide benchmarks to measure progress and identify areas needing attention.'
      ),
    },
    {
      id: 'thresholds',
      title: t('kpiHelp.thresholdsTitle', 'Understanding Thresholds'),
      icon: AlertTriangle,
      content: t('kpiHelp.thresholdsContent',
        'Each KPI has three threshold levels:\n\n' +
        '• Target Value: The ideal goal you want to achieve\n' +
        '• Warning Threshold: When performance starts to slip\n' +
        '• Critical Threshold: Requires immediate attention'
      ),
    },
    {
      id: 'comparison',
      title: t('kpiHelp.comparisonTitle', 'Lower vs Higher is Better'),
      icon: TrendingDown,
      content: t('kpiHelp.comparisonContent',
        'Some KPIs are better when lower (like incident rates), while others are better when higher (like action closure percentage). ' +
        'The system automatically adjusts threshold logic based on the comparison type.'
      ),
    },
    {
      id: 'bestPractices',
      title: t('kpiHelp.bestPracticesTitle', 'Best Practices'),
      icon: CheckCircle,
      content: t('kpiHelp.bestPracticesContent',
        '• Set realistic targets based on industry benchmarks\n' +
        '• Review and adjust targets periodically\n' +
        '• Use warning thresholds as early indicators\n' +
        '• Document reasons for any threshold changes'
      ),
    },
  ];

  const faqs = [
    {
      q: t('kpiHelp.faq1q', 'What is TRIR?'),
      a: t('kpiHelp.faq1a', 'Total Recordable Incident Rate measures the number of work-related injuries per 200,000 hours worked. Industry average is around 3.0, with best-in-class below 1.0.'),
    },
    {
      q: t('kpiHelp.faq2q', 'How often should I update targets?'),
      a: t('kpiHelp.faq2a', 'Review targets quarterly or annually. Update when there are significant changes in operations, workforce, or after achieving sustained improvement.'),
    },
    {
      q: t('kpiHelp.faq3q', 'Can I add custom KPIs?'),
      a: t('kpiHelp.faq3a', 'Currently, the system supports 8 standard HSSE KPIs. Contact your administrator for custom KPI requirements.'),
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isRTL ? 'left' : 'right'} className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-start">
          <SheetTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t('kpiHelp.title', 'KPI Targets Guide')}
          </SheetTitle>
          <SheetDescription>
            {t('kpiHelp.subtitle', 'Learn how to configure and manage safety KPI targets')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Main sections */}
          <Accordion type="single" collapsible className="w-full">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="text-start">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{section.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground whitespace-pre-line">
                    {section.content}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* FAQs */}
          <div>
            <h3 className="font-medium mb-3">{t('kpiHelp.faqTitle', 'Frequently Asked Questions')}</h3>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-start text-sm">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {faq.a}
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
