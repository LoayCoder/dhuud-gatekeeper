/**
 * Mock AI Assistant for Incident Severity Analysis
 * In production, this would connect to an LLM API
 */

export interface AISuggestion {
  suggestedSeverity: 'low' | 'medium' | 'high' | 'critical';
  refinedDescription: string;
  keyRisks: string[];
  confidence: number;
}

const SEVERITY_KEYWORDS = {
  critical: [
    'fatality', 'death', 'explosion', 'collapse', 'chemical spill', 
    'fire', 'major leak', 'toxic', 'evacuation required', 'multiple casualties'
  ],
  high: [
    'hospitalization', 'fracture', 'burn', 'serious injury', 'evacuation',
    'amputation', 'unconscious', 'electrical shock', 'fall from height',
    'confined space', 'equipment failure'
  ],
  medium: [
    'minor injury', 'property damage', 'near miss', 'equipment malfunction',
    'first aid', 'sprain', 'cut', 'bruise', 'slip', 'trip'
  ],
  low: [
    'observation', 'unsafe condition', 'housekeeping', 'minor',
    'no injury', 'potential hazard', 'suggestion', 'improvement'
  ],
};

const RISK_CATEGORIES = [
  'Equipment safety protocols',
  'Worker training requirements', 
  'Procedure compliance',
  'Personal protective equipment',
  'Housekeeping standards',
  'Emergency response preparedness',
  'Supervision oversight',
  'Work environment conditions',
];

export async function analyzeIncidentDescription(description: string): Promise<AISuggestion> {
  // Simulate AI processing time
  await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));
  
  const lowerDesc = description.toLowerCase();
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let matchCount = 0;
  
  // Determine severity based on keyword matching
  for (const keyword of SEVERITY_KEYWORDS.critical) {
    if (lowerDesc.includes(keyword)) {
      severity = 'critical';
      matchCount++;
      break;
    }
  }
  
  if (severity !== 'critical') {
    for (const keyword of SEVERITY_KEYWORDS.high) {
      if (lowerDesc.includes(keyword)) {
        severity = 'high';
        matchCount++;
        break;
      }
    }
  }
  
  if (severity === 'low') {
    for (const keyword of SEVERITY_KEYWORDS.medium) {
      if (lowerDesc.includes(keyword)) {
        severity = 'medium';
        matchCount++;
        break;
      }
    }
  }
  
  // Select 2-4 random relevant risks
  const numRisks = 2 + Math.floor(Math.random() * 3);
  const shuffledRisks = [...RISK_CATEGORIES].sort(() => Math.random() - 0.5);
  const keyRisks = shuffledRisks.slice(0, numRisks);
  
  // Clean up description
  const refinedDescription = description
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\.{2,}/g, '.');
  
  // Calculate confidence based on description length and keyword matches
  const lengthFactor = Math.min(description.length / 200, 1);
  const baseConfidence = 0.65 + (matchCount * 0.1) + (lengthFactor * 0.15);
  const confidence = Math.min(baseConfidence + Math.random() * 0.1, 0.95);
  
  return {
    suggestedSeverity: severity,
    refinedDescription,
    keyRisks,
    confidence,
  };
}
