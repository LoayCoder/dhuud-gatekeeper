export const LANGUAGES = [
  { value: "ar", label: "العربية (Arabic)" },
  { value: "en", label: "English" },
  { value: "ur", label: "اردو (Urdu)" },
  { value: "hi", label: "हिन्दी (Hindi)" },
  { value: "fil", label: "Filipino" },
];

export const ID_TYPES = [
  { value: "national_id", labelKey: "contractors.workers.idTypes.nationalId", fallback: "National ID" },
  { value: "iqama", labelKey: "contractors.workers.idTypes.iqama", fallback: "Iqama" },
  { value: "passport", labelKey: "contractors.workers.idTypes.passport", fallback: "Passport" },
];

export const WORKER_ROLES = [
  { value: "manager", labelKey: "contractors.workers.roles.manager", fallback: "Manager" },
  { value: "supervisor", labelKey: "contractors.workers.roles.supervisor", fallback: "Supervisor" },
  { value: "laborer", labelKey: "contractors.workers.roles.laborer", fallback: "Laborer" },
  { value: "engineer", labelKey: "contractors.workers.roles.engineer", fallback: "Engineer" },
  { value: "leader", labelKey: "contractors.workers.roles.leader", fallback: "Leader" },
];

export const FITNESS_OPTIONS = [
  { value: "fit", labelKey: "contractors.workers.fitness.fit", fallback: "Fit to Work – Medical Check Completed" },
  { value: "not_fit", labelKey: "contractors.workers.fitness.notFit", fallback: "Not Fit to Work" },
  { value: "pending_medical", labelKey: "contractors.workers.fitness.pending", fallback: "Pending Medical Check" },
];

export const TRAINING_CERTS = [
  { value: "first_aid", labelKey: "contractors.workers.certs.firstAid", fallback: "First Aid" },
  { value: "fire_safety", labelKey: "contractors.workers.certs.fireSafety", fallback: "Fire Safety" },
  { value: "ptw", labelKey: "contractors.workers.certs.ptw", fallback: "PTW (Permit to Work)" },
  { value: "confined_space", labelKey: "contractors.workers.certs.confinedSpace", fallback: "Confined Space" },
  { value: "working_at_height", labelKey: "contractors.workers.certs.workingAtHeight", fallback: "Working at Height" },
];

export const GENDERS = [
  { value: "male", labelKey: "common.male", fallback: "Male" },
  { value: "female", labelKey: "common.female", fallback: "Female" },
];
