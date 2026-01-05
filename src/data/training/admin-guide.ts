import { RoleTrainingGuide } from './types';

export const adminGuide: RoleTrainingGuide = {
  roleCode: 'admin',
  roleName: {
    en: 'Administrator',
    ar: 'المسؤول'
  },
  category: 'admin',
  icon: 'Settings',
  color: 'slate',
  overview: {
    en: 'As an Administrator, you manage system configuration, user access, and platform settings. You ensure the HSSE system is properly configured and users have appropriate access levels.',
    ar: 'بصفتك مسؤولاً، تدير تكوين النظام ووصول المستخدمين وإعدادات المنصة. تضمن أن نظام السلامة مُهيأ بشكل صحيح وأن المستخدمين لديهم مستويات وصول مناسبة.'
  },
  responsibilities: [
    {
      id: 'user_management',
      title: { en: 'Manage Users and Roles', ar: 'إدارة المستخدمين والأدوار' },
      description: {
        en: 'Create user invitations, assign roles, manage access permissions, and deactivate users when needed.',
        ar: 'أنشئ دعوات المستخدمين، عيّن الأدوار، أدر صلاحيات الوصول، وأوقف المستخدمين عند الحاجة.'
      },
      priority: 'critical'
    },
    {
      id: 'org_structure',
      title: { en: 'Maintain Organization Structure', ar: 'صيانة الهيكل التنظيمي' },
      description: {
        en: 'Configure sites, branches, buildings, floors, and departments. Maintain accurate organizational hierarchy.',
        ar: 'هيّئ المواقع والفروع والمباني والطوابق والأقسام. حافظ على تسلسل هرمي تنظيمي دقيق.'
      },
      priority: 'high'
    },
    {
      id: 'sla_config',
      title: { en: 'Configure SLA Settings', ar: 'تكوين إعدادات اتفاقيات مستوى الخدمة' },
      description: {
        en: 'Set SLA timelines for actions, findings, and investigations. Configure escalation rules.',
        ar: 'حدد جداول زمنية لاتفاقيات مستوى الخدمة للإجراءات والنتائج والتحقيقات. هيّئ قواعد التصعيد.'
      },
      priority: 'high'
    },
    {
      id: 'notification_config',
      title: { en: 'Configure Notifications', ar: 'تكوين الإشعارات' },
      description: {
        en: 'Set up notification templates, channels (email, WhatsApp, web), and rules for different events.',
        ar: 'أعد قوالب الإشعارات والقنوات (البريد الإلكتروني، واتساب، الويب) والقواعد للأحداث المختلفة.'
      },
      priority: 'medium'
    },
    {
      id: 'templates',
      title: { en: 'Manage Inspection Templates', ar: 'إدارة قوالب التفتيش' },
      description: {
        en: 'Create and maintain inspection templates for different types of inspections and audits.',
        ar: 'أنشئ وحافظ على قوالب التفتيش لأنواع مختلفة من عمليات التفتيش والتدقيق.'
      },
      priority: 'medium'
    }
  ],
  incidentWorkflow: [],
  observationWorkflow: [],
  myActionsGuide: [
    {
      tab: 'user_management',
      tabLabel: { en: 'User Management', ar: 'إدارة المستخدمين' },
      description: {
        en: 'Create, edit, and manage user accounts and roles',
        ar: 'إنشاء وتعديل وإدارة حسابات المستخدمين والأدوار'
      },
      actions: [
        { en: 'Send user invitations', ar: 'إرسال دعوات المستخدمين' },
        { en: 'Assign and modify roles', ar: 'تعيين وتعديل الأدوار' },
        { en: 'Bulk import users via CSV', ar: 'استيراد المستخدمين بالجملة عبر CSV' },
        { en: 'Deactivate users', ar: 'إيقاف المستخدمين' }
      ]
    },
    {
      tab: 'system_config',
      tabLabel: { en: 'System Configuration', ar: 'تكوين النظام' },
      description: {
        en: 'Configure system-wide settings',
        ar: 'تكوين الإعدادات على مستوى النظام'
      },
      actions: [
        { en: 'Set up organization structure', ar: 'إعداد الهيكل التنظيمي' },
        { en: 'Configure SLA timelines', ar: 'تكوين جداول اتفاقيات مستوى الخدمة' },
        { en: 'Manage event categories', ar: 'إدارة فئات الأحداث' },
        { en: 'Configure violation settings', ar: 'تكوين إعدادات المخالفات' }
      ]
    },
    {
      tab: 'notifications',
      tabLabel: { en: 'Notifications', ar: 'الإشعارات' },
      description: {
        en: 'Configure notification templates and channels',
        ar: 'تكوين قوالب الإشعارات والقنوات'
      },
      actions: [
        { en: 'Edit notification templates', ar: 'تعديل قوالب الإشعارات' },
        { en: 'Configure WhatsApp settings', ar: 'تكوين إعدادات واتساب' },
        { en: 'View notification delivery logs', ar: 'عرض سجلات تسليم الإشعارات' }
      ]
    }
  ],
  faqs: [
    {
      question: { en: 'How do I invite a new user?', ar: 'كيف أدعو مستخدماً جديداً؟' },
      answer: {
        en: 'Go to User Management → Click "Invite User" → Enter email and name → Select roles → Choose delivery channel → Send invitation. Users will receive a link to complete registration.',
        ar: 'انتقل إلى إدارة المستخدمين ← انقر "دعوة مستخدم" ← أدخل البريد الإلكتروني والاسم ← اختر الأدوار ← اختر قناة التسليم ← أرسل الدعوة. سيتلقى المستخدمون رابطاً لإكمال التسجيل.'
      }
    },
    {
      question: { en: 'How do I change a users role?', ar: 'كيف أغيّر دور المستخدم؟' },
      answer: {
        en: 'Go to User Management → Find the user → Click Edit → Modify roles as needed → Save. Changes take effect immediately.',
        ar: 'انتقل إلى إدارة المستخدمين ← ابحث عن المستخدم ← انقر تعديل ← عدّل الأدوار حسب الحاجة ← احفظ. التغييرات تسري فوراً.'
      }
    },
    {
      question: { en: 'How do I set up SLA escalation?', ar: 'كيف أعد تصعيد اتفاقية مستوى الخدمة؟' },
      answer: {
        en: 'Go to Admin → Action SLA Settings → Set warning days (before due date) and escalation days (after due date) for each priority level. System will automatically send warnings and escalate overdue items.',
        ar: 'انتقل إلى المسؤول ← إعدادات اتفاقية مستوى خدمة الإجراءات ← حدد أيام التحذير (قبل تاريخ الاستحقاق) وأيام التصعيد (بعد تاريخ الاستحقاق) لكل مستوى أولوية. سيرسل النظام تلقائياً تحذيرات ويصعّد العناصر المتأخرة.'
      }
    },
    {
      question: { en: 'How do I add a new department?', ar: 'كيف أضيف قسماً جديداً؟' },
      answer: {
        en: 'Go to Admin → Organization Structure → Select the branch → Click "Add Department" → Enter name and code → Assign a Department Representative → Save.',
        ar: 'انتقل إلى المسؤول ← الهيكل التنظيمي ← اختر الفرع ← انقر "إضافة قسم" ← أدخل الاسم والرمز ← عيّن ممثل القسم ← احفظ.'
      }
    }
  ],
  quickReference: {
    keyPages: [
      { en: 'Admin → User Management', ar: 'المسؤول ← إدارة المستخدمين' },
      { en: 'Admin → Organization Structure', ar: 'المسؤول ← الهيكل التنظيمي' },
      { en: 'Admin → SLA Settings', ar: 'المسؤول ← إعدادات اتفاقيات مستوى الخدمة' },
      { en: 'Admin → Notification Settings', ar: 'المسؤول ← إعدادات الإشعارات' },
      { en: 'Admin → Inspection Templates', ar: 'المسؤول ← قوالب التفتيش' }
    ],
    shortcuts: [
      { en: 'Bulk user import via CSV', ar: 'استيراد المستخدمين بالجملة عبر CSV' }
    ],
    tips: [
      { en: 'Always assign Department Rep when creating departments', ar: 'عيّن دائماً ممثل القسم عند إنشاء الأقسام' },
      { en: 'Test notification templates before going live', ar: 'اختبر قوالب الإشعارات قبل التشغيل' },
      { en: 'Review SLA settings quarterly', ar: 'راجع إعدادات اتفاقيات مستوى الخدمة كل ربع سنة' },
      { en: 'Keep organization structure up to date', ar: 'حافظ على تحديث الهيكل التنظيمي' }
    ]
  }
};
