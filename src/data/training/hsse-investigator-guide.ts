import { RoleTrainingGuide } from './types';

export const hsseInvestigatorGuide: RoleTrainingGuide = {
  roleCode: 'hsse_investigator',
  roleName: {
    en: 'HSSE Investigator',
    ar: 'محقق الصحة والسلامة والأمن والبيئة'
  },
  category: 'hsse',
  icon: 'Search',
  color: 'orange',
  overview: {
    en: 'As an HSSE Investigator, you conduct formal investigations into incidents. Your role is to gather evidence, interview witnesses, perform root cause analysis, assign corrective actions, and prepare investigation reports.',
    ar: 'بصفتك محقق السلامة، تجري تحقيقات رسمية في الحوادث. دورك هو جمع الأدلة ومقابلة الشهود وإجراء تحليل السبب الجذري وتعيين الإجراءات التصحيحية وإعداد تقارير التحقيق.'
  },
  responsibilities: [
    {
      id: 'accept_assignments',
      title: { en: 'Accept Investigation Assignments', ar: 'قبول تكليفات التحقيق' },
      description: {
        en: 'Accept assigned investigations promptly. Begin investigation within 24 hours of assignment.',
        ar: 'اقبل تكليفات التحقيق فوراً. ابدأ التحقيق خلال 24 ساعة من التكليف.'
      },
      priority: 'critical'
    },
    {
      id: 'collect_evidence',
      title: { en: 'Collect Evidence', ar: 'جمع الأدلة' },
      description: {
        en: 'Gather all relevant evidence including photos, documents, CCTV footage, equipment records, and physical evidence.',
        ar: 'اجمع جميع الأدلة ذات الصلة بما في ذلك الصور والوثائق ولقطات الكاميرات وسجلات المعدات والأدلة المادية.'
      },
      priority: 'critical'
    },
    {
      id: 'interview_witnesses',
      title: { en: 'Interview Witnesses', ar: 'مقابلة الشهود' },
      description: {
        en: 'Conduct structured interviews with all witnesses. Document statements accurately and have witnesses sign their statements.',
        ar: 'أجرِ مقابلات منظمة مع جميع الشهود. وثّق الإفادات بدقة واطلب من الشهود التوقيع على إفاداتهم.'
      },
      priority: 'high'
    },
    {
      id: 'perform_rca',
      title: { en: 'Perform Root Cause Analysis', ar: 'إجراء تحليل السبب الجذري' },
      description: {
        en: 'Use RCA techniques (5 Whys, Fishbone diagram) to identify root causes and contributing factors.',
        ar: 'استخدم تقنيات تحليل السبب الجذري (5 لماذات، مخطط عظمة السمكة) لتحديد الأسباب الجذرية والعوامل المساهمة.'
      },
      priority: 'critical'
    },
    {
      id: 'assign_actions',
      title: { en: 'Assign Corrective Actions', ar: 'تعيين الإجراءات التصحيحية' },
      description: {
        en: 'Based on RCA, assign corrective actions that address root causes. Set appropriate due dates and assignees.',
        ar: 'بناءً على تحليل السبب الجذري، عيّن إجراءات تصحيحية تعالج الأسباب الجذرية. حدد تواريخ استحقاق ومُكلَّفين مناسبين.'
      },
      priority: 'high'
    },
    {
      id: 'request_closure',
      title: { en: 'Request Investigation Closure', ar: 'طلب إغلاق التحقيق' },
      description: {
        en: 'When all actions are verified complete, submit investigation for closure approval.',
        ar: 'عندما يتم التحقق من اكتمال جميع الإجراءات، قدم التحقيق للموافقة على الإغلاق.'
      },
      priority: 'medium'
    }
  ],
  incidentWorkflow: [
    {
      status: 'investigation_pending',
      statusLabel: { en: 'Assigned to You', ar: 'مُكلَّف إليك' },
      action: { en: 'Accept Investigation', ar: 'قبول التحقيق' },
      howTo: {
        en: 'Go to Investigation Workspace → Find your assigned investigation → Click "Accept" to begin → Investigation status changes to "In Progress"',
        ar: 'انتقل إلى مساحة التحقيق ← ابحث عن التحقيق المُكلَّف إليك ← انقر "قبول" للبدء ← تتغير حالة التحقيق إلى "قيد التنفيذ"'
      },
      timeLimit: '24 hours',
      nextStep: 'investigation_in_progress'
    },
    {
      status: 'investigation_in_progress',
      statusLabel: { en: 'Investigation Active', ar: 'التحقيق نشط' },
      action: { en: 'Conduct Investigation', ar: 'إجراء التحقيق' },
      howTo: {
        en: '1. Evidence Tab: Upload photos, documents → 2. Witnesses Tab: Add statements → 3. RCA Tab: Complete 5 Whys/Fishbone → 4. Actions Tab: Assign corrective actions → 5. Click "Complete Investigation"',
        ar: '1. تبويب الأدلة: ارفع صور ووثائق ← 2. تبويب الشهود: أضف الإفادات ← 3. تبويب السبب الجذري: أكمل 5 لماذات/عظمة السمكة ← 4. تبويب الإجراءات: عيّن الإجراءات التصحيحية ← 5. انقر "إكمال التحقيق"'
      },
      nextStep: 'pending_closure'
    },
    {
      status: 'pending_closure',
      statusLabel: { en: 'Awaiting Closure', ar: 'بانتظار الإغلاق' },
      action: { en: 'Monitor Until Closure', ar: 'المراقبة حتى الإغلاق' },
      howTo: {
        en: 'All corrective actions must be completed and verified before final closure. Monitor action completion → HSSE Manager will approve final closure',
        ar: 'يجب إكمال جميع الإجراءات التصحيحية والتحقق منها قبل الإغلاق النهائي. راقب إكمال الإجراءات ← سيوافق مدير السلامة على الإغلاق النهائي'
      }
    }
  ],
  observationWorkflow: [],
  myActionsGuide: [
    {
      tab: 'my_investigations',
      tabLabel: { en: 'My Investigations', ar: 'تحقيقاتي' },
      description: {
        en: 'Investigations assigned to you',
        ar: 'التحقيقات المُكلَّفة إليك'
      },
      actions: [
        { en: 'Accept new investigation assignments', ar: 'قبول تكليفات تحقيق جديدة' },
        { en: 'View investigation details and timeline', ar: 'عرض تفاصيل التحقيق والجدول الزمني' },
        { en: 'Upload evidence and witness statements', ar: 'رفع الأدلة وإفادات الشهود' },
        { en: 'Complete RCA documentation', ar: 'إكمال توثيق تحليل السبب الجذري' },
        { en: 'Assign and track corrective actions', ar: 'تعيين وتتبع الإجراءات التصحيحية' }
      ]
    },
    {
      tab: 'action_verification',
      tabLabel: { en: 'Action Verification', ar: 'التحقق من الإجراءات' },
      description: {
        en: 'Verify corrective actions from your investigations',
        ar: 'التحقق من الإجراءات التصحيحية من تحقيقاتك'
      },
      actions: [
        { en: 'Review completed action evidence', ar: 'مراجعة أدلة الإجراءات المكتملة' },
        { en: 'Verify implementation quality', ar: 'التحقق من جودة التنفيذ' },
        { en: 'Approve or reject with feedback', ar: 'الموافقة أو الرفض مع ملاحظات' }
      ]
    }
  ],
  faqs: [
    {
      question: { en: 'How long do I have to complete an investigation?', ar: 'كم من الوقت لديّ لإكمال التحقيق؟' },
      answer: {
        en: 'Investigation SLAs depend on severity: L5 incidents have strict timelines. Check the investigation SLA settings or dashboard for specific deadlines. You will receive reminders as deadlines approach.',
        ar: 'اتفاقيات مستوى خدمة التحقيق تعتمد على الخطورة: حوادث المستوى 5 لها جداول زمنية صارمة. راجع إعدادات اتفاقية مستوى خدمة التحقيق أو لوحة التحكم للمواعيد النهائية المحددة. ستتلقى تذكيرات مع اقتراب المواعيد النهائية.'
      }
    },
    {
      question: { en: 'What if a witness refuses to give a statement?', ar: 'ماذا لو رفض شاهد إعطاء إفادة؟' },
      answer: {
        en: 'Document the refusal in the investigation. Note who refused and why if a reason was given. Continue with available witnesses and evidence.',
        ar: 'وثّق الرفض في التحقيق. سجّل من رفض ولماذا إذا تم تقديم سبب. تابع مع الشهود والأدلة المتاحة.'
      }
    },
    {
      question: { en: 'Can I reassign an investigation to someone else?', ar: 'هل يمكنني إعادة تكليف التحقيق لشخص آخر؟' },
      answer: {
        en: 'Reassignment requires HSSE Manager approval. Contact your HSSE Manager with justification for the reassignment request.',
        ar: 'إعادة التكليف تتطلب موافقة مدير السلامة. تواصل مع مدير السلامة مع تبرير لطلب إعادة التكليف.'
      }
    },
    {
      question: { en: 'What makes a good root cause analysis?', ar: 'ما الذي يجعل تحليل السبب الجذري جيداً؟' },
      answer: {
        en: 'A good RCA: 1) Goes beyond immediate causes to underlying issues, 2) Identifies systemic factors not just human error, 3) Results in actions that prevent recurrence, 4) Is supported by evidence.',
        ar: 'تحليل السبب الجذري الجيد: 1) يتجاوز الأسباب الفورية إلى القضايا الأساسية، 2) يحدد العوامل النظامية وليس فقط الخطأ البشري، 3) ينتج عنه إجراءات تمنع التكرار، 4) مدعوم بالأدلة.'
      }
    }
  ],
  quickReference: {
    keyPages: [
      { en: 'Investigation Workspace', ar: 'مساحة التحقيق' },
      { en: 'Evidence Management', ar: 'إدارة الأدلة' },
      { en: 'RCA Tools (5 Whys, Fishbone)', ar: 'أدوات السبب الجذري (5 لماذات، عظمة السمكة)' }
    ],
    shortcuts: [
      { en: 'Quick evidence upload', ar: 'رفع الأدلة السريع' },
      { en: 'Witness statement templates', ar: 'قوالب إفادات الشهود' },
      { en: 'RCA diagram builder', ar: 'منشئ مخطط السبب الجذري' }
    ],
    tips: [
      { en: 'Interview witnesses separately', ar: 'قابل الشهود بشكل منفصل' },
      { en: 'Take photos immediately after incident', ar: 'التقط صوراً فوراً بعد الحادث' },
      { en: 'Keep 5 Whys focused on one issue', ar: 'ركز 5 لماذات على قضية واحدة' },
      { en: 'Assign actions that address root cause, not symptoms', ar: 'عيّن إجراءات تعالج السبب الجذري وليس الأعراض' }
    ]
  }
};
