import { RoleTrainingGuide } from './types';

export const hsseOfficerGuide: RoleTrainingGuide = {
  roleCode: 'hsse_officer',
  roleName: {
    en: 'HSSE Officer',
    ar: 'مسؤول الصحة والسلامة والأمن والبيئة'
  },
  category: 'hsse',
  icon: 'Shield',
  color: 'green',
  overview: {
    en: 'As an HSSE Officer, you provide field support for safety operations. You conduct safety walks, support inspections, and serve as a first responder for incidents. You are the eyes and ears of the HSSE team on the ground.',
    ar: 'بصفتك مسؤول السلامة، توفر دعماً ميدانياً لعمليات السلامة. تجري جولات السلامة وتدعم التفتيش وتخدم كمستجيب أول للحوادث. أنت عيون وآذان فريق السلامة على الأرض.'
  },
  responsibilities: [
    {
      id: 'safety_walks',
      title: { en: 'Conduct Safety Walks', ar: 'إجراء جولات السلامة' },
      description: {
        en: 'Perform regular safety walks in assigned areas. Document observations and report any unsafe conditions immediately.',
        ar: 'أجرِ جولات سلامة منتظمة في المناطق المُعيَّنة. وثّق الملاحظات وأبلغ عن أي ظروف غير آمنة فوراً.'
      },
      priority: 'critical'
    },
    {
      id: 'support_inspections',
      title: { en: 'Support Inspections', ar: 'دعم التفتيش' },
      description: {
        en: 'Participate in scheduled inspections. Assist in documenting findings and taking photos of non-conformances.',
        ar: 'شارك في عمليات التفتيش المجدولة. ساعد في توثيق النتائج والتقاط صور لحالات عدم المطابقة.'
      },
      priority: 'high'
    },
    {
      id: 'first_response',
      title: { en: 'First Response Support', ar: 'دعم الاستجابة الأولى' },
      description: {
        en: 'When incidents occur, be among the first responders. Secure the scene, provide initial assistance, and document initial observations.',
        ar: 'عند وقوع الحوادث، كن من بين المستجيبين الأوائل. أمّن الموقع وقدم المساعدة الأولية ووثّق الملاحظات الأولية.'
      },
      priority: 'critical'
    },
    {
      id: 'complete_actions',
      title: { en: 'Complete Assigned Actions', ar: 'إكمال الإجراءات المُكلَّفة' },
      description: {
        en: 'Complete corrective actions assigned to you from incidents and observations. Submit evidence of completion.',
        ar: 'أكمل الإجراءات التصحيحية المُكلَّفة إليك من الحوادث والملاحظات. قدم دليل الإكمال.'
      },
      priority: 'high'
    }
  ],
  incidentWorkflow: [
    {
      status: 'any',
      statusLabel: { en: 'Report Incidents', ar: 'الإبلاغ عن الحوادث' },
      action: { en: 'Submit Incident Reports', ar: 'تقديم تقارير الحوادث' },
      howTo: {
        en: 'As an HSSE Officer, quickly report incidents you witness. Go to HSSE Events → New Report → Fill details with your on-scene observations → Submit',
        ar: 'كمسؤول سلامة، أبلغ بسرعة عن الحوادث التي تشهدها. انتقل إلى أحداث السلامة ← تقرير جديد ← املأ التفاصيل بملاحظاتك الميدانية ← أرسل'
      }
    }
  ],
  observationWorkflow: [
    {
      status: 'submit',
      statusLabel: { en: 'Submit Observations', ar: 'تقديم الملاحظات' },
      action: { en: 'Report Safety Observations', ar: 'الإبلاغ عن ملاحظات السلامة' },
      howTo: {
        en: 'During safety walks, report observations immediately. Use the mobile app for quick photo capture and GPS location.',
        ar: 'خلال جولات السلامة، أبلغ عن الملاحظات فوراً. استخدم تطبيق الجوال لالتقاط صور سريعة وتحديد موقع GPS.'
      }
    },
    {
      status: 'close_l1_l2',
      statusLabel: { en: 'Close Level 1-2', ar: 'إغلاق المستوى 1-2' },
      action: { en: 'Close on Spot', ar: 'الإغلاق الفوري' },
      howTo: {
        en: 'For Level 1-2 observations, fix the issue immediately if possible, take a photo, and close the observation on the spot.',
        ar: 'للملاحظات من المستوى 1-2، أصلح المشكلة فوراً إن أمكن، التقط صورة، وأغلق الملاحظة في المكان.'
      }
    }
  ],
  myActionsGuide: [
    {
      tab: 'assigned',
      tabLabel: { en: 'My Assigned Actions', ar: 'الإجراءات المُكلَّفة لي' },
      description: {
        en: 'Corrective actions assigned to you from incidents and observations',
        ar: 'الإجراءات التصحيحية المُكلَّفة إليك من الحوادث والملاحظات'
      },
      actions: [
        { en: 'View action details and due dates', ar: 'عرض تفاصيل الإجراءات وتواريخ الاستحقاق' },
        { en: 'Update action progress', ar: 'تحديث تقدم الإجراء' },
        { en: 'Submit evidence of completion', ar: 'تقديم دليل الإكمال' },
        { en: 'Request extension if needed', ar: 'طلب تمديد إذا لزم الأمر' }
      ]
    },
    {
      tab: 'inspections',
      tabLabel: { en: 'My Inspections', ar: 'عمليات التفتيش الخاصة بي' },
      description: {
        en: 'Scheduled inspections and safety walks assigned to you',
        ar: 'عمليات التفتيش وجولات السلامة المجدولة المُعيَّنة لك'
      },
      actions: [
        { en: 'View upcoming inspections', ar: 'عرض عمليات التفتيش القادمة' },
        { en: 'Start inspection session', ar: 'بدء جلسة التفتيش' },
        { en: 'Complete inspection checklist', ar: 'إكمال قائمة فحص التفتيش' }
      ]
    }
  ],
  faqs: [
    {
      question: { en: 'What should I do when I find an unsafe condition?', ar: 'ماذا أفعل عند اكتشاف حالة غير آمنة؟' },
      answer: {
        en: 'If it is an immediate danger, take steps to secure the area first. Then report the observation through the system with photos and exact location. For minor issues (L1-L2), fix on the spot if possible.',
        ar: 'إذا كان خطراً فورياً، اتخذ خطوات لتأمين المنطقة أولاً. ثم أبلغ عن الملاحظة من خلال النظام مع صور والموقع الدقيق. للمشاكل البسيطة (المستوى 1-2)، أصلح في المكان إن أمكن.'
      }
    },
    {
      question: { en: 'How do I complete an assigned action?', ar: 'كيف أكمل إجراءً مُكلَّفاً؟' },
      answer: {
        en: 'Go to My Actions → Assigned → Open the action → Document what you did → Upload evidence photos → Mark as Complete. The action will then go to verification.',
        ar: 'انتقل إلى إجراءاتي ← المُكلَّفة ← افتح الإجراء ← وثّق ما فعلته ← ارفع صور الدليل ← حدد كمكتمل. سينتقل الإجراء بعد ذلك للتحقق.'
      }
    },
    {
      question: { en: 'Can I start an inspection on my own?', ar: 'هل يمكنني بدء تفتيش بمفردي؟' },
      answer: {
        en: 'You can start ad-hoc inspections using available templates. Go to Inspections → Start New Session → Select template → Begin inspection.',
        ar: 'يمكنك بدء عمليات تفتيش مخصصة باستخدام القوالب المتاحة. انتقل إلى التفتيش ← بدء جلسة جديدة ← اختر القالب ← ابدأ التفتيش.'
      }
    }
  ],
  quickReference: {
    keyPages: [
      { en: 'HSSE Events → New Report', ar: 'أحداث السلامة ← تقرير جديد' },
      { en: 'Inspections → Sessions', ar: 'التفتيش ← الجلسات' },
      { en: 'My Actions → Assigned', ar: 'إجراءاتي ← المُكلَّفة' }
    ],
    shortcuts: [
      { en: 'Quick Report from Dashboard', ar: 'تقرير سريع من لوحة التحكم' },
      { en: 'Mobile app for field work', ar: 'تطبيق الجوال للعمل الميداني' }
    ],
    tips: [
      { en: 'Always take GPS-tagged photos', ar: 'التقط صوراً مع إحداثيات GPS دائماً' },
      { en: 'Report observations immediately, dont wait', ar: 'أبلغ عن الملاحظات فوراً، لا تنتظر' },
      { en: 'Complete actions before due date', ar: 'أكمل الإجراءات قبل تاريخ الاستحقاق' }
    ]
  }
};
