// System variables
import React from 'react';
import { MessageSquare, Mail } from 'lucide-react';
import { ChannelType } from '@/hooks/useNotificationTemplates';

// available for HSSE templates - comprehensive list by model
export const SYSTEM_VARIABLES = [
  // === General / Common ===
  { key: 'title', label: 'Title', labelAr: 'العنوان', example: 'Fire hazard near storage', category: 'general' },
  { key: 'description', label: 'Description', labelAr: 'الوصف', example: 'Flammable materials found...', category: 'general' },
  { key: 'site_name', label: 'Site Name', labelAr: 'اسم الموقع', example: 'Main Factory', category: 'general' },
  { key: 'department', label: 'Department', labelAr: 'القسم', example: 'Operations', category: 'general' },
  { key: 'action_link', label: 'Action Link', labelAr: 'رابط الإجراء', example: 'https://app.dhuud.com/...', category: 'general' },
  { key: 'reference_id', label: 'Reference ID', labelAr: 'رقم المرجع', example: 'REF-2024-0042', category: 'general' },
  { key: 'tenant_name', label: 'Tenant/Org Name', labelAr: 'اسم المنظمة', example: 'ACME Corporation', category: 'general' },
  { key: 'current_date', label: 'Current Date', labelAr: 'التاريخ الحالي', example: '2024-12-31', category: 'general' },
  { key: 'current_time', label: 'Current Time', labelAr: 'الوقت الحالي', example: '14:30', category: 'general' },
  
  // === Incidents ===
  { key: 'incident_id', label: 'Incident ID', labelAr: 'رقم الحادث', example: 'INC-2024-0042', category: 'incidents' },
  { key: 'incident_title', label: 'Incident Title', labelAr: 'عنوان الحادث', example: 'Slip and Fall Injury', category: 'incidents' },
  { key: 'incident_description', label: 'Incident Description', labelAr: 'وصف الحادث', example: 'Worker slipped on wet floor...', category: 'incidents' },
  { key: 'incident_date', label: 'Incident Date', labelAr: 'تاريخ الحادث', example: '2024-12-26', category: 'incidents' },
  { key: 'incident_time', label: 'Incident Time', labelAr: 'وقت الحادث', example: '14:30', category: 'incidents' },
  { key: 'incident_location', label: 'Incident Location', labelAr: 'موقع الحادث', example: 'Site A - Building 2', category: 'incidents' },
  { key: 'incident_category', label: 'Incident Category', labelAr: 'فئة الحادث', example: 'Near Miss', category: 'incidents' },
  { key: 'incident_severity', label: 'Incident Severity', labelAr: 'شدة الحادث', example: 'Major', category: 'incidents' },
  { key: 'incident_status', label: 'Incident Status', labelAr: 'حالة الحادث', example: 'Under Investigation', category: 'incidents' },
  { key: 'reported_by', label: 'Reported By', labelAr: 'أبلغ عنه', example: 'Ahmed Hassan', category: 'incidents' },
  { key: 'reported_at', label: 'Reported At', labelAr: 'تاريخ البلاغ', example: '2024-12-26 15:00', category: 'incidents' },
  { key: 'root_cause', label: 'Root Cause', labelAr: 'السبب الجذري', example: 'Inadequate housekeeping', category: 'incidents' },
  { key: 'immediate_actions', label: 'Immediate Actions', labelAr: 'الإجراءات الفورية', example: 'Area cordoned off', category: 'incidents' },
  { key: 'injuries_count', label: 'Number of Injuries', labelAr: 'عدد الإصابات', example: '2', category: 'incidents' },
  { key: 'fatalities_count', label: 'Number of Fatalities', labelAr: 'عدد الوفيات', example: '0', category: 'incidents' },
  { key: 'lost_days', label: 'Lost Work Days', labelAr: 'أيام العمل المفقودة', example: '5', category: 'incidents' },
  
  // === Observations ===
  { key: 'observation_id', label: 'Observation ID', labelAr: 'رقم الملاحظة', example: 'OBS-2024-0123', category: 'observations' },
  { key: 'observation_title', label: 'Observation Title', labelAr: 'عنوان الملاحظة', example: 'Unsafe ladder usage', category: 'observations' },
  { key: 'observation_description', label: 'Observation Description', labelAr: 'وصف الملاحظة', example: 'Worker observed not using...', category: 'observations' },
  { key: 'observation_date', label: 'Observation Date', labelAr: 'تاريخ الملاحظة', example: '2024-12-26', category: 'observations' },
  { key: 'observation_type', label: 'Observation Type', labelAr: 'نوع الملاحظة', example: 'Unsafe Act', category: 'observations' },
  { key: 'observation_category', label: 'Observation Category', labelAr: 'فئة الملاحظة', example: 'Working at Height', category: 'observations' },
  { key: 'risk_level', label: 'Risk Level', labelAr: 'مستوى الخطورة', example: 'High', category: 'observations' },
  { key: 'observation_status', label: 'Observation Status', labelAr: 'حالة الملاحظة', example: 'Open', category: 'observations' },
  { key: 'observer_name', label: 'Observer Name', labelAr: 'اسم المراقب', example: 'Mohammed Ali', category: 'observations' },
  { key: 'recommended_action', label: 'Recommended Action', labelAr: 'الإجراء الموصى به', example: 'Retrain worker on ladder safety', category: 'observations' },
  
  // === Inspections ===
  { key: 'inspection_id', label: 'Inspection ID', labelAr: 'رقم التفتيش', example: 'INS-2024-0056', category: 'inspections' },
  { key: 'inspection_title', label: 'Inspection Title', labelAr: 'عنوان التفتيش', example: 'Monthly Safety Audit', category: 'inspections' },
  { key: 'inspection_date', label: 'Inspection Date', labelAr: 'تاريخ التفتيش', example: '2024-12-26', category: 'inspections' },
  { key: 'inspection_type', label: 'Inspection Type', labelAr: 'نوع التفتيش', example: 'Safety Audit', category: 'inspections' },
  { key: 'inspection_status', label: 'Inspection Status', labelAr: 'حالة التفتيش', example: 'Completed', category: 'inspections' },
  { key: 'inspector_name', label: 'Inspector Name', labelAr: 'اسم المفتش', example: 'Mohammed Ali', category: 'inspections' },
  { key: 'inspection_area', label: 'Inspection Area', labelAr: 'منطقة التفتيش', example: 'Warehouse Zone A', category: 'inspections' },
  { key: 'findings_count', label: 'Findings Count', labelAr: 'عدد الملاحظات', example: '5', category: 'inspections' },
  { key: 'compliance_score', label: 'Compliance Score', labelAr: 'درجة الامتثال', example: '85%', category: 'inspections' },
  { key: 'next_inspection_date', label: 'Next Inspection Date', labelAr: 'تاريخ التفتيش القادم', example: '2025-01-26', category: 'inspections' },
  
  // === Corrective Actions ===
  { key: 'action_id', label: 'Action ID', labelAr: 'رقم الإجراء', example: 'ACT-2024-0089', category: 'actions' },
  { key: 'action_title', label: 'Action Title', labelAr: 'عنوان الإجراء', example: 'Install safety barriers', category: 'actions' },
  { key: 'action_description', label: 'Action Description', labelAr: 'وصف الإجراء', example: 'Install barriers around...', category: 'actions' },
  { key: 'action_status', label: 'Action Status', labelAr: 'حالة الإجراء', example: 'In Progress', category: 'actions' },
  { key: 'due_date', label: 'Due Date', labelAr: 'تاريخ الاستحقاق', example: '2024-12-31', category: 'actions' },
  { key: 'assigned_to', label: 'Assigned To', labelAr: 'مُسند إلى', example: 'Khalid Saeed', category: 'actions' },
  { key: 'assigned_by', label: 'Assigned By', labelAr: 'مُسند من قبل', example: 'Ahmed Manager', category: 'actions' },
  { key: 'priority', label: 'Priority', labelAr: 'الأولوية', example: 'High', category: 'actions' },
  { key: 'completion_date', label: 'Completion Date', labelAr: 'تاريخ الإنجاز', example: '2024-12-28', category: 'actions' },
  { key: 'days_overdue', label: 'Days Overdue', labelAr: 'أيام التأخير', example: '3', category: 'actions' },
  { key: 'days_remaining', label: 'Days Remaining', labelAr: 'الأيام المتبقية', example: '7', category: 'actions' },
  
  // === Contractor Company ===
  { key: 'company_name', label: 'Company Name', labelAr: 'اسم الشركة', example: 'ABC Construction LLC', category: 'contractors' },
  { key: 'company_name_ar', label: 'Company Name (Arabic)', labelAr: 'اسم الشركة بالعربي', example: 'شركة أ ب ج للمقاولات', category: 'contractors' },
  { key: 'company_code', label: 'Company Code', labelAr: 'رمز الشركة', example: 'ABC-001', category: 'contractors' },
  { key: 'trade_license', label: 'Trade License', labelAr: 'الرخصة التجارية', example: 'TL-2024-12345', category: 'contractors' },
  { key: 'license_expiry', label: 'License Expiry', labelAr: 'انتهاء الرخصة', example: '2025-06-30', category: 'contractors' },
  { key: 'contact_person', label: 'Contact Person', labelAr: 'الشخص المسؤول', example: 'John Smith', category: 'contractors' },
  { key: 'contact_email', label: 'Contact Email', labelAr: 'البريد الإلكتروني', example: 'john@abc.com', category: 'contractors' },
  { key: 'contact_phone', label: 'Contact Phone', labelAr: 'رقم الهاتف', example: '+971501234567', category: 'contractors' },
  { key: 'company_status', label: 'Company Status', labelAr: 'حالة الشركة', example: 'Active', category: 'contractors' },
  { key: 'risk_rating', label: 'Risk Rating', labelAr: 'تصنيف المخاطر', example: 'Low', category: 'contractors' },
  { key: 'total_workers', label: 'Total Workers', labelAr: 'إجمالي العمال', example: '45', category: 'contractors' },
  { key: 'active_projects', label: 'Active Projects', labelAr: 'المشاريع النشطة', example: '3', category: 'contractors' },
  
  // === Contractor Workers ===
  { key: 'worker_name', label: 'Worker Name', labelAr: 'اسم العامل', example: 'John Smith', category: 'workers' },
  { key: 'worker_name_ar', label: 'Worker Name (Arabic)', labelAr: 'اسم العامل بالعربي', example: 'جون سميث', category: 'workers' },
  { key: 'worker_id', label: 'Worker ID', labelAr: 'رقم العامل', example: 'WRK-2024-0123', category: 'workers' },
  { key: 'worker_trade', label: 'Worker Trade', labelAr: 'حرفة العامل', example: 'Electrician', category: 'workers' },
  { key: 'passport_number', label: 'Passport Number', labelAr: 'رقم الجواز', example: 'AB1234567', category: 'workers' },
  { key: 'nationality', label: 'Nationality', labelAr: 'الجنسية', example: 'Indian', category: 'workers' },
  { key: 'visa_status', label: 'Visa Status', labelAr: 'حالة التأشيرة', example: 'Valid', category: 'workers' },
  { key: 'visa_expiry', label: 'Visa Expiry', labelAr: 'انتهاء التأشيرة', example: '2025-03-15', category: 'workers' },
  { key: 'medical_status', label: 'Medical Status', labelAr: 'الحالة الطبية', example: 'Fit', category: 'workers' },
  { key: 'medical_expiry', label: 'Medical Expiry', labelAr: 'انتهاء الفحص الطبي', example: '2025-06-30', category: 'workers' },
  { key: 'induction_status', label: 'Induction Status', labelAr: 'حالة التأهيل', example: 'Completed', category: 'workers' },
  { key: 'induction_date', label: 'Induction Date', labelAr: 'تاريخ التأهيل', example: '2024-01-15', category: 'workers' },
  { key: 'access_card_number', label: 'Access Card Number', labelAr: 'رقم بطاقة الدخول', example: 'AC-2024-0456', category: 'workers' },
  { key: 'worker_status', label: 'Worker Status', labelAr: 'حالة العامل', example: 'Active', category: 'workers' },
  { key: 'qr_code_url', label: 'QR Code URL', labelAr: 'رابط رمز QR', example: 'https://app.dhuud.com/qr/...', category: 'workers' },
  
  // === Contractor Projects ===
  { key: 'project_name', label: 'Project Name', labelAr: 'اسم المشروع', example: 'Building A Renovation', category: 'projects' },
  { key: 'project_code', label: 'Project Code', labelAr: 'رمز المشروع', example: 'PRJ-2024-001', category: 'projects' },
  { key: 'project_status', label: 'Project Status', labelAr: 'حالة المشروع', example: 'In Progress', category: 'projects' },
  { key: 'project_start_date', label: 'Project Start Date', labelAr: 'تاريخ بدء المشروع', example: '2024-01-01', category: 'projects' },
  { key: 'project_end_date', label: 'Project End Date', labelAr: 'تاريخ انتهاء المشروع', example: '2024-12-31', category: 'projects' },
  { key: 'project_location', label: 'Project Location', labelAr: 'موقع المشروع', example: 'Zone A - Building 5', category: 'projects' },
  { key: 'project_manager', label: 'Project Manager', labelAr: 'مدير المشروع', example: 'Ali Hassan', category: 'projects' },
  { key: 'assigned_workers', label: 'Assigned Workers', labelAr: 'العمال المعينون', example: '15', category: 'projects' },
  { key: 'permit_type', label: 'Permit Type', labelAr: 'نوع التصريح', example: 'Hot Work Permit', category: 'projects' },
  { key: 'permit_status', label: 'Permit Status', labelAr: 'حالة التصريح', example: 'Approved', category: 'projects' },
  { key: 'valid_from', label: 'Valid From', labelAr: 'صالح من', example: '2024-12-01', category: 'projects' },
  { key: 'valid_until', label: 'Valid Until', labelAr: 'صالح حتى', example: '2024-12-31', category: 'projects' },
  
  // === Assets ===
  { key: 'asset_id', label: 'Asset ID', labelAr: 'رقم الأصل', example: 'AST-2024-0042', category: 'assets' },
  { key: 'asset_name', label: 'Asset Name', labelAr: 'اسم الأصل', example: 'Fire Extinguisher #42', category: 'assets' },
  { key: 'asset_name_ar', label: 'Asset Name (Arabic)', labelAr: 'اسم الأصل بالعربي', example: 'طفاية حريق #42', category: 'assets' },
  { key: 'asset_code', label: 'Asset Code', labelAr: 'رمز الأصل', example: 'FE-2024-042', category: 'assets' },
  { key: 'asset_type', label: 'Asset Type', labelAr: 'نوع الأصل', example: 'Fire Safety Equipment', category: 'assets' },
  { key: 'asset_category', label: 'Asset Category', labelAr: 'فئة الأصل', example: 'Safety Equipment', category: 'assets' },
  { key: 'asset_status', label: 'Asset Status', labelAr: 'حالة الأصل', example: 'Active', category: 'assets' },
  { key: 'asset_condition', label: 'Asset Condition', labelAr: 'حالة الأصل', example: 'Good', category: 'assets' },
  { key: 'asset_location', label: 'Asset Location', labelAr: 'موقع الأصل', example: 'Building A - Floor 2', category: 'assets' },
  { key: 'serial_number', label: 'Serial Number', labelAr: 'الرقم التسلسلي', example: 'SN-123456789', category: 'assets' },
  { key: 'manufacturer', label: 'Manufacturer', labelAr: 'الشركة المصنعة', example: 'FireSafe Inc.', category: 'assets' },
  { key: 'model_number', label: 'Model Number', labelAr: 'رقم الموديل', example: 'FS-2000', category: 'assets' },
  { key: 'purchase_date', label: 'Purchase Date', labelAr: 'تاريخ الشراء', example: '2023-01-15', category: 'assets' },
  { key: 'warranty_expiry', label: 'Warranty Expiry', labelAr: 'انتهاء الضمان', example: '2026-01-15', category: 'assets' },
  { key: 'last_inspection_date', label: 'Last Inspection Date', labelAr: 'تاريخ آخر تفتيش', example: '2024-11-15', category: 'assets' },
  { key: 'next_inspection_due', label: 'Next Inspection Due', labelAr: 'موعد التفتيش القادم', example: '2025-02-15', category: 'assets' },
  { key: 'last_maintenance_date', label: 'Last Maintenance Date', labelAr: 'تاريخ آخر صيانة', example: '2024-10-01', category: 'assets' },
  { key: 'next_maintenance_due', label: 'Next Maintenance Due', labelAr: 'موعد الصيانة القادمة', example: '2025-01-01', category: 'assets' },
  { key: 'calibration_due', label: 'Calibration Due', labelAr: 'موعد المعايرة', example: '2025-03-15', category: 'assets' },
  { key: 'health_score', label: 'Health Score', labelAr: 'درجة الصحة', example: '92%', category: 'assets' },
  { key: 'assigned_department', label: 'Assigned Department', labelAr: 'القسم المخصص', example: 'Operations', category: 'assets' },
  { key: 'custodian_name', label: 'Custodian Name', labelAr: 'اسم الحارس', example: 'Mohammed Ahmed', category: 'assets' },
  
  // === Media/Photos ===
  { key: 'photo_url', label: 'Photo URL', labelAr: 'رابط الصورة', example: 'https://storage.dhuud.com/photos/incident-123.jpg', category: 'media' },
  { key: 'first_image_url', label: 'First Image URL', labelAr: 'رابط الصورة الأولى', example: 'https://storage.dhuud.com/photos/image1.jpg', category: 'media' },
  { key: 'image_count', label: 'Image Count', labelAr: 'عدد الصور', example: '3', category: 'media' },
  { key: 'document_url', label: 'Document URL', labelAr: 'رابط المستند', example: 'https://storage.dhuud.com/docs/report.pdf', category: 'media' },
  
  // === Alerts & Reminders ===
  { key: 'alert_time', label: 'Alert Time', labelAr: 'وقت التنبيه', example: '2024-12-26 09:00', category: 'alerts' },
  { key: 'alert_type', label: 'Alert Type', labelAr: 'نوع التنبيه', example: 'Expiry Warning', category: 'alerts' },
  { key: 'alert_message', label: 'Alert Message', labelAr: 'رسالة التنبيه', example: 'License expires in 7 days', category: 'alerts' },
  { key: 'expiry_date', label: 'Expiry Date', labelAr: 'تاريخ الانتهاء', example: '2025-01-02', category: 'alerts' },
  { key: 'escalation_level', label: 'Escalation Level', labelAr: 'مستوى التصعيد', example: 'Level 2', category: 'alerts' },
  
  // === Safety Inductions ===
  { key: 'induction_id', label: 'Induction ID', labelAr: 'رقم التأهيل', example: 'IND-2024-0123', category: 'inductions' },
  { key: 'induction_link', label: 'Induction Link (Required)', labelAr: 'رابط التأهيل (مطلوب)', example: 'https://app.dhuud.com/worker-induction/abc123', category: 'inductions' },
  { key: 'video_title', label: 'Video Title', labelAr: 'عنوان الفيديو', example: 'Site Safety Introduction', category: 'inductions' },
  { key: 'video_title_ar', label: 'Video Title (Arabic)', labelAr: 'عنوان الفيديو بالعربي', example: 'مقدمة السلامة في الموقع', category: 'inductions' },
  { key: 'video_description', label: 'Video Description', labelAr: 'وصف الفيديو', example: 'Learn about safety procedures...', category: 'inductions' },
  { key: 'video_url', label: 'Video URL', labelAr: 'رابط الفيديو', example: 'https://youtube.com/watch?v=...', category: 'inductions' },
  { key: 'video_duration', label: 'Video Duration', labelAr: 'مدة الفيديو', example: '5 minutes', category: 'inductions' },
  { key: 'video_duration_seconds', label: 'Video Duration (Seconds)', labelAr: 'مدة الفيديو (ثواني)', example: '300', category: 'inductions' },
  { key: 'video_language', label: 'Video Language', labelAr: 'لغة الفيديو', example: 'English', category: 'inductions' },
  { key: 'induction_sent_at', label: 'Induction Sent At', labelAr: 'تاريخ إرسال التأهيل', example: '2024-12-26 10:00', category: 'inductions' },
  { key: 'induction_expires_at', label: 'Induction Expires At', labelAr: 'تاريخ انتهاء التأهيل', example: '2025-12-26', category: 'inductions' },
  { key: 'induction_valid_for_days', label: 'Valid For (Days)', labelAr: 'صالح لمدة (أيام)', example: '365', category: 'inductions' },
];

// Category to variable keys mapping - comprehensive
export const CATEGORY_VARIABLES: Record<string, string[]> = {
  general: ['title', 'description', 'site_name', 'department', 'action_link', 'reference_id', 'tenant_name', 'current_date', 'current_time'],
  incidents: [
    'incident_id', 'incident_title', 'incident_description', 'incident_date', 'incident_time', 'incident_location',
    'incident_category', 'incident_severity', 'incident_status', 'reported_by', 'reported_at', 'root_cause',
    'immediate_actions', 'injuries_count', 'fatalities_count', 'lost_days', 'site_name', 'department', 'action_link',
    'photo_url', 'first_image_url', 'image_count'
  ],
  observations: [
    'observation_id', 'observation_title', 'observation_description', 'observation_date', 'observation_type',
    'observation_category', 'risk_level', 'observation_status', 'observer_name', 'recommended_action',
    'site_name', 'department', 'action_link', 'photo_url', 'first_image_url', 'image_count'
  ],
  inspections: [
    'inspection_id', 'inspection_title', 'inspection_date', 'inspection_type', 'inspection_status',
    'inspector_name', 'inspection_area', 'findings_count', 'compliance_score', 'next_inspection_date',
    'site_name', 'department', 'action_link'
  ],
  actions: [
    'action_id', 'action_title', 'action_description', 'action_status', 'due_date', 'assigned_to', 'assigned_by',
    'priority', 'completion_date', 'days_overdue', 'days_remaining', 'site_name', 'department', 'action_link'
  ],
  contractors: [
    'company_name', 'company_name_ar', 'company_code', 'trade_license', 'license_expiry', 'contact_person',
    'contact_email', 'contact_phone', 'company_status', 'risk_rating', 'total_workers', 'active_projects',
    'site_name', 'action_link'
  ],
  workers: [
    'worker_name', 'worker_name_ar', 'worker_id', 'worker_trade', 'passport_number', 'nationality',
    'visa_status', 'visa_expiry', 'medical_status', 'medical_expiry', 'induction_status', 'induction_date',
    'access_card_number', 'worker_status', 'qr_code_url', 'company_name', 'site_name', 'action_link'
  ],
  projects: [
    'project_name', 'project_code', 'project_status', 'project_start_date', 'project_end_date',
    'project_location', 'project_manager', 'assigned_workers', 'permit_type', 'permit_status',
    'valid_from', 'valid_until', 'company_name', 'site_name', 'action_link'
  ],
  assets: [
    'asset_id', 'asset_name', 'asset_name_ar', 'asset_code', 'asset_type', 'asset_category', 'asset_status',
    'asset_condition', 'asset_location', 'serial_number', 'manufacturer', 'model_number', 'purchase_date',
    'warranty_expiry', 'last_inspection_date', 'next_inspection_due', 'last_maintenance_date', 'next_maintenance_due',
    'calibration_due', 'health_score', 'assigned_department', 'custodian_name', 'site_name', 'action_link'
  ],
  media: ['photo_url', 'first_image_url', 'image_count', 'document_url'],
  alerts: [
    'alert_time', 'alert_type', 'alert_message', 'expiry_date', 'days_remaining', 'escalation_level',
    'title', 'description', 'risk_level', 'site_name', 'action_link'
  ],
  inductions: [
    'induction_id', 'induction_link', 'video_title', 'video_title_ar', 'video_description',
    'video_url', 'video_duration', 'video_duration_seconds', 'video_language',
    'induction_sent_at', 'induction_expires_at', 'induction_valid_for_days',
    'worker_name', 'worker_name_ar', 'project_name', 'company_name', 'site_name', 'action_link'
  ],
};

// Category labels with icons
export const CATEGORIES = [
  { id: 'general', label: 'General', labelAr: 'عام' },
  { id: 'incidents', label: 'Incidents', labelAr: 'الحوادث' },
  { id: 'observations', label: 'Observations', labelAr: 'الملاحظات' },
  { id: 'inspections', label: 'Inspections', labelAr: 'التفتيشات' },
  { id: 'actions', label: 'Corrective Actions', labelAr: 'الإجراءات التصحيحية' },
  { id: 'contractors', label: 'Contractor Companies', labelAr: 'شركات المقاولين' },
  { id: 'workers', label: 'Contractor Workers', labelAr: 'عمال المقاولين' },
  { id: 'projects', label: 'Contractor Projects', labelAr: 'مشاريع المقاولين' },
  { id: 'assets', label: 'Assets', labelAr: 'الأصول' },
  { id: 'media', label: 'Media/Photos', labelAr: 'الوسائط/الصور' },
  { id: 'alerts', label: 'Alerts & Reminders', labelAr: 'التنبيهات والتذكيرات' },
  { id: 'inductions', label: 'Safety Inductions', labelAr: 'التأهيل والسلامة' },
];

export const CHANNEL_OPTIONS: { value: ChannelType; label: string; icon: React.ReactNode }[] = [
  { value: 'whatsapp', label: 'WhatsApp Only', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'email', label: 'Email Only', icon: <Mail className="h-4 w-4" /> },
  { value: 'both', label: 'Both Channels', icon: null },
];


