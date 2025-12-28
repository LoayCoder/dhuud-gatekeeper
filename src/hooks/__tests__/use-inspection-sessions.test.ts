import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useInspectionSessions,
  useInspectionSession,
  useStartSession,
  useCompleteSession,
  useSessionProgress,
} from '../use-inspection-sessions';
import {
  createWrapper,
  resetSupabaseMocks,
} from '@/test/setup';

describe('useInspectionSessions', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should initialize hook without error', () => {
    const { result } = renderHook(() => useInspectionSessions(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
    expect(result.current.isLoading).toBeDefined();
  });

  it('should accept status filter', () => {
    const { result } = renderHook(
      () => useInspectionSessions({ status: 'in_progress' }),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
  });

  it('should accept site_id filter', () => {
    const { result } = renderHook(
      () => useInspectionSessions({ site_id: 'site-123' }),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
  });

  it('should accept inspector_id filter', () => {
    const { result } = renderHook(
      () => useInspectionSessions({ inspector_id: 'inspector-123' }),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
  });

  it('should accept combined filters', () => {
    const { result } = renderHook(
      () => useInspectionSessions({ 
        status: 'completed_with_open_actions',
        site_id: 'site-1',
        inspector_id: 'inspector-1'
      }),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
  });
});

describe('useInspectionSession', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should not fetch when sessionId is undefined', () => {
    const { result } = renderHook(
      () => useInspectionSession(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });

  it('should accept sessionId parameter', () => {
    const { result } = renderHook(
      () => useInspectionSession('session-123'),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
  });
});

describe('useStartSession', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should have correct mutation structure', () => {
    const { result } = renderHook(() => useStartSession(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('should accept sessionId in mutate', () => {
    const { result } = renderHook(() => useStartSession(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.mutateAsync).toBe('function');
  });
});

describe('useCompleteSession', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should have correct mutation structure', () => {
    const { result } = renderHook(() => useCompleteSession(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('should accept sessionId in mutateAsync', () => {
    const { result } = renderHook(() => useCompleteSession(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.mutateAsync).toBe('function');
  });
});

describe('useSessionProgress', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should not fetch when sessionId is undefined', () => {
    const { result } = renderHook(
      () => useSessionProgress(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
  });

  it('should initialize with sessionId', () => {
    const { result } = renderHook(
      () => useSessionProgress('session-123'),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
  });
});
