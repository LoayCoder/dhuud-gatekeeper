import { vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ============= Mock Supabase Response Helper =============

export function mockSupabaseResponse<T>(data: T, error: Error | null = null) {
  return Promise.resolve({ data, error });
}

// ============= Mock Supabase Client =============

const createMockClient = () => {
  const client: Record<string, ReturnType<typeof vi.fn>> = {};
  
  const chainableMethods = [
    'from', 'select', 'insert', 'update', 'delete', 
    'eq', 'neq', 'is', 'in', 'order', 'single', 
    'maybeSingle', 'limit', 'gte', 'lte', 'gt', 'lt'
  ];
  
  chainableMethods.forEach(method => {
    client[method] = vi.fn(() => client);
  });
  
  // Make terminal methods return promises
  client.single = vi.fn(() => mockSupabaseResponse(null));
  client.maybeSingle = vi.fn(() => mockSupabaseResponse(null));
  client.order = vi.fn(() => mockSupabaseResponse([]));
  
  return client;
};

export const mockSupabaseClient = createMockClient();

// Reset all mocks
export function resetSupabaseMocks() {
  Object.values(mockSupabaseClient).forEach((mock) => {
    if (typeof mock === 'function' && 'mockClear' in mock) {
      mock.mockClear();
    }
  });
  
  // Reset chainable methods
  ['from', 'select', 'insert', 'update', 'delete', 'eq', 'neq', 'is', 'in', 'limit', 'gte', 'lte', 'gt', 'lt'].forEach(method => {
    mockSupabaseClient[method].mockReturnValue(mockSupabaseClient);
  });
  
  // Reset terminal methods
  mockSupabaseClient.single.mockImplementation(() => mockSupabaseResponse(null));
  mockSupabaseClient.maybeSingle.mockImplementation(() => mockSupabaseResponse(null));
  mockSupabaseClient.order.mockImplementation(() => mockSupabaseResponse([]));
}

// ============= Mock Auth Context =============

export const mockUser: User = {
  id: 'test-user-id',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'test@example.com',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
  confirmed_at: new Date().toISOString(),
};

export const mockProfile = {
  id: 'test-profile-id',
  tenant_id: 'test-tenant-id',
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'inspector',
  language: 'en',
};

export const mockAuthContext = {
  user: mockUser,
  profile: mockProfile,
  session: null,
  isLoading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
};

// ============= Mock Translation =============

export const mockTranslation = {
  t: (key: string) => key,
  i18n: {
    language: 'en',
    changeLanguage: vi.fn(),
  },
};

// ============= Mock Toast =============

export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

// ============= Test Data Factories =============

export function createMockInspectionSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    tenant_id: 'test-tenant-id',
    session_type: 'area',
    template_id: 'template-1',
    period: '2025-01',
    site_id: 'site-1',
    building_id: null,
    floor_zone_id: null,
    category_id: null,
    type_id: null,
    status: 'draft',
    started_at: null,
    completed_at: null,
    closed_at: null,
    total_assets: 0,
    inspected_count: 0,
    passed_count: 0,
    failed_count: 0,
    not_accessible_count: 0,
    compliance_percentage: null,
    inspector_id: 'test-user-id',
    reference_id: 'INS-2025-001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    scope_notes: null,
    weather_conditions: null,
    attendees: null,
    gps_boundary: null,
    report_url: null,
    report_generated_at: null,
    ...overrides,
  };
}

export function createMockAreaFinding(overrides: Record<string, unknown> = {}) {
  return {
    id: 'finding-1',
    tenant_id: 'test-tenant-id',
    session_id: 'session-1',
    response_id: 'response-1',
    reference_id: 'FND-2025-001',
    classification: 'observation' as const,
    risk_level: 'medium' as const,
    description: 'Test finding description',
    recommendation: null,
    corrective_action_id: null,
    status: 'open' as const,
    created_by: 'test-user-id',
    created_at: new Date().toISOString(),
    closed_at: null,
    closed_by: null,
    due_date: null,
    escalation_level: 0,
    escalation_notes: null,
    last_escalated_at: null,
    warning_sent_at: null,
    ...overrides,
  };
}

export function createMockAreaResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'response-1',
    tenant_id: 'test-tenant-id',
    session_id: 'session-1',
    template_item_id: 'item-1',
    response_value: null,
    result: null,
    notes: null,
    photo_paths: [],
    gps_lat: null,
    gps_lng: null,
    gps_accuracy: null,
    responded_by: null,
    responded_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockSLAConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sla-config-1',
    tenant_id: 'test-tenant-id',
    classification: 'observation',
    target_days: 14,
    warning_days: 3,
    escalation_period: 7,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============= Query Client Wrapper =============

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ============= Global Test Setup =============

// Mock modules
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => mockTranslation,
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));
