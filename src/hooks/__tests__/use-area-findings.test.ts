import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useAreaFindings,
  useCreateAreaFinding,
  useUpdateAreaFinding,
  useLinkFindingToAction,
  useCloseAreaFinding,
  useAreaFindingsCount,
} from '../use-area-findings';
import {
  createWrapper,
  resetSupabaseMocks,
} from '@/test/setup';

describe('useAreaFindings', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should not fetch when sessionId is undefined', () => {
    const { result } = renderHook(
      () => useAreaFindings(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });

  it('should accept sessionId parameter', () => {
    const { result } = renderHook(
      () => useAreaFindings('session-123'),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
  });
});

describe('useCreateAreaFinding', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should have correct mutation structure', () => {
    const { result } = renderHook(() => useCreateAreaFinding(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });
});

describe('useUpdateAreaFinding', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should have correct mutation structure', () => {
    const { result } = renderHook(() => useUpdateAreaFinding(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('should have mutateAsync function', () => {
    const { result } = renderHook(() => useUpdateAreaFinding(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.mutateAsync).toBe('function');
  });
});

describe('useLinkFindingToAction', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should have correct mutation structure', () => {
    const { result } = renderHook(() => useLinkFindingToAction(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });
});

describe('useCloseAreaFinding', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should have correct mutation structure', () => {
    const { result } = renderHook(() => useCloseAreaFinding(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('should have mutateAsync function', () => {
    const { result } = renderHook(() => useCloseAreaFinding(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.mutateAsync).toBe('function');
  });
});

describe('useAreaFindingsCount', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should not fetch when sessionId is undefined', () => {
    const { result } = renderHook(
      () => useAreaFindingsCount(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
  });

  it('should accept sessionId parameter', () => {
    const { result } = renderHook(
      () => useAreaFindingsCount('session-123'),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
  });
});
