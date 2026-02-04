import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface DateRangeState {
  start_date: string;
  end_date: string;
}

interface UseDateRangeValidationOptions {
  /** Maximum number of days allowed in the range (default: 7) */
  maxDays?: number;
  /** Initial start date (default: today) */
  initialStartDate?: string;
  /** Initial end date (default: today) */
  initialEndDate?: string;
}

// ============================================================================
// UTILITY FUNCTIONS (can be used independently without the hook)
// ============================================================================

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Calculate the maximum allowed end date based on start date
 * @param startDate - Start date in YYYY-MM-DD format
 * @param maxDays - Maximum number of days allowed (default: 7)
 */
export function calculateMaxEndDate(startDate: string, maxDays: number = 7): string {
  const start = new Date(startDate);
  const maxEnd = new Date(start);
  maxEnd.setDate(start.getDate() + (maxDays - 1));
  return maxEnd.toISOString().split('T')[0];
}

/**
 * Validate a date range and return error message if invalid
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param maxDays - Maximum number of days allowed (default: 7)
 * @param t - Translation function (optional, for i18n support)
 */
export function validateDateRange(
  startDate: string,
  endDate: string,
  maxDays: number = 7,
  t?: (key: string, fallback: string) => string
): string | null {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return t
      ? t('contractors.gatePasses.endDateBeforeStart', 'End date must be on or after start date')
      : 'End date must be on or after start date';
  }

  if (diffDays > maxDays - 1) {
    return t
      ? t('contractors.gatePasses.dateRangeExceedsMax', `Date range cannot exceed ${maxDays} days`)
      : `Date range cannot exceed ${maxDays} days`;
  }

  return null;
}

/**
 * Adjust end date when start date changes to maintain valid range
 * @param newStartDate - New start date in YYYY-MM-DD format
 * @param currentEndDate - Current end date in YYYY-MM-DD format
 * @param maxDays - Maximum number of days allowed (default: 7)
 */
export function adjustEndDateForStartChange(
  newStartDate: string,
  currentEndDate: string,
  maxDays: number = 7
): string {
  let newEndDate = currentEndDate;

  // If end date is before new start date, move it to match start
  if (new Date(newEndDate) < new Date(newStartDate)) {
    newEndDate = newStartDate;
  }

  // Ensure end date doesn't exceed max days from start
  const maxEnd = new Date(newStartDate);
  maxEnd.setDate(maxEnd.getDate() + (maxDays - 1));
  if (new Date(newEndDate) > maxEnd) {
    newEndDate = maxEnd.toISOString().split('T')[0];
  }

  return newEndDate;
}

// ============================================================================
// HOOK (convenience wrapper with built-in state management)
// ============================================================================

interface UseDateRangeValidationReturn {
  /** Current date range state */
  dateRange: DateRangeState;
  /** Set the entire date range */
  setDateRange: (range: DateRangeState) => void;
  /** Handle start date change with automatic end date adjustment */
  handleStartDateChange: (newStartDate: string) => void;
  /** Handle end date change */
  handleEndDateChange: (newEndDate: string) => void;
  /** Get the maximum allowed end date based on current start date */
  getMaxEndDate: () => string;
  /** Get today's date in YYYY-MM-DD format */
  getToday: () => string;
  /** Validation error message, or null if valid */
  dateRangeError: string | null;
  /** Whether the current date range is valid */
  isValid: boolean;
}

/**
 * Hook for managing and validating date ranges with a maximum span
 * Used for gate pass validity periods (max 7 days by default)
 */
export function useDateRangeValidation(
  options: UseDateRangeValidationOptions = {}
): UseDateRangeValidationReturn {
  const { t } = useTranslation();
  const { maxDays = 7 } = options;

  const today = getToday();
  const initialStart = options.initialStartDate || today;
  const initialEnd = options.initialEndDate || today;

  const [dateRange, setDateRange] = useState<DateRangeState>({
    start_date: initialStart,
    end_date: initialEnd,
  });

  // Calculate max end date using utility function
  const getMaxEndDateFn = useCallback(() => {
    return calculateMaxEndDate(dateRange.start_date, maxDays);
  }, [dateRange.start_date, maxDays]);

  // Validate the date range using utility function
  const dateRangeError = useMemo(() => {
    return validateDateRange(dateRange.start_date, dateRange.end_date, maxDays, t);
  }, [dateRange.start_date, dateRange.end_date, maxDays, t]);

  // Handle start date change with automatic end date adjustment
  const handleStartDateChange = useCallback(
    (newStartDate: string) => {
      const newEndDate = adjustEndDateForStartChange(
        newStartDate,
        dateRange.end_date,
        maxDays
      );
      setDateRange({ start_date: newStartDate, end_date: newEndDate });
    },
    [dateRange.end_date, maxDays]
  );

  // Handle end date change
  const handleEndDateChange = useCallback((newEndDate: string) => {
    setDateRange((prev) => ({ ...prev, end_date: newEndDate }));
  }, []);

  return {
    dateRange,
    setDateRange,
    handleStartDateChange,
    handleEndDateChange,
    getMaxEndDate: getMaxEndDateFn,
    getToday: () => getToday(),
    dateRangeError,
    isValid: dateRangeError === null,
  };
}
