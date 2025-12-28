import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useFindingSLAConfigs,
  useFindingSLAConfigByClassification,
  useUpdateFindingSLAConfig,
} from '../use-finding-sla-config';
import {
  createWrapper,
  resetSupabaseMocks,
} from '@/test/setup';

describe('useFindingSLAConfigs', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should initialize hook without error', () => {
    const { result } = renderHook(() => useFindingSLAConfigs(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
    expect(result.current.isLoading).toBeDefined();
  });
});

describe('useFindingSLAConfigByClassification', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should return config for major_nc classification', () => {
    const { result } = renderHook(
      () => useFindingSLAConfigByClassification('major_nc'),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
    expect(result.current.classification).toBe('major_nc');
  });

  it('should provide fallback for unknown classification', () => {
    const { result } = renderHook(
      () => useFindingSLAConfigByClassification('unknown_type'),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
    expect(result.current.target_days).toBeGreaterThan(0);
  });

  it('should return correct structure for all classifications', () => {
    const classifications = ['critical_nc', 'major_nc', 'minor_nc', 'observation', 'ofi'];
    
    classifications.forEach((classification) => {
      const { result } = renderHook(
        () => useFindingSLAConfigByClassification(classification),
        { wrapper: createWrapper() }
      );

      expect(result.current.classification).toBe(classification);
      expect(typeof result.current.target_days).toBe('number');
    });
  });
});

describe('useUpdateFindingSLAConfig', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('should have correct mutation structure', () => {
    const { result } = renderHook(() => useUpdateFindingSLAConfig(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(typeof result.current.mutateAsync).toBe('function');
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});
