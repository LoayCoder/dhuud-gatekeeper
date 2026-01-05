import { RoleTrainingGuide } from './types';

export const deptRepGuide: RoleTrainingGuide = {
  roleCode: 'department_representative',
  roleName: {
    en: 'Department Representative',
    ar: 'ممثل القسم'
  },
  category: 'department',
  icon: 'UserCheck',
  color: 'indigo',
  overview: {
    en: 'As a Department Representative, you are the first reviewer for incidents and observations within your department. Your role is crucial in ensuring reports are accurate, complete, and appropriately routed for further action.',
    ar: 'بصفتك ممثل القسم، أنت المراجع الأول للحوادث والملاحظات داخل قسمك. دورك حاسم في ضمان دقة التقارير واكتمالها وتوجيهها بشكل مناسب لاتخاذ إجراءات إضافية.'
  },
  responsibilities: [
    {
      id: 'review_incidents',
      title: { en: 'Review Department Incidents', ar: 'مراجعة حوادث القسم' },
      description: {
        en: 'Review all incidents reported within your department within 24 hours. Verify details are accurate and complete before forwarding to HSSE.',
        ar: 'راجع جميع الحوادث المُبلَّغ عنها داخل قسمك خلال 24 ساعة. تحقق من دقة التفاصيل واكتمالها قبل إرسالها إلى فريق السلامة.'
      },
      priority: 'critical'
    },
    {
      id: 'manage_observations',
      title: { en: 'Manage Observation Actions', ar: 'إدارة إجراءات الملاحظات' },
      description: {
        en: 'For Level 3-5 observations, assign appropriate corrective actions, set due dates, and monitor completion.',
        ar: 'للملاحظات من المستوى 3-5، قم بتعيين الإجراءات التصحيحية المناسبة وتحديد تواريخ الاستحقاق ومراقبة الإكمال.'
      },
      priority: 'high'
    },
    {
      id: 'escalate_appropriately',
      title: { en: 'Escalate When Needed', ar: 'التصعيد عند الحاجة' },
      description: {
        en: 'Escalate high-severity observations to HSSE for review. Escalate contractor violations to the appropriate controller.',
        ar: 'صعّد الملاحظات عالية الخطورة إلى فريق السلامة للمراجعة. صعّد مخالفات المقاولين إلى المتحكم المناسب.'
      },
      priority: 'high'
    },
    {
      id: 'contractor_violations',
      title: { en: 'Handle Contractor Violations', ar: 'التعامل مع مخالفات المقاولين' },
      description: {
        en: 'For observations involving contractors, select the appropriate violation type to route to Contract Controller for fine approval.',
        ar: 'للملاحظات التي تتضمن مقاولين، اختر نوع المخالفة المناسب لتوجيهها إلى مراقب العقود للموافقة على الغرامة.'
      },
      priority: 'medium'
    }
  ],
  incidentWorkflow: [
    {
      status: 'pending_dept_rep_incident_review',
      statusLabel: { en: 'Pending Your Review', ar: 'بانتظار مراجعتك' },
      action: { en: 'Review and Forward', ar: 'مراجعة وتحويل' },
      howTo: {
        en: 'Go to Investigation Workspace → Review incident details → Verify accuracy → Either Approve (forward to HSSE) or Return to Reporter with correction notes',
        ar: 'انتقل إلى مساحة التحقيق ← راجع تفاصيل الحادث ← تحقق من الدقة ← إما الموافقة (تحويل إلى السلامة) أو إعادة إلى المُبلِّغ مع ملاحظات التصحيح'
      },
      timeLimit: '24 hours',
      nextStep: 'pending_review'
    }
  ],
  observationWorkflow: [
    {
      status: 'pending_dept_rep_approval',
      statusLabel: { en: 'Pending Your Action', ar: 'بانتظار إجراءك' },
      action: { en: 'Review and Add Actions', ar: 'مراجعة وإضافة إجراءات' },
      howTo: {
        en: 'Open observation → Review details → Add corrective action(s) with assignee and due date → Choose: Approve (stays in dept), Escalate (to HSSE), or Reject (with reason)',
        ar: 'افتح الملاحظة ← راجع التفاصيل ← أضف إجراء(ات) تصحيحية مع المُكلَّف وتاريخ الاستحقاق ← اختر: موافقة (يبقى في القسم) أو تصعيد (إلى السلامة) أو رفض (مع السبب)'
      },
      timeLimit: '48 hours',
      nextStep: 'observation_actions_pending'
    },
    {
      status: 'pending_dept_rep_mandatory_action',
      statusLabel: { en: 'HSSE Required Actions', ar: 'إجراءات مطلوبة من السلامة' },
      action: { en: 'Must Add Actions', ar: 'يجب إضافة إجراءات' },
      howTo: {
        en: 'HSSE rejected your rejection. You must now add corrective action(s) and either approve or escalate. Rejection is no longer an option.',
        ar: 'رفضت السلامة رفضك. يجب الآن إضافة إجراء(ات) تصحيحية والموافقة أو التصعيد. الرفض لم يعد خياراً.'
      },
      timeLimit: '24 hours'
    },
    {
      status: 'contractor_observation',
      statusLabel: { en: 'Contractor Violation', ar: 'مخالفة مقاول' },
      action: { en: 'Select Violation Type', ar: 'اختر نوع المخالفة' },
      howTo: {
        en: 'For contractor-related observations → Select violation type from dropdown → This routes to Contract Controller for fine approval → Add corrective actions as usual',
        ar: 'للملاحظات المتعلقة بالمقاولين ← اختر نوع المخالفة من القائمة ← يتم توجيهها إلى مراقب العقود للموافقة على الغرامة ← أضف إجراءات تصحيحية كالمعتاد'
      }
    }
  ],
  myActionsGuide: [
    {
      tab: 'department_reviews',
      tabLabel: { en: 'Department Reviews', ar: 'مراجعات القسم' },
      description: {
        en: 'Shows incidents and observations pending your review as Department Representative',
        ar: 'يعرض الحوادث والملاحظات بانتظار مراجعتك كممثل القسم'
      },
      actions: [
        { en: 'Review and approve/reject incidents', ar: 'مراجعة والموافقة/رفض الحوادث' },
        { en: 'Add corrective actions to observations', ar: 'إضافة إجراءات تصحيحية للملاحظات' },
        { en: 'Escalate to HSSE when needed', ar: 'التصعيد إلى السلامة عند الحاجة' },
        { en: 'Handle contractor violations', ar: 'التعامل مع مخالفات المقاولين' }
      ]
    },
    {
      tab: 'action_tracking',
      tabLabel: { en: 'Action Tracking', ar: 'تتبع الإجراءات' },
      description: {
        en: 'Monitor corrective actions you have assigned to team members',
        ar: 'مراقبة الإجراءات التصحيحية التي عيّنتها لأعضاء الفريق'
      },
      actions: [
        { en: 'Track action completion progress', ar: 'تتبع تقدم إكمال الإجراءات' },
        { en: 'Verify completed actions', ar: 'التحقق من الإجراءات المكتملة' },
        { en: 'Approve extension requests', ar: 'الموافقة على طلبات التمديد' }
      ]
    }
  ],
  faqs: [
    {
      question: { en: 'When should I escalate to HSSE vs handle in department?', ar: 'متى يجب التصعيد إلى السلامة مقابل التعامل داخل القسم؟' },
      answer: {
        en: 'Escalate when: the observation is Level 4-5 severity, involves potential regulatory issues, requires investigation beyond your department, or involves repeat offenses. Handle in department for Level 3 observations that can be resolved with simple corrective actions.',
        ar: 'صعّد عندما: تكون الملاحظة بخطورة المستوى 4-5، أو تتضمن قضايا تنظيمية محتملة، أو تتطلب تحقيقاً خارج قسمك، أو تتضمن مخالفات متكررة. تعامل داخل القسم للملاحظات من المستوى 3 التي يمكن حلها بإجراءات تصحيحية بسيطة.'
      }
    },
    {
      question: { en: 'What if I reject an observation and HSSE sends it back?', ar: 'ماذا لو رفضت ملاحظة وأعادتها السلامة؟' },
      answer: {
        en: 'When HSSE rejects your rejection, you must add corrective actions. The reject option is no longer available. Add appropriate actions and either approve or escalate.',
        ar: 'عندما ترفض السلامة رفضك، يجب إضافة إجراءات تصحيحية. خيار الرفض لم يعد متاحاً. أضف الإجراءات المناسبة ثم وافق أو صعّد.'
      }
    },
    {
      question: { en: 'How do I handle a contractor violation?', ar: 'كيف أتعامل مع مخالفة مقاول؟' },
      answer: {
        en: 'Select the violation type from the dropdown menu. This automatically routes the observation to the Contract Controller for fine approval. Still add corrective actions as you normally would.',
        ar: 'اختر نوع المخالفة من القائمة المنسدلة. هذا يوجه الملاحظة تلقائياً إلى مراقب العقود للموافقة على الغرامة. لا يزال عليك إضافة الإجراءات التصحيحية كالمعتاد.'
      }
    }
  ],
  quickReference: {
    keyPages: [
      { en: 'Investigation Workspace', ar: 'مساحة التحقيق' },
      { en: 'My Actions → Department Reviews', ar: 'إجراءاتي ← مراجعات القسم' },
      { en: 'HSSE Events List (filter by department)', ar: 'قائمة أحداث السلامة (تصفية حسب القسم)' }
    ],
    shortcuts: [
      { en: 'Filter by "Pending My Review"', ar: 'تصفية حسب "بانتظار مراجعتي"' },
      { en: 'Quick action buttons on cards', ar: 'أزرار الإجراء السريع على البطاقات' }
    ],
    tips: [
      { en: 'Review reports within 24 hours to meet SLA', ar: 'راجع التقارير خلال 24 ساعة لتحقيق اتفاقية مستوى الخدمة' },
      { en: 'Always add clear action descriptions', ar: 'أضف دائماً أوصاف إجراءات واضحة' },
      { en: 'Set realistic due dates based on action complexity', ar: 'حدد تواريخ استحقاق واقعية بناءً على تعقيد الإجراء' }
    ]
  }
};
