/**
 * ID Card System Types
 * Supports: Visitor, VIP Visitor, Worker, Employee, Contractor Representative
 */

export type IDCardType = 'visitor' | 'visitor_vip' | 'worker' | 'employee' | 'contractor_rep';

export type QRPosition = 'left' | 'right' | 'bottom';
export type LogoPosition = 'top-left' | 'top-right' | 'top-center';
export type CardOrientation = 'portrait' | 'landscape';
export type TemplatePreset = 'standard' | 'minimal' | 'corporate' | 'safety';

// Available fields for each card type
export type FrontFieldKey = 
  | 'full_name'
  | 'full_name_ar'
  | 'company'
  | 'department'
  | 'role'
  | 'employee_id'
  | 'national_id'
  | 'project'
  | 'valid_until'
  | 'entry_date'
  | 'destination'
  | 'host_name'
  | 'badge_number';

export type BackFieldKey = 
  | 'emergency_contact'
  | 'safety_instructions'
  | 'induction_status'
  | 'contract_validity'
  | 'company_contact'
  | 'office_location'
  | 'custom_text';

export interface TenantIDCardSettings {
  id: string;
  tenant_id: string;
  card_type: IDCardType;
  
  // Front Side Configuration
  front_bg_color: string;
  front_accent_color: string;
  front_text_color: string;
  show_photo: boolean;
  show_qr_code: boolean;
  qr_position: QRPosition;
  front_fields: FrontFieldKey[];
  
  // Back Side Configuration
  back_enabled: boolean;
  back_bg_color: string;
  back_fields: BackFieldKey[];
  back_custom_text: string | null;
  back_custom_text_ar: string | null;
  
  // Card Layout
  card_orientation: CardOrientation;
  
  // Branding
  show_logo: boolean;
  logo_position: LogoPosition;
  show_tenant_name: boolean;
  template_preset: TemplatePreset;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IDCardPersonData {
  id: string;
  fullName: string;
  fullNameAr?: string;
  photo?: string;
  role?: string;
  roleAr?: string;
  company?: string;
  companyAr?: string;
  department?: string;
  departmentAr?: string;
  employeeId?: string;
  nationalId?: string;
  badgeNumber?: string;
  project?: string;
  projectAr?: string;
  validUntil?: string;
  entryDate?: string;
  destination?: string;
  destinationAr?: string;
  hostName?: string;
  hostNameAr?: string;
  qrToken: string;
  qrUrl?: string;
  emergencyContact?: string;
  safetyInstructions?: string;
  inductionCompleted?: boolean;
}

export interface IDCardTenantData {
  id: string;
  name: string;
  nameAr?: string;
  logoUrl?: string;
  hsseDepartmentName?: string;
  hsseDepartmentNameAr?: string;
}

export interface IDCardRenderOptions {
  cardType: IDCardType;
  personData: IDCardPersonData;
  tenantData: IDCardTenantData;
  settings: TenantIDCardSettings;
  side: 'front' | 'back';
  language: 'en' | 'ar';
}

export interface IDCardGenerateResult {
  success: boolean;
  frontImageUrl?: string;
  backImageUrl?: string;
  frontImagePath?: string;
  backImagePath?: string;
  error?: string;
}

// Default settings for each card type
export const DEFAULT_CARD_SETTINGS: Record<IDCardType, Partial<TenantIDCardSettings>> = {
  visitor: {
    front_fields: ['full_name', 'company', 'destination', 'host_name', 'valid_until'],
    back_enabled: true,
    back_fields: ['emergency_contact', 'safety_instructions'],
    front_accent_color: '#3b82f6', // Blue
    template_preset: 'standard',
  },
  visitor_vip: {
    front_fields: ['full_name', 'company', 'destination', 'host_name', 'valid_until'],
    back_enabled: false,
    back_fields: [],
    front_accent_color: '#ca8a04', // Gold
    template_preset: 'corporate',
  },
  worker: {
    front_fields: ['full_name', 'company', 'role', 'project', 'valid_until'],
    back_enabled: true,
    back_fields: ['safety_instructions', 'induction_status', 'emergency_contact'],
    front_accent_color: '#f97316', // Orange
    template_preset: 'safety',
  },
  employee: {
    front_fields: ['full_name', 'department', 'role', 'employee_id'],
    back_enabled: false,
    back_fields: ['office_location', 'emergency_contact'],
    front_accent_color: '#1e40af', // Deep Blue
    template_preset: 'corporate',
  },
  contractor_rep: {
    front_fields: ['full_name', 'company', 'role', 'valid_until'],
    back_enabled: true,
    back_fields: ['contract_validity', 'company_contact'],
    front_accent_color: '#7c3aed', // Purple
    template_preset: 'standard',
  },
};

// Card type display names
export const CARD_TYPE_LABELS: Record<IDCardType, { en: string; ar: string }> = {
  visitor: { en: 'Visitor', ar: 'زائر' },
  visitor_vip: { en: 'VIP Visitor', ar: 'زائر VIP' },
  worker: { en: 'Worker', ar: 'عامل' },
  employee: { en: 'Employee', ar: 'موظف' },
  contractor_rep: { en: 'Contractor Representative', ar: 'ممثل المقاول' },
};

// Field display names
export const FIELD_LABELS: Record<FrontFieldKey | BackFieldKey, { en: string; ar: string }> = {
  full_name: { en: 'Full Name', ar: 'الاسم الكامل' },
  full_name_ar: { en: 'Name (Arabic)', ar: 'الاسم (عربي)' },
  company: { en: 'Company', ar: 'الشركة' },
  department: { en: 'Department', ar: 'القسم' },
  role: { en: 'Role', ar: 'الدور' },
  employee_id: { en: 'Employee ID', ar: 'رقم الموظف' },
  national_id: { en: 'National ID', ar: 'رقم الهوية' },
  project: { en: 'Project', ar: 'المشروع' },
  valid_until: { en: 'Valid Until', ar: 'صالح حتى' },
  entry_date: { en: 'Entry Date', ar: 'تاريخ الدخول' },
  destination: { en: 'Destination', ar: 'الوجهة' },
  host_name: { en: 'Host', ar: 'المستضيف' },
  badge_number: { en: 'Badge No.', ar: 'رقم البطاقة' },
  emergency_contact: { en: 'Emergency Contact', ar: 'جهة اتصال الطوارئ' },
  safety_instructions: { en: 'Safety Instructions', ar: 'تعليمات السلامة' },
  induction_status: { en: 'Induction Status', ar: 'حالة التعريف' },
  contract_validity: { en: 'Contract Validity', ar: 'صلاحية العقد' },
  company_contact: { en: 'Company Contact', ar: 'جهة اتصال الشركة' },
  office_location: { en: 'Office Location', ar: 'موقع المكتب' },
  custom_text: { en: 'Notes', ar: 'ملاحظات' },
};
