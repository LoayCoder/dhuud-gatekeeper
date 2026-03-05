import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { useCursorPagination, CursorPosition, buildCursorCondition } from '@/hooks/use-cursor-pagination';
import { ActivityLog, LoginHistoryRecord, SECURITY_EVENTS, USER_MANAGEMENT_EVENTS } from '../types';

export function useSecurityAuditLogState() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [searchQuery, setSearchQuery] = useState('');
  const [accessTypeFilter, setAccessTypeFilter] = useState<string>('all');
  const [userEventFilter, setUserEventFilter] = useState<string>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [securityEventFilter, setSecurityEventFilter] = useState<string>('all');
  const [securitySearchQuery, setSecuritySearchQuery] = useState('');
  const [suspiciousSearchQuery, setSuspiciousSearchQuery] = useState('');
  const [suspiciousFilter, setSuspiciousFilter] = useState<string>('all');
  const [loginHistory, setLoginHistory] = useState<LoginHistoryRecord[]>([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(true);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  return {
    t, i18n, direction, searchQuery, setSearchQuery, accessTypeFilter, setAccessTypeFilter,
    userEventFilter, setUserEventFilter, userSearchQuery, setUserSearchQuery,
    securityEventFilter, setSecurityEventFilter, securitySearchQuery, setSecuritySearchQuery,
    suspiciousSearchQuery, setSuspiciousSearchQuery, suspiciousFilter, setSuspiciousFilter,
    loginHistory, loginHistoryLoading, realtimeEnabled, selectedTenantId, setSelectedTenantId,
    securityEventLogs, isSecurityLoading, securityHasNext, securityHasPrev,
    securityNextPage, securityPrevPage, securityFirstPage, securityTotal, securityPage,
    userManagementLogs, isUserMgmtLoading, userMgmtHasNext, userMgmtHasPrev,
    userMgmtNextPage, userMgmtPrevPage, userMgmtFirstPage, userMgmtTotal, userMgmtPage,
    sensitiveDataLogs, isSensitiveLoading, sensitiveHasNext, sensitiveHasPrev,
    sensitiveNextPage, sensitivePrevPage, sensitiveFirstPage, sensitiveTotal, sensitivePage,
    filteredSensitiveLogs, filteredUserMgmtLogs, filteredSecurityLogs, filteredLoginHistory,
    accessTypes, formatChanges, suspiciousStats, PAGE_SIZE, textAlign
  };
}
