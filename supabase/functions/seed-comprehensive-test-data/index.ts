import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Realistic Saudi Arabian context data
const BRANCHES = [
  { name: 'Riyadh Headquarters', location: 'King Fahd Road, Al Olaya District, Riyadh' },
  { name: 'Jeddah Regional Office', location: 'Prince Sultan Street, Al Rawdah District, Jeddah' },
  { name: 'Dammam Industrial Complex', location: 'Industrial Area 2, Dammam' },
]

const SITES_PER_BRANCH = [
  [
    { name: 'Main Manufacturing Plant', address: 'Riyadh Industrial City' },
    { name: 'Central Warehouse', address: 'Al Sulay District, Riyadh' },
  ],
  [
    { name: 'Jeddah Port Facility', address: 'Jeddah Islamic Port' },
    { name: 'Distribution Center', address: 'Al Khalidiyah, Jeddah' },
  ],
  [
    { name: 'Petrochemical Plant', address: 'Jubail Industrial City' },
    { name: 'Equipment Yard', address: 'Dammam Port Area' },
  ],
]

const BUILDINGS = [
  { name: 'Administration Building', name_ar: 'مبنى الإدارة' },
  { name: 'Production Hall A', name_ar: 'صالة الإنتاج أ' },
  { name: 'Warehouse Block 1', name_ar: 'مبنى المستودعات 1' },
  { name: 'Maintenance Workshop', name_ar: 'ورشة الصيانة' },
]

const FLOORS = [
  { name: 'Ground Floor', name_ar: 'الطابق الأرضي' },
  { name: 'First Floor', name_ar: 'الطابق الأول' },
  { name: 'Mezzanine', name_ar: 'الميزانين' },
]

const DIVISIONS = [
  { name: 'Operations' },
  { name: 'Health, Safety & Environment' },
  { name: 'Engineering' },
  { name: 'Administration' },
]

const DEPARTMENTS = [
  { name: 'Production', division: 'Operations' },
  { name: 'Quality Control', division: 'Operations' },
  { name: 'Occupational Safety', division: 'Health, Safety & Environment' },
  { name: 'Environmental Affairs', division: 'Health, Safety & Environment' },
  { name: 'Mechanical Engineering', division: 'Engineering' },
  { name: 'Electrical Engineering', division: 'Engineering' },
  { name: 'Human Resources', division: 'Administration' },
  { name: 'Finance', division: 'Administration' },
]

const ASSET_CATEGORIES = [
  { code: 'FIRE', name: 'Fire Safety Equipment', name_ar: 'معدات السلامة من الحرائق', icon: 'flame', color: '#DC2626' },
  { code: 'ELEC', name: 'Electrical Safety', name_ar: 'السلامة الكهربائية', icon: 'zap', color: '#F59E0B' },
  { code: 'PPE', name: 'Personal Protective Equipment', name_ar: 'معدات الحماية الشخصية', icon: 'hard-hat', color: '#10B981' },
  { code: 'FIRST-AID', name: 'First Aid Equipment', name_ar: 'معدات الإسعافات الأولية', icon: 'heart-pulse', color: '#EF4444' },
  { code: 'EMERGENCY', name: 'Emergency Response', name_ar: 'الاستجابة للطوارئ', icon: 'siren', color: '#8B5CF6' },
]

const ASSET_TYPES = [
  { category: 'FIRE', code: 'FE-ABC', name: 'ABC Dry Powder Extinguisher', name_ar: 'طفاية بودرة جافة ABC' },
  { category: 'FIRE', code: 'FE-CO2', name: 'CO2 Fire Extinguisher', name_ar: 'طفاية ثاني أكسيد الكربون' },
  { category: 'FIRE', code: 'FE-FOAM', name: 'Foam Fire Extinguisher', name_ar: 'طفاية رغوة' },
  { category: 'FIRE', code: 'SMOKE-DET', name: 'Smoke Detector', name_ar: 'كاشف دخان' },
  { category: 'FIRE', code: 'FIRE-ALARM', name: 'Fire Alarm Panel', name_ar: 'لوحة إنذار حريق' },
  { category: 'ELEC', code: 'LOCKOUT', name: 'Lockout/Tagout Kit', name_ar: 'مجموعة القفل والتعليق' },
  { category: 'ELEC', code: 'INSUL-MAT', name: 'Insulating Mat', name_ar: 'بساط عازل' },
  { category: 'ELEC', code: 'VOLT-TEST', name: 'Voltage Tester', name_ar: 'جهاز فحص الجهد' },
  { category: 'PPE', code: 'HARD-HAT', name: 'Safety Helmet', name_ar: 'خوذة السلامة' },
  { category: 'PPE', code: 'SAFETY-BOOT', name: 'Safety Boots', name_ar: 'أحذية السلامة' },
  { category: 'PPE', code: 'HI-VIS', name: 'High Visibility Vest', name_ar: 'سترة عاكسة' },
  { category: 'FIRST-AID', code: 'FAK-STD', name: 'Standard First Aid Kit', name_ar: 'حقيبة إسعافات أولية قياسية' },
  { category: 'FIRST-AID', code: 'AED', name: 'Automated External Defibrillator', name_ar: 'جهاز إزالة الرجفان الخارجي' },
  { category: 'EMERGENCY', code: 'EYE-WASH', name: 'Emergency Eye Wash Station', name_ar: 'محطة غسيل العيون الطارئة' },
  { category: 'EMERGENCY', code: 'SHOWER', name: 'Emergency Safety Shower', name_ar: 'دش السلامة الطارئ' },
]

const CONTRACTOR_COMPANIES = [
  { name: 'Al-Falak Contracting', name_ar: 'شركة الفلك للمقاولات', cr: 'CR-1234567890' },
  { name: 'Golden Star Maintenance', name_ar: 'مجموعة النجم الذهبي للصيانة', cr: 'CR-9876543210' },
  { name: 'Saudi Electrical Works', name_ar: 'الأعمال الكهربائية السعودية', cr: 'CR-5555666677' },
  { name: 'Al-Madinah Safety Services', name_ar: 'خدمات المدينة للسلامة', cr: 'CR-1111222233' },
  { name: 'Eastern Province Welding', name_ar: 'لحام المنطقة الشرقية', cr: 'CR-4444555566' },
]

const CONTRACTOR_PROJECTS = [
  { name: 'HVAC Maintenance Program', name_ar: 'برنامج صيانة التكييف', code_prefix: 'HVAC', location: 'Main Manufacturing Plant - All Floors', days_duration: 180 },
  { name: 'Fire Alarm System Upgrade', name_ar: 'ترقية نظام إنذار الحريق', code_prefix: 'FIRE', location: 'Administration Building', days_duration: 90 },
  { name: 'Electrical Panel Replacement', name_ar: 'استبدال اللوحات الكهربائية', code_prefix: 'ELEC', location: 'Production Hall A', days_duration: 60 },
  { name: 'Scaffolding Erection Works', name_ar: 'أعمال تركيب السقالات', code_prefix: 'SCAF', location: 'Warehouse Block 1 - Exterior', days_duration: 45 },
  { name: 'Tank Cleaning & Inspection', name_ar: 'تنظيف وفحص الخزانات', code_prefix: 'TANK', location: 'Petrochemical Plant - Storage Area', days_duration: 30 },
  { name: 'Welding & Fabrication Works', name_ar: 'أعمال اللحام والتصنيع', code_prefix: 'WELD', location: 'Maintenance Workshop', days_duration: 120 },
  { name: 'Painting & Corrosion Protection', name_ar: 'الطلاء والحماية من التآكل', code_prefix: 'PAINT', location: 'Equipment Yard - All Structures', days_duration: 75 },
  { name: 'Cable Tray Installation', name_ar: 'تركيب حوامل الكابلات', code_prefix: 'CABLE', location: 'New Extension Building', days_duration: 40 },
]

const WORKER_NAMES = [
  { full: 'Ahmed Al-Rashid', full_ar: 'أحمد الراشد' },
  { full: 'Mohammed Al-Ghamdi', full_ar: 'محمد الغامدي' },
  { full: 'Khalid Al-Otaibi', full_ar: 'خالد العتيبي' },
  { full: 'Abdullah Al-Zahrani', full_ar: 'عبدالله الزهراني' },
  { full: 'Faisal Al-Shammari', full_ar: 'فيصل الشمري' },
  { full: 'Omar Al-Harbi', full_ar: 'عمر الحربي' },
  { full: 'Saud Al-Dosari', full_ar: 'سعود الدوسري' },
  { full: 'Nasser Al-Qahtani', full_ar: 'ناصر القحطاني' },
  { full: 'Ibrahim Al-Mutairi', full_ar: 'إبراهيم المطيري' },
  { full: 'Youssef Al-Subaie', full_ar: 'يوسف السبيعي' },
]

const INCIDENTS_DATA = [
  { event_type: 'observation', severity_v2: 'level_1', title: 'Minor housekeeping issue', description: 'Oil spill on walkway near warehouse entrance' },
  { event_type: 'observation', severity_v2: 'level_1', title: 'PPE non-compliance', description: 'Worker observed without safety glasses in designated area' },
  { event_type: 'observation', severity_v2: 'level_2', title: 'Missing machine guard', description: 'Conveyor belt guard found removed during inspection' },
  { event_type: 'near_miss', severity_v2: 'level_3', title: 'Forklift near-miss', description: 'Forklift almost struck pedestrian at blind corner' },
  { event_type: 'near_miss', severity_v2: 'level_4', title: 'Chemical spill prevented', description: 'Leaking drum identified before major spill occurred' },
  { event_type: 'accident', severity_v2: 'level_3', title: 'Minor hand laceration', description: 'Worker cut hand on sharp metal edge while handling material' },
  { event_type: 'observation', severity_v2: 'level_2', title: 'Blocked emergency exit', description: 'Pallets stacked blocking emergency exit door' },
  { event_type: 'observation', severity_v2: 'level_1', title: 'Missing safety signage', description: 'Hazard warning sign missing from chemical storage area' },
  { event_type: 'near_miss', severity_v2: 'level_4', title: 'Scaffolding instability', description: 'Scaffolding started to tip during work at height' },
  { event_type: 'accident', severity_v2: 'level_5', title: 'Severe injury incident', description: 'Major incident requiring immediate medical attention' },
]

const RISK_ASSESSMENTS_DATA = [
  { title: 'Hot Work Operations', activity: 'Welding and cutting operations in production area', status: 'approved' },
  { title: 'Confined Space Entry', activity: 'Tank cleaning and inspection procedures', status: 'approved' },
  { title: 'Working at Height', activity: 'Maintenance work on elevated platforms', status: 'draft' },
  { title: 'Chemical Handling', activity: 'Storage and transfer of hazardous chemicals', status: 'approved' },
  { title: 'Electrical Maintenance', activity: 'Live electrical work procedures', status: 'draft' },
  { title: 'Lifting Operations', activity: 'Crane and heavy lifting activities', status: 'approved' },
  { title: 'Excavation Work', activity: 'Deep excavation near existing utilities', status: 'expired' },
  { title: 'Night Shift Operations', activity: 'Reduced visibility work during night shift', status: 'draft' },
]

const HAZARDS_DATA = [
  { hazard: 'Fire and explosion', hazard_ar: 'الحريق والانفجار', consequence: 'Burns, fatalities', existing_controls: ['Fire extinguishers', 'Fire watch'], likelihood: 4, severity: 5 },
  { hazard: 'Fall from height', hazard_ar: 'السقوط من ارتفاع', consequence: 'Serious injury, death', existing_controls: ['Harness', 'Guardrails'], likelihood: 3, severity: 5 },
  { hazard: 'Toxic gas exposure', hazard_ar: 'التعرض للغازات السامة', consequence: 'Respiratory issues, death', existing_controls: ['Gas detectors', 'Ventilation'], likelihood: 3, severity: 4 },
  { hazard: 'Electrical shock', hazard_ar: 'الصدمة الكهربائية', consequence: 'Burns, cardiac arrest', existing_controls: ['LOTO', 'Insulated tools'], likelihood: 2, severity: 5 },
  { hazard: 'Struck by falling object', hazard_ar: 'الإصابة بجسم ساقط', consequence: 'Head injury, death', existing_controls: ['Hard hats', 'Exclusion zones'], likelihood: 3, severity: 4 },
  { hazard: 'Chemical burns', hazard_ar: 'حروق كيميائية', consequence: 'Skin damage, blindness', existing_controls: ['PPE', 'SDS available'], likelihood: 2, severity: 4 },
  { hazard: 'Noise exposure', hazard_ar: 'التعرض للضوضاء', consequence: 'Hearing loss', existing_controls: ['Ear protection', 'Barriers'], likelihood: 4, severity: 2 },
  { hazard: 'Manual handling injury', hazard_ar: 'إصابة المناولة اليدوية', consequence: 'Back strain, sprains', existing_controls: ['Lifting aids', 'Training'], likelihood: 4, severity: 3 },
]

const INSPECTION_TEMPLATES = [
  { name: 'Fire Safety Inspection', name_ar: 'فحص السلامة من الحرائق', template_type: 'area' },
  { name: 'Electrical Safety Check', name_ar: 'فحص السلامة الكهربائية', template_type: 'area' },
  { name: 'PPE Compliance Audit', name_ar: 'تدقيق امتثال معدات الحماية', template_type: 'area' },
  { name: 'Workplace Housekeeping', name_ar: 'نظافة مكان العمل', template_type: 'area' },
  { name: 'Emergency Equipment Check', name_ar: 'فحص معدات الطوارئ', template_type: 'area' },
]

const INSPECTION_ITEMS = [
  { template: 'Fire Safety Inspection', items: [
    { question: 'Are fire extinguishers accessible and not blocked?', question_ar: 'هل طفايات الحريق متاحة وغير مسدودة؟' },
    { question: 'Is the fire extinguisher gauge in the green zone?', question_ar: 'هل مؤشر الطفاية في المنطقة الخضراء؟' },
    { question: 'Are emergency exits clearly marked and illuminated?', question_ar: 'هل مخارج الطوارئ مُعلّمة ومُضاءة بوضوح؟' },
    { question: 'Is the fire alarm system functioning properly?', question_ar: 'هل يعمل نظام إنذار الحريق بشكل صحيح؟' },
    { question: 'Are fire hose cabinets properly maintained?', question_ar: 'هل تتم صيانة خزائن خراطيم الحريق بشكل صحيح؟' },
  ]},
  { template: 'Electrical Safety Check', items: [
    { question: 'Are all electrical panels properly labeled?', question_ar: 'هل جميع اللوحات الكهربائية موسومة بشكل صحيح؟' },
    { question: 'Are there any exposed wires or damaged cables?', question_ar: 'هل توجد أسلاك مكشوفة أو كابلات تالفة؟' },
    { question: 'Is the electrical room access restricted?', question_ar: 'هل الوصول لغرفة الكهرباء مقيد؟' },
    { question: 'Are GFCI outlets functioning in wet areas?', question_ar: 'هل منافذ GFCI تعمل في المناطق الرطبة؟' },
  ]},
  { template: 'PPE Compliance Audit', items: [
    { question: 'Are all workers wearing required PPE?', question_ar: 'هل يرتدي جميع العمال معدات الحماية المطلوبة؟' },
    { question: 'Is PPE in good condition and not damaged?', question_ar: 'هل معدات الحماية بحالة جيدة وغير تالفة؟' },
    { question: 'Are PPE storage areas clean and organized?', question_ar: 'هل مناطق تخزين معدات الحماية نظيفة ومنظمة؟' },
  ]},
  { template: 'Workplace Housekeeping', items: [
    { question: 'Are walkways clear of obstructions?', question_ar: 'هل الممرات خالية من العوائق؟' },
    { question: 'Is there proper waste segregation?', question_ar: 'هل يتم فصل النفايات بشكل صحيح؟' },
    { question: 'Are spill kits available and stocked?', question_ar: 'هل مجموعات الانسكاب متوفرة ومخزنة؟' },
    { question: 'Is lighting adequate in all work areas?', question_ar: 'هل الإضاءة كافية في جميع مناطق العمل؟' },
  ]},
  { template: 'Emergency Equipment Check', items: [
    { question: 'Is the AED charged and accessible?', question_ar: 'هل جهاز AED مشحون ومتاح؟' },
    { question: 'Are eye wash stations operational?', question_ar: 'هل محطات غسيل العيون تعمل؟' },
    { question: 'Is the emergency shower functional?', question_ar: 'هل دش الطوارئ يعمل؟' },
    { question: 'Are first aid kits fully stocked?', question_ar: 'هل حقائب الإسعافات الأولية مكتملة؟' },
  ]},
]

const SECURITY_ZONES = [
  { zone_code: 'MG', name: 'Main Gate', name_ar: 'البوابة الرئيسية', zone_type: 'entrance', risk_level: 'high' },
  { zone_code: 'PFN', name: 'Perimeter Fence North', name_ar: 'السياج الشمالي', zone_type: 'perimeter', risk_level: 'medium' },
  { zone_code: 'PFS', name: 'Perimeter Fence South', name_ar: 'السياج الجنوبي', zone_type: 'perimeter', risk_level: 'medium' },
  { zone_code: 'WH', name: 'Warehouse Area', name_ar: 'منطقة المستودعات', zone_type: 'storage', risk_level: 'medium' },
  { zone_code: 'CR', name: 'Control Room', name_ar: 'غرفة التحكم', zone_type: 'restricted', risk_level: 'critical' },
  { zone_code: 'CS', name: 'Chemical Storage', name_ar: 'مخزن المواد الكيميائية', zone_type: 'hazmat', risk_level: 'high' },
  { zone_code: 'ADM', name: 'Admin Building', name_ar: 'مبنى الإدارة', zone_type: 'office', risk_level: 'low' },
  { zone_code: 'EAP', name: 'Emergency Assembly Point', name_ar: 'نقطة التجمع الطارئة', zone_type: 'assembly', risk_level: 'low' },
]

const VISITORS_DATA = [
  { name: 'Fahad Al-Mutairi', company: 'Ministry of Labor' },
  { name: 'Saleh Al-Qahtani', company: 'Aramco Inspection' },
  { name: 'Majed Al-Harbi', company: 'Civil Defense' },
  { name: 'Turki Al-Dosari', company: 'SASO Quality Audit' },
  { name: 'Bandar Al-Shehri', company: 'Environmental Agency' },
]

// Utility functions
function generateReferenceId(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `TEST-${prefix}-${timestamp}-${random}`
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, n)
}

function randomPastDate(daysBack: number): string {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack))
  return date.toISOString()
}

function randomFutureDate(daysAhead: number): string {
  const date = new Date()
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead) + 1)
  return date.toISOString()
}

function randomPastDateOnly(daysBack: number): string {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack))
  return date.toISOString().split('T')[0]
}

function randomFutureDateOnly(daysAhead: number): string {
  const date = new Date()
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead) + 1)
  return date.toISOString().split('T')[0]
}

// Seeding functions
async function seedOrganizationStructure(supabase: any, tenantId: string) {
  console.log('Seeding organization structure...')
  const results = { branches: 0, sites: 0, buildings: 0, floors: 0, divisions: 0, departments: 0 }

  // Seed branches - use upsert to handle existing data
  const branchIds: string[] = []
  for (const branch of BRANCHES) {
    // First try to find existing branch
    const { data: existingBranch } = await supabase
      .from('branches')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', `TEST - ${branch.name}`)
      .maybeSingle()
    
    if (existingBranch) {
      branchIds.push(existingBranch.id)
      results.branches++
      console.log(`Branch already exists: TEST - ${branch.name}`)
    } else {
      const { data, error } = await supabase
        .from('branches')
        .insert({
          tenant_id: tenantId,
          name: `TEST - ${branch.name}`,
          location: branch.location,
          is_active: true,
        })
        .select('id')
        .single()
      
      if (!error && data) {
        branchIds.push(data.id)
        results.branches++
      } else {
        console.log('Branch insert error:', error?.message || error)
      }
    }
  }

  // Seed sites - check for existing
  const siteIds: string[] = []
  for (let i = 0; i < branchIds.length; i++) {
    const branchId = branchIds[i]
    const sitesForBranch = SITES_PER_BRANCH[i] || SITES_PER_BRANCH[0]
    
    for (const site of sitesForBranch) {
      // Check for existing site
      const { data: existingSite } = await supabase
        .from('sites')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', `TEST - ${site.name}`)
        .maybeSingle()
      
      if (existingSite) {
        siteIds.push(existingSite.id)
        results.sites++
        console.log(`Site already exists: TEST - ${site.name}`)
      } else {
        const { data, error } = await supabase
          .from('sites')
          .insert({
            tenant_id: tenantId,
            branch_id: branchId,
            name: `TEST - ${site.name}`,
            address: site.address,
            is_active: true,
          })
          .select('id')
          .single()
        
        if (!error && data) {
          siteIds.push(data.id)
          results.sites++
        } else {
          console.log('Site insert error:', error?.message || error)
        }
      }
    }
  }

  // Seed buildings
  const buildingIds: string[] = []
  for (const siteId of siteIds) {
    const buildingsToAdd = pickRandomN(BUILDINGS, 2)
    for (const building of buildingsToAdd) {
      const { data, error } = await supabase
        .from('buildings')
        .insert({
          tenant_id: tenantId,
          site_id: siteId,
          name: `TEST - ${building.name}`,
          name_ar: building.name_ar,
          is_active: true,
        })
        .select('id')
        .single()
      
      if (!error && data) {
        buildingIds.push(data.id)
        results.buildings++
      } else {
        console.log('Building insert error:', error)
      }
    }
  }

  // Seed floors/zones
  for (const buildingId of buildingIds) {
    const floorsToAdd = pickRandomN(FLOORS, 2)
    for (const floor of floorsToAdd) {
      const { error } = await supabase
        .from('floors_zones')
        .insert({
          tenant_id: tenantId,
          building_id: buildingId,
          name: `TEST - ${floor.name}`,
          name_ar: floor.name_ar,
          is_active: true,
        })
      
      if (!error) results.floors++
      else console.log('Floor insert error:', error)
    }
  }

  // Seed divisions
  const divisionMap: Record<string, string> = {}
  for (const division of DIVISIONS) {
    const { data, error } = await supabase
      .from('divisions')
      .insert({
        tenant_id: tenantId,
        name: `TEST - ${division.name}`,
        is_active: true,
      })
      .select('id')
      .single()
    
    if (!error && data) {
      divisionMap[division.name] = data.id
      results.divisions++
    } else {
      console.log('Division insert error:', error)
    }
  }

  // Seed departments
  for (const dept of DEPARTMENTS) {
    const divisionId = divisionMap[dept.division]
    if (divisionId) {
      const { error } = await supabase
        .from('departments')
        .insert({
          tenant_id: tenantId,
          division_id: divisionId,
          name: `TEST - ${dept.name}`,
          is_active: true,
        })
      
      if (!error) results.departments++
      else console.log('Department insert error:', error)
    }
  }

  return { results, branchIds, siteIds, buildingIds }
}

async function seedAssets(supabase: any, tenantId: string, siteIds: string[], buildingIds: string[]) {
  console.log('Seeding assets...')
  const results = { categories: 0, types: 0, assets: 0, schedules: 0 }

  // Seed asset categories
  const categoryMap: Record<string, string> = {}
  for (const cat of ASSET_CATEGORIES) {
    const { data, error } = await supabase
      .from('asset_categories')
      .insert({
        tenant_id: tenantId,
        code: `TEST-${cat.code}`,
        name: cat.name,
        name_ar: cat.name_ar,
        icon: cat.icon,
        color: cat.color,
        is_active: true,
      })
      .select('id')
      .single()
    
    if (!error && data) {
      categoryMap[cat.code] = data.id
      results.categories++
    }
  }

  // Seed asset types
  const typeMap: Record<string, string> = {}
  for (const type of ASSET_TYPES) {
    const categoryId = categoryMap[type.category]
    if (categoryId) {
      const { data, error } = await supabase
        .from('asset_types')
        .insert({
          tenant_id: tenantId,
          category_id: categoryId,
          code: `TEST-${type.code}`,
          name: type.name,
          name_ar: type.name_ar,
          is_active: true,
        })
        .select('id')
        .single()
      
      if (!error && data) {
        typeMap[type.code] = data.id
        results.types++
      }
    }
  }

  // Seed assets
  const assetIds: string[] = []
  const assetTypeKeys = Object.keys(typeMap)
  for (let i = 0; i < 50; i++) {
    const typeCode = pickRandom(assetTypeKeys)
    const typeId = typeMap[typeCode]
    const siteId = pickRandom(siteIds)
    const buildingId = pickRandom(buildingIds)
    
    const assetCode = generateReferenceId('ASSET')
    const { data, error } = await supabase
      .from('hsse_assets')
      .insert({
        tenant_id: tenantId,
        asset_type_id: typeId,
        site_id: siteId,
        building_id: buildingId,
        asset_code: assetCode,
        name: `${typeCode.replace('-', ' ')} Unit ${i + 1}`,
        serial_number: `SN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        status: pickRandom(['active', 'active', 'active', 'maintenance', 'retired']),
        condition: pickRandom(['good', 'good', 'fair', 'poor']),
        installation_date: randomPastDateOnly(365 * 3),
        warranty_expiry: randomFutureDateOnly(365),
        last_inspection_date: randomPastDateOnly(90),
        next_inspection_due: randomFutureDateOnly(90),
      })
      .select('id')
      .single()
    
    if (!error && data) {
      assetIds.push(data.id)
      results.assets++
    }
  }

  // Seed maintenance schedules
  for (const assetId of assetIds.slice(0, 30)) {
    const { error } = await supabase
      .from('asset_maintenance_schedules')
      .insert({
        tenant_id: tenantId,
        asset_id: assetId,
        schedule_type: pickRandom(['preventive', 'predictive', 'inspection']),
        frequency_type: pickRandom(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
        frequency_value: pickRandom([1, 2, 3, 6]),
        description: 'Regular maintenance check',
        next_due: randomFutureDateOnly(30),
        is_active: true,
      })
    
    if (!error) results.schedules++
  }

  return { results, assetIds }
}

async function seedContractors(supabase: any, tenantId: string, siteIds: string[], userId: string) {
  console.log('Seeding contractors...')
  const results = { companies: 0, workers: 0, projects: 0 }

  // Seed contractor companies - match actual schema
  const companyIds: string[] = []
  for (const company of CONTRACTOR_COMPANIES) {
    const { data, error } = await supabase
      .from('contractor_companies')
      .insert({
        tenant_id: tenantId,
        company_name: `TEST - ${company.name}`,
        company_name_ar: company.name_ar,
        commercial_registration_number: `TEST-${company.cr}`,
        email: `info@${company.name.toLowerCase().replace(/\s+/g, '')}.test.sa`,
        phone: `+966${Math.floor(500000000 + Math.random() * 99999999)}`,
        city: pickRandom(['Riyadh', 'Jeddah', 'Dammam']),
        status: 'active',
        created_by: userId,
      })
      .select('id')
      .single()
    
    if (!error && data) {
      companyIds.push(data.id)
      results.companies++
    } else {
      console.log('Contractor company insert error:', error)
    }
  }

  // Seed contractor workers - match actual schema
  for (const companyId of companyIds) {
    const workersToCreate = pickRandomN(WORKER_NAMES, 6)
    for (const worker of workersToCreate) {
      const { error } = await supabase
        .from('contractor_workers')
        .insert({
          tenant_id: tenantId,
          company_id: companyId,
          full_name: worker.full,
          full_name_ar: worker.full_ar,
          national_id: `TEST${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          nationality: pickRandom(['Saudi Arabia', 'Egypt', 'India', 'Pakistan', 'Bangladesh']),
          mobile_number: `+966${Math.floor(500000000 + Math.random() * 99999999)}`,
          preferred_language: pickRandom(['ar', 'en']),
          approval_status: pickRandom(['approved', 'approved', 'approved', 'pending']),
          created_by: userId,
        })
      
      if (!error) results.workers++
      else console.log('Contractor worker insert error:', error)
    }
  }

  // Seed contractor projects
  const statuses = ['active', 'active', 'active', 'completed', 'suspended']
  for (const project of CONTRACTOR_PROJECTS) {
    const companyId = pickRandom(companyIds)
    const siteId = siteIds.length > 0 ? pickRandom(siteIds) : null
    const status = pickRandom(statuses)
    
    const startDate = randomPastDateOnly(60)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + project.days_duration)
    
    const projectCode = `TEST-${project.code_prefix}-${Date.now().toString(36).toUpperCase().slice(-4)}`
    
    const { error } = await supabase
      .from('contractor_projects')
      .insert({
        tenant_id: tenantId,
        company_id: companyId,
        project_code: projectCode,
        project_name: `TEST - ${project.name}`,
        project_name_ar: project.name_ar,
        site_id: siteId,
        location_description: project.location,
        start_date: startDate,
        end_date: endDate.toISOString().split('T')[0],
        status: status,
        assigned_workers_count: Math.floor(5 + Math.random() * 20),
        required_safety_officers: Math.floor(1 + Math.random() * 3),
        notes: `Test project seeded for ${project.name}`,
        created_by: userId,
        geofence_radius_meters: 100,
      })
    
    if (!error) {
      results.projects++
    } else {
      console.log('Contractor project insert error:', error?.message)
    }
  }

  return { results, companyIds }
}

async function seedIncidents(supabase: any, tenantId: string, siteIds: string[], branchIds: string[], userId: string) {
  console.log('Seeding incidents...')
  const results = { incidents: 0, actions: 0 }

  const incidentIds: string[] = []
  for (const incident of INCIDENTS_DATA) {
    const { data, error } = await supabase
      .from('incidents')
      .insert({
        tenant_id: tenantId,
        site_id: pickRandom(siteIds),
        branch_id: pickRandom(branchIds),
        reference_id: generateReferenceId('INC'),
        event_type: incident.event_type,
        severity_v2: incident.severity_v2,
        title: `TEST - ${incident.title}`,
        description: incident.description,
        occurred_at: randomPastDate(90),
        reporter_id: userId,
        status: pickRandom(['submitted', 'pending_review', 'investigation_in_progress', 'closed']),
        location: pickRandom(['Production Area', 'Warehouse', 'Office Building', 'Parking Lot']),
      })
      .select('id')
      .single()
    
    if (!error && data) {
      incidentIds.push(data.id)
      results.incidents++
    } else {
      console.log('Incident insert error:', error)
    }
  }

  // Seed corrective actions - match actual schema
  for (const incidentId of incidentIds) {
    const numActions = Math.floor(1 + Math.random() * 3)
    for (let i = 0; i < numActions; i++) {
      const { error } = await supabase
        .from('corrective_actions')
        .insert({
          tenant_id: tenantId,
          incident_id: incidentId,
          title: `Corrective Action ${i + 1}`,
          description: pickRandom([
            'Implement additional safety barriers',
            'Conduct refresher training for all staff',
            'Install warning signage at location',
            'Review and update SOPs',
            'Perform equipment inspection and repair',
          ]),
          priority: pickRandom(['low', 'medium', 'high', 'critical']),
          status: pickRandom(['open', 'in_progress', 'completed', 'completed']),
          due_date: randomFutureDateOnly(30),
          assigned_to: userId,
        })
      
      if (!error) results.actions++
      else console.log('Corrective action insert error:', error)
    }
  }

  return { results, incidentIds }
}

async function seedRiskAssessments(supabase: any, tenantId: string, siteIds: string[], userId: string) {
  console.log('Seeding risk assessments...')
  const results = { assessments: 0, details: 0, team: 0 }

  const assessmentIds: string[] = []
  for (const ra of RISK_ASSESSMENTS_DATA) {
    const { data, error } = await supabase
      .from('risk_assessments')
      .insert({
        tenant_id: tenantId,
        assessment_number: generateReferenceId('RA'),
        activity_name: `TEST - ${ra.title}`,
        activity_name_ar: ra.title,
        activity_description: ra.activity,
        status: ra.status,
        assessment_date: randomPastDate(180),
        location: pickRandom(siteIds),
        created_by: userId,
        overall_risk_rating: pickRandom(['low', 'medium', 'high']),
      })
      .select('id')
      .single()
    
    if (!error && data) {
      assessmentIds.push(data.id)
      results.assessments++
    } else {
      console.log('Risk assessment insert error:', error)
    }
  }

  // Seed risk assessment details (hazards) - match actual schema
  // Note: initial_risk_score and residual_risk_score are generated columns, don't insert them
  for (const assessmentId of assessmentIds) {
    const hazardsToAdd = pickRandomN(HAZARDS_DATA, 5)
    for (let i = 0; i < hazardsToAdd.length; i++) {
      const hazard = hazardsToAdd[i]
      const { error } = await supabase
        .from('risk_assessment_details')
        .insert({
          tenant_id: tenantId,
          risk_assessment_id: assessmentId,
          hazard_description: hazard.hazard,
          hazard_description_ar: hazard.hazard_ar,
          hazard_category: pickRandom(['physical', 'chemical', 'biological', 'ergonomic']),
          existing_controls: hazard.existing_controls,
          additional_controls: ['Implement additional monitoring', 'Provide training'],
          likelihood: hazard.likelihood,
          severity: hazard.severity,
          // initial_risk_score is a generated column - don't insert
          residual_likelihood: Math.max(1, hazard.likelihood - 1),
          residual_severity: hazard.severity,
          // residual_risk_score is a generated column - don't insert
          sort_order: i + 1,
        })
      
      if (!error) results.details++
      else console.log('Risk assessment detail insert error:', error?.message || error)
    }
  }

  // Seed team members
  for (const assessmentId of assessmentIds) {
    // Add team leader
    const { error: leaderError } = await supabase
      .from('risk_assessment_team')
      .insert({
        tenant_id: tenantId,
        risk_assessment_id: assessmentId,
        user_id: userId,
        role: 'team_leader',
        is_required_signatory: true,
      })
    if (!leaderError) results.team++

    // Add 2 team members
    for (let i = 0; i < 2; i++) {
      const { error } = await supabase
        .from('risk_assessment_team')
        .insert({
          tenant_id: tenantId,
          risk_assessment_id: assessmentId,
          user_id: userId,
          role: 'member',
          is_required_signatory: false,
        })
      if (!error) results.team++
    }
  }

  return { results, assessmentIds }
}

async function seedInspections(supabase: any, tenantId: string, siteIds: string[], userId: string) {
  console.log('Seeding inspections...')
  const results = { templates: 0, items: 0, sessions: 0, responses: 0, findings: 0 }

  // Seed inspection templates - match actual schema
  const templateMap: Record<string, string> = {}
  for (const template of INSPECTION_TEMPLATES) {
    const { data, error } = await supabase
      .from('inspection_templates')
      .insert({
        tenant_id: tenantId,
        code: generateReferenceId('TMPL'),
        name: `TEST - ${template.name}`,
        name_ar: template.name_ar,
        template_type: template.template_type,
        is_active: true,
        created_by: userId,
      })
      .select('id')
      .single()
    
    if (!error && data) {
      templateMap[template.name] = data.id
      results.templates++
    } else {
      console.log('Inspection template insert error:', error)
    }
  }

  // Seed template items - match actual schema
  const templateItemIds: Record<string, string[]> = {}
  for (const templateData of INSPECTION_ITEMS) {
    const templateId = templateMap[templateData.template]
    if (templateId) {
      templateItemIds[templateId] = []
      for (let i = 0; i < templateData.items.length; i++) {
        const item = templateData.items[i]
        const { data, error } = await supabase
          .from('inspection_template_items')
          .insert({
            tenant_id: tenantId,
            template_id: templateId,
            question: item.question,
            question_ar: item.question_ar,
            response_type: 'yes_no', // Valid response type per check constraint
            is_required: true,
            sort_order: i + 1,
          })
          .select('id')
          .single()
        
        if (!error && data) {
          templateItemIds[templateId].push(data.id)
          results.items++
        } else {
          console.log('Template item insert error:', error?.message || error)
        }
      }
    }
  }

  // Seed inspection sessions - match actual schema
  const sessionIds: string[] = []
  const templateIds = Object.keys(templateItemIds)
  for (let i = 0; i < 15; i++) {
    const templateId = pickRandom(templateIds)
    const { data, error } = await supabase
      .from('inspection_sessions')
      .insert({
        tenant_id: tenantId,
        template_id: templateId,
        site_id: pickRandom(siteIds),
        session_type: 'area',
        period: pickRandom(['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4']),
        reference_id: generateReferenceId('INSP'),
        inspector_id: userId,
        status: pickRandom(['draft', 'in_progress', 'completed_with_open_actions', 'closed']), // Valid statuses per check constraint
        started_at: randomPastDate(30),
        completed_at: Math.random() > 0.3 ? randomPastDate(30) : null,
      })
      .select('id, template_id')
      .single()
    
    if (!error && data) {
      sessionIds.push(data.id)
      results.sessions++

      // Seed responses for this session
      const itemIds = templateItemIds[data.template_id] || []
      for (const itemId of itemIds) {
        const result = pickRandom(['pass', 'pass', 'pass', 'fail', 'na'])
        const { data: responseData, error: respError } = await supabase
          .from('area_inspection_responses')
          .insert({
            tenant_id: tenantId,
            session_id: data.id,
            template_item_id: itemId,
            result: result,
            response_value: result,
            notes: result === 'fail' ? 'Requires attention' : null,
            responded_by: userId,
            responded_at: new Date().toISOString(),
          })
          .select('id')
          .single()
        
        if (!respError && responseData) {
          results.responses++

          // Create finding for failed items
          if (result === 'fail' && Math.random() > 0.5) {
            const { error: findingError } = await supabase
              .from('area_inspection_findings')
              .insert({
                tenant_id: tenantId,
                session_id: data.id,
                response_id: responseData.id,
                reference_id: generateReferenceId('FIND'),
                classification: pickRandom(['observation', 'non_conformance', 'major_nc']),
                description: 'Item found non-compliant during inspection',
                recommendation: 'Immediate corrective action required',
                risk_level: pickRandom(['low', 'medium', 'high']),
                status: pickRandom(['open', 'in_progress', 'closed']),
                due_date: randomFutureDateOnly(14),
                created_by: userId,
              })
            
            if (!findingError) results.findings++
          }
        }
      }
    } else {
      console.log('Inspection session insert error:', error?.message || error)
    }
  }

  return { results, sessionIds }
}

async function seedPTW(supabase: any, tenantId: string, siteIds: string[], buildingIds: string[], userId: string) {
  console.log('Seeding PTW...')
  const results = { projects: 0, permits: 0, gasTests: 0 }

  // Seed PTW projects - match actual schema
  const projectIds: string[] = []
  for (let i = 0; i < 5; i++) {
    const startDate = randomPastDateOnly(30)
    const endDate = randomFutureDateOnly(60)
    const { data, error } = await supabase
      .from('ptw_projects')
      .insert({
        tenant_id: tenantId,
        reference_id: generateReferenceId('PTWP'),
        name: `TEST - PTW Project ${i + 1}`,
        description: `Test PTW project ${i + 1} for development`,
        site_id: pickRandom(siteIds),
        building_id: pickRandom(buildingIds),
        start_date: startDate,
        end_date: endDate,
        status: pickRandom(['active', 'active', 'completed']),
        is_internal_work: Math.random() > 0.5,
        created_by: userId,
      })
      .select('id')
      .single()
    
    if (!error && data) {
      projectIds.push(data.id)
      results.projects++
    } else {
      console.log('PTW project insert error:', error)
    }
  }

  // Note: ptw_permit_types table doesn't exist based on empty query result
  // Skip permit type seeding and use the project type_id from ptw_projects

  // Seed PTW permits - match actual schema  
  for (let i = 0; i < 20; i++) {
    const projectId = pickRandom(projectIds)
    const plannedStart = new Date()
    plannedStart.setDate(plannedStart.getDate() + Math.floor(Math.random() * 7))
    const plannedEnd = new Date(plannedStart)
    plannedEnd.setHours(plannedEnd.getHours() + 8)
    
    const { data, error } = await supabase
      .from('ptw_permits')
      .insert({
        tenant_id: tenantId,
        project_id: projectId,
        type_id: projectId, // Using project_id as type_id since ptw_permit_types doesn't exist
        reference_id: generateReferenceId('PTW'),
        site_id: pickRandom(siteIds),
        building_id: pickRandom(buildingIds),
        job_description: pickRandom([
          'Welding operations on pipeline',
          'Tank entry for cleaning',
          'Excavation for cable laying',
          'Electrical panel maintenance',
          'Scaffold erection for painting',
        ]),
        work_scope: 'Test work scope for development',
        location_details: pickRandom(['Area A', 'Area B', 'Tank Farm', 'Electrical Room', 'Warehouse']),
        planned_start_time: plannedStart.toISOString(),
        planned_end_time: plannedEnd.toISOString(),
        status: pickRandom(['draft', 'pending_endorsement', 'endorsed', 'issued', 'active', 'closed']),
        applicant_id: userId,
        created_by: userId,
        emergency_contact_name: 'Test Emergency Contact',
        emergency_contact_number: '+966500000000',
      })
      .select('id')
      .single()
    
    if (!error && data) {
      results.permits++

      // Add gas tests for some permits
      if (Math.random() > 0.6) {
        const { error: gasError } = await supabase
          .from('ptw_gas_tests')
          .insert({
            tenant_id: tenantId,
            permit_id: data.id,
            test_time: new Date().toISOString(),
            oxygen_level: (20.5 + Math.random()).toFixed(1),
            lel_level: (Math.random() * 5).toFixed(1),
            h2s_level: (Math.random() * 2).toFixed(1),
            co_level: (Math.random() * 10).toFixed(1),
            result: pickRandom(['pass', 'pass', 'pass', 'fail']),
            tested_by: userId,
          })
        
        if (!gasError) results.gasTests++
      }
    } else {
      console.log('PTW permit insert error:', error)
    }
  }

  return results
}

async function seedSecurity(supabase: any, tenantId: string, siteIds: string[], userId: string) {
  console.log('Seeding security operations...')
  const results = { zones: 0, routes: 0, checkpoints: 0, patrols: 0 }

  // Seed security zones - match actual schema
  const zoneIds: string[] = []
  for (const zone of SECURITY_ZONES) {
    const { data, error } = await supabase
      .from('security_zones')
      .insert({
        tenant_id: tenantId,
        site_id: pickRandom(siteIds),
        zone_code: `TEST-${zone.zone_code}`,
        zone_name: `TEST - ${zone.name}`,
        zone_name_ar: zone.name_ar,
        zone_type: zone.zone_type,
        risk_level: zone.risk_level,
        polygon_geojson: { type: 'Polygon', coordinates: [[[46.7, 24.7], [46.8, 24.7], [46.8, 24.8], [46.7, 24.8], [46.7, 24.7]]] },
        is_active: true,
        created_by: userId,
      })
      .select('id')
      .single()
    
    if (!error && data) {
      zoneIds.push(data.id)
      results.zones++
    } else {
      console.log('Security zone insert error:', error)
    }
  }

  // Seed patrol routes - match actual schema
  const routeIds: string[] = []
  for (let i = 0; i < 6; i++) {
    const { data, error } = await supabase
      .from('security_patrol_routes')
      .insert({
        tenant_id: tenantId,
        site_id: pickRandom(siteIds),
        name: `TEST - Route ${i + 1}`,
        description: `Patrol route covering areas ${i + 1}`,
        frequency: pickRandom(['hourly', 'bi_hourly', 'shift']),
        estimated_duration_minutes: 30 + Math.floor(Math.random() * 30),
        is_active: true,
        created_by: userId,
      })
      .select('id')
      .single()
    
    if (!error && data) {
      routeIds.push(data.id)
      results.routes++
    } else {
      console.log('Patrol route insert error:', error)
    }
  }

  // Seed patrol checkpoints - match actual schema
  for (const routeId of routeIds) {
    const numCheckpoints = 4 + Math.floor(Math.random() * 3)
    for (let i = 0; i < numCheckpoints; i++) {
      const { error } = await supabase
        .from('patrol_checkpoints')
        .insert({
          tenant_id: tenantId,
          route_id: routeId,
          name: `Checkpoint ${i + 1}`,
          sequence_order: i + 1,
          qr_code_data: `TEST-CP-${routeId.substring(0, 8)}-${i + 1}`,
          photo_required: Math.random() > 0.5,
          notes_required: Math.random() > 0.7,
          is_active: true,
        })
      
      if (!error) results.checkpoints++
      else console.log('Patrol checkpoint insert error:', error)
    }
  }

  // Seed security patrols - match actual schema
  for (let i = 0; i < 20; i++) {
    const { error } = await supabase
      .from('security_patrols')
      .insert({
        tenant_id: tenantId,
        route_id: pickRandom(routeIds),
        reference_id: generateReferenceId('PAT'),
        patrol_officer_id: userId,
        scheduled_start: randomPastDate(14),
        actual_start: randomPastDate(14),
        actual_end: Math.random() > 0.2 ? randomPastDate(14) : null,
        status: pickRandom(['completed', 'completed', 'in_progress', 'scheduled']),
        checkpoints_visited: Math.floor(Math.random() * 6),
        checkpoints_total: 6,
      })
    
    if (!error) results.patrols++
    else console.log('Security patrol insert error:', error)
  }

  return { results, zoneIds }
}

async function seedVisitors(supabase: any, tenantId: string, siteIds: string[]) {
  console.log('Seeding visitors...')
  const results = { visitors: 0, entries: 0 }

  // Seed visitors - match actual schema
  const visitorIds: string[] = []
  for (const visitor of VISITORS_DATA) {
    const { data, error } = await supabase
      .from('visitors')
      .insert({
        tenant_id: tenantId,
        full_name: `TEST - ${visitor.name}`,
        company_name: visitor.company,
        phone: `+966${Math.floor(500000000 + Math.random() * 99999999)}`,
        email: `${visitor.name.toLowerCase().replace(/\s+/g, '.')}@test.example.com`,
        national_id: `TEST${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        nationality: 'Saudi Arabia',
        qr_code_token: crypto.randomUUID(),
        is_active: true,
      })
      .select('id')
      .single()
    
    if (!error && data) {
      visitorIds.push(data.id)
      results.visitors++
    } else {
      console.log('Visitor insert error:', error)
    }
  }

  // Seed gate entry logs - match actual schema
  for (let i = 0; i < 50; i++) {
    const { error } = await supabase
      .from('gate_entry_logs')
      .insert({
        tenant_id: tenantId,
        site_id: pickRandom(siteIds),
        visitor_id: visitorIds.length > 0 && Math.random() > 0.5 ? pickRandom(visitorIds) : null,
        entry_type: pickRandom(['visitor', 'contractor', 'delivery', 'employee']),
        person_name: `Test Person ${i + 1}`,
        mobile_number: `+966${Math.floor(500000000 + Math.random() * 99999999)}`,
        gate_id: pickRandom(['main_gate', 'gate_2', 'gate_3']),
        entry_time: randomPastDate(7),
        exit_time: Math.random() > 0.3 ? randomPastDate(7) : null,
        car_plate: Math.random() > 0.5 ? `TEST-${Math.random().toString(36).substring(2, 6).toUpperCase()}` : null,
        purpose: pickRandom(['Meeting', 'Delivery', 'Inspection', 'Maintenance']),
        nationality: pickRandom(['Saudi Arabia', 'Egypt', 'India', 'Pakistan']),
      })
    
    if (!error) results.entries++
    else console.log('Gate entry log insert error:', error)
  }

  return results
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting comprehensive test data seeding...')

    // Get auth token for user verification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create user client for authentication
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Create service role client for bypassing RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify user is authenticated using user client
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Get tenant_id from profile using user client
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.tenant_id) {
      throw new Error('Could not determine tenant')
    }

    const tenantId = profile.tenant_id
    const userId = user.id

    console.log(`Seeding data for tenant: ${tenantId}`)

    // Seed all data categories
    const orgResults = await seedOrganizationStructure(supabase, tenantId)
    const assetResults = await seedAssets(supabase, tenantId, orgResults.siteIds, orgResults.buildingIds)
    const contractorResults = await seedContractors(supabase, tenantId, orgResults.siteIds, userId)
    const incidentResults = await seedIncidents(supabase, tenantId, orgResults.siteIds, orgResults.branchIds, userId)
    const raResults = await seedRiskAssessments(supabase, tenantId, orgResults.siteIds, userId)
    const inspectionResults = await seedInspections(supabase, tenantId, orgResults.siteIds, userId)
    const ptwResults = await seedPTW(supabase, tenantId, orgResults.siteIds, orgResults.buildingIds, userId)
    const securityResults = await seedSecurity(supabase, tenantId, orgResults.siteIds, userId)
    const visitorResults = await seedVisitors(supabase, tenantId, orgResults.siteIds)

    const summary = {
      success: true,
      message: 'Test data seeded successfully',
      tenant_id: tenantId,
      results: {
        organization: orgResults.results,
        assets: assetResults.results,
        contractors: contractorResults.results,
        incidents: incidentResults.results,
        riskAssessments: raResults.results,
        inspections: inspectionResults.results,
        ptw: ptwResults,
        security: securityResults.results,
        visitors: visitorResults,
      },
    }

    console.log('Seeding completed:', JSON.stringify(summary, null, 2))

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Seeding error:', error)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
