/**
 * Body Parts and Injury Types Constants
 * Used for standardized injury documentation in the Investigation system
 */

export const BODY_PARTS = {
  head: { en: 'Head', ar: 'الرأس' },
  face: { en: 'Face', ar: 'الوجه' },
  eyes: { en: 'Eyes', ar: 'العينان' },
  ears: { en: 'Ears', ar: 'الأذنان' },
  nose: { en: 'Nose', ar: 'الأنف' },
  mouth: { en: 'Mouth', ar: 'الفم' },
  neck: { en: 'Neck', ar: 'الرقبة' },
  left_shoulder: { en: 'Left Shoulder', ar: 'الكتف الأيسر' },
  right_shoulder: { en: 'Right Shoulder', ar: 'الكتف الأيمن' },
  chest: { en: 'Chest', ar: 'الصدر' },
  upper_back: { en: 'Upper Back', ar: 'أعلى الظهر' },
  lower_back: { en: 'Lower Back', ar: 'أسفل الظهر' },
  abdomen: { en: 'Abdomen', ar: 'البطن' },
  pelvis: { en: 'Pelvis', ar: 'الحوض' },
  left_upper_arm: { en: 'Left Upper Arm', ar: 'الذراع العلوي الأيسر' },
  right_upper_arm: { en: 'Right Upper Arm', ar: 'الذراع العلوي الأيمن' },
  left_elbow: { en: 'Left Elbow', ar: 'الكوع الأيسر' },
  right_elbow: { en: 'Right Elbow', ar: 'الكوع الأيمن' },
  left_forearm: { en: 'Left Forearm', ar: 'الساعد الأيسر' },
  right_forearm: { en: 'Right Forearm', ar: 'الساعد الأيمن' },
  left_wrist: { en: 'Left Wrist', ar: 'المعصم الأيسر' },
  right_wrist: { en: 'Right Wrist', ar: 'المعصم الأيمن' },
  left_hand: { en: 'Left Hand', ar: 'اليد اليسرى' },
  right_hand: { en: 'Right Hand', ar: 'اليد اليمنى' },
  left_fingers: { en: 'Left Fingers', ar: 'أصابع اليد اليسرى' },
  right_fingers: { en: 'Right Fingers', ar: 'أصابع اليد اليمنى' },
  left_thigh: { en: 'Left Thigh', ar: 'الفخذ الأيسر' },
  right_thigh: { en: 'Right Thigh', ar: 'الفخذ الأيمن' },
  left_knee: { en: 'Left Knee', ar: 'الركبة اليسرى' },
  right_knee: { en: 'Right Knee', ar: 'الركبة اليمنى' },
  left_shin: { en: 'Left Shin', ar: 'الساق اليسرى' },
  right_shin: { en: 'Right Shin', ar: 'الساق اليمنى' },
  left_ankle: { en: 'Left Ankle', ar: 'الكاحل الأيسر' },
  right_ankle: { en: 'Right Ankle', ar: 'الكاحل الأيمن' },
  left_foot: { en: 'Left Foot', ar: 'القدم اليسرى' },
  right_foot: { en: 'Right Foot', ar: 'القدم اليمنى' },
  left_toes: { en: 'Left Toes', ar: 'أصابع القدم اليسرى' },
  right_toes: { en: 'Right Toes', ar: 'أصابع القدم اليمنى' },
} as const;

export type BodyPartCode = keyof typeof BODY_PARTS;

export const INJURY_TYPES = {
  laceration: { en: 'Laceration/Cut', ar: 'جرح/قطع' },
  abrasion: { en: 'Abrasion/Scrape', ar: 'سحج/خدش' },
  puncture: { en: 'Puncture Wound', ar: 'جرح ثقبي' },
  contusion: { en: 'Bruise/Contusion', ar: 'كدمة/رض' },
  fracture: { en: 'Fracture', ar: 'كسر' },
  dislocation: { en: 'Dislocation', ar: 'خلع' },
  sprain: { en: 'Sprain', ar: 'التواء' },
  strain: { en: 'Strain', ar: 'شد عضلي' },
  burn_thermal: { en: 'Burn (Thermal)', ar: 'حرق حراري' },
  burn_chemical: { en: 'Burn (Chemical)', ar: 'حرق كيميائي' },
  burn_electrical: { en: 'Burn (Electrical)', ar: 'حرق كهربائي' },
  crushing: { en: 'Crushing Injury', ar: 'إصابة هرس' },
  amputation: { en: 'Amputation', ar: 'بتر' },
  internal_injury: { en: 'Internal Injury', ar: 'إصابة داخلية' },
  foreign_body: { en: 'Foreign Body', ar: 'جسم غريب' },
  inhalation: { en: 'Inhalation Injury', ar: 'إصابة استنشاق' },
  eye_injury: { en: 'Eye Injury', ar: 'إصابة العين' },
  hearing_damage: { en: 'Hearing Damage', ar: 'ضرر السمع' },
  heat_exhaustion: { en: 'Heat Exhaustion', ar: 'إنهاك حراري' },
  hypothermia: { en: 'Hypothermia', ar: 'انخفاض حرارة الجسم' },
  electrical_shock: { en: 'Electrical Shock', ar: 'صدمة كهربائية' },
  poisoning: { en: 'Poisoning', ar: 'تسمم' },
  other: { en: 'Other', ar: 'أخرى' },
} as const;

export type InjuryTypeCode = keyof typeof INJURY_TYPES;

export const INJURY_SEVERITY = {
  minor: { en: 'Minor', ar: 'طفيفة', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  moderate: { en: 'Moderate', ar: 'متوسطة', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  severe: { en: 'Severe', ar: 'شديدة', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  critical: { en: 'Critical', ar: 'حرجة', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
} as const;

export type InjurySeverityCode = keyof typeof INJURY_SEVERITY;

export const RECORDER_ROLES = {
  investigator: { en: 'Investigator', ar: 'المحقق' },
  medical_staff: { en: 'Medical Staff', ar: 'الطاقم الطبي' },
  first_aider: { en: 'First Aider', ar: 'المسعف' },
} as const;

export type RecorderRoleCode = keyof typeof RECORDER_ROLES;

// Body diagram marker interface
export interface BodyDiagramMarker {
  id: string;
  x: number;
  y: number;
  bodyPart?: BodyPartCode;
  notes?: string;
  injuryType?: InjuryTypeCode;
}

export interface BodyDiagramData {
  front: BodyDiagramMarker[];
  back: BodyDiagramMarker[];
  left: BodyDiagramMarker[];
  right: BodyDiagramMarker[];
}

export const DEFAULT_BODY_DIAGRAM_DATA: BodyDiagramData = {
  front: [],
  back: [],
  left: [],
  right: [],
};
