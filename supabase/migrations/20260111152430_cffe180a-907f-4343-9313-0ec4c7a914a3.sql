-- Insert email notification templates for contractor workflow (12 templates: 6 types x 2 languages)

-- Company Approved (English)
INSERT INTO notification_templates (
  tenant_id, slug, content_pattern, variable_keys, 
  category, language, channel_type, email_subject, is_active, meta_template_name
) VALUES
(
  (SELECT id FROM tenants LIMIT 1),
  'company_approved_en',
  '✅ Company Registration Approved

Dear Contractor,

Your company {{1}} has been approved by {{2}} on {{3}}.

You can now:
• Add workers for site access
• Submit gate pass requests
• Manage your company profile

Login to your portal: {{4}}

Best regards,
HSSE Management Team',
  ARRAY['company_name', 'approved_by', 'approval_date', 'login_url'],
  'contractors',
  'en',
  'both',
  'Company Registration Approved - {{1}}',
  true,
  'Company Approved (English)'
),
-- Company Approved (Arabic)
(
  (SELECT id FROM tenants LIMIT 1),
  'company_approved_ar',
  '✅ تمت الموافقة على تسجيل الشركة

عزيزي المقاول،

تمت الموافقة على شركتك {{1}} من قبل {{2}} بتاريخ {{3}}.

يمكنك الآن:
• إضافة عمال للوصول إلى الموقع
• تقديم طلبات تصاريح المرور
• إدارة ملف شركتك

تسجيل الدخول إلى البوابة: {{4}}

مع أطيب التحيات،
فريق إدارة الصحة والسلامة والأمن والبيئة',
  ARRAY['company_name', 'approved_by', 'approval_date', 'login_url'],
  'contractors',
  'ar',
  'both',
  'تمت الموافقة على تسجيل الشركة - {{1}}',
  true,
  'Company Approved (Arabic)'
),
-- Company Rejected (English)
(
  (SELECT id FROM tenants LIMIT 1),
  'company_rejected_en',
  '❌ Company Registration Not Approved

Dear Contractor,

Your company registration for {{1}} was not approved by the HSSE Manager.

Reason: {{2}}

Please address the concerns and resubmit your application.

Reviewer: {{3}}
Date: {{4}}

Resubmit here: {{5}}

If you have questions, please contact your HSSE representative.',
  ARRAY['company_name', 'rejection_reason', 'rejected_by', 'rejection_date', 'resubmit_url'],
  'contractors',
  'en',
  'both',
  'Company Registration Requires Attention - {{1}}',
  true,
  'Company Rejected (English)'
),
-- Company Rejected (Arabic)
(
  (SELECT id FROM tenants LIMIT 1),
  'company_rejected_ar',
  '❌ لم تتم الموافقة على تسجيل الشركة

عزيزي المقاول،

لم تتم الموافقة على تسجيل شركتك {{1}} من قبل مدير الصحة والسلامة.

السبب: {{2}}

يرجى معالجة المخاوف وإعادة تقديم طلبك.

المراجع: {{3}}
التاريخ: {{4}}

إعادة التقديم هنا: {{5}}

إذا كانت لديك أسئلة، يرجى التواصل مع ممثل الصحة والسلامة.',
  ARRAY['company_name', 'rejection_reason', 'rejected_by', 'rejection_date', 'resubmit_url'],
  'contractors',
  'ar',
  'both',
  'تسجيل الشركة يحتاج إلى مراجعة - {{1}}',
  true,
  'Company Rejected (Arabic)'
),
-- Worker Stage 1 Approved (English)
(
  (SELECT id FROM tenants LIMIT 1),
  'worker_stage1_approved_en',
  '🔄 Worker Approved - Security Review Pending

Dear Contractor,

{{1}} from {{2}} has been approved by the Contractor Administrator.

Approved by: {{3}}
Date: {{4}}

Next Step: Security supervisor review is now in progress.
You will be notified once security approval is complete.

Thank you for your patience.',
  ARRAY['worker_name', 'company_name', 'approved_by', 'approval_date'],
  'contractors',
  'en',
  'both',
  'Worker Approved - Pending Security Review - {{1}}',
  true,
  'Worker Stage 1 Approved (English)'
),
-- Worker Stage 1 Approved (Arabic)
(
  (SELECT id FROM tenants LIMIT 1),
  'worker_stage1_approved_ar',
  '🔄 تمت الموافقة على العامل - في انتظار المراجعة الأمنية

عزيزي المقاول،

تمت الموافقة على {{1}} من {{2}} من قبل مسؤول المقاولين.

تمت الموافقة من قبل: {{3}}
التاريخ: {{4}}

الخطوة التالية: مراجعة المشرف الأمني جارية الآن.
سيتم إخطارك بمجرد اكتمال الموافقة الأمنية.

شكراً لصبرك.',
  ARRAY['worker_name', 'company_name', 'approved_by', 'approval_date'],
  'contractors',
  'ar',
  'both',
  'تمت الموافقة على العامل - في انتظار المراجعة الأمنية - {{1}}',
  true,
  'Worker Stage 1 Approved (Arabic)'
),
-- Worker Security Approved (English)
(
  (SELECT id FROM tenants LIMIT 1),
  'worker_security_approved_en',
  '✅ Worker Approved - Site Access Granted

Dear Contractor,

{{1}} from {{2}} has received full security approval and is now authorized for site access.

Security Approved by: {{3}}
Approval Date: {{4}}
Access Starts: {{5}}

Safety Induction: A safety induction video has been sent to the worker''s mobile phone.

The worker can now present their QR code at the gate for entry.

Important: Workers must complete the safety induction before site access.',
  ARRAY['worker_name', 'company_name', 'approved_by', 'approval_date', 'access_date'],
  'contractors',
  'en',
  'both',
  'Worker Fully Approved for Site Access - {{1}}',
  true,
  'Worker Security Approved (English)'
),
-- Worker Security Approved (Arabic)
(
  (SELECT id FROM tenants LIMIT 1),
  'worker_security_approved_ar',
  '✅ تمت الموافقة على العامل - تم منح الوصول للموقع

عزيزي المقاول،

حصل {{1}} من {{2}} على الموافقة الأمنية الكاملة وهو مخول الآن للوصول إلى الموقع.

تمت الموافقة الأمنية من قبل: {{3}}
تاريخ الموافقة: {{4}}
يبدأ الوصول: {{5}}

التعريف بالسلامة: تم إرسال فيديو التعريف بالسلامة إلى هاتف العامل المحمول.

يمكن للعامل الآن تقديم رمز QR الخاص به عند البوابة للدخول.

هام: يجب على العمال إكمال التعريف بالسلامة قبل الوصول إلى الموقع.',
  ARRAY['worker_name', 'company_name', 'approved_by', 'approval_date', 'access_date'],
  'contractors',
  'ar',
  'both',
  'تمت الموافقة الكاملة على العامل للوصول للموقع - {{1}}',
  true,
  'Worker Security Approved (Arabic)'
),
-- Worker Rejected (English)
(
  (SELECT id FROM tenants LIMIT 1),
  'worker_rejected_en',
  '❌ Worker Application Not Approved

Dear Contractor,

The application for {{1}} from {{2}} has not been approved.

Stage: {{3}}
Rejected by: {{4}}
Date: {{5}}

Reason: {{6}}

Please address the concerns and resubmit the worker application if needed.

If you have questions, please contact your site representative.',
  ARRAY['worker_name', 'company_name', 'stage', 'rejected_by', 'rejection_date', 'rejection_reason'],
  'contractors',
  'en',
  'both',
  'Worker Application Not Approved - {{1}}',
  true,
  'Worker Rejected (English)'
),
-- Worker Rejected (Arabic)
(
  (SELECT id FROM tenants LIMIT 1),
  'worker_rejected_ar',
  '❌ لم تتم الموافقة على طلب العامل

عزيزي المقاول،

لم تتم الموافقة على طلب {{1}} من {{2}}.

المرحلة: {{3}}
تم الرفض من قبل: {{4}}
التاريخ: {{5}}

السبب: {{6}}

يرجى معالجة المخاوف وإعادة تقديم طلب العامل إذا لزم الأمر.

إذا كانت لديك أسئلة، يرجى التواصل مع ممثل الموقع.',
  ARRAY['worker_name', 'company_name', 'stage', 'rejected_by', 'rejection_date', 'rejection_reason'],
  'contractors',
  'ar',
  'both',
  'لم تتم الموافقة على طلب العامل - {{1}}',
  true,
  'Worker Rejected (Arabic)'
),
-- Worker Security Returned (English)
(
  (SELECT id FROM tenants LIMIT 1),
  'worker_security_returned_en',
  '🔄 Worker Application Returned - Security Review

Dear Contractor,

The application for {{1}} from {{2}} has been returned by security with comments.

Reviewed by: {{3}}
Date: {{4}}

Security Comments: {{5}}

Action Required: Please address the security concerns and resubmit the worker application. The worker will need to go through the approval process again.

Contact your site representative if you need clarification.',
  ARRAY['worker_name', 'company_name', 'reviewer_name', 'review_date', 'security_comments'],
  'contractors',
  'en',
  'both',
  'Worker Application Returned - {{1}}',
  true,
  'Worker Security Returned (English)'
),
-- Worker Security Returned (Arabic)
(
  (SELECT id FROM tenants LIMIT 1),
  'worker_security_returned_ar',
  '🔄 تم إرجاع طلب العامل - المراجعة الأمنية

عزيزي المقاول،

تم إرجاع طلب {{1}} من {{2}} من قبل الأمن مع ملاحظات.

تمت المراجعة من قبل: {{3}}
التاريخ: {{4}}

ملاحظات الأمن: {{5}}

الإجراء المطلوب: يرجى معالجة المخاوف الأمنية وإعادة تقديم طلب العامل. سيحتاج العامل إلى المرور بعملية الموافقة مرة أخرى.

تواصل مع ممثل الموقع إذا كنت بحاجة إلى توضيح.',
  ARRAY['worker_name', 'company_name', 'reviewer_name', 'review_date', 'security_comments'],
  'contractors',
  'ar',
  'both',
  'تم إرجاع طلب العامل - {{1}}',
  true,
  'Worker Security Returned (Arabic)'
);