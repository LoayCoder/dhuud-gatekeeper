import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

export interface ImportAsset {
  name: string;
  description?: string;
  category_name: string;
  type_name: string;
  subtype_name?: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  branch_name?: string;
  site_name?: string;
  building_name?: string;
  floor_zone_name?: string;
  status?: string;
  condition_rating?: string;
  criticality_level?: string;
  installation_date?: string;
  commissioning_date?: string;
  warranty_expiry_date?: string;
  inspection_interval_days?: number;
  tags?: string;
}

export interface AssetValidationError {
  row: number;
  field: string;
  message: string;
}

export interface AssetValidationWarning {
  row: number;
  message: string;
}

export interface AssetImportValidationResult {
  valid: boolean;
  errors: AssetValidationError[];
  warnings: AssetValidationWarning[];
  assets: ImportAsset[];
  validAssets: ImportAsset[];
}

const VALID_STATUSES = ['active', 'out_of_service', 'under_maintenance', 'retired', 'missing'];
const VALID_CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'critical'];
const VALID_CRITICALITY = ['low', 'medium', 'high', 'critical'];

const TEMPLATE_HEADERS = [
  'Name*',
  'Category*',
  'Type*',
  'Subtype',
  'Serial Number',
  'Manufacturer',
  'Model',
  'Description',
  'Branch',
  'Site',
  'Building',
  'Floor/Zone',
  'Status',
  'Condition',
  'Criticality',
  'Installation Date',
  'Commissioning Date',
  'Warranty Expiry',
  'Inspection Interval (days)',
  'Tags'
];

const TEMPLATE_INSTRUCTIONS = [
  'Required - Asset name',
  'Required - Select from dropdown',
  'Required - Select from dropdown',
  'Optional - Select from dropdown',
  'Unique serial/asset number',
  'Manufacturer name',
  'Model number/name',
  'Asset description',
  'Branch location',
  'Site within branch',
  'Building within site',
  'Floor or zone within building',
  'active, out_of_service, under_maintenance, retired, missing',
  'excellent, good, fair, poor, critical',
  'low, medium, high, critical',
  'YYYY-MM-DD format',
  'YYYY-MM-DD format',
  'YYYY-MM-DD format',
  'Number of days between inspections',
  'Comma-separated tags'
];

const SAMPLE_DATA = [
  ['Fire Extinguisher ABC-001', 'Fire Safety', 'Fire Extinguisher', 'ABC Powder', 'FE-2024-001', 'Kidde', 'Pro 210', 'Main lobby fire extinguisher', 'Head Office', 'Main Building', 'Tower A', 'Ground Floor', 'active', 'excellent', 'high', '2024-01-15', '2024-02-01', '2029-01-15', '365', 'fire,safety,lobby'],
  ['CCTV Camera - Entrance', 'Security', 'CCTV Camera', 'Dome Camera', 'CAM-2024-001', 'Hikvision', 'DS-2CD2143G2', 'Main entrance surveillance camera', 'Head Office', 'Main Building', 'Tower A', 'Ground Floor', 'active', 'good', 'medium', '2024-03-01', '2024-03-15', '2027-03-01', '180', 'security,surveillance'],
  ['Emergency Exit Sign', 'Health & Safety', 'Emergency Signs', '', 'EXIT-001', 'ExitLite', 'EL-200', 'Illuminated exit sign', 'Head Office', 'Main Building', 'Tower A', 'Floor 1', 'active', 'good', 'high', '2023-06-01', '2023-06-15', '', '365', 'emergency,signage'],
];

export interface AssetHierarchyData {
  categories: { id: string; name: string; code: string }[];
  types: { id: string; name: string; code: string; category_id: string; category_name?: string }[];
  subtypes: { id: string; name: string; code: string; type_id: string; type_name?: string }[];
  branches: { id: string; name: string }[];
  sites: { id: string; name: string; branch_id: string }[];
  buildings: { id: string; name: string; site_id: string }[];
  floorsZones: { id: string; name: string; building_id: string }[];
}

export interface AssetTemplateLookupData {
  categories: string[];
  types: string[];
  subtypes: string[];
  branches: string[];
  sites: string[];
  buildings: string[];
  floorsZones: string[];
}

export interface GenerateAssetTemplateOptions {
  includeSamples?: boolean;
  lookupData?: AssetTemplateLookupData;
}

export async function generateAssetImportTemplate(options: GenerateAssetTemplateOptions = {}): Promise<void> {
  const { includeSamples = false, lookupData } = options;
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DHUUD Platform';
  workbook.created = new Date();
  
  // Create main Assets sheet
  const assetsSheet = workbook.addWorksheet('Assets', {
    views: [{ state: 'frozen', ySplit: 2 }]
  });
  
  // Add headers (Row 1)
  const headerRow = assetsSheet.addRow(TEMPLATE_HEADERS);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E7D32' } // Green for assets
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
  const instructionRow = assetsSheet.addRow(TEMPLATE_INSTRUCTIONS);
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
      assetsSheet.addRow(row);
    });
  }
  
  // Set column widths
  assetsSheet.columns = [
    { width: 30 }, // Name
    { width: 18 }, // Category
    { width: 20 }, // Type
    { width: 18 }, // Subtype
    { width: 18 }, // Serial Number
    { width: 15 }, // Manufacturer
    { width: 15 }, // Model
    { width: 30 }, // Description
    { width: 18 }, // Branch
    { width: 18 }, // Site
    { width: 18 }, // Building
    { width: 18 }, // Floor/Zone
    { width: 15 }, // Status
    { width: 12 }, // Condition
    { width: 12 }, // Criticality
    { width: 15 }, // Installation Date
    { width: 18 }, // Commissioning Date
    { width: 15 }, // Warranty Expiry
    { width: 20 }, // Inspection Interval
    { width: 25 }, // Tags
  ];
  
  // Create Lookup sheet if lookup data is provided
  if (lookupData) {
    const lookupSheet = workbook.addWorksheet('Lookup', {
      state: 'veryHidden' // Hide the lookup sheet
    });
    
    // Add headers to lookup sheet
    lookupSheet.getCell('A1').value = 'Categories';
    lookupSheet.getCell('B1').value = 'Types';
    lookupSheet.getCell('C1').value = 'Subtypes';
    lookupSheet.getCell('D1').value = 'Branches';
    lookupSheet.getCell('E1').value = 'Sites';
    lookupSheet.getCell('F1').value = 'Buildings';
    lookupSheet.getCell('G1').value = 'FloorsZones';
    
    // Populate lookup data
    const maxRows = Math.max(
      lookupData.categories.length,
      lookupData.types.length,
      lookupData.subtypes.length,
      lookupData.branches.length,
      lookupData.sites.length,
      lookupData.buildings.length,
      lookupData.floorsZones.length
    );
    
    for (let i = 0; i < maxRows; i++) {
      if (lookupData.categories[i]) lookupSheet.getCell(`A${i + 2}`).value = lookupData.categories[i];
      if (lookupData.types[i]) lookupSheet.getCell(`B${i + 2}`).value = lookupData.types[i];
      if (lookupData.subtypes[i]) lookupSheet.getCell(`C${i + 2}`).value = lookupData.subtypes[i];
      if (lookupData.branches[i]) lookupSheet.getCell(`D${i + 2}`).value = lookupData.branches[i];
      if (lookupData.sites[i]) lookupSheet.getCell(`E${i + 2}`).value = lookupData.sites[i];
      if (lookupData.buildings[i]) lookupSheet.getCell(`F${i + 2}`).value = lookupData.buildings[i];
      if (lookupData.floorsZones[i]) lookupSheet.getCell(`G${i + 2}`).value = lookupData.floorsZones[i];
    }
    
    // Define the range for data validation (rows 3 to 1000)
    const dataStartRow = 3;
    const dataEndRow = 1000;
    
    // Add data validation for Category (Column B)
    if (lookupData.categories.length > 0) {
      const categoryRange = `Lookup!$A$2:$A$${lookupData.categories.length + 1}`;
      for (let row = dataStartRow; row <= dataEndRow; row++) {
        assetsSheet.getCell(`B${row}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [categoryRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Category',
          error: 'Please select a valid category from the dropdown list.'
        };
      }
    }
    
    // Add data validation for Type (Column C)
    if (lookupData.types.length > 0) {
      const typeRange = `Lookup!$B$2:$B$${lookupData.types.length + 1}`;
      for (let row = dataStartRow; row <= dataEndRow; row++) {
        assetsSheet.getCell(`C${row}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [typeRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Type',
          error: 'Please select a valid type from the dropdown list.'
        };
      }
    }
    
    // Add data validation for Subtype (Column D)
    if (lookupData.subtypes.length > 0) {
      const subtypeRange = `Lookup!$C$2:$C$${lookupData.subtypes.length + 1}`;
      for (let row = dataStartRow; row <= dataEndRow; row++) {
        assetsSheet.getCell(`D${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [subtypeRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Subtype',
          error: 'Please select a valid subtype from the dropdown list.'
        };
      }
    }
    
    // Add data validation for Branch (Column I)
    if (lookupData.branches.length > 0) {
      const branchRange = `Lookup!$D$2:$D$${lookupData.branches.length + 1}`;
      for (let row = dataStartRow; row <= dataEndRow; row++) {
        assetsSheet.getCell(`I${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [branchRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Branch',
          error: 'Please select a valid branch from the dropdown list.'
        };
      }
    }
    
    // Add data validation for Site (Column J)
    if (lookupData.sites.length > 0) {
      const siteRange = `Lookup!$E$2:$E$${lookupData.sites.length + 1}`;
      for (let row = dataStartRow; row <= dataEndRow; row++) {
        assetsSheet.getCell(`J${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [siteRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Site',
          error: 'Please select a valid site from the dropdown list.'
        };
      }
    }
    
    // Add data validation for Building (Column K)
    if (lookupData.buildings.length > 0) {
      const buildingRange = `Lookup!$F$2:$F$${lookupData.buildings.length + 1}`;
      for (let row = dataStartRow; row <= dataEndRow; row++) {
        assetsSheet.getCell(`K${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [buildingRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Building',
          error: 'Please select a valid building from the dropdown list.'
        };
      }
    }
    
    // Add data validation for Floor/Zone (Column L)
    if (lookupData.floorsZones.length > 0) {
      const floorZoneRange = `Lookup!$G$2:$G$${lookupData.floorsZones.length + 1}`;
      for (let row = dataStartRow; row <= dataEndRow; row++) {
        assetsSheet.getCell(`L${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [floorZoneRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Floor/Zone',
          error: 'Please select a valid floor/zone from the dropdown list.'
        };
      }
    }
    
    // Add data validation for Status (Column M)
    for (let row = dataStartRow; row <= dataEndRow; row++) {
      assetsSheet.getCell(`M${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"active,out_of_service,under_maintenance,retired,missing"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Status',
        error: 'Please select a valid status from the dropdown list.'
      };
    }
    
    // Add data validation for Condition (Column N)
    for (let row = dataStartRow; row <= dataEndRow; row++) {
      assetsSheet.getCell(`N${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"excellent,good,fair,poor,critical"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Condition',
        error: 'Please select a valid condition from the dropdown list.'
      };
    }
    
    // Add data validation for Criticality (Column O)
    for (let row = dataStartRow; row <= dataEndRow; row++) {
      assetsSheet.getCell(`O${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"low,medium,high,critical"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Criticality',
        error: 'Please select a valid criticality level from the dropdown list.'
      };
    }
  } else {
    // Static dropdowns if no lookup data provided
    const dataStartRow = 3;
    const dataEndRow = 1000;
    
    for (let row = dataStartRow; row <= dataEndRow; row++) {
      assetsSheet.getCell(`M${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"active,out_of_service,under_maintenance,retired,missing"'],
        showErrorMessage: true
      };
      
      assetsSheet.getCell(`N${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"excellent,good,fair,poor,critical"'],
        showErrorMessage: true
      };
      
      assetsSheet.getCell(`O${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"low,medium,high,critical"'],
        showErrorMessage: true
      };
    }
  }
  
  // Generate file and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = includeSamples ? 'asset_import_template_with_samples.xlsx' : 'asset_import_template.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseAssetExcelFile(file: File): Promise<ImportAsset[]> {
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
        
        const assets: ImportAsset[] = dataRows
          .filter(row => row && row[0]) // Filter out empty rows
          .map(row => ({
            name: String(row[0] || '').trim(),
            category_name: String(row[1] || '').trim(),
            type_name: String(row[2] || '').trim(),
            subtype_name: String(row[3] || '').trim() || undefined,
            serial_number: String(row[4] || '').trim() || undefined,
            manufacturer: String(row[5] || '').trim() || undefined,
            model: String(row[6] || '').trim() || undefined,
            description: String(row[7] || '').trim() || undefined,
            branch_name: String(row[8] || '').trim() || undefined,
            site_name: String(row[9] || '').trim() || undefined,
            building_name: String(row[10] || '').trim() || undefined,
            floor_zone_name: String(row[11] || '').trim() || undefined,
            status: String(row[12] || '').toLowerCase().trim() || undefined,
            condition_rating: String(row[13] || '').toLowerCase().trim() || undefined,
            criticality_level: String(row[14] || '').toLowerCase().trim() || undefined,
            installation_date: parseDate(row[15]),
            commissioning_date: parseDate(row[16]),
            warranty_expiry_date: parseDate(row[17]),
            inspection_interval_days: parseNumber(row[18]),
            tags: String(row[19] || '').trim() || undefined,
          }));
        
        resolve(assets);
      } catch (error) {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function parseDate(value: unknown): string | undefined {
  if (!value) return undefined;
  
  // Handle Excel date serial numbers
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  const strValue = String(value).trim();
  if (!strValue) return undefined;
  
  // Try to parse as ISO date
  const dateMatch = strValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) return strValue;
  
  // Try common date formats
  const parsed = new Date(strValue);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return undefined;
}

function parseNumber(value: unknown): number | undefined {
  if (!value) return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : Math.round(num);
}

export interface AssetLookupMaps {
  categories: Map<string, string>; // name -> id
  types: Map<string, { id: string; category_id: string }>; // name -> { id, category_id }
  subtypes: Map<string, { id: string; type_id: string }>; // name -> { id, type_id }
  branches: Map<string, string>; // name -> id
  sites: Map<string, { id: string; branch_id: string }>; // name -> { id, branch_id }
  buildings: Map<string, { id: string; site_id: string }>; // name -> { id, site_id }
  floorsZones: Map<string, { id: string; building_id: string }>; // name -> { id, building_id }
}

export function validateAssetImportData(
  assets: ImportAsset[],
  lookup: AssetLookupMaps,
  existingSerialNumbers: Set<string>
): AssetImportValidationResult {
  const errors: AssetValidationError[] = [];
  const warnings: AssetValidationWarning[] = [];
  const validAssets: ImportAsset[] = [];
  const seenSerialNumbers = new Set<string>();
  
  assets.forEach((asset, index) => {
    const row = index + 3; // Account for header + instruction rows
    let hasError = false;
    
    // Required field: name
    if (!asset.name) {
      errors.push({ row, field: 'name', message: 'fieldRequired' });
      hasError = true;
    }
    
    // Required field: category_name
    if (!asset.category_name) {
      errors.push({ row, field: 'category', message: 'fieldRequired' });
      hasError = true;
    } else if (!lookup.categories.has(asset.category_name.toLowerCase())) {
      errors.push({ row, field: 'category', message: 'categoryNotFound' });
      hasError = true;
    }
    
    // Required field: type_name
    if (!asset.type_name) {
      errors.push({ row, field: 'type', message: 'fieldRequired' });
      hasError = true;
    } else {
      const typeInfo = lookup.types.get(asset.type_name.toLowerCase());
      if (!typeInfo) {
        errors.push({ row, field: 'type', message: 'typeNotFound' });
        hasError = true;
      } else if (asset.category_name) {
        // Verify type belongs to the selected category
        const categoryId = lookup.categories.get(asset.category_name.toLowerCase());
        if (categoryId && typeInfo.category_id !== categoryId) {
          errors.push({ row, field: 'type', message: 'typeCategoryMismatch' });
          hasError = true;
        }
      }
    }
    
    // Validate subtype if provided
    if (asset.subtype_name) {
      const subtypeInfo = lookup.subtypes.get(asset.subtype_name.toLowerCase());
      if (!subtypeInfo) {
        errors.push({ row, field: 'subtype', message: 'subtypeNotFound' });
        hasError = true;
      } else if (asset.type_name) {
        // Verify subtype belongs to the selected type
        const typeInfo = lookup.types.get(asset.type_name.toLowerCase());
        if (typeInfo && subtypeInfo.type_id !== typeInfo.id) {
          errors.push({ row, field: 'subtype', message: 'subtypeTypeMismatch' });
          hasError = true;
        }
      }
    }
    
    // Check for duplicate serial numbers
    if (asset.serial_number) {
      const lowerSerial = asset.serial_number.toLowerCase();
      if (existingSerialNumbers.has(lowerSerial) || seenSerialNumbers.has(lowerSerial)) {
        errors.push({ row, field: 'serial_number', message: 'duplicateSerialNumber' });
        hasError = true;
      } else {
        seenSerialNumbers.add(lowerSerial);
      }
    }
    
    // Validate location hierarchy
    if (asset.branch_name && !lookup.branches.has(asset.branch_name.toLowerCase())) {
      errors.push({ row, field: 'branch', message: 'branchNotFound' });
      hasError = true;
    }
    
    if (asset.site_name) {
      const siteInfo = lookup.sites.get(asset.site_name.toLowerCase());
      if (!siteInfo) {
        errors.push({ row, field: 'site', message: 'siteNotFound' });
        hasError = true;
      } else if (asset.branch_name) {
        const branchId = lookup.branches.get(asset.branch_name.toLowerCase());
        if (branchId && siteInfo.branch_id !== branchId) {
          warnings.push({ row, message: 'siteBranchMismatch' });
        }
      }
    }
    
    if (asset.building_name) {
      const buildingInfo = lookup.buildings.get(asset.building_name.toLowerCase());
      if (!buildingInfo) {
        errors.push({ row, field: 'building', message: 'buildingNotFound' });
        hasError = true;
      } else if (asset.site_name) {
        const siteInfo = lookup.sites.get(asset.site_name.toLowerCase());
        if (siteInfo && buildingInfo.site_id !== siteInfo.id) {
          warnings.push({ row, message: 'buildingSiteMismatch' });
        }
      }
    }
    
    if (asset.floor_zone_name) {
      const floorZoneInfo = lookup.floorsZones.get(asset.floor_zone_name.toLowerCase());
      if (!floorZoneInfo) {
        errors.push({ row, field: 'floor_zone', message: 'floorZoneNotFound' });
        hasError = true;
      } else if (asset.building_name) {
        const buildingInfo = lookup.buildings.get(asset.building_name.toLowerCase());
        if (buildingInfo && floorZoneInfo.building_id !== buildingInfo.id) {
          warnings.push({ row, message: 'floorZoneBuildingMismatch' });
        }
      }
    }
    
    // Validate status if provided
    if (asset.status && !VALID_STATUSES.includes(asset.status)) {
      errors.push({ row, field: 'status', message: 'invalidStatus' });
      hasError = true;
    }
    
    // Validate condition if provided
    if (asset.condition_rating && !VALID_CONDITIONS.includes(asset.condition_rating)) {
      errors.push({ row, field: 'condition', message: 'invalidCondition' });
      hasError = true;
    }
    
    // Validate criticality if provided
    if (asset.criticality_level && !VALID_CRITICALITY.includes(asset.criticality_level)) {
      errors.push({ row, field: 'criticality', message: 'invalidCriticality' });
      hasError = true;
    }
    
    // Validate dates
    if (asset.installation_date && !isValidDate(asset.installation_date)) {
      warnings.push({ row, message: 'invalidInstallationDate' });
    }
    
    if (asset.commissioning_date && !isValidDate(asset.commissioning_date)) {
      warnings.push({ row, message: 'invalidCommissioningDate' });
    }
    
    if (asset.warranty_expiry_date && !isValidDate(asset.warranty_expiry_date)) {
      warnings.push({ row, message: 'invalidWarrantyDate' });
    }
    
    // Validate inspection interval
    if (asset.inspection_interval_days !== undefined && asset.inspection_interval_days < 1) {
      warnings.push({ row, message: 'invalidInspectionInterval' });
    }
    
    if (!hasError) {
      validAssets.push(asset);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    assets,
    validAssets,
  };
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export function mapAssetToIds(
  asset: ImportAsset,
  lookup: AssetLookupMaps
): {
  category_id?: string;
  type_id?: string;
  subtype_id?: string;
  branch_id?: string;
  site_id?: string;
  building_id?: string;
  floor_zone_id?: string;
} {
  const result: {
    category_id?: string;
    type_id?: string;
    subtype_id?: string;
    branch_id?: string;
    site_id?: string;
    building_id?: string;
    floor_zone_id?: string;
  } = {};
  
  if (asset.category_name) {
    result.category_id = lookup.categories.get(asset.category_name.toLowerCase());
  }
  
  if (asset.type_name) {
    const typeInfo = lookup.types.get(asset.type_name.toLowerCase());
    if (typeInfo) result.type_id = typeInfo.id;
  }
  
  if (asset.subtype_name) {
    const subtypeInfo = lookup.subtypes.get(asset.subtype_name.toLowerCase());
    if (subtypeInfo) result.subtype_id = subtypeInfo.id;
  }
  
  if (asset.branch_name) {
    result.branch_id = lookup.branches.get(asset.branch_name.toLowerCase());
  }
  
  if (asset.site_name) {
    const siteInfo = lookup.sites.get(asset.site_name.toLowerCase());
    if (siteInfo) result.site_id = siteInfo.id;
  }
  
  if (asset.building_name) {
    const buildingInfo = lookup.buildings.get(asset.building_name.toLowerCase());
    if (buildingInfo) result.building_id = buildingInfo.id;
  }
  
  if (asset.floor_zone_name) {
    const floorZoneInfo = lookup.floorsZones.get(asset.floor_zone_name.toLowerCase());
    if (floorZoneInfo) result.floor_zone_id = floorZoneInfo.id;
  }
  
  return result;
}

export function generateAssetCode(categoryCode: string, sequence: number): string {
  const year = new Date().getFullYear();
  const paddedSequence = String(sequence).padStart(4, '0');
  // Strip TEST- prefix if present (for production-safe codes)
  const cleanCode = categoryCode.replace(/^TEST-/i, '');
  return `${cleanCode}-${year}-${paddedSequence}`;
}
