import { RoleTrainingGuide } from './types';

export const hsseExpertGuide: RoleTrainingGuide = {
  roleCode: 'hsse_expert',
  roleName: {
    en: 'HSSE Expert',
    ar: 'خبير الصحة والسلامة والأمن والبيئة'
  },
  category: 'hsse',
  icon: 'ShieldCheck',
  color: 'teal',
  overview: {
    en: 'As an HSSE Expert, you are the technical gatekeeper for incidents and the validator for observation closures. You screen incoming incidents, assign severity levels, validate root cause analysis, and ensure corrective actions are appropriate before closure.',
    ar: 'بصفتك خبير السلامة، أنت الحارس التقني للحوادث والمُصادق على إغلاق الملاحظات. تفحص الحوادث الواردة وتُعيّن مستويات الخطورة وتصادق على تحليل السبب الجذري وتضمن ملاءمة الإجراءات التصحيحية قبل الإغلاق.'
  },
  responsibilities: [
    {
      id: 'screen_incidents',
      title: { en: 'Screen Incoming Incidents', ar: 'فحص الحوادث الواردة' },
      description: {
        en: 'Review all incidents forwarded by Department Representatives. Approve valid incidents, reject invalid ones, or return to reporter for corrections.',
        ar: 'راجع جميع الحوادث المُحوَّلة من ممثلي الأقسام. وافق على الحوادث الصالحة، ارفض غير الصالحة، أو أعد إلى المُبلِّغ للتصحيح.'
      },
      priority: 'critical'
    },
    {
      id: 'assign_severity',
      title: { en: 'Assign Incident Severity', ar: 'تعيين خطورة الحادث' },
      description: {
        en: 'Assign severity levels (1-5) based on actual and potential consequences. Follow severity assignment rules - fatality must be L5, LTI must be minimum L4.',
        ar: 'عيّن مستويات الخطورة (1-5) بناءً على العواقب الفعلية والمحتملة. اتبع قواعد تعيين الخطورة - الوفاة يجب أن تكون المستوى 5، إصابة فقدان الوقت يجب أن تكون الحد الأدنى المستوى 4.'
      },
      priority: 'critical'
    },
    {
      id: 'validate_observations',
      title: { en: 'Validate Observation Closures', ar: 'التحقق من إغلاق الملاحظات' },
      description: {
        en: 'Review completed corrective actions from observations. Validate that actions are properly implemented before approving closure.',
        ar: 'راجع الإجراءات التصحيحية المكتملة من الملاحظات. تحقق من تنفيذ الإجراءات بشكل صحيح قبل الموافقة على الإغلاق.'
      },
      priority: 'high'
    },
    {
      id: 'review_escalations',
      title: { en: 'Review Escalated Observations', ar: 'مراجعة الملاحظات المُصعَّدة' },
      description: {
        en: 'Handle observations escalated by Department Representatives. Decide to keep as observation or upgrade to incident investigation.',
        ar: 'تعامل مع الملاحظات المُصعَّدة من ممثلي الأقسام. قرر الإبقاء كملاحظة أو ترقية إلى تحقيق حادث.'
      },
      priority: 'high'
    },
    {
      id: 'handle_disputes',
      title: { en: 'Handle Reporter Disputes', ar: 'التعامل مع اعتراضات المُبلِّغين' },
      description: {
        en: 'When reporters dispute rejections, review their justification and make a final decision.',
        ar: 'عندما يعترض المُبلِّغون على الرفض، راجع مبرراتهم واتخذ قراراً نهائياً.'
      },
      priority: 'medium'
    }
  ],
  incidentWorkflow: [
    {
      status: 'pending_review',
      statusLabel: { en: 'Expert Screening', ar: 'فحص الخبير' },
      action: { en: 'Screen and Assign Severity', ar: 'فحص وتعيين الخطورة' },
      howTo: {
        en: 'Go to Investigation Workspace → Review incident details → Verify classification → Assign severity (1-5) → Choose: Approve (goes to Manager) OR Reject (with reason) OR Return to Reporter (for corrections)',
        ar: 'انتقل إلى مساحة التحقيق ← راجع تفاصيل الحادث ← تحقق من التصنيف ← عيّن الخطورة (1-5) ← اختر: موافقة (ينتقل للمدير) أو رفض (مع السبب) أو إعادة للمُبلِّغ (للتصحيحات)'
      },
      timeLimit: '24 hours',
      nextStep: 'pending_manager_approval'
    },
    {
      status: 'reporter_dispute',
      statusLabel: { en: 'Dispute Review', ar: 'مراجعة الاعتراض' },
      action: { en: 'Review Dispute', ar: 'مراجعة الاعتراض' },
      howTo: {
        en: 'Reporter disputed your rejection → Review their justification → Either uphold rejection (closes dispute) or accept the report (proceeds to normal flow)',
        ar: 'المُبلِّغ اعترض على رفضك ← راجع مبرراته ← إما تأكيد الرفض (إغلاق الاعتراض) أو قبول التقرير (يستمر في المسار العادي)'
      },
      timeLimit: '48 hours'
    }
  ],
  observationWorkflow: [
    {
      status: 'pending_hsse_escalation_review',
      statusLabel: { en: 'Escalation Review', ar: 'مراجعة التصعيد' },
      action: { en: 'Review Escalated Observation', ar: 'مراجعة الملاحظة المُصعَّدة' },
      howTo: {
        en: 'Department Rep escalated this observation → Review details → Choose: Accept as Observation (add actions), Upgrade to Incident (starts investigation), or Return to Dept Rep',
        ar: 'ممثل القسم صعّد هذه الملاحظة ← راجع التفاصيل ← اختر: قبول كملاحظة (أضف إجراءات)، ترقية لحادث (يبدأ التحقيق)، أو إعادة لممثل القسم'
      },
      timeLimit: '24 hours'
    },
    {
      status: 'pending_hsse_validation',
      statusLabel: { en: 'Action Validation', ar: 'التحقق من الإجراءات' },
      action: { en: 'Validate Completed Actions', ar: 'التحقق من الإجراءات المكتملة' },
      howTo: {
        en: 'All corrective actions completed → Review evidence → Either Accept (auto-closes L3-4, goes to HSSE Manager for L5) OR Reject (returns to Dept Rep with reason)',
        ar: 'جميع الإجراءات التصحيحية مكتملة ← راجع الأدلة ← إما قبول (إغلاق تلقائي للمستوى 3-4، ينتقل لمدير السلامة للمستوى 5) أو رفض (يعود لممثل القسم مع السبب)'
      },
      nextStep: 'closed'
    },
    {
      status: 'pending_hsse_rejection_review',
      statusLabel: { en: 'Rejection Review', ar: 'مراجعة الرفض' },
      action: { en: 'Review Dept Rep Rejection', ar: 'مراجعة رفض ممثل القسم' },
      howTo: {
        en: 'Dept Rep rejected observation → Review their reason → Either Accept rejection (closes observation) OR Send back requiring mandatory actions',
        ar: 'ممثل القسم رفض الملاحظة ← راجع سببه ← إما قبول الرفض (يغلق الملاحظة) أو الإعادة مع طلب إجراءات إلزامية'
      }
    }
  ],
  myActionsGuide: [
    {
      tab: 'incident_screening',
      tabLabel: { en: 'Incident Screening', ar: 'فحص الحوادث' },
      description: {
        en: 'Incidents pending your expert review and severity assignment',
        ar: 'الحوادث بانتظار مراجعتك كخبير وتعيين الخطورة'
      },
      actions: [
        { en: 'Review incident details and classification', ar: 'مراجعة تفاصيل الحادث والتصنيف' },
        { en: 'Assign severity level (1-5)', ar: 'تعيين مستوى الخطورة (1-5)' },
        { en: 'Approve, reject, or return for corrections', ar: 'الموافقة أو الرفض أو الإعادة للتصحيح' },
        { en: 'Handle reporter disputes', ar: 'التعامل مع اعتراضات المُبلِّغين' }
      ]
    },
    {
      tab: 'observation_validation',
      tabLabel: { en: 'Observation Validation', ar: 'التحقق من الملاحظات' },
      description: {
        en: 'Observations pending your validation or escalation review',
        ar: 'الملاحظات بانتظار التحقق أو مراجعة التصعيد'
      },
      actions: [
        { en: 'Validate completed actions', ar: 'التحقق من الإجراءات المكتملة' },
        { en: 'Review escalated observations', ar: 'مراجعة الملاحظات المُصعَّدة' },
        { en: 'Review dept rep rejections', ar: 'مراجعة رفض ممثلي الأقسام' },
        { en: 'Upgrade to incident if needed', ar: 'الترقية لحادث إذا لزم الأمر' }
      ]
    },
    {
      tab: 'rca_validation',
      tabLabel: { en: 'RCA Validation', ar: 'التحقق من تحليل السبب الجذري' },
      description: {
        en: 'Review root cause analysis quality on investigations',
        ar: 'مراجعة جودة تحليل السبب الجذري في التحقيقات'
      },
      actions: [
        { en: 'Validate RCA completeness', ar: 'التحقق من اكتمال تحليل السبب الجذري' },
        { en: 'Review contributing factors', ar: 'مراجعة العوامل المساهمة' },
        { en: 'Ensure actions address root causes', ar: 'ضمان معالجة الإجراءات للأسباب الجذرية' }
      ]
    }
  ],
  faqs: [
    {
      question: { en: 'What severity should I assign for a fatality?', ar: 'ما الخطورة التي يجب تعيينها لحالة وفاة؟' },
      answer: {
        en: 'A fatality MUST always be Level 5. The system enforces this rule - you cannot assign a lower severity when fatality is indicated.',
        ar: 'الوفاة يجب أن تكون دائماً المستوى 5. النظام يفرض هذه القاعدة - لا يمكنك تعيين خطورة أقل عند الإشارة إلى الوفاة.'
      }
    },
    {
      question: { en: 'When should I upgrade an observation to an incident?', ar: 'متى يجب ترقية ملاحظة إلى حادث؟' },
      answer: {
        en: 'Upgrade when: the observation reveals a near-miss that could have caused injury, there is evidence of repeated unsafe conditions, or the severity level warrants formal investigation.',
        ar: 'رقِّ عندما: تكشف الملاحظة عن حادثة وشيكة كان يمكن أن تسبب إصابة، أو هناك دليل على ظروف غير آمنة متكررة، أو مستوى الخطورة يستدعي تحقيقاً رسمياً.'
      }
    },
    {
      question: { en: 'What if I disagree with the Department Rep actions?', ar: 'ماذا لو لم أوافق على إجراءات ممثل القسم؟' },
      answer: {
        en: 'You can reject the validation with specific feedback. The observation returns to Dept Rep who must address your concerns. You can also add additional actions if needed.',
        ar: 'يمكنك رفض التحقق مع ملاحظات محددة. تعود الملاحظة لممثل القسم الذي يجب أن يعالج مخاوفك. يمكنك أيضاً إضافة إجراءات إضافية إذا لزم الأمر.'
      }
    }
  ],
  quickReference: {
    keyPages: [
      { en: 'Investigation Workspace', ar: 'مساحة التحقيق' },
      { en: 'HSSE Validation Dashboard', ar: 'لوحة التحقق من السلامة' },
      { en: 'My Actions → Screening Queue', ar: 'إجراءاتي ← قائمة الفحص' }
    ],
    shortcuts: [
      { en: 'Filter by "Pending Expert Review"', ar: 'تصفية حسب "بانتظار مراجعة الخبير"' },
      { en: 'Quick severity assignment panel', ar: 'لوحة تعيين الخطورة السريعة' }
    ],
    tips: [
      { en: 'Review severity rules before assigning', ar: 'راجع قواعد الخطورة قبل التعيين' },
      { en: 'Add detailed rejection reasons', ar: 'أضف أسباب رفض مفصلة' },
      { en: 'Validate actions meet root cause', ar: 'تحقق من أن الإجراءات تعالج السبب الجذري' }
    ]
  }
};
