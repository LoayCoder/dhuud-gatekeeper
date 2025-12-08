/**
 * AI Assistant for Incident Severity Analysis
 * Uses mock implementation - in production would connect to LLM API
 */

export interface AISuggestion {
  suggestedSeverity: 'low' | 'medium' | 'high' | 'critical';
  suggestedEventType?: 'observation' | 'incident';
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

const EVENT_TYPE_KEYWORDS = {
  observation: {
    unsafe_act: ['unsafe behavior', 'not wearing', 'ignoring', 'bypassing', 'shortcut', 'horseplay', 'distracted'],
    unsafe_condition: ['hazard', 'unsafe condition', 'broken', 'damaged', 'missing guard', 'exposed wires', 'slippery', 'obstruction'],
  },
  incident: {
    near_miss: ['near miss', 'close call', 'almost', 'narrowly avoided', 'lucky'],
    property_damage: ['damage', 'broken', 'destroyed', 'crashed', 'collision'],
    environmental: ['spill', 'leak', 'contamination', 'pollution', 'emission'],
    first_aid: ['first aid', 'minor injury', 'bandage', 'ice pack', 'small cut'],
    medical_treatment: ['hospital', 'medical treatment', 'doctor', 'stitches', 'x-ray'],
    fire: ['fire', 'smoke', 'burning', 'flames', 'extinguisher'],
    security: ['theft', 'intrusion', 'unauthorized', 'breach', 'trespassing'],
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
    suggestedSubtype: eventTypeResult.subtype,
    refinedDescription,
    keyRisks,
    confidence,
  };
}

function detectEventTypeFromText(text: string): { eventType?: 'observation' | 'incident'; subtype?: string } {
  // Check observation keywords first
  for (const [subtype, keywords] of Object.entries(EVENT_TYPE_KEYWORDS.observation)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return { eventType: 'observation', subtype };
      }
    }
  }
  
  // Check incident keywords
  for (const [subtype, keywords] of Object.entries(EVENT_TYPE_KEYWORDS.incident)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return { eventType: 'incident', subtype };
      }
    }
  }
  
  return {};
}

export async function detectEventType(description: string): Promise<{ 
  eventType: 'observation' | 'incident' | null; 
  subtype: string | null;
  confidence: number;
  reasoning?: string;
}> {
  try {
    // Call the AI-powered edge function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-event-type`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ description }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Event type detection failed:', response.status, errorData);
      
      // Fall back to keyword-based detection on error
      return fallbackDetectEventType(description);
    }

    const data = await response.json();
    
    return {
      eventType: data.eventType || null,
      subtype: data.subtype || null,
      confidence: data.confidence || 0.8,
      reasoning: data.reasoning,
    };
  } catch (error) {
    console.error('Error calling detect-event-type:', error);
    // Fall back to keyword-based detection on network error
    return fallbackDetectEventType(description);
  }
}

// Fallback function using keyword matching (for offline/error scenarios)
function fallbackDetectEventType(description: string): {
  eventType: 'observation' | 'incident' | null;
  subtype: string | null;
  confidence: number;
} {
  const lowerDesc = description.toLowerCase();
  const result = detectEventTypeFromText(lowerDesc);
  
  return {
    eventType: result.eventType || null,
    subtype: result.subtype || null,
    confidence: result.eventType ? 0.6 : 0.3, // Lower confidence for fallback
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
