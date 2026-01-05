import { RoleTrainingGuide } from './types';

export const normalUserGuide: RoleTrainingGuide = {
  roleCode: 'normal_user',
  roleName: {
    en: 'Reporter / Normal User',
    ar: 'المُبلِّغ / المستخدم العادي'
  },
  category: 'reporter',
  icon: 'User',
  color: 'blue',
  overview: {
    en: 'As a Reporter, you are the first line of defense in the HSSE system. Your responsibility is to report any incidents or observations that you witness in the workplace. Timely and accurate reporting helps prevent future incidents and maintains a safe work environment.',
    ar: 'بصفتك مُبلِّغاً، أنت خط الدفاع الأول في نظام الصحة والسلامة والأمن والبيئة. مسؤوليتك هي الإبلاغ عن أي حوادث أو ملاحظات تشهدها في مكان العمل. الإبلاغ في الوقت المناسب والدقيق يساعد في منع الحوادث المستقبلية والحفاظ على بيئة عمل آمنة.'
  },
  responsibilities: [
    {
      id: 'report_incidents',
      title: { en: 'Report Incidents Promptly', ar: 'الإبلاغ عن الحوادث فوراً' },
      description: {
        en: 'Report any workplace incident within 24 hours of occurrence. Include all relevant details such as time, location, people involved, and what happened.',
        ar: 'أبلغ عن أي حادث في مكان العمل خلال 24 ساعة من وقوعه. قم بتضمين جميع التفاصيل ذات الصلة مثل الوقت والموقع والأشخاص المعنيين وما حدث.'
      },
      priority: 'critical'
    },
    {
      id: 'submit_observations',
      title: { en: 'Submit Safety Observations', ar: 'تقديم ملاحظات السلامة' },
      description: {
        en: 'Report unsafe conditions, near misses, or positive safety behaviors. This proactive reporting prevents incidents before they happen.',
        ar: 'أبلغ عن الظروف غير الآمنة أو الحوادث الوشيكة أو سلوكيات السلامة الإيجابية. هذا الإبلاغ الاستباقي يمنع الحوادث قبل وقوعها.'
      },
      priority: 'high'
    },
    {
      id: 'respond_corrections',
      title: { en: 'Respond to Correction Requests', ar: 'الاستجابة لطلبات التصحيح' },
      description: {
        en: 'If your report is returned for corrections, update the information promptly and resubmit within 48 hours.',
        ar: 'إذا أُعيد تقريرك للتصحيح، قم بتحديث المعلومات فوراً وأعد تقديمه خلال 48 ساعة.'
      },
      priority: 'high'
    },
    {
      id: 'complete_actions',
      title: { en: 'Complete Assigned Actions', ar: 'إكمال الإجراءات المُكلَّفة' },
      description: {
        en: 'If assigned any corrective actions, complete them by the due date and submit evidence of completion.',
        ar: 'إذا كُلِّفت بأي إجراءات تصحيحية، أكملها قبل تاريخ الاستحقاق وقدم دليل الإكمال.'
      },
      priority: 'medium'
    }
  ],
  incidentWorkflow: [
    {
      status: 'new',
      statusLabel: { en: 'New Report', ar: 'تقرير جديد' },
      action: { en: 'Submit Incident Report', ar: 'تقديم تقرير الحادث' },
      howTo: {
        en: 'Go to HSSE Events → New Report → Select "Incident" → Fill all required fields → Attach photos/evidence → Click Submit',
        ar: 'انتقل إلى أحداث السلامة ← تقرير جديد ← اختر "حادث" ← املأ جميع الحقول المطلوبة ← أرفق الصور/الأدلة ← انقر على إرسال'
      },
      nextStep: 'submitted'
    },
    {
      status: 'returned_to_reporter',
      statusLabel: { en: 'Returned for Correction', ar: 'مُعاد للتصحيح' },
      action: { en: 'Correct and Resubmit', ar: 'تصحيح وإعادة الإرسال' },
      howTo: {
        en: 'View the correction banner showing what needs to be fixed → Edit the report → Make required changes → Click Resubmit',
        ar: 'اعرض شريط التصحيح الذي يوضح ما يجب إصلاحه ← عدّل التقرير ← أجرِ التغييرات المطلوبة ← انقر على إعادة الإرسال'
      },
      timeLimit: '48 hours'
    },
    {
      status: 'rejected',
      statusLabel: { en: 'Rejected (Dispute Option)', ar: 'مرفوض (خيار الاعتراض)' },
      action: { en: 'Accept or Dispute', ar: 'قبول أو اعتراض' },
      howTo: {
        en: 'If you believe the rejection is incorrect, click "Dispute" and provide justification. Otherwise, accept the rejection.',
        ar: 'إذا كنت تعتقد أن الرفض غير صحيح، انقر على "اعتراض" وقدم المبررات. وإلا، اقبل الرفض.'
      }
    }
  ],
  observationWorkflow: [
    {
      status: 'new',
      statusLabel: { en: 'New Observation', ar: 'ملاحظة جديدة' },
      action: { en: 'Submit Observation', ar: 'تقديم الملاحظة' },
      howTo: {
        en: 'Go to HSSE Events → New Report → Select "Observation" → Fill details → Select severity level → Submit',
        ar: 'انتقل إلى أحداث السلامة ← تقرير جديد ← اختر "ملاحظة" ← املأ التفاصيل ← اختر مستوى الخطورة ← أرسل'
      },
      nextStep: 'submitted'
    },
    {
      status: 'submitted_l1_l2',
      statusLabel: { en: 'Level 1-2: Close on Spot', ar: 'المستوى 1-2: إغلاق فوري' },
      action: { en: 'Close Immediately', ar: 'إغلاق فوراً' },
      howTo: {
        en: 'For Level 1-2 observations, you can close them immediately by taking a photo showing the issue is resolved and adding a closing note.',
        ar: 'للملاحظات من المستوى 1-2، يمكنك إغلاقها فوراً بالتقاط صورة تُظهر حل المشكلة وإضافة ملاحظة الإغلاق.'
      }
    },
    {
      status: 'submitted_l3_l5',
      statusLabel: { en: 'Level 3-5: Await Review', ar: 'المستوى 3-5: انتظار المراجعة' },
      action: { en: 'Monitor Status', ar: 'مراقبة الحالة' },
      howTo: {
        en: 'For Level 3-5 observations, wait for Department Representative review. Track via My Actions → Reported tab.',
        ar: 'للملاحظات من المستوى 3-5، انتظر مراجعة ممثل القسم. تتبع عبر إجراءاتي ← تبويب المُبلَّغ عنها.'
      }
    }
  ],
  myActionsGuide: [
    {
      tab: 'reported',
      tabLabel: { en: 'Reported', ar: 'المُبلَّغ عنها' },
      description: {
        en: 'Shows all incidents and observations you have reported',
        ar: 'يعرض جميع الحوادث والملاحظات التي أبلغت عنها'
      },
      actions: [
        { en: 'View status of your reports', ar: 'عرض حالة تقاريرك' },
        { en: 'Respond to correction requests', ar: 'الاستجابة لطلبات التصحيح' },
        { en: 'Dispute rejected reports', ar: 'الاعتراض على التقارير المرفوضة' }
      ]
    },
    {
      tab: 'assigned',
      tabLabel: { en: 'Assigned Actions', ar: 'الإجراءات المُكلَّفة' },
      description: {
        en: 'Shows corrective actions assigned to you',
        ar: 'يعرض الإجراءات التصحيحية المُكلَّفة إليك'
      },
      actions: [
        { en: 'View action details and due dates', ar: 'عرض تفاصيل الإجراءات وتواريخ الاستحقاق' },
        { en: 'Submit evidence of completion', ar: 'تقديم دليل الإكمال' },
        { en: 'Request deadline extension if needed', ar: 'طلب تمديد الموعد النهائي إذا لزم الأمر' }
      ]
    }
  ],
  faqs: [
    {
      question: { en: 'What should I report as an incident vs observation?', ar: 'ما الذي يجب الإبلاغ عنه كحادث مقابل ملاحظة؟' },
      answer: {
        en: 'An incident is an event that has already occurred causing harm, injury, property damage, or near miss. An observation is a proactive report of unsafe conditions, behaviors, or positive safety practices.',
        ar: 'الحادث هو حدث وقع بالفعل وتسبب في ضرر أو إصابة أو تلف في الممتلكات أو حادثة وشيكة. الملاحظة هي تقرير استباقي عن ظروف أو سلوكيات غير آمنة أو ممارسات سلامة إيجابية.'
      }
    },
    {
      question: { en: 'What if my report is rejected?', ar: 'ماذا لو تم رفض تقريري؟' },
      answer: {
        en: 'You can dispute the rejection if you believe it was incorrect. Click "Dispute" and provide your justification. An HSSE Expert will review your dispute.',
        ar: 'يمكنك الاعتراض على الرفض إذا كنت تعتقد أنه غير صحيح. انقر على "اعتراض" وقدم مبرراتك. سيراجع خبير السلامة اعتراضك.'
      }
    },
    {
      question: { en: 'How long do I have to complete an assigned action?', ar: 'كم من الوقت لديَّ لإكمال الإجراء المُكلَّف؟' },
      answer: {
        en: 'The due date is set when the action is assigned. If you cannot meet the deadline, request an extension before the due date through the action details page.',
        ar: 'يتم تحديد تاريخ الاستحقاق عند تعيين الإجراء. إذا لم تتمكن من الالتزام بالموعد النهائي، اطلب تمديداً قبل تاريخ الاستحقاق من خلال صفحة تفاصيل الإجراء.'
      }
    }
  ],
  quickReference: {
    keyPages: [
      { en: 'HSSE Events → New Report', ar: 'أحداث السلامة ← تقرير جديد' },
      { en: 'My Actions → Reported', ar: 'إجراءاتي ← المُبلَّغ عنها' },
      { en: 'My Actions → Assigned', ar: 'إجراءاتي ← المُكلَّفة' }
    ],
    shortcuts: [
      { en: 'Quick Report button on Dashboard', ar: 'زر الإبلاغ السريع في لوحة التحكم' }
    ],
    tips: [
      { en: 'Always attach photos when possible', ar: 'أرفق صوراً دائماً عند الإمكان' },
      { en: 'Be specific about location and time', ar: 'كن محدداً بشأن الموقع والوقت' },
      { en: 'Include witness names if applicable', ar: 'ضمّن أسماء الشهود إن وجدوا' }
    ]
  }
};
