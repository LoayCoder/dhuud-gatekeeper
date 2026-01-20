/**
 * Asset Hierarchy Import/Export Utilities
 * Generates Excel templates, exports existing data, and parses uploaded files 
 * for bulk importing asset categories, types, subtypes, and inspectable parts.
 */

import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

// Hierarchy levels
export type HierarchyLevel = 'Category' | 'Type' | 'Subtype' | 'Part';

// Import mode for handling existing data
export type ImportMode = 'insert_only' | 'update_or_insert';

export interface ParsedHierarchyRow {
  level: HierarchyLevel;
  code: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  parentCode: string;
  isCritical: boolean;
  responseType: 'pass_fail' | 'condition_rating' | 'numeric';
  sortOrder: number;
  isValid: boolean;
  errors: string[];
  // Resolved IDs after processing (filled during import)
  resolvedId?: string;
  resolvedParentId?: string;
  // For tracking existing items
  existsInDb?: boolean;
  dbId?: string;
}

export interface ParseResult {
  rows: ParsedHierarchyRow[];
  categories: ParsedHierarchyRow[];
  types: ParsedHierarchyRow[];
  subtypes: ParsedHierarchyRow[];
  parts: ParsedHierarchyRow[];
  validCount: number;
  invalidCount: number;
  parseError?: string;
}

// Column aliases for flexible mapping
const COLUMN_ALIASES: Record<string, string[]> = {
  level: ['level', 'hierarchy', 'المستوى', 'type'],
  code: ['code', 'الكود', 'رمز'],
  nameEn: ['name_en', 'name', 'english_name', 'الاسم الإنجليزي', 'name (en)'],
  nameAr: ['name_ar', 'arabic_name', 'الاسم العربي', 'name (ar)', 'الاسم'],
  descriptionEn: ['description_en', 'description', 'desc', 'الوصف الإنجليزي', 'description (en)'],
  descriptionAr: ['description_ar', 'arabic_description', 'الوصف العربي', 'description (ar)', 'الوصف'],
  parentCode: ['parent_code', 'parent', 'الكود الأب', 'الأب'],
  isCritical: ['is_critical', 'critical', 'حرج', 'مهم'],
  responseType: ['response_type', 'type_response', 'نوع الاستجابة'],
  sortOrder: ['sort_order', 'order', 'sort', 'الترتيب'],
};

function normalizeColumnName(col: string): string | null {
  const normalized = col.toLowerCase().trim();
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some(alias => alias.toLowerCase() === normalized) || key.toLowerCase() === normalized) {
      return key;
    }
  }
  return null;
}

function parseLevel(value: string): HierarchyLevel | null {
  const normalized = value?.toLowerCase().trim();
  const levelMap: Record<string, HierarchyLevel> = {
    'category': 'Category',
    'cat': 'Category',
    'فئة': 'Category',
    'type': 'Type',
    'نوع': 'Type',
    'subtype': 'Subtype',
    'sub-type': 'Subtype',
    'sub': 'Subtype',
    'نوع فرعي': 'Subtype',
    'part': 'Part',
    'parts': 'Part',
    'جزء': 'Part',
    'قطعة': 'Part',
  };
  return levelMap[normalized] || null;
}

function parseBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const str = String(value).toLowerCase().trim();
  return ['yes', 'true', '1', 'نعم', 'y'].includes(str);
}

function parseResponseType(value: string): 'pass_fail' | 'condition_rating' | 'numeric' {
  const normalized = value?.toLowerCase().trim();
  if (['condition', 'condition_rating', 'rating', 'تقييم'].includes(normalized)) {
    return 'condition_rating';
  }
  if (['numeric', 'number', 'رقم'].includes(normalized)) {
    return 'numeric';
  }
  return 'pass_fail';
}

function generateCode(name: string, level: HierarchyLevel): string {
  // Generate a code from the name
  const cleanName = name
    .replace(/[^\w\s]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .slice(0, 20);
  return cleanName || `${level.toUpperCase()}_${Date.now()}`;
}

function validateRow(row: Partial<ParsedHierarchyRow>, allRows: Partial<ParsedHierarchyRow>[], index: number): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Level is required
  if (!row.level) {
    errors.push('Level is required (Category, Type, Subtype, or Part)');
  }
  
  // Name EN is required
  if (!row.nameEn || row.nameEn.trim().length < 1) {
    errors.push('Name (EN) is required');
  }
  
  // Parent code validation for non-Category levels
  if (row.level !== 'Category') {
    if (!row.parentCode || row.parentCode.trim().length < 1) {
      errors.push('Parent Code is required for Types, Subtypes, and Parts');
    } else {
      // Check if parent exists in previous rows
      const parentExists = allRows.slice(0, index).some(r => {
        const parentCode = r.code?.toLowerCase().trim();
        const expectedCode = row.parentCode?.toLowerCase().trim();
        return parentCode === expectedCode;
      });
      if (!parentExists) {
        errors.push(`Parent "${row.parentCode}" not found in previous rows`);
      }
    }
  }
  
  // Validate parent level hierarchy
  if (row.level === 'Type' && row.parentCode) {
    const parent = allRows.slice(0, index).find(r => r.code?.toLowerCase().trim() === row.parentCode?.toLowerCase().trim());
    if (parent && parent.level !== 'Category') {
      errors.push('Type must have a Category as parent');
    }
  }
  
  if (row.level === 'Subtype' && row.parentCode) {
    const parent = allRows.slice(0, index).find(r => r.code?.toLowerCase().trim() === row.parentCode?.toLowerCase().trim());
    if (parent && parent.level !== 'Type') {
      errors.push('Subtype must have a Type as parent');
    }
  }
  
  if (row.level === 'Part' && row.parentCode) {
    const parent = allRows.slice(0, index).find(r => r.code?.toLowerCase().trim() === row.parentCode?.toLowerCase().trim());
    if (parent && parent.level !== 'Type' && parent.level !== 'Subtype') {
      errors.push('Part must have a Type or Subtype as parent');
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Parse an Excel/CSV file containing asset hierarchy data
 */
export function parseHierarchyFile(data: ArrayBuffer): ParseResult {
  try {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames.find(name => 
      name.toLowerCase() !== 'instructions' && name.toLowerCase() !== 'lookups'
    ) || workbook.SheetNames[0];
    
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    
    if (jsonData.length === 0) {
      return {
        rows: [],
        categories: [],
        types: [],
        subtypes: [],
        parts: [],
        validCount: 0,
        invalidCount: 0,
        parseError: 'The file is empty or has no valid data rows',
      };
    }
    
    // First pass: map columns and create partial rows
    const partialRows: Partial<ParsedHierarchyRow>[] = jsonData.map((rawRow) => {
      const mapped: Partial<ParsedHierarchyRow> = {};
      
      for (const [key, value] of Object.entries(rawRow)) {
        const normalizedKey = normalizeColumnName(key);
        if (!normalizedKey) continue;
        
        const strValue = String(value).trim();
        
        switch (normalizedKey) {
          case 'level':
            mapped.level = parseLevel(strValue) || undefined;
            break;
          case 'code':
            mapped.code = strValue;
            break;
          case 'nameEn':
            mapped.nameEn = strValue;
            break;
          case 'nameAr':
            mapped.nameAr = strValue;
            break;
          case 'descriptionEn':
            mapped.descriptionEn = strValue;
            break;
          case 'descriptionAr':
            mapped.descriptionAr = strValue;
            break;
          case 'parentCode':
            mapped.parentCode = strValue;
            break;
          case 'isCritical':
            mapped.isCritical = parseBool(value);
            break;
          case 'responseType':
            mapped.responseType = parseResponseType(strValue);
            break;
          case 'sortOrder':
            mapped.sortOrder = parseInt(strValue, 10) || 0;
            break;
        }
      }
      
      // Auto-generate code if not provided
      if (!mapped.code && mapped.nameEn && mapped.level) {
        mapped.code = generateCode(mapped.nameEn, mapped.level);
      }
      
      return mapped;
    });
    
    // Second pass: validate and finalize rows
    const rows: ParsedHierarchyRow[] = partialRows.map((partial, index) => {
      const validation = validateRow(partial, partialRows, index);
      
      return {
        level: partial.level || 'Category',
        code: partial.code || '',
        nameEn: partial.nameEn || '',
        nameAr: partial.nameAr || '',
        descriptionEn: partial.descriptionEn,
        descriptionAr: partial.descriptionAr,
        parentCode: partial.parentCode || '',
        isCritical: partial.isCritical ?? false,
        responseType: partial.responseType || 'pass_fail',
        sortOrder: partial.sortOrder || index + 1,
        isValid: validation.isValid,
        errors: validation.errors,
      };
    });
    
    // Group by level
    const categories = rows.filter(r => r.level === 'Category');
    const types = rows.filter(r => r.level === 'Type');
    const subtypes = rows.filter(r => r.level === 'Subtype');
    const parts = rows.filter(r => r.level === 'Part');
    
    return {
      rows,
      categories,
      types,
      subtypes,
      parts,
      validCount: rows.filter(r => r.isValid).length,
      invalidCount: rows.filter(r => !r.isValid).length,
    };
  } catch (error) {
    return {
      rows: [],
      categories: [],
      types: [],
      subtypes: [],
      parts: [],
      validCount: 0,
      invalidCount: 0,
      parseError: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Generate and download an Excel template for asset hierarchy import
 */
export function downloadHierarchyTemplate(): void {
  // Instructions sheet
  const instructionsData = [
    ['Asset Hierarchy Import Template'],
    [''],
    ['Instructions:'],
    ['1. Use the "Hierarchy" sheet to enter your data'],
    ['2. Each row represents one item (Category, Type, Subtype, or Part)'],
    ['3. Items must be in hierarchical order - parents before children'],
    ['4. The Level column determines what kind of item it is'],
    ['5. Parent Code links the item to its parent (must match a Code from a previous row)'],
    [''],
    ['Column Descriptions:'],
    ['Level: Category, Type, Subtype, or Part'],
    ['Code: Unique identifier (auto-generated if empty)'],
    ['Name (EN): English name (required)'],
    ['Name (AR): Arabic name (optional)'],
    ['Description (EN): English description (Parts only)'],
    ['Description (AR): Arabic description (Parts only)'],
    ['Parent Code: The Code of the parent item (required for Type, Subtype, Part)'],
    ['Is Critical: Yes/No - marks Part as critical for inspection (Parts only)'],
    ['Response Type: pass_fail, condition_rating, or numeric (Parts only)'],
    ['Sort Order: Display order within the same level'],
  ];
  
  // Sample data sheet
  const hierarchyData = [
    {
      'Level': 'Category',
      'Code': 'FIRE',
      'Name (EN)': 'Fire Safety',
      'Name (AR)': 'السلامة من الحريق',
      'Description (EN)': '',
      'Description (AR)': '',
      'Parent Code': '',
      'Is Critical': '',
      'Response Type': '',
      'Sort Order': 1,
    },
    {
      'Level': 'Type',
      'Code': 'FE',
      'Name (EN)': 'Fire Extinguisher',
      'Name (AR)': 'طفاية الحريق',
      'Description (EN)': '',
      'Description (AR)': '',
      'Parent Code': 'FIRE',
      'Is Critical': '',
      'Response Type': '',
      'Sort Order': 1,
    },
    {
      'Level': 'Subtype',
      'Code': 'CO2',
      'Name (EN)': 'CO2',
      'Name (AR)': 'ثاني أكسيد الكربون',
      'Description (EN)': '',
      'Description (AR)': '',
      'Parent Code': 'FE',
      'Is Critical': '',
      'Response Type': '',
      'Sort Order': 1,
    },
    {
      'Level': 'Part',
      'Code': 'CYL_BODY',
      'Name (EN)': 'Cylinder Body',
      'Name (AR)': 'جسم الأسطوانة',
      'Description (EN)': 'Check for damage and corrosion',
      'Description (AR)': 'فحص التلف والتآكل',
      'Parent Code': 'CO2',
      'Is Critical': 'Yes',
      'Response Type': 'pass_fail',
      'Sort Order': 1,
    },
    {
      'Level': 'Part',
      'Code': 'SAFETY_PIN',
      'Name (EN)': 'Safety Pin',
      'Name (AR)': 'دبوس الأمان',
      'Description (EN)': 'Verify pin is intact and sealed',
      'Description (AR)': 'التحقق من سلامة الدبوس والختم',
      'Parent Code': 'CO2',
      'Is Critical': 'Yes',
      'Response Type': 'pass_fail',
      'Sort Order': 2,
    },
    {
      'Level': 'Part',
      'Code': 'PRESSURE_GAUGE',
      'Name (EN)': 'Pressure Gauge',
      'Name (AR)': 'مقياس الضغط',
      'Description (EN)': 'Check gauge is in green zone',
      'Description (AR)': 'التحقق من المقياس في المنطقة الخضراء',
      'Parent Code': 'CO2',
      'Is Critical': 'Yes',
      'Response Type': 'pass_fail',
      'Sort Order': 3,
    },
  ];
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Add instructions sheet
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
  
  // Add hierarchy sheet
  const wsHierarchy = XLSX.utils.json_to_sheet(hierarchyData);
  
  // Set column widths
  wsHierarchy['!cols'] = [
    { wch: 12 },  // Level
    { wch: 15 },  // Code
    { wch: 25 },  // Name (EN)
    { wch: 25 },  // Name (AR)
    { wch: 35 },  // Description (EN)
    { wch: 35 },  // Description (AR)
    { wch: 15 },  // Parent Code
    { wch: 12 },  // Is Critical
    { wch: 18 },  // Response Type
    { wch: 12 },  // Sort Order
  ];
  
  XLSX.utils.book_append_sheet(wb, wsHierarchy, 'Hierarchy');
  
  // Download file
  XLSX.writeFile(wb, 'asset_hierarchy_import_template.xlsx');
}

/**
 * Export existing asset hierarchy to Excel file
 */
export async function exportAssetHierarchy(): Promise<boolean> {
  try {
    // Get tenant ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.tenant_id) throw new Error('No tenant ID found');
    const tenantId = profile.tenant_id;

    // Fetch all data
    const [categoriesRes, typesRes, subtypesRes, partsRes] = await Promise.all([
      supabase
        .from('asset_categories')
        .select('id, code, name, name_ar, sort_order')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('sort_order'),
      supabase
        .from('asset_types')
        .select('id, code, name, name_ar, category_id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('asset_subtypes')
        .select('id, code, name, name_ar, type_id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('asset_type_parts')
        .select('id, code, name, name_ar, description, description_ar, type_id, subtype_id, is_critical, default_response_type, sort_order')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('sort_order'),
    ]);

    const categories = categoriesRes.data || [];
    const types = typesRes.data || [];
    const subtypes = subtypesRes.data || [];
    const parts = partsRes.data || [];

    if (categories.length === 0 && types.length === 0) {
      return false; // No data to export
    }

    // Build code lookup maps
    const categoryIdToCode: Record<string, string> = {};
    const typeIdToCode: Record<string, string> = {};
    const subtypeIdToCode: Record<string, string> = {};

    categories.forEach(c => { categoryIdToCode[c.id] = c.code; });
    types.forEach(t => { typeIdToCode[t.id] = t.code; });
    subtypes.forEach(s => { subtypeIdToCode[s.id] = s.code; });

    // Build hierarchical export data
    const exportData: Record<string, unknown>[] = [];

    // Add categories
    categories.forEach(cat => {
      exportData.push({
        'Level': 'Category',
        'Code': cat.code,
        'Name (EN)': cat.name,
        'Name (AR)': cat.name_ar || '',
        'Description (EN)': '',
        'Description (AR)': '',
        'Parent Code': '',
        'Is Critical': '',
        'Response Type': '',
        'Sort Order': cat.sort_order || 1,
      });

      // Add types for this category
      const catTypes = types.filter(t => t.category_id === cat.id);
      catTypes.forEach((type, typeIdx) => {
        exportData.push({
          'Level': 'Type',
          'Code': type.code,
          'Name (EN)': type.name,
          'Name (AR)': type.name_ar || '',
          'Description (EN)': '',
          'Description (AR)': '',
          'Parent Code': cat.code,
          'Is Critical': '',
          'Response Type': '',
          'Sort Order': typeIdx + 1,
        });

        // Add parts directly under type (no subtype)
        const typeParts = parts.filter(p => p.type_id === type.id && !p.subtype_id);
        typeParts.forEach(part => {
          exportData.push({
            'Level': 'Part',
            'Code': part.code || '',
            'Name (EN)': part.name,
            'Name (AR)': part.name_ar || '',
            'Description (EN)': part.description || '',
            'Description (AR)': part.description_ar || '',
            'Parent Code': type.code,
            'Is Critical': part.is_critical ? 'Yes' : 'No',
            'Response Type': part.default_response_type || 'pass_fail',
            'Sort Order': part.sort_order || 1,
          });
        });

        // Add subtypes for this type
        const typeSubtypes = subtypes.filter(s => s.type_id === type.id);
        typeSubtypes.forEach((subtype, subtypeIdx) => {
          exportData.push({
            'Level': 'Subtype',
            'Code': subtype.code,
            'Name (EN)': subtype.name,
            'Name (AR)': subtype.name_ar || '',
            'Description (EN)': '',
            'Description (AR)': '',
            'Parent Code': type.code,
            'Is Critical': '',
            'Response Type': '',
            'Sort Order': subtypeIdx + 1,
          });

          // Add parts for this subtype
          const subtypeParts = parts.filter(p => p.subtype_id === subtype.id);
          subtypeParts.forEach(part => {
            exportData.push({
              'Level': 'Part',
              'Code': part.code || '',
              'Name (EN)': part.name,
              'Name (AR)': part.name_ar || '',
              'Description (EN)': part.description || '',
              'Description (AR)': part.description_ar || '',
              'Parent Code': subtype.code,
              'Is Critical': part.is_critical ? 'Yes' : 'No',
              'Response Type': part.default_response_type || 'pass_fail',
              'Sort Order': part.sort_order || 1,
            });
          });
        });
      });
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 },  // Level
      { wch: 20 },  // Code
      { wch: 30 },  // Name (EN)
      { wch: 30 },  // Name (AR)
      { wch: 40 },  // Description (EN)
      { wch: 40 },  // Description (AR)
      { wch: 20 },  // Parent Code
      { wch: 12 },  // Is Critical
      { wch: 18 },  // Response Type
      { wch: 12 },  // Sort Order
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Hierarchy');

    // Download file
    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `asset_hierarchy_export_${timestamp}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Failed to export asset hierarchy:', error);
    return false;
  }
}
