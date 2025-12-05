import * as XLSX from 'xlsx';

export interface ImportUser {
  full_name: string;
  email?: string;
  phone_number?: string;
  user_type: string;
  employee_id?: string;
  job_title?: string;
  has_login: boolean;
  branch_name?: string;
  division_name?: string;
  department_name?: string;
  section_name?: string;
  role_codes?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationWarning {
  row: number;
  message: string;
}

export interface ImportValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  users: ImportUser[];
  validUsers: ImportUser[];
}

const VALID_USER_TYPES = ['employee', 'contractor_longterm', 'contractor_shortterm', 'member', 'visitor'];

const TEMPLATE_HEADERS = [
  'Full Name*',
  'Email',
  'Phone Number',
  'User Type*',
  'Employee ID',
  'Job Title',
  'Has Login',
  'Branch',
  'Division',
  'Department',
  'Section',
  'Roles'
];

const TEMPLATE_INSTRUCTIONS = [
  'Required - User full name',
  'Required if Has Login is TRUE',
  'Phone number',
  'Required: employee, contractor_longterm, contractor_shortterm, member, visitor',
  'Unique employee identifier',
  'Job position/title',
  'TRUE or FALSE (auto-set based on user type if empty)',
  'Branch name (must exist in system)',
  'Division name (must exist in system)',
  'Department name (must exist in system)',
  'Section name (must exist in system)',
  'Comma-separated role codes (e.g., hsse_officer,manager)'
];

const SAMPLE_DATA = [
  ['Ahmed Mohammed', 'ahmed@example.com', '+966501234567', 'employee', 'EMP001', 'Safety Officer', 'TRUE', 'Head Office', 'Operations', 'Safety Dept', '', 'hsse_officer'],
  ['Sara Abdullah', 'sara@example.com', '+966509876543', 'contractor_longterm', 'CON001', 'Site Supervisor', 'TRUE', 'Branch A', '', '', '', 'manager'],
  ['Mohammed Ali', '', '+966507654321', 'visitor', '', '', 'FALSE', '', '', '', '', ''],
];

export function generateImportTemplate(includeSamples: boolean = false): void {
  const wb = XLSX.utils.book_new();
  
  const data: (string | boolean)[][] = [
    TEMPLATE_HEADERS,
    TEMPLATE_INSTRUCTIONS,
  ];
  
  if (includeSamples) {
    data.push(...SAMPLE_DATA);
  }
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Full Name
    { wch: 30 }, // Email
    { wch: 18 }, // Phone
    { wch: 22 }, // User Type
    { wch: 15 }, // Employee ID
    { wch: 20 }, // Job Title
    { wch: 12 }, // Has Login
    { wch: 18 }, // Branch
    { wch: 18 }, // Division
    { wch: 18 }, // Department
    { wch: 18 }, // Section
    { wch: 30 }, // Roles
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Users');
  
  const filename = includeSamples ? 'user_import_template_with_samples.xlsx' : 'user_import_template.xlsx';
  XLSX.writeFile(wb, filename);
}

export function parseExcelFile(file: File): Promise<ImportUser[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: ''
        }) as unknown[][];
        
        // Skip header and instruction rows
        const dataRows = jsonData.slice(2);
        
        const users: ImportUser[] = dataRows
          .filter(row => row && row[0]) // Filter out empty rows
          .map(row => {
            const hasLoginValue = String(row[6] || '').toUpperCase();
            const userType = String(row[3] || '').toLowerCase().trim();
            
            // Auto-determine has_login based on user type if not specified
            let hasLogin: boolean;
            if (hasLoginValue === 'TRUE' || hasLoginValue === '1' || hasLoginValue === 'YES') {
              hasLogin = true;
            } else if (hasLoginValue === 'FALSE' || hasLoginValue === '0' || hasLoginValue === 'NO') {
              hasLogin = false;
            } else {
              // Default based on user type
              hasLogin = ['employee', 'contractor_longterm'].includes(userType);
            }
            
            return {
              full_name: String(row[0] || '').trim(),
              email: String(row[1] || '').trim() || undefined,
              phone_number: String(row[2] || '').trim() || undefined,
              user_type: userType,
              employee_id: String(row[4] || '').trim() || undefined,
              job_title: String(row[5] || '').trim() || undefined,
              has_login: hasLogin,
              branch_name: String(row[7] || '').trim() || undefined,
              division_name: String(row[8] || '').trim() || undefined,
              department_name: String(row[9] || '').trim() || undefined,
              section_name: String(row[10] || '').trim() || undefined,
              role_codes: String(row[11] || '').trim() || undefined,
            };
          });
        
        resolve(users);
      } catch (error) {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

interface HierarchyLookup {
  branches: Map<string, string>; // name -> id
  divisions: Map<string, string>;
  departments: Map<string, string>;
  sections: Map<string, string>;
  roles: Map<string, string>; // code -> id
}

export function validateImportData(
  users: ImportUser[],
  lookup: HierarchyLookup,
  existingEmployeeIds: Set<string>
): ImportValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const validUsers: ImportUser[] = [];
  const seenEmployeeIds = new Set<string>();
  
  users.forEach((user, index) => {
    const row = index + 3; // Account for header + instruction rows
    let hasError = false;
    
    // Required field: full_name
    if (!user.full_name) {
      errors.push({ row, field: 'full_name', message: 'fieldRequired' });
      hasError = true;
    }
    
    // Required field: user_type
    if (!user.user_type) {
      errors.push({ row, field: 'user_type', message: 'fieldRequired' });
      hasError = true;
    } else if (!VALID_USER_TYPES.includes(user.user_type)) {
      errors.push({ row, field: 'user_type', message: 'invalidUserType' });
      hasError = true;
    }
    
    // Email required for users with login
    if (user.has_login && !user.email) {
      errors.push({ row, field: 'email', message: 'emailRequiredForLogin' });
      hasError = true;
    }
    
    // Validate email format if provided
    if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      errors.push({ row, field: 'email', message: 'invalidEmail' });
      hasError = true;
    }
    
    // Check for duplicate employee IDs
    if (user.employee_id) {
      if (existingEmployeeIds.has(user.employee_id) || seenEmployeeIds.has(user.employee_id)) {
        errors.push({ row, field: 'employee_id', message: 'duplicateEmployeeId' });
        hasError = true;
      } else {
        seenEmployeeIds.add(user.employee_id);
      }
    }
    
    // Validate hierarchy references
    if (user.branch_name && !lookup.branches.has(user.branch_name.toLowerCase())) {
      errors.push({ row, field: 'branch', message: 'branchNotFound' });
      hasError = true;
    }
    
    if (user.division_name && !lookup.divisions.has(user.division_name.toLowerCase())) {
      errors.push({ row, field: 'division', message: 'divisionNotFound' });
      hasError = true;
    }
    
    if (user.department_name && !lookup.departments.has(user.department_name.toLowerCase())) {
      errors.push({ row, field: 'department', message: 'departmentNotFound' });
      hasError = true;
    }
    
    if (user.section_name && !lookup.sections.has(user.section_name.toLowerCase())) {
      errors.push({ row, field: 'section', message: 'sectionNotFound' });
      hasError = true;
    }
    
    // Validate role codes
    if (user.role_codes) {
      const codes = user.role_codes.split(',').map(c => c.trim().toLowerCase());
      for (const code of codes) {
        if (code && !lookup.roles.has(code)) {
          errors.push({ row, field: 'roles', message: `roleNotFound:${code}` });
          hasError = true;
        }
      }
    }
    
    // Warnings
    if (!user.has_login && user.email) {
      warnings.push({ row, message: 'emailProvidedNoLogin' });
    }
    
    if (!hasError) {
      validUsers.push(user);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    users,
    validUsers,
  };
}

export function mapUserToHierarchyIds(
  user: ImportUser,
  lookup: HierarchyLookup
): {
  branch_id?: string;
  division_id?: string;
  department_id?: string;
  section_id?: string;
  role_ids: string[];
} {
  const branch_id = user.branch_name ? lookup.branches.get(user.branch_name.toLowerCase()) : undefined;
  const division_id = user.division_name ? lookup.divisions.get(user.division_name.toLowerCase()) : undefined;
  const department_id = user.department_name ? lookup.departments.get(user.department_name.toLowerCase()) : undefined;
  const section_id = user.section_name ? lookup.sections.get(user.section_name.toLowerCase()) : undefined;
  
  const role_ids: string[] = [];
  if (user.role_codes) {
    const codes = user.role_codes.split(',').map(c => c.trim().toLowerCase());
    for (const code of codes) {
      const roleId = lookup.roles.get(code);
      if (roleId) {
        role_ids.push(roleId);
      }
    }
  }
  
  return { branch_id, division_id, department_id, section_id, role_ids };
}
