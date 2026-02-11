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
      whatsapp: {
        contentPattern: '*Incident Assigned to You*\nRef: {{reference_id}}\nTitle: {{title}}\nPriority: {{priority}}\nDue: {{due_date}}\n\nPlease take action promptly.',
      },
    },
    variableKeys: ['reference_id', 'title', 'priority', 'due_date', 'entity_id'],
    defaultPriority: 'high',
  },

  incident_status_changed: {
    slug: 'incident_status_changed',
    channels: {
      in_app: {
        titlePattern: 'Incident Updated: {{reference_id}}',
        titlePatternAr: 'تحديث حادثة: {{reference_id}}',
        bodyPattern: '{{reference_id}} status changed to {{new_status}}',
        bodyPatternAr: '{{reference_id}} تم تغيير الحالة إلى {{new_status}}',
      },
      push: {
        titlePattern: 'Update: {{reference_id}}',
        bodyPattern: 'Status: {{new_status}}',
        tag: 'incident-status-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'new_status', 'entity_id'],
    defaultPriority: 'medium',
  },

  incident_closed: {
    slug: 'incident_closed',
    channels: {
      in_app: {
        titlePattern: 'Incident Closed: {{reference_id}}',
        titlePatternAr: 'تم إغلاق الحادثة: {{reference_id}}',
        bodyPattern: '{{reference_id}} has been closed. {{closure_notes}}',
        bodyPatternAr: 'تم إغلاق {{reference_id}}. {{closure_notes}}',
      },
      push: {
        titlePattern: 'Closed: {{reference_id}}',
        bodyPattern: 'Incident {{reference_id}} resolved',
        tag: 'incident-closed-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'closure_notes', 'entity_id'],
    defaultPriority: 'low',
  },

  incident_escalated: {
    slug: 'incident_escalated',
    channels: {
      in_app: {
        titlePattern: 'ESCALATED: {{reference_id}}',
        titlePatternAr: 'تصعيد: {{reference_id}}',
        bodyPattern: '{{reference_id}} escalated to {{escalation_target}} — {{severity}}',
        bodyPatternAr: '{{reference_id}} تم تصعيده إلى {{escalation_target}} — {{severity}}',
      },
      email: {
        subjectPattern: '[ESCALATION] Incident {{reference_id}} — {{severity}}',
        bodyPattern: 'Incident {{reference_id}} has been escalated.\n\nTitle: {{title}}\nSeverity: {{severity}}\nEscalated to: {{escalation_target}}\nReason: {{escalation_reason}}\n\nImmediate attention required.',
      },
      push: {
        titlePattern: 'ESCALATED: {{reference_id}}',
        bodyPattern: '{{severity}} — escalated to {{escalation_target}}',
        tag: 'incident-escalated-{{entity_id}}',
      },
      whatsapp: {
        contentPattern: '*INCIDENT ESCALATED*\nRef: {{reference_id}}\nSeverity: {{severity}}\nTitle: {{title}}\nEscalated to: {{escalation_target}}\n\nImmediate attention required.',
      },
    },
    variableKeys: ['reference_id', 'title', 'severity', 'escalation_target', 'escalation_reason', 'entity_id'],
    defaultPriority: 'critical',
  },

  incident_rejected: {
    slug: 'incident_rejected',
    channels: {
      in_app: {
        titlePattern: 'Incident Rejected: {{reference_id}}',
        titlePatternAr: 'تم رفض الحادثة: {{reference_id}}',
        bodyPattern: '{{reference_id}} was rejected. Reason: {{rejection_reason}}',
        bodyPatternAr: 'تم رفض {{reference_id}}. السبب: {{rejection_reason}}',
      },
      email: {
        subjectPattern: 'Incident Rejected: {{reference_id}}',
        bodyPattern: 'Incident {{reference_id}} has been rejected.\n\nTitle: {{title}}\nRejected by: {{rejected_by}}\nReason: {{rejection_reason}}',
      },
      push: {
        titlePattern: 'Rejected: {{reference_id}}',
        bodyPattern: '{{rejection_reason}}',
        tag: 'incident-rejected-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'title', 'rejected_by', 'rejection_reason', 'entity_id'],
    defaultPriority: 'medium',
  },

  incident_investigation_started: {
    slug: 'incident_investigation_started',
    channels: {
      in_app: {
        titlePattern: 'Investigation Started: {{reference_id}}',
        titlePatternAr: 'بدأ التحقيق: {{reference_id}}',
        bodyPattern: 'Investigation for {{reference_id}} has been initiated by {{investigator_name}}',
        bodyPatternAr: 'بدأ التحقيق في {{reference_id}} بواسطة {{investigator_name}}',
      },
      push: {
        titlePattern: 'Investigation: {{reference_id}}',
        bodyPattern: 'Investigation started by {{investigator_name}}',
        tag: 'incident-investigation-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'investigator_name', 'entity_id'],
    defaultPriority: 'medium',
  },

  incident_investigation_completed: {
    slug: 'incident_investigation_completed',
    channels: {
      in_app: {
        titlePattern: 'Investigation Complete: {{reference_id}}',
        titlePatternAr: 'اكتمل التحقيق: {{reference_id}}',
        bodyPattern: 'Investigation for {{reference_id}} is complete. Pending review.',
        bodyPatternAr: 'اكتمل التحقيق في {{reference_id}}. في انتظار المراجعة.',
      },
      email: {
        subjectPattern: 'Investigation Complete: {{reference_id}}',
        bodyPattern: 'The investigation for incident {{reference_id}} has been completed.\n\nTitle: {{title}}\nInvestigator: {{investigator_name}}\n\nPlease review the findings.',
      },
      push: {
        titlePattern: 'Investigation Done: {{reference_id}}',
        bodyPattern: 'Pending review',
        tag: 'incident-investigation-done-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'title', 'investigator_name', 'entity_id'],
    defaultPriority: 'medium',
  },

  // --- OBSERVATIONS ---
  observation_created: {
    slug: 'observation_created',
    channels: {
      in_app: {
        titlePattern: 'New Observation: {{reference_id}}',
        titlePatternAr: 'ملاحظة جديدة: {{reference_id}}',
        bodyPattern: '{{reporter_name}} reported an observation at {{location}}',
        bodyPatternAr: '{{reporter_name}} أبلغ عن ملاحظة في {{location}}',
      },
      push: {
        titlePattern: 'Observation: {{reference_id}}',
        bodyPattern: '{{observation_type}} at {{location}}',
        tag: 'observation-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'reporter_name', 'location', 'observation_type', 'entity_id'],
    defaultPriority: 'medium',
  },

  observation_assigned: {
    slug: 'observation_assigned',
    channels: {
      in_app: {
        titlePattern: 'Observation Assigned: {{reference_id}}',
        titlePatternAr: 'تم تعيين ملاحظة: {{reference_id}}',
        bodyPattern: 'You have been assigned to review observation {{reference_id}}',
        bodyPatternAr: 'تم تعيينك لمراجعة الملاحظة {{reference_id}}',
      },
      email: {
        subjectPattern: 'Action Required: Observation {{reference_id}} assigned to you',
        bodyPattern: 'You have been assigned to review observation {{reference_id}}.\n\nType: {{observation_type}}\nLocation: {{location}}\nReported by: {{reporter_name}}\n\nPlease review and take action.',
      },
      push: {
        titlePattern: 'Assigned: {{reference_id}}',
        bodyPattern: 'Observation assigned for review',
        tag: 'observation-assigned-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'observation_type', 'location', 'reporter_name', 'entity_id'],
    defaultPriority: 'medium',
  },

  observation_escalated: {
    slug: 'observation_escalated',
    channels: {
      in_app: {
        titlePattern: 'Observation Escalated: {{reference_id}}',
        titlePatternAr: 'تصعيد ملاحظة: {{reference_id}}',
        bodyPattern: '{{reference_id}} escalated to {{escalation_target}}',
        bodyPatternAr: '{{reference_id}} تم تصعيده إلى {{escalation_target}}',
      },
      email: {
        subjectPattern: '[Escalation] Observation {{reference_id}}',
        bodyPattern: 'Observation {{reference_id}} has been escalated.\n\nType: {{observation_type}}\nLocation: {{location}}\nEscalated to: {{escalation_target}}\n\nPlease review promptly.',
      },
      push: {
        titlePattern: 'Escalated: {{reference_id}}',
        bodyPattern: 'Observation escalated to {{escalation_target}}',
        tag: 'observation-escalated-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'observation_type', 'location', 'escalation_target', 'entity_id'],
    defaultPriority: 'high',
  },

  observation_closed: {
    slug: 'observation_closed',
    channels: {
      in_app: {
        titlePattern: 'Observation Closed: {{reference_id}}',
        titlePatternAr: 'تم إغلاق الملاحظة: {{reference_id}}',
        bodyPattern: 'Observation {{reference_id}} has been closed',
        bodyPatternAr: 'تم إغلاق الملاحظة {{reference_id}}',
      },
    },
    variableKeys: ['reference_id', 'entity_id'],
    defaultPriority: 'low',
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

  action_started: {
    slug: 'action_started',
    channels: {
      in_app: {
        titlePattern: 'Action Started: {{reference_id}}',
        titlePatternAr: 'بدأ الإجراء: {{reference_id}}',
        bodyPattern: '{{action_title}} is now in progress',
        bodyPatternAr: '{{action_title}} قيد التنفيذ الآن',
      },
    },
    variableKeys: ['reference_id', 'action_title', 'entity_id'],
    defaultPriority: 'low',
  },

  action_completed: {
    slug: 'action_completed',
    channels: {
      in_app: {
        titlePattern: 'Action Completed: {{reference_id}}',
        titlePatternAr: 'اكتمل الإجراء: {{reference_id}}',
        bodyPattern: '{{action_title}} completed — pending verification',
        bodyPatternAr: '{{action_title}} مكتمل — في انتظار التحقق',
      },
      push: {
        titlePattern: 'Completed: {{reference_id}}',
        bodyPattern: '{{action_title}} — awaiting verification',
        tag: 'action-completed-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'action_title', 'entity_id'],
    defaultPriority: 'medium',
  },

  action_verified: {
    slug: 'action_verified',
    channels: {
      in_app: {
        titlePattern: 'Action Verified: {{reference_id}}',
        titlePatternAr: 'تم التحقق من الإجراء: {{reference_id}}',
        bodyPattern: '{{action_title}} has been verified by {{verifier_name}}',
        bodyPatternAr: 'تم التحقق من {{action_title}} بواسطة {{verifier_name}}',
      },
      push: {
        titlePattern: 'Verified: {{reference_id}}',
        bodyPattern: '{{action_title}} verified',
        tag: 'action-verified-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'action_title', 'verifier_name', 'entity_id'],
    defaultPriority: 'medium',
  },

  action_closed: {
    slug: 'action_closed',
    channels: {
      in_app: {
        titlePattern: 'Action Closed: {{reference_id}}',
        titlePatternAr: 'تم إغلاق الإجراء: {{reference_id}}',
        bodyPattern: '{{action_title}} has been closed',
        bodyPatternAr: 'تم إغلاق {{action_title}}',
      },
      push: {
        titlePattern: 'Closed: {{reference_id}}',
        bodyPattern: '{{action_title}} closed',
        tag: 'action-closed-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'action_title', 'entity_id'],
    defaultPriority: 'low',
  },

  action_extension_requested: {
    slug: 'action_extension_requested',
    channels: {
      in_app: {
        titlePattern: 'Extension Requested: {{reference_id}}',
        titlePatternAr: 'طلب تمديد: {{reference_id}}',
        bodyPattern: '{{requester_name}} requested a deadline extension for {{action_title}}',
        bodyPatternAr: '{{requester_name}} طلب تمديد الموعد النهائي لـ {{action_title}}',
      },
      push: {
        titlePattern: 'Extension: {{reference_id}}',
        bodyPattern: 'Extension requested for {{action_title}}',
        tag: 'action-extension-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'action_title', 'requester_name', 'new_due_date', 'entity_id'],
    defaultPriority: 'medium',
  },

  action_extension_approved: {
    slug: 'action_extension_approved',
    channels: {
      in_app: {
        titlePattern: 'Extension Approved: {{reference_id}}',
        titlePatternAr: 'تمت الموافقة على التمديد: {{reference_id}}',
        bodyPattern: 'New deadline: {{new_due_date}}',
        bodyPatternAr: 'الموعد الجديد: {{new_due_date}}',
      },
      push: {
        titlePattern: 'Approved: {{reference_id}}',
        bodyPattern: 'Extension approved — new due date: {{new_due_date}}',
        tag: 'action-extension-approved-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'new_due_date', 'entity_id'],
    defaultPriority: 'medium',
  },

  action_extension_rejected: {
    slug: 'action_extension_rejected',
    channels: {
      in_app: {
        titlePattern: 'Extension Denied: {{reference_id}}',
        titlePatternAr: 'تم رفض التمديد: {{reference_id}}',
        bodyPattern: 'Extension request denied. Original deadline: {{due_date}}',
        bodyPatternAr: 'تم رفض طلب التمديد. الموعد الأصلي: {{due_date}}',
      },
      push: {
        titlePattern: 'Denied: {{reference_id}}',
        bodyPattern: 'Extension denied — due: {{due_date}}',
        tag: 'action-extension-denied-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'due_date', 'entity_id'],
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

  gate_pass_rejected: {
    slug: 'gate_pass_rejected',
    channels: {
      in_app: {
        titlePattern: 'Gate Pass Rejected',
        titlePatternAr: 'تم رفض التصريح',
        bodyPattern: 'Your {{pass_type}} gate pass has been rejected. Reason: {{rejection_reason}}',
        bodyPatternAr: 'تم رفض تصريح {{pass_type}} الخاص بك. السبب: {{rejection_reason}}',
      },
      email: {
        subjectPattern: 'Gate Pass Rejected — {{reference_id}}',
        bodyPattern: 'Your gate pass request has been rejected.\n\nReference: {{reference_id}}\nType: {{pass_type}}\nReason: {{rejection_reason}}\n\nYou may submit a new request if needed.',
      },
      push: {
        titlePattern: 'Pass Rejected',
        bodyPattern: '{{pass_type}} pass rejected',
        tag: 'gate-pass-rejected-{{entity_id}}',
      },
      whatsapp: {
        contentPattern: '*Gate Pass Rejected*\nRef: {{reference_id}}\nType: {{pass_type}}\nReason: {{rejection_reason}}\n\nYou may submit a new request.',
      },
    },
    variableKeys: ['pass_type', 'reference_id', 'rejection_reason', 'entity_id'],
    defaultPriority: 'medium',
  },

  gate_pass_checked_in: {
    slug: 'gate_pass_checked_in',
    channels: {
      in_app: {
        titlePattern: 'Gate Pass Entry: {{reference_id}}',
        titlePatternAr: 'دخول التصريح: {{reference_id}}',
        bodyPattern: '{{holder_name}} checked in with pass {{reference_id}}',
        bodyPatternAr: '{{holder_name}} دخل بالتصريح {{reference_id}}',
      },
      push: {
        titlePattern: 'Entry: {{reference_id}}',
        bodyPattern: '{{holder_name}} checked in',
        tag: 'gate-pass-entry-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'holder_name', 'entity_id'],
    defaultPriority: 'low',
  },

  gate_pass_checked_out: {
    slug: 'gate_pass_checked_out',
    channels: {
      in_app: {
        titlePattern: 'Gate Pass Exit: {{reference_id}}',
        titlePatternAr: 'خروج التصريح: {{reference_id}}',
        bodyPattern: '{{holder_name}} checked out with pass {{reference_id}}',
        bodyPatternAr: '{{holder_name}} خرج بالتصريح {{reference_id}}',
      },
      push: {
        titlePattern: 'Exit: {{reference_id}}',
        bodyPattern: '{{holder_name}} checked out',
        tag: 'gate-pass-exit-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'holder_name', 'entity_id'],
    defaultPriority: 'low',
  },

  gate_pass_expired: {
    slug: 'gate_pass_expired',
    channels: {
      in_app: {
        titlePattern: 'Gate Pass Expired: {{reference_id}}',
        titlePatternAr: 'انتهى التصريح: {{reference_id}}',
        bodyPattern: 'Your {{pass_type}} gate pass has expired',
        bodyPatternAr: 'انتهت صلاحية تصريح {{pass_type}} الخاص بك',
      },
      push: {
        titlePattern: 'Expired: {{reference_id}}',
        bodyPattern: '{{pass_type}} pass expired',
        tag: 'gate-pass-expired-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'pass_type', 'entity_id'],
    defaultPriority: 'low',
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

  emergency_acknowledged: {
    slug: 'emergency_acknowledged',
    channels: {
      in_app: {
        titlePattern: 'Emergency Acknowledged: {{alert_type}}',
        titlePatternAr: 'تم الإقرار بالطوارئ: {{alert_type}}',
        bodyPattern: '{{responder_name}} acknowledged the {{alert_type}} alert at {{location}}',
        bodyPatternAr: '{{responder_name}} أقر بإنذار {{alert_type}} في {{location}}',
      },
    },
    variableKeys: ['alert_type', 'responder_name', 'location', 'entity_id'],
    defaultPriority: 'high',
  },

  emergency_escalated: {
    slug: 'emergency_escalated',
    channels: {
      in_app: {
        titlePattern: 'EMERGENCY ESCALATED: {{alert_type}}',
        titlePatternAr: 'تصعيد طوارئ: {{alert_type}}',
        bodyPattern: 'Emergency {{alert_type}} at {{location}} escalated to {{escalation_target}}',
        bodyPatternAr: 'تم تصعيد طوارئ {{alert_type}} في {{location}} إلى {{escalation_target}}',
      },
      email: {
        subjectPattern: '[EMERGENCY ESCALATION] {{alert_type}} — {{location}}',
        bodyPattern: 'An emergency alert has been escalated.\n\nType: {{alert_type}}\nLocation: {{location}}\nEscalated to: {{escalation_target}}\nDescription: {{description}}\n\nImmediate response required.',
      },
      push: {
        titlePattern: 'ESCALATED: {{alert_type}}',
        bodyPattern: '{{location}} — escalated to {{escalation_target}}',
        icon: '/emergency-icon.png',
        tag: 'emergency-escalated-{{entity_id}}',
      },
      whatsapp: {
        contentPattern: '*EMERGENCY ESCALATION*\nType: {{alert_type}}\nLocation: {{location}}\nEscalated to: {{escalation_target}}\nDescription: {{description}}\n\nImmediate response required.',
      },
    },
    variableKeys: ['alert_type', 'location', 'escalation_target', 'description', 'entity_id'],
    defaultPriority: 'critical',
  },

  emergency_closed: {
    slug: 'emergency_closed',
    channels: {
      in_app: {
        titlePattern: 'Emergency Resolved: {{alert_type}}',
        titlePatternAr: 'تم حل الطوارئ: {{alert_type}}',
        bodyPattern: '{{alert_type}} at {{location}} has been resolved',
        bodyPatternAr: 'تم حل {{alert_type}} في {{location}}',
      },
      push: {
        titlePattern: 'Resolved: {{alert_type}}',
        bodyPattern: 'Emergency at {{location}} resolved',
        tag: 'emergency-closed-{{entity_id}}',
      },
    },
    variableKeys: ['alert_type', 'location', 'entity_id'],
    defaultPriority: 'medium',
  },

  // --- SLA ---
  sla_warning: {
    slug: 'sla_warning',
    channels: {
      in_app: {
        titlePattern: 'SLA Warning: {{reference_id}}',
        titlePatternAr: 'تحذير SLA: {{reference_id}}',
        bodyPattern: '{{entity_type}} {{reference_id}} is approaching SLA deadline',
        bodyPatternAr: '{{entity_type}} {{reference_id}} يقترب من الموعد النهائي',
      },
      push: {
        titlePattern: 'SLA Warning',
        bodyPattern: '{{reference_id}} due soon',
        tag: 'sla-warning-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'entity_type', 'days_remaining', 'entity_id'],
    defaultPriority: 'high',
  },

  sla_overdue: {
    slug: 'sla_overdue',
    channels: {
      in_app: {
        titlePattern: 'SLA Overdue: {{reference_id}}',
        titlePatternAr: 'تجاوز SLA: {{reference_id}}',
        bodyPattern: '{{entity_type}} {{reference_id}} is {{days_overdue}} days overdue',
        bodyPatternAr: '{{entity_type}} {{reference_id}} متأخر {{days_overdue}} أيام',
      },
      email: {
        subjectPattern: '[SLA OVERDUE] {{reference_id}} — {{days_overdue}} days',
        bodyPattern: 'An SLA deadline has been breached.\n\nReference: {{reference_id}}\nType: {{entity_type}}\nDays Overdue: {{days_overdue}}\n\nPlease take immediate action.',
      },
      push: {
        titlePattern: 'OVERDUE: {{reference_id}}',
        bodyPattern: '{{days_overdue}} days overdue',
        tag: 'sla-overdue-{{entity_id}}',
      },
    },
    variableKeys: ['reference_id', 'entity_type', 'days_overdue', 'entity_id'],
    defaultPriority: 'high',
  },

  // --- HSSE BROADCAST ---
  hsse_broadcast: {
    slug: 'hsse_broadcast',
    channels: {
      in_app: {
        titlePattern: '{{category}}: {{title}}',
        titlePatternAr: '{{category}}: {{title_ar}}',
        bodyPattern: '{{body}}',
        bodyPatternAr: '{{body_ar}}',
      },
      email: {
        subjectPattern: '[{{priority}}] {{category}}: {{title}}',
        bodyPattern: '{{body}}\n\nCategory: {{category}}\nPriority: {{priority}}',
      },
      push: {
        titlePattern: '{{category}}',
        bodyPattern: '{{title}}',
        tag: 'hsse-{{entity_id}}',
      },
    },
    variableKeys: ['title', 'title_ar', 'body', 'body_ar', 'category', 'priority', 'entity_id'],
    defaultPriority: 'medium',
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

  approval_granted: {
    slug: 'approval_granted',
    channels: {
      in_app: {
        titlePattern: 'Approved: {{approval_type}}',
        titlePatternAr: 'تمت الموافقة: {{approval_type}}',
        bodyPattern: '{{item_reference}} has been approved by {{approver_name}}',
        bodyPatternAr: 'تمت الموافقة على {{item_reference}} بواسطة {{approver_name}}',
      },
      push: {
        titlePattern: 'Approved',
        bodyPattern: '{{approval_type}} — {{item_reference}} approved',
        tag: 'approval-granted-{{entity_id}}',
      },
    },
    variableKeys: ['approval_type', 'item_reference', 'approver_name', 'entity_id'],
    defaultPriority: 'medium',
  },

  approval_denied: {
    slug: 'approval_denied',
    channels: {
      in_app: {
        titlePattern: 'Denied: {{approval_type}}',
        titlePatternAr: 'تم الرفض: {{approval_type}}',
        bodyPattern: '{{item_reference}} has been denied. Reason: {{denial_reason}}',
        bodyPatternAr: 'تم رفض {{item_reference}}. السبب: {{denial_reason}}',
      },
      push: {
        titlePattern: 'Denied',
        bodyPattern: '{{approval_type}} — {{item_reference}} denied',
        tag: 'approval-denied-{{entity_id}}',
      },
    },
    variableKeys: ['approval_type', 'item_reference', 'denial_reason', 'entity_id'],
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
