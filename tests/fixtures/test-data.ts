// Test Fixtures
export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'testpassword',
    role: 'hsse_admin',
  },
  hsseManager: {
    email: 'hsse-manager@test.com',
    password: 'testpassword',
    role: 'hsse_manager',
  },
  hsseExpert: {
    email: 'hsse-expert@test.com',
    password: 'testpassword',
    role: 'hsse_expert',
  },
  deptRep: {
    email: 'dept-rep@test.com',
    password: 'testpassword',
    role: 'dept_rep',
  },
  investigator: {
    email: 'investigator@test.com',
    password: 'testpassword',
    role: 'hsse_investigator',
  },
  employee: {
    email: 'employee@test.com',
    password: 'testpassword',
    role: 'employee',
  },
};

export const testData = {
  incident: {
    valid: {
      title: 'Test Incident',
      description: 'This is a test incident for E2E testing',
      event_type: 'incident',
      severity: 'medium',
      location: 'Test Location',
      has_injury: false,
      has_damage: false,
    },
    withInjury: {
      title: 'Incident with Injury',
      description: 'Worker injured during work',
      event_type: 'incident',
      severity: 'high',
      has_injury: true,
      injury_details: {
        count: 1,
        description: 'Minor cut on hand',
      },
    },
    withDamage: {
      title: 'Incident with Property Damage',
      description: 'Equipment damaged',
      event_type: 'incident',
      severity: 'medium',
      has_damage: true,
      damage_details: {
        description: 'Machine broken',
        estimated_cost: 1000,
      },
    },
  },
  observation: {
    valid: {
      title: 'Test Observation',
      description: 'This is a test observation',
      event_type: 'observation',
      risk_rating: 'low',
    },
    highRisk: {
      title: 'High Risk Observation',
      description: 'Requires immediate attention',
      event_type: 'observation',
      risk_rating: 'high',
    },
  },
  investigation: {
    fiveWhys: [
      { why: 'Why did the incident happen?', answer: 'Because...' },
      { why: 'Why?', answer: 'Due to...' },
      { why: 'Why?', answer: 'Result of...' },
    ],
    rootCauses: [
      { text: 'Inadequate training', category: 'Training' },
      { text: 'Poor equipment maintenance', category: 'Maintenance' },
    ],
    correctiveActions: [
      {
        title: 'Implement safety training',
        description: 'Conduct safety training for all employees',
        due_date: '2026-04-30',
        priority: 'high',
      },
    ],
  },
};

export const testAttachments = {
  validImage: 'tests/fixtures/test-image.png',
  validPdf: 'tests/fixtures/test-document.pdf',
  largeFile: 'tests/fixtures/large-file.pdf',
};

// Helper functions
export function generateUniqueReference(): string {
  return `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getCurrentDate(): string {
  return new Date().toISOString();
}

export function getFutureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}