/**
 * Mock AI Vision Analysis Service
 * Simulates computer vision analysis of incident images
 */

export interface AIVisionResult {
  suggestedTitle: string;
  suggestedDescription: string;
  suggestedSeverity: 'low' | 'medium' | 'high' | 'critical';
  detectedHazards: string[];
  confidence: number;
}

// Mock hazard scenarios for simulation
const HAZARD_SCENARIOS = [
  {
    title: "Oil Spill Detected on Floor",
    desc: "Visual analysis detected liquid spillage on floor surface creating a slip hazard. The affected area appears to be approximately 2-3 square meters. Immediate cleanup and warning signage recommended.",
    severity: "medium" as const,
    hazards: ["slip", "chemical"],
  },
  {
    title: "Exposed Electrical Wiring Identified",
    desc: "AI analysis detected exposed electrical wiring near work area. Fire risk and electrical shock hazard present. Immediate isolation and repair required by qualified electrician.",
    severity: "high" as const,
    hazards: ["electrical", "fire"],
  },
  {
    title: "Missing Machine Safety Guard",
    desc: "Visual inspection identified missing protective guard on machinery. Laceration and entanglement risk to operators. Machine should be locked out until guard is reinstalled.",
    severity: "high" as const,
    hazards: ["machinery", "laceration"],
  },
  {
    title: "Blocked Emergency Exit Detected",
    desc: "AI analysis found emergency exit route obstructed by materials. Critical evacuation hazard. Immediate clearance of exit pathway required per fire safety regulations.",
    severity: "critical" as const,
    hazards: ["fire", "evacuation"],
  },
  {
    title: "Unsecured Load on Elevated Surface",
    desc: "Visual detection of improperly secured materials on elevated platform. Falling object hazard to workers below. Materials should be secured or relocated immediately.",
    severity: "medium" as const,
    hazards: ["falling_objects", "struck_by"],
  },
  {
    title: "Damaged Ladder Identified",
    desc: "AI inspection detected structural damage to ladder rungs. Fall hazard for users. Ladder should be removed from service and replaced immediately.",
    severity: "high" as const,
    hazards: ["fall", "equipment"],
  },
  {
    title: "Chemical Container Without Label",
    desc: "Unidentified chemical container detected without proper hazard labeling. Potential exposure risk. Contents should be identified and properly labeled per GHS standards.",
    severity: "medium" as const,
    hazards: ["chemical", "exposure"],
  },
  {
    title: "Tripping Hazard - Cables on Floor",
    desc: "Multiple cables and cords detected running across walkway. Trip and fall hazard present. Cable management and floor covers recommended.",
    severity: "low" as const,
    hazards: ["trip", "fall"],
  },
];

/**
 * Analyzes an incident image and returns AI-generated suggestions
 * This is a mock implementation that simulates a 2-second AI processing delay
 */
export async function analyzeIncidentImage(file: File): Promise<AIVisionResult> {
  // Simulate AI processing delay (1.5-2.5 seconds)
  const delay = 1500 + Math.random() * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Select a random hazard scenario
  const scenario = HAZARD_SCENARIOS[Math.floor(Math.random() * HAZARD_SCENARIOS.length)];

  // Generate confidence score (75-95%)
  const confidence = 0.75 + Math.random() * 0.2;

  return {
    suggestedTitle: scenario.title,
    suggestedDescription: scenario.desc,
    suggestedSeverity: scenario.severity,
    detectedHazards: scenario.hazards,
    confidence,
  };
}

/**
 * Validates if a file is a supported image type
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  return validTypes.includes(file.type);
}

/**
 * Validates if a file is a supported video type
 */
export function isValidVideoFile(file: File): boolean {
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  return validTypes.includes(file.type);
}
