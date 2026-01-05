import { RoleTrainingGuide } from './types';

export const managerGuide: RoleTrainingGuide = {
  roleCode: 'manager',
  roleName: {
    en: 'Manager',
    ar: 'المدير'
  },
  category: 'management',
  icon: 'Briefcase',
  color: 'purple',
  overview: {
    en: 'As a Manager, you approve incidents for investigation within your area of responsibility. Your approval authorizes the investigation process to begin and resources to be allocated.',
    ar: 'بصفتك مديراً، توافق على الحوادث للتحقيق ضمن نطاق مسؤوليتك. موافقتك تُخوّل بدء عملية التحقيق وتخصيص الموارد.'
  },
  responsibilities: [
    {
      id: 'approve_investigations',
      title: { en: 'Approve Investigation Requests', ar: 'الموافقة على طلبات التحقيق' },
      description: {
        en: 'Review incidents forwarded by HSSE Expert and approve them for investigation. Your approval is required before investigators can begin their work.',
        ar: 'راجع الحوادث المُحوَّلة من خبير السلامة ووافق عليها للتحقيق. موافقتك مطلوبة قبل أن يتمكن المحققون من بدء عملهم.'
      },
      priority: 'critical'
    },
    {
      id: 'review_team_actions',
      title: { en: 'Monitor Team Corrective Actions', ar: 'مراقبة إجراءات الفريق التصحيحية' },
      description: {
        en: 'Track corrective actions assigned to your team members. Ensure actions are completed on time.',
        ar: 'تتبع الإجراءات التصحيحية المُعيَّنة لأعضاء فريقك. تأكد من إكمال الإجراءات في الوقت المحدد.'
      },
      priority: 'high'
    },
    {
      id: 'verify_actions',
      title: { en: 'Verify Completed Actions', ar: 'التحقق من الإجراءات المكتملة' },
      description: {
        en: 'Review and verify corrective actions completed by your team members before they are closed.',
        ar: 'راجع وتحقق من الإجراءات التصحيحية المكتملة من قبل أعضاء فريقك قبل إغلاقها.'
      },
      priority: 'medium'
    }
  ],
  incidentWorkflow: [
    {
      status: 'pending_manager_approval',
      statusLabel: { en: 'Pending Your Approval', ar: 'بانتظار موافقتك' },
      action: { en: 'Approve or Reject Investigation', ar: 'الموافقة على التحقيق أو رفضه' },
      howTo: {
        en: 'Go to Investigation Workspace → Review incident details and severity → Click "Approve" to authorize investigation OR "Reject" if investigation is not warranted (will escalate to HSSE Manager)',
        ar: 'انتقل إلى مساحة التحقيق ← راجع تفاصيل الحادث والخطورة ← انقر "موافقة" لتفويض التحقيق أو "رفض" إذا لم يكن التحقيق مبرراً (سيُصعَّد إلى مدير السلامة)'
      },
      timeLimit: '24 hours',
      nextStep: 'investigation_pending'
    }
  ],
  observationWorkflow: [],
  myActionsGuide: [
    {
      tab: 'approval_queue',
      tabLabel: { en: 'Approval Queue', ar: 'قائمة الموافقات' },
      description: {
        en: 'Incidents pending your approval for investigation',
        ar: 'الحوادث بانتظار موافقتك للتحقيق'
      },
      actions: [
        { en: 'Review incident details', ar: 'مراجعة تفاصيل الحادث' },
        { en: 'Approve investigation to proceed', ar: 'الموافقة على المضي قدماً بالتحقيق' },
        { en: 'Reject with justification (escalates to HSSE Manager)', ar: 'الرفض مع التبرير (يُصعَّد إلى مدير السلامة)' }
      ]
    },
    {
      tab: 'team_actions',
      tabLabel: { en: 'Team Actions', ar: 'إجراءات الفريق' },
      description: {
        en: 'Track corrective actions assigned to your team',
        ar: 'تتبع الإجراءات التصحيحية المُعيَّنة لفريقك'
      },
      actions: [
        { en: 'Monitor action progress', ar: 'مراقبة تقدم الإجراءات' },
        { en: 'Approve extension requests', ar: 'الموافقة على طلبات التمديد' },
        { en: 'Verify completed actions', ar: 'التحقق من الإجراءات المكتملة' }
      ]
    }
  ],
  faqs: [
    {
      question: { en: 'What happens if I reject an investigation?', ar: 'ماذا يحدث إذا رفضت التحقيق؟' },
      answer: {
        en: 'If you reject an investigation, it automatically escalates to the HSSE Manager for final decision. The HSSE Manager can override your rejection or confirm it.',
        ar: 'إذا رفضت التحقيق، يُصعَّد تلقائياً إلى مدير السلامة للقرار النهائي. يمكن لمدير السلامة تجاوز رفضك أو تأكيده.'
      }
    },
    {
      question: { en: 'How long do I have to approve an investigation?', ar: 'كم من الوقت لديّ للموافقة على التحقيق؟' },
      answer: {
        en: 'You have 24 hours to approve or reject. After this, reminders will be sent and it may escalate to HSSE Manager if no action is taken.',
        ar: 'لديك 24 ساعة للموافقة أو الرفض. بعد ذلك، سيتم إرسال تذكيرات وقد يُصعَّد إلى مدير السلامة إذا لم يُتخذ أي إجراء.'
      }
    },
    {
      question: { en: 'Can I see actions assigned to my team members?', ar: 'هل يمكنني رؤية الإجراءات المُعيَّنة لأعضاء فريقي؟' },
      answer: {
        en: 'Yes, in My Actions you can filter by team and see all corrective actions assigned to people reporting to you. You can also verify their completed actions.',
        ar: 'نعم، في إجراءاتي يمكنك التصفية حسب الفريق ورؤية جميع الإجراءات التصحيحية المُعيَّنة للأشخاص الذين يعملون تحت إشرافك. يمكنك أيضاً التحقق من إجراءاتهم المكتملة.'
      }
    }
  ],
  quickReference: {
    keyPages: [
      { en: 'Investigation Workspace', ar: 'مساحة التحقيق' },
      { en: 'My Actions → Approval Queue', ar: 'إجراءاتي ← قائمة الموافقات' },
      { en: 'Team Performance Dashboard', ar: 'لوحة أداء الفريق' }
    ],
    shortcuts: [
      { en: 'Filter by "Pending My Approval"', ar: 'تصفية حسب "بانتظار موافقتي"' }
    ],
    tips: [
      { en: 'Approve within 24 hours to avoid escalation', ar: 'وافق خلال 24 ساعة لتجنب التصعيد' },
      { en: 'Review severity assignment before approving', ar: 'راجع تعيين الخطورة قبل الموافقة' },
      { en: 'Add notes when rejecting to help HSSE Manager decide', ar: 'أضف ملاحظات عند الرفض لمساعدة مدير السلامة في اتخاذ القرار' }
    ]
  }
};
