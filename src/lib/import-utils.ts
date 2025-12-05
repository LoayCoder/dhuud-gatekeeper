import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

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

export interface TemplateHierarchyData {
  branches: string[];
  divisions: string[];
  departments: string[];
  sections: string[];
  roles: string[];
}

export interface GenerateTemplateOptions {
  includeSamples?: boolean;
  hierarchyData?: TemplateHierarchyData;
}

export async function generateImportTemplate(options: GenerateTemplateOptions = {}): Promise<void> {
  const { includeSamples = false, hierarchyData } = options;
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DHUUD Platform';
  workbook.created = new Date();
  
  // Create main Users sheet
  const usersSheet = workbook.addWorksheet('Users', {
    views: [{ state: 'frozen', ySplit: 2 }]
  });
  
  // Add headers (Row 1)
  const headerRow = usersSheet.addRow(TEMPLATE_HEADERS);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // Add instructions (Row 2)
  const instructionRow = usersSheet.addRow(TEMPLATE_INSTRUCTIONS);
  instructionRow.eachCell((cell) => {
    cell.font = { italic: true, size: 9, color: { argb: 'FF666666' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' }
    };
    cell.alignment = { wrapText: true, vertical: 'top' };
  });
  
  // Add sample data if requested
  if (includeSamples) {
    SAMPLE_DATA.forEach(row => {
      usersSheet.addRow(row);
    });
  }
  
  // Set column widths
  usersSheet.columns = [
    { width: 25 }, // Full Name
    { width: 30 }, // Email
    { width: 18 }, // Phone
    { width: 22 }, // User Type
    { width: 15 }, // Employee ID
    { width: 20 }, // Job Title
    { width: 12 }, // Has Login
    { width: 20 }, // Branch
    { width: 20 }, // Division
    { width: 20 }, // Department
    { width: 20 }, // Section
    { width: 35 }, // Roles
  ];
  
  // Create Lookup sheet if hierarchy data is provided
  if (hierarchyData) {
    const lookupSheet = workbook.addWorksheet('Lookup', {
      state: 'veryHidden' // Hide the lookup sheet
    });
    
    // Add headers to lookup sheet
    lookupSheet.getCell('A1').value = 'Branches';
    lookupSheet.getCell('B1').value = 'Divisions';
    lookupSheet.getCell('C1').value = 'Departments';
    lookupSheet.getCell('D1').value = 'Sections';
    lookupSheet.getCell('E1').value = 'Roles';
    
    // Populate lookup data
    const maxRows = Math.max(
      hierarchyData.branches.length,
      hierarchyData.divisions.length,
      hierarchyData.departments.length,
      hierarchyData.sections.length,
      hierarchyData.roles.length
    );
    
    for (let i = 0; i < maxRows; i++) {
      if (hierarchyData.branches[i]) lookupSheet.getCell(`A${i + 2}`).value = hierarchyData.branches[i];
      if (hierarchyData.divisions[i]) lookupSheet.getCell(`B${i + 2}`).value = hierarchyData.divisions[i];
      if (hierarchyData.departments[i]) lookupSheet.getCell(`C${i + 2}`).value = hierarchyData.departments[i];
      if (hierarchyData.sections[i]) lookupSheet.getCell(`D${i + 2}`).value = hierarchyData.sections[i];
      if (hierarchyData.roles[i]) lookupSheet.getCell(`E${i + 2}`).value = hierarchyData.roles[i];
    }
    
    // Define the range for data validation (rows 3 to 1000)
    const dataStartRow = 3;
    const dataEndRow = 1000;
    
    // Add data validation for User Type (Column D)
    for (let row = dataStartRow; row <= dataEndRow; row++) {
      usersSheet.getCell(`D${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"employee,contractor_longterm,contractor_shortterm,member,visitor"'],
        showErrorMessage: true,
        errorTitle: 'Invalid User Type',
        error: 'Please select a valid user type from the dropdown list.'
      };
    }
    
    // Add data validation for Has Login (Column G)
    for (let row = dataStartRow; row <= dataEndRow; row++) {
      usersSheet.getCell(`G${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"TRUE,FALSE"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Value',
        error: 'Please select TRUE or FALSE.'
      };
    }
    
    // Add data validation for Branch (Column H)
    if (hierarchyData.branches.length > 0) {
      const branchRange = `Lookup!$A$2:$A$${hierarchyData.branches.length + 1}`;
      for (let row = dataStartRow; row <= dataEndRow; row++) {
        usersSheet.getCell(`H${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [branchRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Branch',
          error: 'Please select a valid branch from the dropdown list.'
        };
      }
    }
    
    // Add data validation for Division (Column I)
    if (hierarchyData.divisions.length > 0) {
      const divisionRange = `Lookup!$B$2:$B$${hierarchyData.divisions.length + 1}`;
      for (let row = dataStartRow; row <= dataEndRow; row++) {
        usersSheet.getCell(`I${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [divisionRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Division',
          error: 'Please select a valid division from the dropdown list.'
        };
      }
    }
    
    // Add data validation for Department (Column J)
    if (hierarchyData.departments.length > 0) {
      const deptRange = `Lookup!$C$2:$C$${hierarchyData.departments.length + 1}`;
      for (let row = dataStartRow; row <= dataEndRow; row++) {
        usersSheet.getCell(`J${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [deptRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Department',
          error: 'Please select a valid department from the dropdown list.'
        };
      }
    }
    
    // Add data validation for Section (Column K)
    if (hierarchyData.sections.length > 0) {
      const sectionRange = `Lookup!$D$2:$D$${hierarchyData.sections.length + 1}`;
      for (let row = dataStartRow; row <= dataEndRow; row++) {
        usersSheet.getCell(`K${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [sectionRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Section',
          error: 'Please select a valid section from the dropdown list.'
        };
      }
    }
    
    // Add data validation for Roles (Column L) - Note: roles are comma-separated, so we show list but allow manual entry
    if (hierarchyData.roles.length > 0) {
      const rolesRange = `Lookup!$E$2:$E$${hierarchyData.roles.length + 1}`;
      for (let row = dataStartRow; row <= dataEndRow; row++) {
        usersSheet.getCell(`L${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [rolesRange],
          showErrorMessage: false, // Allow manual entry for comma-separated roles
          promptTitle: 'Role Selection',
          prompt: 'Select a role or type comma-separated role codes for multiple roles.'
        };
      }
    }
  } else {
    // If no hierarchy data, still add static dropdowns for User Type and Has Login
    const dataStartRow = 3;
    const dataEndRow = 1000;
    
    for (let row = dataStartRow; row <= dataEndRow; row++) {
      usersSheet.getCell(`D${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"employee,contractor_longterm,contractor_shortterm,member,visitor"'],
        showErrorMessage: true,
        errorTitle: 'Invalid User Type',
        error: 'Please select a valid user type from the dropdown list.'
      };
      
      usersSheet.getCell(`G${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"TRUE,FALSE"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Value',
        error: 'Please select TRUE or FALSE.'
      };
    }
  }
  
  // Generate file and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = includeSamples ? 'user_import_template_with_samples.xlsx' : 'user_import_template.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Legacy function for backward compatibility (deprecated)
export function generateImportTemplateLegacy(includeSamples: boolean = false): void {
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
