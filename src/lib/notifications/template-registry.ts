/**
 * TEMPLATE REGISTRY
 *
 * Centralized template resolution for all notification channels.
 * Templates can come from:
 * 1. Database (notification_templates table) — admin-configured
 * 2. Built-in defaults (this file) — fallback templates
 *
 * Template variable syntax: {{variable_name}}
 * All templates support the same variable interpolation.
 */

import type { NotificationTemplate, NotificationChannel } from './types';

// ============================================================================
// BUILT-IN DEFAULT TEMPLATES
// ============================================================================

/**
 * Default templates that ship with the platform.
 * These are used when no admin-configured template exists in the database.
 * Admin templates in notification_templates table ALWAYS take precedence.
 */
const BUILTIN_TEMPLATES: Record<string, NotificationTemplate> = {
  // --- INCIDENTS ---
  incident_created: {
    slug: 'incident_created',
    channels: {
      in_app: {
        titlePattern: 'New Incident Reported: {{reference_id}}',
        titlePatternAr: 'حادثة جديدة: {{reference_id}}',
        bodyPattern: '{{reporter_name}} reported a {{severity}} incident at {{location}}',
        bodyPatternAr: '{{reporter_name}} أبلغ عن حادثة {{severity}} في {{location}}',
      },
      email: {
        subjectPattern: '[{{severity}}] New Incident: {{reference_id}} — {{title}}',
        bodyPattern: 'A new {{severity}} incident has been reported.\n\nReference: {{reference_id}}\nLocation: {{location}}\nReporter: {{reporter_name}}\nDescription: {{description}}\n\nPlease review and take appropriate action.',
      },
      push: {
        titlePattern: 'New Incident: {{reference_id}}',
        bodyPattern: '{{severity}} incident at {{location}}',
        tag: 'incident-{{entity_id}}',
      },
      whatsapp: {
        contentPattern: '*New Incident Report*\nRef: {{reference_id}}\nSeverity: {{severity}}\nLocation: {{location}}\nReporter: {{reporter_name}}\nDescription: {{description}}',
      },
    },
    variableKeys: ['reference_id', 'severity', 'location', 'reporter_name', 'description', 'title', 'entity_id'],
    defaultPriority: 'high',
  },

  incident_assigned: {
    slug: 'incident_assigned',
    channels: {
      in_app: {
        titlePattern: 'Incident Assigned: {{reference_id}}',
        titlePatternAr: 'تم تعيين حادثة: {{reference_id}}',
        bodyPattern: 'You have been assigned to investigate {{reference_id}}',
        bodyPatternAr: 'تم تعيينك للتحقيق في {{reference_id}}',
      },
      email: {
        subjectPattern: 'Action Required: Incident {{reference_id}} assigned to you',
        bodyPattern: 'You have been assigned to incident {{reference_id}}.\n\nTitle: {{title}}\nPriority: {{priority}}\nDue Date: {{due_date}}\n\nPlease take action promptly.',
      },
      push: {
        titlePattern: 'Assigned: {{reference_id}}',
        bodyPattern: 'Incident assigned — {{priority}} priority',
        tag: 'incident-assigned-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'title', 'priority', 'due_date', 'entity_id'],
    defaultPriority: 'high',
  },

  // --- CORRECTIVE ACTIONS ---
  action_assigned: {
    slug: 'action_assigned',
    channels: {
      in_app: {
        titlePattern: 'New Action Assigned: {{action_title}}',
        titlePatternAr: 'إجراء جديد مُعيّن: {{action_title}}',
        bodyPattern: 'Action {{reference_id}} due by {{due_date}} — {{priority}} priority',
        bodyPatternAr: 'الإجراء {{reference_id}} بحلول {{due_date}} — أولوية {{priority}}',
      },
      email: {
        subjectPattern: '[Action Required] {{reference_id}}: {{action_title}}',
        bodyPattern: 'A corrective action has been assigned to you.\n\nReference: {{reference_id}}\nTitle: {{action_title}}\nPriority: {{priority}}\nDue Date: {{due_date}}\nSource: {{source_type}} ({{source_reference}})\n\nPlease start work before the due date.',
      },
      push: {
        titlePattern: 'Action: {{reference_id}}',
        bodyPattern: '{{action_title}} — Due {{due_date}}',
        tag: 'action-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'action_title', 'priority', 'due_date', 'source_type', 'source_reference', 'entity_id'],
    defaultPriority: 'high',
  },

  action_overdue: {
    slug: 'action_overdue',
    channels: {
      in_app: {
        titlePattern: 'OVERDUE: {{reference_id}}',
        titlePatternAr: 'متأخر: {{reference_id}}',
        bodyPattern: '{{action_title}} was due on {{due_date}} ({{days_overdue}} days overdue)',
        bodyPatternAr: '{{action_title}} كان مستحقاً في {{due_date}} (متأخر {{days_overdue}} أيام)',
      },
      email: {
        subjectPattern: '[OVERDUE] Action {{reference_id}} is past due',
        bodyPattern: 'Action {{reference_id}} is {{days_overdue}} days overdue.\n\nTitle: {{action_title}}\nOriginal Due Date: {{due_date}}\nPriority: {{priority}}\n\nImmediate action required.',
      },
      push: {
        titlePattern: 'OVERDUE: {{reference_id}}',
        bodyPattern: '{{days_overdue}} days overdue — {{action_title}}',
        tag: 'action-overdue-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'action_title', 'due_date', 'days_overdue', 'priority', 'entity_id'],
    defaultPriority: 'critical',
  },

  action_returned: {
    slug: 'action_returned',
    channels: {
      in_app: {
        titlePattern: 'Action Returned: {{reference_id}}',
        titlePatternAr: 'إجراء مُعاد: {{reference_id}}',
        bodyPattern: 'Returned for revision: {{return_reason}}',
        bodyPatternAr: 'تم إعادته للمراجعة: {{return_reason}}',
      },
      email: {
        subjectPattern: 'Action {{reference_id}} returned for revision',
        bodyPattern: 'Your action {{reference_id}} has been returned for correction.\n\nReason: {{return_reason}}\nReturned by: {{returned_by}}\n\nPlease revise and resubmit.',
      },
      push: {
        titlePattern: 'Returned: {{reference_id}}',
        bodyPattern: 'Revision needed — {{return_reason}}',
        tag: 'action-returned-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'return_reason', 'returned_by', 'entity_id'],
    defaultPriority: 'high',
  },

  // --- GATE PASSES ---
  gate_pass_requested: {
    slug: 'gate_pass_requested',
    channels: {
      in_app: {
        titlePattern: 'Gate Pass Request: {{pass_type}}',
        titlePatternAr: 'طلب تصريح بوابة: {{pass_type}}',
        bodyPattern: '{{requester_name}} requests a {{pass_type}} gate pass for {{valid_date}}',
        bodyPatternAr: '{{requester_name}} يطلب تصريح {{pass_type}} لتاريخ {{valid_date}}',
      },
      push: {
        titlePattern: 'New Gate Pass Request',
        bodyPattern: '{{pass_type}} pass — {{requester_name}}',
        tag: 'gate-pass-{{entity_id}}',
      },
    },
    variableKeys: ['pass_type', 'requester_name', 'valid_date', 'entity_id'],
    defaultPriority: 'medium',
  },

  gate_pass_approved: {
    slug: 'gate_pass_approved',
    channels: {
      in_app: {
        titlePattern: 'Gate Pass Approved',
        titlePatternAr: 'تمت الموافقة على التصريح',
        bodyPattern: 'Your {{pass_type}} gate pass for {{valid_date}} has been approved',
        bodyPatternAr: 'تمت الموافقة على تصريح {{pass_type}} الخاص بك لتاريخ {{valid_date}}',
      },
      email: {
        subjectPattern: 'Gate Pass Approved — {{pass_type}}',
        bodyPattern: 'Your gate pass has been approved.\n\nType: {{pass_type}}\nValid: {{valid_date}}\nApproved by: {{approver_name}}\n\nPass ID: {{reference_id}}',
      },
      push: {
        titlePattern: 'Pass Approved',
        bodyPattern: '{{pass_type}} pass approved for {{valid_date}}',
        tag: 'gate-pass-approved-{{entity_id}}',
      },
    },
    variableKeys: ['pass_type', 'valid_date', 'approver_name', 'reference_id', 'entity_id'],
    defaultPriority: 'medium',
  },

  // --- INSPECTIONS ---
  inspection_scheduled: {
    slug: 'inspection_scheduled',
    channels: {
      in_app: {
        titlePattern: 'Inspection Scheduled: {{inspection_title}}',
        titlePatternAr: 'تفتيش مجدول: {{inspection_title}}',
        bodyPattern: 'Scheduled for {{scheduled_date}} at {{location}}',
        bodyPatternAr: 'مجدول لتاريخ {{scheduled_date}} في {{location}}',
      },
      push: {
        titlePattern: 'Inspection: {{inspection_title}}',
        bodyPattern: '{{scheduled_date}} — {{location}}',
        tag: 'inspection-{{entity_id}}',
      },
    },
    variableKeys: ['inspection_title', 'scheduled_date', 'location', 'entity_id'],
    defaultPriority: 'medium',
  },

  // --- CONTRACTORS ---
  contractor_approved: {
    slug: 'contractor_approved',
    channels: {
      in_app: {
        titlePattern: 'Contractor Approved: {{company_name}}',
        titlePatternAr: 'تمت الموافقة على المقاول: {{company_name}}',
        bodyPattern: '{{company_name}} has been approved for operations',
        bodyPatternAr: 'تمت الموافقة على {{company_name}} للعمليات',
      },
      email: {
        subjectPattern: 'Contractor Approved: {{company_name}}',
        bodyPattern: 'The contractor {{company_name}} has been approved.\n\nContact: {{contact_name}}\nPhone: {{contact_phone}}\n\nThey may now begin operations.',
      },
      whatsapp: {
        contentPattern: '*Contractor Approved*\nCompany: {{company_name}}\nContact: {{contact_name}}\nStatus: Approved for operations',
      },
    },
    variableKeys: ['company_name', 'contact_name', 'contact_phone'],
    defaultPriority: 'medium',
  },

  // --- SLA ---
  sla_escalated: {
    slug: 'sla_escalated',
    channels: {
      in_app: {
        titlePattern: 'SLA Escalation: {{reference_id}}',
        titlePatternAr: 'تصعيد SLA: {{reference_id}}',
        bodyPattern: '{{entity_type}} {{reference_id}} has been escalated to Level {{escalation_level}}',
        bodyPatternAr: '{{entity_type}} {{reference_id}} تم تصعيده إلى المستوى {{escalation_level}}',
      },
      email: {
        subjectPattern: '[SLA Escalation L{{escalation_level}}] {{reference_id}}',
        bodyPattern: 'An SLA breach has triggered an escalation.\n\nReference: {{reference_id}}\nEntity: {{entity_type}}\nEscalation Level: {{escalation_level}}\nDays Overdue: {{days_overdue}}\n\nImmediate management attention required.',
      },
      push: {
        titlePattern: 'SLA Escalation L{{escalation_level}}',
        bodyPattern: '{{reference_id}} — {{days_overdue}} days overdue',
        tag: 'sla-escalation-{{entity_id}}',
      },
      whatsapp: {
        contentPattern: '*SLA ESCALATION — Level {{escalation_level}}*\nRef: {{reference_id}}\nType: {{entity_type}}\nOverdue: {{days_overdue}} days\nAction required immediately.',
      },
    },
    variableKeys: ['reference_id', 'entity_type', 'escalation_level', 'days_overdue', 'entity_id'],
    defaultPriority: 'critical',
  },

  // --- EMERGENCY ---
  emergency_alert: {
    slug: 'emergency_alert',
    channels: {
      in_app: {
        titlePattern: 'EMERGENCY: {{alert_type}}',
        titlePatternAr: 'طوارئ: {{alert_type}}',
        bodyPattern: '{{description}} — {{location}}',
        bodyPatternAr: '{{description}} — {{location}}',
      },
      push: {
        titlePattern: 'EMERGENCY: {{alert_type}}',
        bodyPattern: '{{description}} at {{location}}',
        icon: '/emergency-icon.png',
        tag: 'emergency-{{entity_id}}',
      },
      whatsapp: {
        contentPattern: '*EMERGENCY ALERT*\nType: {{alert_type}}\nLocation: {{location}}\nDescription: {{description}}\nPriority: {{priority}}\n\nRespond immediately.',
      },
    },
    variableKeys: ['alert_type', 'description', 'location', 'priority', 'entity_id'],
    defaultPriority: 'critical',
  },

  // --- APPROVALS ---
  approval_requested: {
    slug: 'approval_requested',
    channels: {
      in_app: {
        titlePattern: 'Approval Required: {{approval_type}}',
        titlePatternAr: 'مطلوب موافقة: {{approval_type}}',
        bodyPattern: '{{requester_name}} requests approval for {{item_reference}}',
        bodyPatternAr: '{{requester_name}} يطلب الموافقة على {{item_reference}}',
      },
      push: {
        titlePattern: 'Approval Needed',
        bodyPattern: '{{approval_type}} — {{item_reference}}',
        tag: 'approval-{{entity_id}}',
      },
    },
    variableKeys: ['approval_type', 'requester_name', 'item_reference', 'entity_id'],
    defaultPriority: 'medium',
  },
};

// ============================================================================
// TEMPLATE RESOLUTION
// ============================================================================

/**
 * Resolves a template by slug, with database override.
 * Priority: DB template > Built-in template > Generic fallback
 *
 * @param slug - Template slug (e.g., 'incident_created')
 * @param dbTemplates - Optional cached DB templates (from notification_templates table)
 */
export function resolveTemplate(
  slug: string,
  dbTemplates?: Map<string, NotificationTemplate>
): NotificationTemplate | null {
  // 1. Check database templates (admin-configured)
  if (dbTemplates?.has(slug)) {
    return dbTemplates.get(slug)!;
  }

  // 2. Try base slug (strip channel suffix like _in_app, _email)
  const baseSlug = slug.replace(/_(in_app|email|whatsapp|push)$/, '');
  if (dbTemplates?.has(baseSlug)) {
    return dbTemplates.get(baseSlug)!;
  }

  // 3. Check built-in templates
  if (BUILTIN_TEMPLATES[slug]) {
    return BUILTIN_TEMPLATES[slug];
  }
  if (BUILTIN_TEMPLATES[baseSlug]) {
    return BUILTIN_TEMPLATES[baseSlug];
  }

  return null;
}

/**
 * Renders a template pattern by replacing {{variable}} placeholders with values.
 */
export function renderTemplate(pattern: string, variables: Record<string, string>): string {
  return pattern.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}

/**
 * Renders all channel-specific content from a template.
 */
export function renderTemplateForChannel(
  template: NotificationTemplate,
  channel: NotificationChannel,
  variables: Record<string, string>,
  language: string = 'en'
): { title?: string; body?: string; subject?: string } | null {
  const channelConfig = template.channels[channel];
  if (!channelConfig) return null;

  const isArabic = language === 'ar';

  switch (channel) {
    case 'in_app': {
      const cfg = channelConfig as NonNullable<NotificationTemplate['channels']['in_app']>;
      return {
        title: renderTemplate(
          (isArabic && cfg.titlePatternAr) ? cfg.titlePatternAr : cfg.titlePattern,
          variables
        ),
        body: renderTemplate(
          (isArabic && cfg.bodyPatternAr) ? cfg.bodyPatternAr : cfg.bodyPattern,
          variables
        ),
      };
    }
    case 'email': {
      const cfg = channelConfig as NonNullable<NotificationTemplate['channels']['email']>;
      return {
        subject: renderTemplate(cfg.subjectPattern, variables),
        body: renderTemplate(cfg.bodyPattern, variables),
      };
    }
    case 'whatsapp': {
      const cfg = channelConfig as NonNullable<NotificationTemplate['channels']['whatsapp']>;
      return {
        body: renderTemplate(cfg.contentPattern, variables),
      };
    }
    case 'push': {
      const cfg = channelConfig as NonNullable<NotificationTemplate['channels']['push']>;
      return {
        title: renderTemplate(cfg.titlePattern, variables),
        body: renderTemplate(cfg.bodyPattern, variables),
      };
    }
    default:
      return null;
  }
}

/**
 * Gets all built-in template slugs (for admin UI display).
 */
export function getBuiltinTemplateSlugs(): string[] {
  return Object.keys(BUILTIN_TEMPLATES);
}

/**
 * Gets a built-in template for inspection/preview.
 */
export function getBuiltinTemplate(slug: string): NotificationTemplate | undefined {
  return BUILTIN_TEMPLATES[slug];
}
