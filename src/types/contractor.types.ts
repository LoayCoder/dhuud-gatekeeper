/**
 * Contractor Management Types
 * Types for contractor companies, workers, gate passes, and compliance
 */

// Contractor company status
export type ContractorCompanyStatus = 
  | 'active'
  | 'inactive'
  | 'pending_approval'
  | 'suspended'
  | 'blacklisted';

// Worker status
export type ContractorWorkerStatus = 
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'terminated'
  | 'pending_verification';

// Gate pass status
export type GatePassStatus = 
  | 'active'
  | 'expired'
  | 'revoked'
  | 'suspended'
  | 'pending_approval';

// Gate pass type
export type GatePassType = 
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'project'
  | 'permanent';

// Document compliance status
export type ComplianceStatus = 
  | 'valid'
  | 'expiring_soon'
  | 'expired'
  | 'missing'
  | 'pending_review';

// Contractor company
export interface ContractorCompany {
  id: string;
  tenant_id: string;
  name: string;
  name_ar?: string | null;
  registration_number?: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  status: ContractorCompanyStatus;
  rating?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Contractor worker
export interface ContractorWorker {
  id: string;
  tenant_id: string;
  company_id: string;
  employee_number?: string | null;
  full_name: string;
  full_name_ar?: string | null;
  nationality?: string | null;
  id_number?: string | null;
  id_type?: 'national_id' | 'passport' | 'iqama' | 'other';
  phone_number?: string | null;
  email?: string | null;
  job_title?: string | null;
  status: ContractorWorkerStatus;
  photo_url?: string | null;
  
  // Safety info
  safety_induction_date?: string | null;
  safety_induction_expiry?: string | null;
  medical_exam_date?: string | null;
  medical_exam_expiry?: string | null;
  
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Gate pass
export interface GatePass {
  id: string;
  tenant_id: string;
  worker_id: string;
  pass_number: string;
  pass_type: GatePassType;
  status: GatePassStatus;
  valid_from: string;
  valid_until: string;
  
  // Access control
  allowed_sites?: string[] | null;
  allowed_areas?: string[] | null;
  access_hours_start?: string | null;
  access_hours_end?: string | null;
  
  // Approval
  issued_by?: string | null;
  issued_at?: string | null;
  revoked_by?: string | null;
  revoked_at?: string | null;
  revoke_reason?: string | null;
  
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Worker document
export interface WorkerDocument {
  id: string;
  worker_id: string;
  tenant_id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  expiry_date?: string | null;
  compliance_status: ComplianceStatus;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
}

// Gate entry log
export interface GateEntryLog {
  id: string;
  tenant_id: string;
  worker_id?: string | null;
  visitor_id?: string | null;
  gate_id: string;
  entry_type: 'entry' | 'exit';
  timestamp: string;
  recorded_by?: string | null;
  vehicle_plate?: string | null;
  notes?: string | null;
}

// Contractor compliance summary
export interface ContractorComplianceSummary {
  companyId: string;
  totalWorkers: number;
  activeWorkers: number;
  compliantWorkers: number;
  expiringDocuments: number;
  expiredDocuments: number;
  overallComplianceRate: number;
}
