/**
 * AI Assistant for Incident Severity Analysis
 * Uses Lovable AI via edge function - with fallback to keyword matching
 */

export interface AISuggestion {
  suggestedSeverity: 'low' | 'medium' | 'high' | 'critical';
  suggestedEventType?: 'observation' | 'incident';
  suggestedIncidentType?: string;
  suggestedSubtype?: string;
  refinedDescription: string;
  keyRisks: string[];
  confidence: number;
}

export interface AIRewriteResult {
  text: string;
  confidence: number;
}

const SEVERITY_KEYWORDS = {
  critical: [
    'fatality', 'death', 'explosion', 'collapse', 'chemical spill', 
    'fire', 'major leak', 'toxic', 'evacuation required', 'multiple casualties',
    'lopc', 'loss of primary containment', 'erp activated'
  ],
  high: [
    'hospitalization', 'fracture', 'burn', 'serious injury', 'evacuation',
    'amputation', 'unconscious', 'electrical shock', 'fall from height',
    'confined space', 'equipment failure', 'vehicle collision', 'chemical exposure',
    'process fire', 'overpressure', 'barrier failure'
  ],
  medium: [
    'minor injury', 'property damage', 'near miss', 'equipment malfunction',
    'first aid', 'sprain', 'cut', 'bruise', 'slip', 'trip', 'heat stress',
    'noise exposure', 'vehicle incident', 'spill', 'leak'
  ],
  low: [
    'observation', 'unsafe condition', 'housekeeping', 'minor',
    'no injury', 'potential hazard', 'suggestion', 'improvement'
  ],
};

// Keywords for incident type detection
const INCIDENT_TYPE_KEYWORDS: Record<string, string[]> = {
  safety: ['injury', 'hurt', 'fall', 'slip', 'trip', 'struck', 'caught', 'burn', 'cut', 'laceration', 'eye', 'shock', 'dropped object', 'tool', 'equipment'],
  health: ['heat stress', 'dehydration', 'chemical exposure', 'inhalation', 'noise', 'hearing', 'respiratory', 'dust', 'fumes', 'fatigue', 'illness', 'disease', 'food'],
  process_safety: ['lopc', 'containment', 'process fire', 'explosion', 'overpressure', 'relief', 'toxic release', 'flammable', 'runaway', 'barrier', 'sis', 'psv', 'esd'],
  environment: ['spill', 'leak', 'contamination', 'emission', 'odor', 'waste', 'disposal', 'soil', 'wildlife', 'discharge', 'stormwater', 'sewer'],
  security: ['unauthorized', 'access', 'theft', 'stolen', 'vandalism', 'assault', 'threat', 'harassment', 'crowd', 'suspicious', 'bomb', 'perimeter', 'breach', 'intrusion'],
  property_asset: ['equipment damage', 'building damage', 'infrastructure', 'utility outage', 'power outage', 'flooding', 'weather damage', 'non-process fire'],
  road_traffic: ['vehicle', 'collision', 'crash', 'pedestrian', 'reversing', 'forklift', 'buggy', 'cart', 'speeding', 'unsafe driving', 'load shift'],
  quality_service: ['service interruption', 'nonconformance', 'quality failure', 'product defect'],
  community_third_party: ['visitor', 'third party', 'public complaint', 'nuisance', 'offsite traffic'],
  compliance_regulatory: ['ptw', 'permit', 'violation', 'breach', 'compliance', 'sop', 'legal', 'regulatory'],
  emergency_crisis: ['erp', 'emergency response', 'evacuation', 'crisis', 'major incident']
};

const EVENT_TYPE_KEYWORDS = {
  observation: {
    unsafe_act: ['unsafe behavior', 'not wearing', 'ignoring', 'bypassing', 'shortcut', 'horseplay', 'distracted'],
    unsafe_condition: ['hazard', 'unsafe condition', 'broken', 'damaged', 'missing guard', 'exposed wires', 'slippery', 'obstruction'],
  },
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
  'Process safety management',
  'Contractor management',
];

export async function analyzeIncidentDescription(description: string): Promise<AISuggestion> {
  // Simulate AI processing time
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
  
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
  
  // Detect event type and subtype
  const eventTypeResult = detectEventTypeFromText(lowerDesc);
  
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
    suggestedEventType: eventTypeResult.eventType,
    suggestedIncidentType: eventTypeResult.incidentType,
    suggestedSubtype: eventTypeResult.subtype,
    refinedDescription,
    keyRisks,
    confidence,
  };
}

function detectEventTypeFromText(text: string): { 
  eventType?: 'observation' | 'incident'; 
  incidentType?: string;
  subtype?: string;
} {
  // Check observation keywords first
  for (const [subtype, keywords] of Object.entries(EVENT_TYPE_KEYWORDS.observation)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return { eventType: 'observation', subtype };
      }
    }
  }
  
  // Check incident type keywords
  for (const [incidentType, keywords] of Object.entries(INCIDENT_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return { 
          eventType: 'incident', 
          incidentType,
          subtype: undefined // Will be determined by AI or user selection
        };
      }
    }
  }
  
  return {};
}

export interface AIAnalysisResult {
  eventType: 'observation' | 'incident' | null;
  incidentType: string | null;
  subtype: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  keyRisks: string[];
  confidence: number;
  reasoning?: string;
  // Injury details
  hasInjury: boolean;
  injuryCount?: number;
  injuryDescription?: string;
  // Damage details
  hasDamage: boolean;
  damageDescription?: string;
  estimatedCost?: number;
  // Immediate actions
  immediateActions?: string[];
}

import { supabase } from '@/integrations/supabase/client';

export async function analyzeIncidentWithAI(description: string): Promise<AIAnalysisResult> {
  try {
    // Call the AI analysis edge function using supabase client
    const { data, error } = await supabase.functions.invoke('analyze-incident', {
      body: { description },
    });

    if (error) {
      console.error('Incident analysis failed:', error);
      // Fall back to local analysis on error
      return fallbackAnalyzeIncident(description);
    }
    
    return {
      eventType: data.eventType || null,
      incidentType: data.incidentType || null,
      subtype: data.subtype || null,
      severity: data.severity || null,
      keyRisks: data.keyRisks || [],
      confidence: data.confidence || 0.8,
      reasoning: data.reasoning,
      hasInjury: data.hasInjury || false,
      injuryCount: data.injuryCount || undefined,
      injuryDescription: data.injuryDescription || undefined,
      hasDamage: data.hasDamage || false,
      damageDescription: data.damageDescription || undefined,
      estimatedCost: data.estimatedCost || undefined,
      immediateActions: data.immediateActions || [],
    };
  } catch (error) {
    console.error('Error calling analyze-incident:', error);
    // Fall back to local analysis on network error
    return fallbackAnalyzeIncident(description);
  }
}

// Fallback function using keyword matching (for offline/error scenarios)
function fallbackAnalyzeIncident(description: string): AIAnalysisResult {
  const lowerDesc = description.toLowerCase();
  const typeResult = detectEventTypeFromText(lowerDesc);
  
  // Determine severity based on keyword matching
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  
  for (const keyword of SEVERITY_KEYWORDS.critical) {
    if (lowerDesc.includes(keyword)) {
      severity = 'critical';
      break;
    }
  }
  if (severity === 'low') {
    for (const keyword of SEVERITY_KEYWORDS.high) {
      if (lowerDesc.includes(keyword)) {
        severity = 'high';
        break;
      }
    }
  }
  if (severity === 'low') {
    for (const keyword of SEVERITY_KEYWORDS.medium) {
      if (lowerDesc.includes(keyword)) {
        severity = 'medium';
        break;
      }
    }
  }

  // Select random risks
  const numRisks = 2 + Math.floor(Math.random() * 2);
  const shuffledRisks = [...RISK_CATEGORIES].sort(() => Math.random() - 0.5);
  
  // Basic injury/damage detection from keywords (reuse lowerDesc from line 233)
  const hasInjury = ['injury', 'hurt', 'injured', 'hospitalized', 'first aid', 'إصابة', 'مصاب'].some(k => lowerDesc.includes(k));
  const hasDamage = ['damage', 'broken', 'destroyed', 'leak', 'spill', 'ضرر', 'تلف', 'كسر'].some(k => lowerDesc.includes(k));
  
  return {
    eventType: typeResult.eventType || null,
    incidentType: typeResult.incidentType || null,
    subtype: typeResult.subtype || null,
    severity,
    keyRisks: shuffledRisks.slice(0, numRisks),
    confidence: typeResult.eventType ? 0.6 : 0.4,
    hasInjury,
    injuryCount: undefined,
    injuryDescription: undefined,
    hasDamage,
    damageDescription: undefined,
    estimatedCost: undefined,
    immediateActions: [],
  };
}

export async function detectEventType(description: string): Promise<{ 
  eventType: 'observation' | 'incident' | null; 
  incidentType: string | null;
  subtype: string | null;
  confidence: number;
  reasoning?: string;
}> {
  // Use the combined analysis function
  const result = await analyzeIncidentWithAI(description);
  return {
    eventType: result.eventType,
    incidentType: result.incidentType,
    subtype: result.subtype,
    confidence: result.confidence,
    reasoning: result.reasoning,
  };
}

export async function rewriteText(text: string, type: 'title' | 'description'): Promise<AIRewriteResult> {
  // Simulate AI processing time
  await new Promise(resolve => setTimeout(resolve, 700 + Math.random() * 500));
  
  // Simple text improvement (in production, this would call an LLM)
  let improved = text.trim();
  
  // Capitalize first letter
  improved = improved.charAt(0).toUpperCase() + improved.slice(1);
  
  // Remove excessive punctuation
  improved = improved.replace(/\.{2,}/g, '.');
  improved = improved.replace(/\s+/g, ' ');
  
  // Ensure ends with period for descriptions
  if (type === 'description' && !improved.match(/[.!?]$/)) {
    improved += '.';
  }
  
  // For titles, ensure it's concise (max 120 chars)
  if (type === 'title' && improved.length > 120) {
    improved = improved.substring(0, 117) + '...';
  }
  
  return {
    text: improved,
    confidence: 0.8 + Math.random() * 0.15,
  };
}

export async function summarizeText(text: string): Promise<AIRewriteResult> {
  // Simulate AI processing time
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
  
  // Simple summarization (in production, this would call an LLM)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Take first 2-3 sentences as summary
  const summaryLength = Math.min(3, sentences.length);
  let summary = sentences.slice(0, summaryLength).join('. ').trim();
  
  if (summary && !summary.match(/[.!?]$/)) {
    summary += '.';
  }
  
  return {
    text: summary || text,
    confidence: 0.75 + Math.random() * 0.2,
  };
}
