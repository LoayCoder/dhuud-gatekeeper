import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Realistic Saudi Arabian context data
const BRANCHES = [
  { name: 'Riyadh Headquarters', name_ar: 'المقر الرئيسي - الرياض', code: 'RYD-HQ', city: 'Riyadh', address: 'King Fahd Road, Al Olaya District' },
  { name: 'Jeddah Regional Office', name_ar: 'المكتب الإقليمي - جدة', code: 'JED-REG', city: 'Jeddah', address: 'Prince Sultan Street, Al Rawdah District' },
  { name: 'Dammam Industrial Complex', name_ar: 'المجمع الصناعي - الدمام', code: 'DMM-IND', city: 'Dammam', address: 'Industrial Area 2, Dammam' },
]

const SITES_PER_BRANCH = [
  [
    { name: 'Main Manufacturing Plant', name_ar: 'مصنع التصنيع الرئيسي', code: 'RYD-MFG', type: 'manufacturing' },
    { name: 'Central Warehouse', name_ar: 'المستودع المركزي', code: 'RYD-WH', type: 'warehouse' },
  ],
  [
    { name: 'Jeddah Port Facility', name_ar: 'منشأة ميناء جدة', code: 'JED-PORT', type: 'logistics' },
    { name: 'Distribution Center', name_ar: 'مركز التوزيع', code: 'JED-DC', type: 'warehouse' },
  ],
  [
    { name: 'Petrochemical Plant', name_ar: 'مصنع البتروكيماويات', code: 'DMM-PETRO', type: 'manufacturing' },
    { name: 'Equipment Yard', name_ar: 'ساحة المعدات', code: 'DMM-YARD', type: 'storage' },
  ],
]

const BUILDINGS = [
  { name: 'Administration Building', name_ar: 'مبنى الإدارة', code: 'ADMIN' },
  { name: 'Production Hall A', name_ar: 'صالة الإنتاج أ', code: 'PROD-A' },
  { name: 'Warehouse Block 1', name_ar: 'مبنى المستودعات 1', code: 'WH-1' },
  { name: 'Maintenance Workshop', name_ar: 'ورشة الصيانة', code: 'MAINT' },
]

const FLOORS = [
  { name: 'Ground Floor', name_ar: 'الطابق الأرضي', code: 'GF' },
  { name: 'First Floor', name_ar: 'الطابق الأول', code: '1F' },
  { name: 'Mezzanine', name_ar: 'الميزانين', code: 'MZ' },
]

const DIVISIONS = [
  { name: 'Operations', name_ar: 'العمليات', code: 'OPS' },
  { name: 'Health, Safety & Environment', name_ar: 'الصحة والسلامة والبيئة', code: 'HSE' },
  { name: 'Engineering', name_ar: 'الهندسة', code: 'ENG' },
  { name: 'Administration', name_ar: 'الإدارة', code: 'ADM' },
]

const DEPARTMENTS = [
  { name: 'Production', name_ar: 'الإنتاج', division: 'OPS' },
  { name: 'Quality Control', name_ar: 'مراقبة الجودة', division: 'OPS' },
  { name: 'Occupational Safety', name_ar: 'السلامة المهنية', division: 'HSE' },
  { name: 'Environmental Affairs', name_ar: 'الشؤون البيئية', division: 'HSE' },
  { name: 'Mechanical Engineering', name_ar: 'الهندسة الميكانيكية', division: 'ENG' },
  { name: 'Electrical Engineering', name_ar: 'الهندسة الكهربائية', division: 'ENG' },
  { name: 'Human Resources', name_ar: 'الموارد البشرية', division: 'ADM' },
  { name: 'Finance', name_ar: 'المالية', division: 'ADM' },
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
  { name: 'Al-Falak Contracting', name_ar: 'شركة الفلك للمقاولات', trade: 'General Contracting', license: 'CR-1234567890' },
  { name: 'Golden Star Maintenance', name_ar: 'مجموعة النجم الذهبي للصيانة', trade: 'Mechanical Maintenance', license: 'CR-9876543210' },
  { name: 'Saudi Electrical Works', name_ar: 'الأعمال الكهربائية السعودية', trade: 'Electrical Installation', license: 'CR-5555666677' },
  { name: 'Al-Madinah Safety Services', name_ar: 'خدمات المدينة للسلامة', trade: 'Safety Equipment', license: 'CR-1111222233' },
  { name: 'Eastern Province Welding', name_ar: 'لحام المنطقة الشرقية', trade: 'Welding & Fabrication', license: 'CR-4444555566' },
]

const WORKER_NAMES = [
  { first: 'Ahmed', last: 'Al-Rashid', first_ar: 'أحمد', last_ar: 'الراشد' },
  { first: 'Mohammed', last: 'Al-Ghamdi', first_ar: 'محمد', last_ar: 'الغامدي' },
  { first: 'Khalid', last: 'Al-Otaibi', first_ar: 'خالد', last_ar: 'العتيبي' },
  { first: 'Abdullah', last: 'Al-Zahrani', first_ar: 'عبدالله', last_ar: 'الزهراني' },
  { first: 'Faisal', last: 'Al-Shammari', first_ar: 'فيصل', last_ar: 'الشمري' },
  { first: 'Omar', last: 'Al-Harbi', first_ar: 'عمر', last_ar: 'الحربي' },
  { first: 'Saud', last: 'Al-Dosari', first_ar: 'سعود', last_ar: 'الدوسري' },
  { first: 'Nasser', last: 'Al-Qahtani', first_ar: 'ناصر', last_ar: 'القحطاني' },
  { first: 'Ibrahim', last: 'Al-Mutairi', first_ar: 'إبراهيم', last_ar: 'المطيري' },
  { first: 'Youssef', last: 'Al-Subaie', first_ar: 'يوسف', last_ar: 'السبيعي' },
]

const INCIDENTS_DATA = [
  { type: 'observation', severity: 'L1', title: 'Minor housekeeping issue', title_ar: 'مشكلة تنظيف بسيطة', description: 'Oil spill on walkway near warehouse entrance', category: 'housekeeping' },
  { type: 'observation', severity: 'L2', title: 'PPE non-compliance', title_ar: 'عدم الامتثال لمعدات الحماية', description: 'Worker observed without safety glasses in designated area', category: 'ppe' },
  { type: 'observation', severity: 'L3', title: 'Missing machine guard', title_ar: 'حارس آلة مفقود', description: 'Conveyor belt guard found removed during inspection', category: 'machine_safety' },
  { type: 'near_miss', severity: 'L4', title: 'Forklift near-miss', title_ar: 'حادث فوركليفت وشيك', description: 'Forklift almost struck pedestrian at blind corner', category: 'vehicle' },
  { type: 'near_miss', severity: 'L5', title: 'Chemical spill prevented', title_ar: 'تم منع انسكاب كيميائي', description: 'Leaking drum identified before major spill occurred', category: 'chemical' },
  { type: 'accident', severity: 'L3', title: 'Minor hand laceration', title_ar: 'جرح بسيط باليد', description: 'Worker cut hand on sharp metal edge while handling material', category: 'injury' },
  { type: 'observation', severity: 'L2', title: 'Blocked emergency exit', title_ar: 'مخرج طوارئ مسدود', description: 'Pallets stacked blocking emergency exit door', category: 'emergency' },
  { type: 'observation', severity: 'L1', title: 'Missing safety signage', title_ar: 'لافتة سلامة مفقودة', description: 'Hazard warning sign missing from chemical storage area', category: 'signage' },
  { type: 'near_miss', severity: 'L4', title: 'Scaffolding instability', title_ar: 'عدم استقرار السقالة', description: 'Scaffolding started to tip during work at height', category: 'working_at_height' },
  { type: 'accident', severity: 'L2', title: 'Slip and fall', title_ar: 'انزلاق وسقوط', description: 'Employee slipped on wet floor in production area', category: 'slip_trip_fall' },
]

const RISK_ASSESSMENTS_DATA = [
  { title: 'Hot Work Operations', title_ar: 'عمليات الأعمال الساخنة', activity: 'Welding and cutting operations in production area', status: 'approved' },
  { title: 'Confined Space Entry', title_ar: 'دخول الأماكن المحصورة', activity: 'Tank cleaning and inspection procedures', status: 'approved' },
  { title: 'Working at Height', title_ar: 'العمل على ارتفاعات', activity: 'Maintenance work on elevated platforms', status: 'draft' },
  { title: 'Chemical Handling', title_ar: 'التعامل مع المواد الكيميائية', activity: 'Storage and transfer of hazardous chemicals', status: 'approved' },
  { title: 'Electrical Maintenance', title_ar: 'الصيانة الكهربائية', activity: 'Live electrical work procedures', status: 'pending_approval' },
  { title: 'Lifting Operations', title_ar: 'عمليات الرفع', activity: 'Crane and heavy lifting activities', status: 'approved' },
  { title: 'Excavation Work', title_ar: 'أعمال الحفر', activity: 'Deep excavation near existing utilities', status: 'expired' },
  { title: 'Night Shift Operations', title_ar: 'عمليات المناوبة الليلية', activity: 'Reduced visibility work during night shift', status: 'draft' },
]

const HAZARDS_DATA = [
  { hazard: 'Fire and explosion', hazard_ar: 'الحريق والانفجار', consequence: 'Burns, fatalities', existing_controls: 'Fire extinguishers, fire watch', likelihood: 4, severity: 5 },
  { hazard: 'Fall from height', hazard_ar: 'السقوط من ارتفاع', consequence: 'Serious injury, death', existing_controls: 'Harness, guardrails', likelihood: 3, severity: 5 },
  { hazard: 'Toxic gas exposure', hazard_ar: 'التعرض للغازات السامة', consequence: 'Respiratory issues, death', existing_controls: 'Gas detectors, ventilation', likelihood: 3, severity: 4 },
  { hazard: 'Electrical shock', hazard_ar: 'الصدمة الكهربائية', consequence: 'Burns, cardiac arrest', existing_controls: 'LOTO, insulated tools', likelihood: 2, severity: 5 },
  { hazard: 'Struck by falling object', hazard_ar: 'الإصابة بجسم ساقط', consequence: 'Head injury, death', existing_controls: 'Hard hats, exclusion zones', likelihood: 3, severity: 4 },
  { hazard: 'Chemical burns', hazard_ar: 'حروق كيميائية', consequence: 'Skin damage, blindness', existing_controls: 'PPE, SDS available', likelihood: 2, severity: 4 },
  { hazard: 'Noise exposure', hazard_ar: 'التعرض للضوضاء', consequence: 'Hearing loss', existing_controls: 'Ear protection, barriers', likelihood: 4, severity: 2 },
  { hazard: 'Manual handling injury', hazard_ar: 'إصابة المناولة اليدوية', consequence: 'Back strain, sprains', existing_controls: 'Lifting aids, training', likelihood: 4, severity: 3 },
]

const INSPECTION_TEMPLATES = [
  { name: 'Fire Safety Inspection', name_ar: 'فحص السلامة من الحرائق', category: 'fire_safety', frequency: 'monthly' },
  { name: 'Electrical Safety Check', name_ar: 'فحص السلامة الكهربائية', category: 'electrical', frequency: 'quarterly' },
  { name: 'PPE Compliance Audit', name_ar: 'تدقيق امتثال معدات الحماية', category: 'ppe', frequency: 'weekly' },
  { name: 'Workplace Housekeeping', name_ar: 'نظافة مكان العمل', category: 'housekeeping', frequency: 'daily' },
  { name: 'Emergency Equipment Check', name_ar: 'فحص معدات الطوارئ', category: 'emergency', frequency: 'monthly' },
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

const PTW_TYPES = [
  { name: 'Hot Work Permit', name_ar: 'تصريح الأعمال الساخنة', code: 'HW', color: '#DC2626', requires_gas_test: true },
  { name: 'Confined Space Entry', name_ar: 'تصريح دخول الأماكن المحصورة', code: 'CSE', color: '#7C3AED', requires_gas_test: true },
  { name: 'Excavation Permit', name_ar: 'تصريح الحفر', code: 'EXC', color: '#B45309', requires_gas_test: false },
  { name: 'Electrical Work Permit', name_ar: 'تصريح الأعمال الكهربائية', code: 'ELEC', color: '#0891B2', requires_gas_test: false },
  { name: 'Working at Height', name_ar: 'تصريح العمل على ارتفاعات', code: 'WAH', color: '#059669', requires_gas_test: false },
  { name: 'Radiography Permit', name_ar: 'تصريح التصوير الإشعاعي', code: 'RAD', color: '#9333EA', requires_gas_test: false },
]

const SECURITY_ZONES = [
  { name: 'Main Gate', name_ar: 'البوابة الرئيسية', zone_type: 'entrance', security_level: 'high' },
  { name: 'Perimeter Fence North', name_ar: 'السياج الشمالي', zone_type: 'perimeter', security_level: 'medium' },
  { name: 'Perimeter Fence South', name_ar: 'السياج الجنوبي', zone_type: 'perimeter', security_level: 'medium' },
  { name: 'Warehouse Area', name_ar: 'منطقة المستودعات', zone_type: 'storage', security_level: 'medium' },
  { name: 'Control Room', name_ar: 'غرفة التحكم', zone_type: 'restricted', security_level: 'critical' },
  { name: 'Chemical Storage', name_ar: 'مخزن المواد الكيميائية', zone_type: 'hazmat', security_level: 'high' },
  { name: 'Admin Building', name_ar: 'مبنى الإدارة', zone_type: 'office', security_level: 'low' },
  { name: 'Emergency Assembly Point', name_ar: 'نقطة التجمع الطارئة', zone_type: 'assembly', security_level: 'low' },
]

const SECURITY_SHIFTS = [
  { name: 'Morning Shift', name_ar: 'المناوبة الصباحية', start_time: '06:00', end_time: '14:00' },
  { name: 'Evening Shift', name_ar: 'المناوبة المسائية', start_time: '14:00', end_time: '22:00' },
  { name: 'Night Shift', name_ar: 'المناوبة الليلية', start_time: '22:00', end_time: '06:00' },
]

const VISITORS_DATA = [
  { name: 'Fahad Al-Mutairi', name_ar: 'فهد المطيري', company: 'Ministry of Labor', purpose: 'Regulatory Inspection' },
  { name: 'Salman Al-Dosari', name_ar: 'سلمان الدوسري', company: 'Saudi Aramco', purpose: 'Vendor Meeting' },
  { name: 'Turki Al-Shehri', name_ar: 'تركي الشهري', company: 'SABIC', purpose: 'Technical Consultation' },
  { name: 'Bandar Al-Harbi', name_ar: 'بندر الحربي', company: 'Civil Defense', purpose: 'Fire Safety Audit' },
  { name: 'Mansour Al-Qahtani', name_ar: 'منصور القحطاني', company: 'Environmental Agency', purpose: 'Environmental Review' },
]

// Helper functions
function generateReferenceId(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `TEST-${prefix}-${timestamp}-${random}`
}

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date.toISOString()
}

function randomFutureDate(daysAhead: number): string {
  const date = new Date()
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead))
  return date.toISOString().split('T')[0]
}

function randomPastDate(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo))
  return date.toISOString().split('T')[0]
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, n)
}

async function seedOrganizationStructure(supabase: any, tenantId: string) {
  console.log('Seeding organization structure...')
  const results = { branches: 0, sites: 0, buildings: 0, floors: 0, divisions: 0, departments: 0 }
  
  // Seed branches - using actual schema: id, tenant_id, name, location
  const branchIds: string[] = []
  for (const branch of BRANCHES) {
    const { data, error } = await supabase
      .from('branches')
      .insert({
        tenant_id: tenantId,
        name: `TEST - ${branch.name}`,
        location: `${branch.city}, ${branch.address}`,
      })
      .select('id')
      .single()
    
    if (error) {
      console.log('Branch insert error:', error.message)
    }
    if (!error && data) {
      branchIds.push(data.id)
      results.branches++
    }
  }

  // Seed sites - actual schema: id, tenant_id, name, address, branch_id, is_active
  const siteIds: string[] = []
  for (let i = 0; i < branchIds.length; i++) {
    const sitesForBranch = SITES_PER_BRANCH[i] || SITES_PER_BRANCH[0]
    for (const site of sitesForBranch) {
      const { data, error } = await supabase
        .from('sites')
        .insert({
          tenant_id: tenantId,
          branch_id: branchIds[i],
          name: `TEST - ${site.name}`,
          address: `${BRANCHES[i].city} - ${site.type}`,
          is_active: true,
        })
        .select('id')
        .single()
      
      if (error) {
        console.log('Site insert error:', error.message)
      }
      if (!error && data) {
        siteIds.push(data.id)
        results.sites++
      }
    }
  }

  // Seed buildings - actual schema: id, tenant_id, site_id, name, name_ar, code, is_active
  const buildingIds: string[] = []
  for (const siteId of siteIds) {
    const buildingsToCreate = pickRandomN(BUILDINGS, 2)
    for (const building of buildingsToCreate) {
      const { data, error } = await supabase
        .from('buildings')
        .insert({
          tenant_id: tenantId,
          site_id: siteId,
          name: `TEST - ${building.name}`,
          name_ar: building.name_ar,
          code: `TEST-${building.code}-${Math.random().toString(36).substring(7)}`,
          is_active: true,
        })
        .select('id')
        .single()
      
      if (error) {
        console.log('Building insert error:', error.message)
      }
      if (!error && data) {
        buildingIds.push(data.id)
        results.buildings++
      }
    }
  }

  // Seed floors/zones - actual schema: id, tenant_id, building_id, name, name_ar, zone_type, is_active
  for (const buildingId of buildingIds) {
    const floorsToCreate = pickRandomN(FLOORS, 2)
    for (const floor of floorsToCreate) {
      const { error } = await supabase
        .from('floors_zones')
        .insert({
          tenant_id: tenantId,
          building_id: buildingId,
          name: `TEST - ${floor.name}`,
          name_ar: floor.name_ar,
          is_active: true,
        })
      
      if (error) {
        console.log('Floor insert error:', error.message)
      }
      if (!error) results.floors++
    }
  }

  // Seed divisions - actual schema: id, tenant_id, name
  const divisionMap: Record<string, string> = {}
  for (const division of DIVISIONS) {
    const { data, error } = await supabase
      .from('divisions')
      .insert({
        tenant_id: tenantId,
        name: `TEST - ${division.name}`,
      })
      .select('id')
      .single()
    
    if (error) {
      console.log('Division insert error:', error.message)
    }
    if (!error && data) {
      divisionMap[division.code] = data.id
      results.divisions++
    }
  }

  // Seed departments - actual schema: id, tenant_id, division_id, name
  for (const dept of DEPARTMENTS) {
    const divisionId = divisionMap[dept.division]
    if (divisionId) {
      const { error } = await supabase
        .from('departments')
        .insert({
          tenant_id: tenantId,
          division_id: divisionId,
          name: `TEST - ${dept.name}`,
        })
      
      if (error) {
        console.log('Department insert error:', error.message)
      }
      if (!error) results.departments++
    }
  }

  return { results, siteIds, buildingIds }
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
        installation_date: randomPastDate(365 * 3),
        warranty_expiry: randomFutureDate(365),
        last_inspection_date: randomPastDate(90),
        next_inspection_due: randomFutureDate(90),
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
        next_due: randomFutureDate(30),
        is_active: true,
      })
    
    if (!error) results.schedules++
  }

  return { results, assetIds }
}

async function seedContractors(supabase: any, tenantId: string, siteIds: string[]) {
  console.log('Seeding contractors...')
  const results = { companies: 0, workers: 0, projects: 0 }

  // Seed contractor companies
  const companyIds: string[] = []
  for (const company of CONTRACTOR_COMPANIES) {
    const { data, error } = await supabase
      .from('contractor_companies')
      .insert({
        tenant_id: tenantId,
        name: company.name,
        name_ar: company.name_ar,
        trade_type: company.trade,
        license_number: `TEST-${company.license}`,
        contact_email: `info@${company.name.toLowerCase().replace(/\s+/g, '')}.sa`,
        contact_phone: `+966${Math.floor(500000000 + Math.random() * 99999999)}`,
        status: 'approved',
        safety_rating: Math.floor(70 + Math.random() * 30),
        insurance_expiry: randomFutureDate(365),
        license_expiry: randomFutureDate(365),
      })
      .select('id')
      .single()
    
    if (!error && data) {
      companyIds.push(data.id)
      results.companies++
    }
  }

  // Seed contractor workers
  const workerIds: string[] = []
  for (const companyId of companyIds) {
    const workersToCreate = pickRandomN(WORKER_NAMES, 6)
    for (const worker of workersToCreate) {
      const { data, error } = await supabase
        .from('contractor_workers')
        .insert({
          tenant_id: tenantId,
          company_id: companyId,
          first_name: worker.first,
          last_name: worker.last,
          first_name_ar: worker.first_ar,
          last_name_ar: worker.last_ar,
          iqama_number: `TEST-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          job_title: pickRandom(['Electrician', 'Welder', 'Technician', 'Supervisor', 'Operator', 'Helper']),
          phone: `+966${Math.floor(500000000 + Math.random() * 99999999)}`,
          status: pickRandom(['active', 'active', 'active', 'inactive']),
          induction_completed: Math.random() > 0.3,
          induction_expiry: randomFutureDate(365),
          medical_expiry: randomFutureDate(180),
        })
        .select('id')
        .single()
      
      if (!error && data) {
        workerIds.push(data.id)
        results.workers++
      }
    }
  }

  // Seed contractor projects
  for (let i = 0; i < 8; i++) {
    const { error } = await supabase
      .from('contractor_projects')
      .insert({
        tenant_id: tenantId,
        company_id: pickRandom(companyIds),
        site_id: pickRandom(siteIds),
        project_name: `TEST-Project ${i + 1}: ${pickRandom(['Maintenance', 'Installation', 'Upgrade', 'Repair'])}`,
        project_code: generateReferenceId('PROJ'),
        start_date: randomPastDate(60),
        end_date: randomFutureDate(120),
        status: pickRandom(['active', 'active', 'completed', 'on_hold']),
        description: 'Test project for development and QA',
      })
    
    if (!error) results.projects++
  }

  return { results, companyIds, workerIds }
}

async function seedIncidents(supabase: any, tenantId: string, siteIds: string[], userId: string) {
  console.log('Seeding incidents...')
  const results = { incidents: 0, actions: 0 }

  const incidentIds: string[] = []
  for (const incident of INCIDENTS_DATA) {
    const { data, error } = await supabase
      .from('incidents')
      .insert({
        tenant_id: tenantId,
        site_id: pickRandom(siteIds),
        reference_id: generateReferenceId('INC'),
        event_type: incident.type,
        severity_level: incident.severity,
        title: incident.title,
        title_ar: incident.title_ar,
        description: incident.description,
        category: incident.category,
        incident_date: randomPastDate(90),
        reported_by: userId,
        status: pickRandom(['open', 'investigating', 'closed', 'closed']),
        is_confidential: Math.random() > 0.9,
      })
      .select('id')
      .single()
    
    if (!error && data) {
      incidentIds.push(data.id)
      results.incidents++
    }
  }

  // Seed corrective actions
  for (const incidentId of incidentIds) {
    const numActions = Math.floor(1 + Math.random() * 3)
    for (let i = 0; i < numActions; i++) {
      const { error } = await supabase
        .from('corrective_actions')
        .insert({
          tenant_id: tenantId,
          incident_id: incidentId,
          reference_id: generateReferenceId('ACT'),
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
          due_date: randomFutureDate(30),
          assigned_to: userId,
          created_by: userId,
        })
      
      if (!error) results.actions++
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
        site_id: pickRandom(siteIds),
        reference_id: generateReferenceId('RA'),
        title: ra.title,
        title_ar: ra.title_ar,
        activity_description: ra.activity,
        status: ra.status,
        assessment_date: randomPastDate(180),
        review_date: randomFutureDate(365),
        created_by: userId,
        risk_level: pickRandom(['low', 'medium', 'high']),
      })
      .select('id')
      .single()
    
    if (!error && data) {
      assessmentIds.push(data.id)
      results.assessments++
    }
  }

  // Seed risk assessment details (hazards)
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
          potential_consequences: hazard.consequence,
          existing_controls: hazard.existing_controls,
          initial_likelihood: hazard.likelihood,
          initial_severity: hazard.severity,
          initial_risk_score: hazard.likelihood * hazard.severity,
          additional_controls: 'Implement additional monitoring and training',
          residual_likelihood: Math.max(1, hazard.likelihood - 1),
          residual_severity: hazard.severity,
          residual_risk_score: Math.max(1, hazard.likelihood - 1) * hazard.severity,
          sort_order: i + 1,
        })
      
      if (!error) results.details++
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

    // Add 2-3 team members
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

  // Seed inspection templates
  const templateMap: Record<string, string> = {}
  for (const template of INSPECTION_TEMPLATES) {
    const { data, error } = await supabase
      .from('inspection_templates')
      .insert({
        tenant_id: tenantId,
        name: `TEST - ${template.name}`,
        name_ar: template.name_ar,
        category: template.category,
        frequency: template.frequency,
        is_active: true,
        created_by: userId,
      })
      .select('id')
      .single()
    
    if (!error && data) {
      templateMap[template.name] = data.id
      results.templates++
    }
  }

  // Seed template items
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
            item_type: 'yes_no_na',
            is_required: true,
            sort_order: i + 1,
          })
          .select('id')
          .single()
        
        if (!error && data) {
          templateItemIds[templateId].push(data.id)
          results.items++
        }
      }
    }
  }

  // Seed inspection sessions
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
        reference_id: generateReferenceId('INSP'),
        inspector_id: userId,
        status: pickRandom(['completed', 'completed', 'in_progress', 'scheduled']),
        scheduled_date: randomPastDate(30),
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
                due_date: randomFutureDate(14),
                created_by: userId,
              })
            
            if (!findingError) results.findings++
          }
        }
      }
    }
  }

  return { results, sessionIds }
}

async function seedPTW(supabase: any, tenantId: string, siteIds: string[], userId: string) {
  console.log('Seeding PTW...')
  const results = { permitTypes: 0, projects: 0, permits: 0, gasTests: 0 }

  // Seed PTW permit types
  const permitTypeIds: string[] = []
  for (const type of PTW_TYPES) {
    const { data, error } = await supabase
      .from('ptw_permit_types')
      .insert({
        tenant_id: tenantId,
        name: `TEST - ${type.name}`,
        name_ar: type.name_ar,
        code: `TEST-${type.code}`,
        color: type.color,
        requires_gas_test: type.requires_gas_test,
        is_active: true,
      })
      .select('id')
      .single()
    
    if (!error && data) {
      permitTypeIds.push(data.id)
      results.permitTypes++
    }
  }

  // Seed PTW projects
  const projectIds: string[] = []
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from('ptw_projects')
      .insert({
        tenant_id: tenantId,
        site_id: pickRandom(siteIds),
        name: `TEST - PTW Project ${i + 1}`,
        code: generateReferenceId('PTWP'),
        start_date: randomPastDate(30),
        end_date: randomFutureDate(60),
        status: pickRandom(['active', 'active', 'completed']),
        created_by: userId,
      })
      .select('id')
      .single()
    
    if (!error && data) {
      projectIds.push(data.id)
      results.projects++
    }
  }

  // Seed PTW permits
  for (let i = 0; i < 20; i++) {
    const permitTypeId = pickRandom(permitTypeIds)
    const { data, error } = await supabase
      .from('ptw_permits')
      .insert({
        tenant_id: tenantId,
        project_id: pickRandom(projectIds),
        permit_type_id: permitTypeId,
        site_id: pickRandom(siteIds),
        permit_number: generateReferenceId('PTW'),
        work_description: pickRandom([
          'Welding operations on pipeline',
          'Tank entry for cleaning',
          'Excavation for cable laying',
          'Electrical panel maintenance',
          'Scaffold erection for painting',
        ]),
        work_location: pickRandom(['Area A', 'Area B', 'Tank Farm', 'Electrical Room', 'Warehouse']),
        valid_from: new Date().toISOString(),
        valid_until: randomFutureDate(7),
        status: pickRandom(['draft', 'pending_approval', 'approved', 'active', 'closed']),
        requested_by: userId,
        created_by: userId,
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
    }
  }

  return results
}

async function seedSecurity(supabase: any, tenantId: string, siteIds: string[], userId: string) {
  console.log('Seeding security operations...')
  const results = { zones: 0, shifts: 0, routes: 0, checkpoints: 0, patrols: 0, roster: 0 }

  // Seed security zones
  const zoneIds: string[] = []
  for (const zone of SECURITY_ZONES) {
    const { data, error } = await supabase
      .from('security_zones')
      .insert({
        tenant_id: tenantId,
        site_id: pickRandom(siteIds),
        name: `TEST - ${zone.name}`,
        name_ar: zone.name_ar,
        zone_type: zone.zone_type,
        security_level: zone.security_level,
        is_active: true,
      })
      .select('id')
      .single()
    
    if (!error && data) {
      zoneIds.push(data.id)
      results.zones++
    }
  }

  // Seed security shifts
  const shiftIds: string[] = []
  for (const shift of SECURITY_SHIFTS) {
    const { data, error } = await supabase
      .from('security_shifts')
      .insert({
        tenant_id: tenantId,
        name: `TEST - ${shift.name}`,
        name_ar: shift.name_ar,
        start_time: shift.start_time,
        end_time: shift.end_time,
        is_active: true,
      })
      .select('id')
      .single()
    
    if (!error && data) {
      shiftIds.push(data.id)
      results.shifts++
    }
  }

  // Seed patrol routes
  const routeIds: string[] = []
  for (let i = 0; i < 6; i++) {
    const { data, error } = await supabase
      .from('security_patrol_routes')
      .insert({
        tenant_id: tenantId,
        site_id: pickRandom(siteIds),
        name: `TEST - Route ${i + 1}`,
        description: `Patrol route covering areas ${i + 1}`,
        estimated_duration_minutes: 30 + Math.floor(Math.random() * 30),
        is_active: true,
      })
      .select('id')
      .single()
    
    if (!error && data) {
      routeIds.push(data.id)
      results.routes++
    }
  }

  // Seed patrol checkpoints
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
          qr_code: `TEST-CP-${routeId}-${i + 1}`,
          is_mandatory: Math.random() > 0.3,
        })
      
      if (!error) results.checkpoints++
    }
  }

  // Seed security patrols
  for (let i = 0; i < 20; i++) {
    const { error } = await supabase
      .from('security_patrols')
      .insert({
        tenant_id: tenantId,
        route_id: pickRandom(routeIds),
        guard_id: userId,
        shift_id: pickRandom(shiftIds),
        patrol_date: randomPastDate(14),
        started_at: randomPastDate(14),
        completed_at: Math.random() > 0.2 ? randomPastDate(14) : null,
        status: pickRandom(['completed', 'completed', 'in_progress', 'scheduled']),
      })
    
    if (!error) results.patrols++
  }

  // Seed shift roster
  for (let i = 0; i < 30; i++) {
    const { error } = await supabase
      .from('shift_roster')
      .insert({
        tenant_id: tenantId,
        guard_id: userId,
        shift_id: pickRandom(shiftIds),
        site_id: pickRandom(siteIds),
        roster_date: randomFutureDate(14),
        status: pickRandom(['scheduled', 'scheduled', 'confirmed']),
      })
    
    if (!error) results.roster++
  }

  return { results, zoneIds, shiftIds }
}

async function seedVisitors(supabase: any, tenantId: string, siteIds: string[]) {
  console.log('Seeding visitors...')
  const results = { visitors: 0, entries: 0 }

  // Seed visitors
  const visitorIds: string[] = []
  for (const visitor of VISITORS_DATA) {
    const { data, error } = await supabase
      .from('visitors')
      .insert({
        tenant_id: tenantId,
        full_name: visitor.name,
        full_name_ar: visitor.name_ar,
        company_name: visitor.company,
        purpose: visitor.purpose,
        id_type: 'national_id',
        id_number: `TEST-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        phone: `+966${Math.floor(500000000 + Math.random() * 99999999)}`,
        email: `${visitor.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        status: 'pre_registered',
      })
      .select('id')
      .single()
    
    if (!error && data) {
      visitorIds.push(data.id)
      results.visitors++
    }
  }

  // Seed gate entry logs
  for (let i = 0; i < 50; i++) {
    const { error } = await supabase
      .from('gate_entry_logs')
      .insert({
        tenant_id: tenantId,
        site_id: pickRandom(siteIds),
        visitor_id: Math.random() > 0.5 ? pickRandom(visitorIds) : null,
        entry_type: pickRandom(['visitor', 'contractor', 'delivery', 'employee']),
        gate_number: pickRandom(['Main Gate', 'Gate 2', 'Gate 3']),
        entry_time: randomPastDate(7),
        exit_time: Math.random() > 0.3 ? randomPastDate(7) : null,
        vehicle_plate: Math.random() > 0.5 ? `TEST-${Math.random().toString(36).substring(2, 6).toUpperCase()}` : null,
        status: pickRandom(['checked_in', 'checked_out', 'checked_out']),
      })
    
    if (!error) results.entries++
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
    const contractorResults = await seedContractors(supabase, tenantId, orgResults.siteIds)
    const incidentResults = await seedIncidents(supabase, tenantId, orgResults.siteIds, userId)
    const raResults = await seedRiskAssessments(supabase, tenantId, orgResults.siteIds, userId)
    const inspectionResults = await seedInspections(supabase, tenantId, orgResults.siteIds, userId)
    const ptwResults = await seedPTW(supabase, tenantId, orgResults.siteIds, userId)
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
