import { RoleTrainingGuide } from './types';

export const hsseManagerGuide: RoleTrainingGuide = {
  roleCode: 'hsse_manager',
  roleName: {
    en: 'HSSE Manager',
    ar: 'مدير الصحة والسلامة والأمن والبيئة'
  },
  category: 'hsse',
  icon: 'ShieldAlert',
  color: 'red',
  overview: {
    en: 'As the HSSE Manager, you are the final authority for incident escalations and closures. You handle manager rejections, approve final closure of incidents and Level 5 observations, and oversee the overall HSSE performance.',
    ar: 'بصفتك مدير السلامة، أنت السلطة النهائية لتصعيدات وإغلاقات الحوادث. تتعامل مع رفض المديرين وتوافق على الإغلاق النهائي للحوادث وملاحظات المستوى 5 وتشرف على الأداء العام للسلامة.'
  },
  responsibilities: [
    {
      id: 'handle_escalations',
      title: { en: 'Handle Manager Escalations', ar: 'التعامل مع تصعيدات المديرين' },
      description: {
        en: 'When a manager rejects an investigation request, review and make final decision - override rejection or confirm it.',
        ar: 'عندما يرفض مدير طلب تحقيق، راجع واتخذ القرار النهائي - تجاوز الرفض أو تأكيده.'
      },
      priority: 'critical'
    },
    {
      id: 'final_incident_closure',
      title: { en: 'Approve Final Incident Closure', ar: 'الموافقة على الإغلاق النهائي للحوادث' },
      description: {
        en: 'Review completed investigations and approve final closure. All actions must be verified before closure.',
        ar: 'راجع التحقيقات المكتملة ووافق على الإغلاق النهائي. يجب التحقق من جميع الإجراءات قبل الإغلاق.'
      },
      priority: 'critical'
    },
    {
      id: 'l5_observation_closure',
      title: { en: 'Approve Level 5 Observation Closure', ar: 'الموافقة على إغلاق ملاحظات المستوى 5' },
      description: {
        en: 'Level 5 observations require your final approval to close after HSSE Expert validation.',
        ar: 'ملاحظات المستوى 5 تتطلب موافقتك النهائية للإغلاق بعد التحقق من خبير السلامة.'
      },
      priority: 'high'
    },
    {
      id: 'monitor_performance',
      title: { en: 'Monitor HSSE Performance', ar: 'مراقبة أداء السلامة' },
      description: {
        en: 'Review dashboards, KPIs, and SLA compliance. Identify trends and areas for improvement.',
        ar: 'راجع لوحات التحكم ومؤشرات الأداء الرئيسية والامتثال لاتفاقيات مستوى الخدمة. حدد الاتجاهات ومجالات التحسين.'
      },
      priority: 'high'
    },
    {
      id: 'assign_investigators',
      title: { en: 'Assign Investigators', ar: 'تعيين المحققين' },
      description: {
        en: 'Assign qualified investigators to incidents based on expertise and workload.',
        ar: 'عيّن محققين مؤهلين للحوادث بناءً على الخبرة وعبء العمل.'
      },
      priority: 'high'
    }
  ],
  incidentWorkflow: [
    {
      status: 'hsse_manager_escalation',
      statusLabel: { en: 'Manager Rejection Escalation', ar: 'تصعيد رفض المدير' },
      action: { en: 'Handle Escalation', ar: 'التعامل مع التصعيد' },
      howTo: {
        en: 'Manager rejected investigation request → Review incident and rejection reason → Either: Override (approve investigation despite rejection) OR Confirm (accept rejection, incident does not proceed to investigation)',
        ar: 'المدير رفض طلب التحقيق ← راجع الحادث وسبب الرفض ← إما: تجاوز (الموافقة على التحقيق رغم الرفض) أو تأكيد (قبول الرفض، الحادث لا يتقدم للتحقيق)'
      },
      timeLimit: '24 hours',
      nextStep: 'investigation_pending'
    },
    {
      status: 'pending_final_closure',
      statusLabel: { en: 'Pending Final Closure', ar: 'بانتظار الإغلاق النهائي' },
      action: { en: 'Approve Incident Closure', ar: 'الموافقة على إغلاق الحادث' },
      howTo: {
        en: 'Review investigation report → Verify all actions are completed and verified → Approve final closure → Incident status changes to "Closed"',
        ar: 'راجع تقرير التحقيق ← تحقق من إكمال جميع الإجراءات والتحقق منها ← وافق على الإغلاق النهائي ← تتغير حالة الحادث إلى "مُغلق"'
      }
    }
  ],
  observationWorkflow: [
    {
      status: 'pending_final_closure',
      statusLabel: { en: 'L5 Pending Closure', ar: 'المستوى 5 بانتظار الإغلاق' },
      action: { en: 'Approve L5 Closure', ar: 'الموافقة على إغلاق المستوى 5' },
      howTo: {
        en: 'Level 5 observation with validated actions → Review completeness → Approve final closure',
        ar: 'ملاحظة المستوى 5 مع إجراءات مُصادق عليها ← راجع الاكتمال ← وافق على الإغلاق النهائي'
      }
    }
  ],
  myActionsGuide: [
    {
      tab: 'escalations',
      tabLabel: { en: 'Escalations', ar: 'التصعيدات' },
      description: {
        en: 'Incidents escalated to you due to manager rejection',
        ar: 'الحوادث المُصعَّدة إليك بسبب رفض المدير'
      },
      actions: [
        { en: 'Review rejected investigation requests', ar: 'مراجعة طلبات التحقيق المرفوضة' },
        { en: 'Override or confirm manager rejection', ar: 'تجاوز أو تأكيد رفض المدير' },
        { en: 'Assign investigator if overriding', ar: 'تعيين محقق إذا تم التجاوز' }
      ]
    },
    {
      tab: 'closure_approvals',
      tabLabel: { en: 'Closure Approvals', ar: 'موافقات الإغلاق' },
      description: {
        en: 'Incidents and L5 observations pending your closure approval',
        ar: 'الحوادث وملاحظات المستوى 5 بانتظار موافقتك على الإغلاق'
      },
      actions: [
        { en: 'Review completed investigations', ar: 'مراجعة التحقيقات المكتملة' },
        { en: 'Verify all actions completed', ar: 'التحقق من إكمال جميع الإجراءات' },
        { en: 'Approve final closure', ar: 'الموافقة على الإغلاق النهائي' },
        { en: 'Approve L5 observation closures', ar: 'الموافقة على إغلاق ملاحظات المستوى 5' }
      ]
    },
    {
      tab: 'investigator_assignment',
      tabLabel: { en: 'Investigator Assignment', ar: 'تعيين المحققين' },
      description: {
        en: 'Assign investigators to approved incidents',
        ar: 'تعيين محققين للحوادث الموافق عليها'
      },
      actions: [
        { en: 'View available investigators', ar: 'عرض المحققين المتاحين' },
        { en: 'Assign based on expertise and workload', ar: 'التعيين بناءً على الخبرة وعبء العمل' },
        { en: 'Reassign if needed', ar: 'إعادة التعيين إذا لزم الأمر' }
      ]
    },
    {
      tab: 'dashboards',
      tabLabel: { en: 'Performance Dashboards', ar: 'لوحات الأداء' },
      description: {
        en: 'Monitor overall HSSE performance and KPIs',
        ar: 'مراقبة الأداء العام للسلامة ومؤشرات الأداء الرئيسية'
      },
      actions: [
        { en: 'View incident trends', ar: 'عرض اتجاهات الحوادث' },
        { en: 'Monitor SLA compliance', ar: 'مراقبة الامتثال لاتفاقيات مستوى الخدمة' },
        { en: 'Track action completion rates', ar: 'تتبع معدلات إكمال الإجراءات' },
        { en: 'Generate executive reports', ar: 'إنشاء تقارير تنفيذية' }
      ]
    }
  ],
  faqs: [
    {
      question: { en: 'When should I override a manager rejection?', ar: 'متى يجب أن أتجاوز رفض المدير؟' },
      answer: {
        en: 'Override when: the incident severity warrants investigation regardless of manager concerns, there are regulatory or legal requirements, or the rejection reason is not valid. Document your override justification.',
        ar: 'تجاوز عندما: خطورة الحادث تستدعي التحقيق بغض النظر عن مخاوف المدير، أو هناك متطلبات تنظيمية أو قانونية، أو سبب الرفض غير صالح. وثّق مبرر التجاوز.'
      }
    },
    {
      question: { en: 'Why do Level 5 observations require my approval to close?', ar: 'لماذا تتطلب ملاحظات المستوى 5 موافقتي للإغلاق؟' },
      answer: {
        en: 'Level 5 observations are the most severe and could indicate systemic issues. Your review ensures that corrective actions are truly adequate and lessons learned are captured at the highest level.',
        ar: 'ملاحظات المستوى 5 هي الأكثر خطورة وقد تشير إلى مشاكل نظامية. مراجعتك تضمن أن الإجراءات التصحيحية مناسبة حقاً وأن الدروس المستفادة مُسجَّلة على أعلى مستوى.'
      }
    },
    {
      question: { en: 'How do I assign investigators?', ar: 'كيف أعيّن المحققين؟' },
      answer: {
        en: 'Go to the incident in Investigation Workspace → Click "Assign Investigator" → Select from available investigators → Consider their expertise, current workload, and any conflicts of interest.',
        ar: 'انتقل إلى الحادث في مساحة التحقيق ← انقر "تعيين محقق" ← اختر من المحققين المتاحين ← ضع في اعتبارك خبرتهم وعبء العمل الحالي وأي تضارب مصالح.'
      }
    }
  ],
  quickReference: {
    keyPages: [
      { en: 'HSSE Event Dashboard', ar: 'لوحة أحداث السلامة' },
      { en: 'Investigation Workspace', ar: 'مساحة التحقيق' },
      { en: 'Executive Report', ar: 'التقرير التنفيذي' },
      { en: 'SLA Dashboard', ar: 'لوحة اتفاقيات مستوى الخدمة' }
    ],
    shortcuts: [
      { en: 'Filter by "Pending My Action"', ar: 'تصفية حسب "بانتظار إجراءي"' },
      { en: 'Quick escalation panel', ar: 'لوحة التصعيد السريعة' }
    ],
    tips: [
      { en: 'Review escalations within 24 hours', ar: 'راجع التصعيدات خلال 24 ساعة' },
      { en: 'Always document override justification', ar: 'وثّق دائماً مبرر التجاوز' },
      { en: 'Check investigator workload before assigning', ar: 'تحقق من عبء عمل المحقق قبل التعيين' },
      { en: 'Use dashboards to spot trends early', ar: 'استخدم لوحات التحكم لاكتشاف الاتجاهات مبكراً' }
    ]
  }
};
