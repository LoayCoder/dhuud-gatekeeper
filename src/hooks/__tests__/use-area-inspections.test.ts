import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useAreaTemplates,
  useAreaTemplate,
  useCreateAreaSession,
  useStartAreaSession,
  useAreaInspectionResponses,
  useSaveAreaResponse,
  useAreaChecklistProgress,
  useCompleteAreaSession,
} from '../use-area-inspections';
import {
  createWrapper,
  resetSupabaseMocks,
} from '@/test/setup';

describe('useAreaTemplates', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should initialize hook without error', () => {
    const { result } = renderHook(() => useAreaTemplates(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
    expect(result.current.isLoading).toBeDefined();
  });
});

describe('useAreaTemplate', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should not fetch when templateId is undefined', () => {
    const { result } = renderHook(
      () => useAreaTemplate(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should accept templateId parameter', () => {
    const { result } = renderHook(
      () => useAreaTemplate('template-1'),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
  });
});

describe('useCreateAreaSession', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should have correct mutation structure', () => {
    const { result } = renderHook(() => useCreateAreaSession(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });
});

describe('useStartAreaSession', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should have correct mutation structure', () => {
    const { result } = renderHook(() => useStartAreaSession(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });
});

describe('useAreaInspectionResponses', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should not fetch when sessionId is undefined', () => {
    const { result } = renderHook(
      () => useAreaInspectionResponses(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
  });

  it('should accept sessionId parameter', () => {
    const { result } = renderHook(
      () => useAreaInspectionResponses('session-123'),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
  });
});

describe('useSaveAreaResponse', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should have correct mutation structure', () => {
    const { result } = renderHook(() => useSaveAreaResponse(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('should have mutateAsync function', () => {
    const { result } = renderHook(() => useSaveAreaResponse(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.mutateAsync).toBe('function');
  });
});

describe('useAreaChecklistProgress', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should not fetch when sessionId is undefined', () => {
    const { result } = renderHook(
      () => useAreaChecklistProgress(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
  });

  it('should accept sessionId parameter', () => {
    const { result } = renderHook(
      () => useAreaChecklistProgress('session-123'),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
  });
});

describe('useCompleteAreaSession', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should have correct mutation structure', () => {
    const { result } = renderHook(() => useCompleteAreaSession(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('should have mutateAsync function', () => {
    const { result } = renderHook(() => useCompleteAreaSession(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.mutateAsync).toBe('function');
  });
});
