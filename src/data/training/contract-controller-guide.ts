import { RoleTrainingGuide } from './types';

export const contractControllerGuide: RoleTrainingGuide = {
  roleCode: 'contract_controller',
  roleName: {
    en: 'Contract Controller',
    ar: 'مراقب العقود'
  },
  category: 'management',
  icon: 'FileContract',
  color: 'amber',
  overview: {
    en: 'As a Contract Controller, you review and approve contractor violations submitted through the observation process. Your role ensures that contractor fines are appropriately applied and documented.',
    ar: 'بصفتك مراقب العقود، تراجع وتوافق على مخالفات المقاولين المُقدَّمة من خلال عملية الملاحظات. دورك يضمن تطبيق غرامات المقاولين وتوثيقها بشكل مناسب.'
  },
  responsibilities: [
    {
      id: 'review_violations',
      title: { en: 'Review Contractor Violations', ar: 'مراجعة مخالفات المقاولين' },
      description: {
        en: 'Review violation details submitted by Department Representatives. Verify the violation type and proposed fine are appropriate.',
        ar: 'راجع تفاصيل المخالفات المُقدَّمة من ممثلي الأقسام. تحقق من أن نوع المخالفة والغرامة المقترحة مناسبة.'
      },
      priority: 'critical'
    },
    {
      id: 'approve_fines',
      title: { en: 'Approve or Reject Fines', ar: 'الموافقة على الغرامات أو رفضها' },
      description: {
        en: 'Make final decision on contractor fines. Approve valid violations or reject with documented reason.',
        ar: 'اتخذ القرار النهائي بشأن غرامات المقاولين. وافق على المخالفات الصالحة أو ارفض مع سبب موثق.'
      },
      priority: 'critical'
    },
    {
      id: 'track_violations',
      title: { en: 'Track Contractor Violation History', ar: 'تتبع سجل مخالفات المقاولين' },
      description: {
        en: 'Monitor contractor violation patterns. Use history to identify repeat offenders.',
        ar: 'راقب أنماط مخالفات المقاولين. استخدم السجل لتحديد المخالفين المتكررين.'
      },
      priority: 'high'
    }
  ],
  incidentWorkflow: [],
  observationWorkflow: [
    {
      status: 'pending_contract_controller_violation_approval',
      statusLabel: { en: 'Violation Pending Approval', ar: 'المخالفة بانتظار الموافقة' },
      action: { en: 'Review and Decide', ar: 'مراجعة واتخاذ قرار' },
      howTo: {
        en: 'Open the observation → Review violation details → Check contractor info and violation type → Either Approve (fine proceeds) OR Reject (with reason)',
        ar: 'افتح الملاحظة ← راجع تفاصيل المخالفة ← تحقق من معلومات المقاول ونوع المخالفة ← إما الموافقة (تستمر الغرامة) أو الرفض (مع السبب)'
      },
      timeLimit: '48 hours'
    }
  ],
  myActionsGuide: [
    {
      tab: 'violation_approvals',
      tabLabel: { en: 'Violation Approvals', ar: 'موافقات المخالفات' },
      description: {
        en: 'Contractor violations pending your approval',
        ar: 'مخالفات المقاولين بانتظار موافقتك'
      },
      actions: [
        { en: 'Review violation evidence', ar: 'مراجعة أدلة المخالفة' },
        { en: 'Verify violation type matches offense', ar: 'التحقق من أن نوع المخالفة يطابق الجريمة' },
        { en: 'Approve or reject with notes', ar: 'الموافقة أو الرفض مع ملاحظات' }
      ]
    },
    {
      tab: 'contractor_history',
      tabLabel: { en: 'Contractor History', ar: 'سجل المقاولين' },
      description: {
        en: 'View violation history by contractor',
        ar: 'عرض سجل المخالفات حسب المقاول'
      },
      actions: [
        { en: 'Search by contractor name', ar: 'البحث باسم المقاول' },
        { en: 'View violation trends', ar: 'عرض اتجاهات المخالفات' },
        { en: 'Export violation reports', ar: 'تصدير تقارير المخالفات' }
      ]
    }
  ],
  faqs: [
    {
      question: { en: 'How do contractor violations reach me?', ar: 'كيف تصلني مخالفات المقاولين؟' },
      answer: {
        en: 'When a Department Representative selects a violation type on an observation involving a contractor, it automatically routes to you for fine approval after they complete their action assignment.',
        ar: 'عندما يختار ممثل القسم نوع مخالفة على ملاحظة تتعلق بمقاول، تُوجَّه تلقائياً إليك للموافقة على الغرامة بعد إكمال تعيين الإجراء.'
      }
    },
    {
      question: { en: 'What if I reject a violation?', ar: 'ماذا لو رفضت مخالفة؟' },
      answer: {
        en: 'If you reject, the violation is not applied but the observation continues its normal workflow. The corrective actions still need to be completed. Your rejection is logged for audit purposes.',
        ar: 'إذا رفضت، لا تُطبَّق المخالفة لكن الملاحظة تستمر في مسارها الطبيعي. لا يزال يجب إكمال الإجراءات التصحيحية. رفضك مُسجَّل لأغراض التدقيق.'
      }
    },
    {
      question: { en: 'How are fines calculated?', ar: 'كيف تُحسب الغرامات؟' },
      answer: {
        en: 'Fines are defined in the Violation Settings based on violation type and severity. The system suggests the appropriate fine when a violation type is selected. You can review and confirm.',
        ar: 'الغرامات مُحددة في إعدادات المخالفات بناءً على نوع المخالفة والخطورة. النظام يقترح الغرامة المناسبة عند اختيار نوع المخالفة. يمكنك المراجعة والتأكيد.'
      }
    }
  ],
  quickReference: {
    keyPages: [
      { en: 'My Actions → Violation Approvals', ar: 'إجراءاتي ← موافقات المخالفات' },
      { en: 'Contractor Analytics', ar: 'تحليلات المقاولين' },
      { en: 'Violation Settings (Admin)', ar: 'إعدادات المخالفات (المسؤول)' }
    ],
    shortcuts: [
      { en: 'Filter by contractor company', ar: 'تصفية حسب شركة المقاول' }
    ],
    tips: [
      { en: 'Check contractor violation history before deciding', ar: 'تحقق من سجل مخالفات المقاول قبل اتخاذ القرار' },
      { en: 'Always add notes when rejecting', ar: 'أضف دائماً ملاحظات عند الرفض' },
      { en: 'Review within 48 hours to meet SLA', ar: 'راجع خلال 48 ساعة لتحقيق اتفاقية مستوى الخدمة' }
    ]
  }
};
