const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/pages/admin/SecurityAuditLog.tsx');
let content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/pages/admin/SecurityAuditLog');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const hooksDir = path.join(targetDir, 'hooks');
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

const componentsDir = path.join(targetDir, 'components');
if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });

function extractBetween(str, startStr, endStr) {
    const startIdx = str.indexOf(startStr);
    if (startIdx === -1) return '';
    const rest = str.substring(startIdx + startStr.length);
    const endIdx = rest.indexOf(endStr);
    if (endIdx === -1) return '';
    return rest.substring(0, endIdx);
}

// 1. Types & Constants
const typesStr = extractBetween(content, 'interface ActivityLog {', 'export default function SecurityAuditLog() {');
const typesContent =
    "import React from 'react';\n" +
    "import { Eye, AlertTriangle, Lock, UserPlus, UserMinus, UserCheck, UserX, Pencil, LogIn, LogOut, Clock, ShieldCheck, ShieldOff, ShieldAlert, KeyRound } from 'lucide-react';\n\n" +
    "export interface ActivityLog {" + typesStr;

fs.writeFileSync(path.join(targetDir, 'types.ts'), typesContent);

// 2. State Hook
const stateBody = extractBetween(content, 'const PAGE_SIZE = 50;', 'return (\n    <div className="container max-w-7xl');
const stateTop =
    "import { useState, useCallback, useEffect } from 'react';\n" +
    "import { useTranslation } from 'react-i18next';\n" +
    "import { supabase } from '@/integrations/supabase/client';\n" +
    "import { toast } from '@/hooks/use-toast';\n" +
    "import { logger } from '@/lib/logger';\n" +
    "import { useCursorPagination, CursorPosition, buildCursorCondition } from '@/hooks/use-cursor-pagination';\n" +
    "import { ActivityLog, LoginHistoryRecord, SECURITY_EVENTS, USER_MANAGEMENT_EVENTS } from '../types';\n\n" +
    "export function useSecurityAuditLogState() {\n" +
    "  const { t, i18n } = useTranslation();\n" +
    "  const direction = i18n.dir();\n" +
    "  const [searchQuery, setSearchQuery] = useState('');\n" +
    "  const [accessTypeFilter, setAccessTypeFilter] = useState<string>('all');\n" +
    "  const [userEventFilter, setUserEventFilter] = useState<string>('all');\n" +
    "  const [userSearchQuery, setUserSearchQuery] = useState('');\n" +
    "  const [securityEventFilter, setSecurityEventFilter] = useState<string>('all');\n" +
    "  const [securitySearchQuery, setSecuritySearchQuery] = useState('');\n" +
    "  const [suspiciousSearchQuery, setSuspiciousSearchQuery] = useState('');\n" +
    "  const [suspiciousFilter, setSuspiciousFilter] = useState<string>('all');\n" +
    "  const [loginHistory, setLoginHistory] = useState<LoginHistoryRecord[]>([]);\n" +
    "  const [loginHistoryLoading, setLoginHistoryLoading] = useState(true);\n" +
    "  const [realtimeEnabled, setRealtimeEnabled] = useState(true);\n" +
    "  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);\n\n" +
    "  const PAGE_SIZE = 50;\n\n";

const stateRetunFields =
    "  return {\n" +
    "    t, i18n, direction, searchQuery, setSearchQuery, accessTypeFilter, setAccessTypeFilter,\n" +
    "    userEventFilter, setUserEventFilter, userSearchQuery, setUserSearchQuery,\n" +
    "    securityEventFilter, setSecurityEventFilter, securitySearchQuery, setSecuritySearchQuery,\n" +
    "    suspiciousSearchQuery, setSuspiciousSearchQuery, suspiciousFilter, setSuspiciousFilter,\n" +
    "    loginHistory, loginHistoryLoading, realtimeEnabled, selectedTenantId, setSelectedTenantId,\n" +
    "    securityEventLogs, isSecurityLoading, securityHasNext, securityHasPrev,\n" +
    "    securityNextPage, securityPrevPage, securityFirstPage, securityTotal, securityPage,\n" +
    "    userManagementLogs, isUserMgmtLoading, userMgmtHasNext, userMgmtHasPrev,\n" +
    "    userMgmtNextPage, userMgmtPrevPage, userMgmtFirstPage, userMgmtTotal, userMgmtPage,\n" +
    "    sensitiveDataLogs, isSensitiveLoading, sensitiveHasNext, sensitiveHasPrev,\n" +
    "    sensitiveNextPage, sensitivePrevPage, sensitiveFirstPage, sensitiveTotal, sensitivePage,\n" +
    "    filteredSensitiveLogs, filteredUserMgmtLogs, filteredSecurityLogs, filteredLoginHistory,\n" +
    "    accessTypes, formatChanges, suspiciousStats, PAGE_SIZE, textAlign\n" +
    "  };\n" +
    "}\n";

fs.writeFileSync(path.join(hooksDir, 'useSecurityAuditLogState.ts'), stateTop + stateBody + stateRetunFields);

const barrelContent =
    "import { useSecurityAuditLogState } from './useSecurityAuditLogState';\n\n" +
    "export function useSecurityAuditLog() {\n" +
    "  return useSecurityAuditLogState();\n" +
    "}\n";
fs.writeFileSync(path.join(hooksDir, 'useSecurityAuditLog.ts'), barrelContent);

// 3. Tab Sub-components
const t1 = extractBetween(content, '{/* Suspicious Activity Tab (NEW) */}', '{/* Security Events Tab (Login, MFA, Backup Codes) */}');
const t2 = extractBetween(content, '{/* Security Events Tab (Login, MFA, Backup Codes) */}', '{/* User Management Tab */}');
const t3 = extractBetween(content, '{/* User Management Tab */}', '{/* Sensitive Data Access Tab */}');
const t4 = extractBetween(content, '{/* Sensitive Data Access Tab */}', '{/* Settings & Actions Tab */}');

const importsForTabs =
    "import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';\n" +
    "import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';\n" +
    "import { Badge } from '@/components/ui/badge';\n" +
    "import { Input } from '@/components/ui/input';\n" +
    "import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';\n" +
    "import { TabsContent } from '@/components/ui/tabs';\n" +
    "import { Loader2, Shield, Search, Eye, AlertTriangle, Lock, UserPlus, UserMinus, UserCheck, UserX, Pencil, Users, KeyRound, LogIn, LogOut, ShieldCheck, ShieldOff, ShieldAlert, Clock, MapPin, Smartphone, Globe, Wifi } from 'lucide-react';\n" +
    "import { format } from 'date-fns';\n" +
    "import { CursorPagination } from '@/components/ui/cursor-pagination';\n" +
    "import { userEventLabels, securityEventLabels, accessTypeLabels, getRiskColor, USER_MANAGEMENT_EVENTS, SECURITY_EVENTS } from '../types';\n\n";

fs.writeFileSync(path.join(componentsDir, 'SuspiciousActivityTabContent.tsx'),
    importsForTabs +
    "export function SuspiciousActivityTabContent({ state }: { state: any }) {\n" +
    "  const { t, suspiciousSearchQuery, setSuspiciousSearchQuery, suspiciousFilter, setSuspiciousFilter, suspiciousStats, textAlign, loginHistoryLoading, filteredLoginHistory } = state;\n" +
    "  return (\n    " + t1.trim() + "\n  );\n}\n"
);

fs.writeFileSync(path.join(componentsDir, 'SecurityEventsTabContent.tsx'),
    importsForTabs +
    "export function SecurityEventsTabContent({ state }: { state: any }) {\n" +
    "  const { t, securitySearchQuery, setSecuritySearchQuery, securityEventFilter, setSecurityEventFilter, securityEventLogs, textAlign, isSecurityLoading, filteredSecurityLogs, securityPage, securityHasNext, securityHasPrev, securityNextPage, securityPrevPage, securityFirstPage, securityTotal, PAGE_SIZE } = state;\n" +
    "  return (\n    " + t2.trim() + "\n  );\n}\n"
);

fs.writeFileSync(path.join(componentsDir, 'UserManagementTabContent.tsx'),
    importsForTabs +
    "export function UserManagementTabContent({ state }: { state: any }) {\n" +
    "  const { t, userSearchQuery, setUserSearchQuery, userEventFilter, setUserEventFilter, userManagementLogs, textAlign, isUserMgmtLoading, filteredUserMgmtLogs, userMgmtPage, userMgmtHasNext, userMgmtHasPrev, userMgmtNextPage, userMgmtPrevPage, userMgmtFirstPage, userMgmtTotal, PAGE_SIZE, formatChanges } = state;\n" +
    "  return (\n    " + t3.trim() + "\n  );\n}\n"
);

fs.writeFileSync(path.join(componentsDir, 'SensitiveDataAccessTabContent.tsx'),
    importsForTabs +
    "export function SensitiveDataAccessTabContent({ state }: { state: any }) {\n" +
    "  const { t, searchQuery, setSearchQuery, accessTypeFilter, setAccessTypeFilter, accessTypes, sensitiveDataLogs, textAlign, isSensitiveLoading, filteredSensitiveLogs, sensitivePage, sensitiveHasNext, sensitiveHasPrev, sensitiveNextPage, sensitivePrevPage, sensitiveFirstPage, sensitiveTotal, PAGE_SIZE } = state;\n" +
    "  return (\n    " + t4.trim() + "\n  );\n}\n"
);

// 4. Main Component Shell
const shellTop = extractBetween(content, 'const suspiciousStats = {', '{/* Suspicious Activity Tab (NEW) */}');
const shellBottom = extractBetween(content, '{/* Settings & Actions Tab */}', '</div>\n  );\n}');

const pureShell =
    "import { useTranslation } from 'react-i18next';\n" +
    "import { Shield, AlertTriangle, LayoutDashboard, Monitor, ShieldCheck, Users, Lock, Settings } from 'lucide-react';\n" +
    "import { Badge } from '@/components/ui/badge';\n" +
    "import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';\n" +
    "import { TenantSecuritySelector } from '@/components/security/TenantSecuritySelector';\n" +
    "import { SecurityOverviewTab } from '@/components/security/SecurityOverviewTab';\n" +
    "import { ActiveSessionsTab } from '@/components/security/ActiveSessionsTab';\n" +
    "import { SecuritySettingsActionsTab } from '@/components/security/SecuritySettingsActionsTab';\n" +
    "import { SuspiciousActivityTabContent } from './components/SuspiciousActivityTabContent';\n" +
    "import { SecurityEventsTabContent } from './components/SecurityEventsTabContent';\n" +
    "import { UserManagementTabContent } from './components/UserManagementTabContent';\n" +
    "import { SensitiveDataAccessTabContent } from './components/SensitiveDataAccessTabContent';\n" +
    "import { useSecurityAuditLog } from './hooks/useSecurityAuditLog';\n\n" +
    "export default function SecurityAuditLog() {\n" +
    "  const state = useSecurityAuditLog();\n" +
    "  const {\n" +
    "    t, direction, realtimeEnabled, selectedTenantId, setSelectedTenantId, suspiciousStats\n" +
    "  } = state;\n" +
    "\n  return (\n    <div className=\"container max-w-7xl py-8 space-y-8\" dir={direction}>\n      {/* Header */}\n      <div className=\"text-start\">\n        <h1 className=\"text-3xl font-bold tracking-tight flex items-center gap-2\">\n          <Shield className=\"h-8 w-8 text-primary\" />\n          {t('securityAudit.title', 'Security Audit Log')}\n        </h1>\n        <p className=\"text-muted-foreground\">\n          {t('securityAudit.description', 'Monitor and review security events and user management activities')}\n        </p>\n        {realtimeEnabled && (\n          <Badge variant=\"outline\" className=\"mt-2 gap-1\">\n            <span className=\"h-2 w-2 rounded-full bg-green-500 animate-pulse\" />\n            {t('securityAudit.realtime', 'Real-time updates enabled')}\n          </Badge>\n        )}\n      </div>\n\n      {/* Tenant Selector */}\n      <div className=\"flex items-center justify-between\">\n        <TenantSecuritySelector \n          selectedTenantId={selectedTenantId} \n          onTenantChange={setSelectedTenantId} \n        />\n        {realtimeEnabled && (\n          <Badge variant=\"outline\" className=\"gap-1\">\n            <span className=\"h-2 w-2 rounded-full bg-green-500 animate-pulse\" />\n            {t('securityAudit.realtime', 'Real-time updates enabled')}\n          </Badge>\n        )}\n      </div>\n\n      <Tabs defaultValue=\"overview\" className=\"space-y-6\" dir={direction}>\n        <div className=\"flex justify-start overflow-x-auto\">\n          <TabsList className=\"flex flex-wrap h-auto gap-1 w-full max-w-5xl\">\n            <TabsTrigger value=\"overview\" className=\"flex items-center gap-2\">\n              <LayoutDashboard className=\"h-4 w-4\" />\n              {t('securityAudit.overview', 'Overview')}\n            </TabsTrigger>\n            <TabsTrigger value=\"suspicious-activity\" className=\"flex items-center gap-2\">\n              <AlertTriangle className=\"h-4 w-4\" />\n              {t('securityAudit.suspiciousActivity', 'Suspicious Activity')}\n              {suspiciousStats.suspicious > 0 && (\n                <Badge variant=\"destructive\" className=\"ms-1\">{suspiciousStats.suspicious}</Badge>\n              )}\n            </TabsTrigger>\n            <TabsTrigger value=\"active-sessions\" className=\"flex items-center gap-2\">\n              <Monitor className=\"h-4 w-4\" />\n              {t('securityAudit.activeSessions', 'Active Sessions')}\n            </TabsTrigger>\n            <TabsTrigger value=\"security-events\" className=\"flex items-center gap-2\">\n              <ShieldCheck className=\"h-4 w-4\" />\n              {t('securityAudit.securityEvents', 'Security Events')}\n            </TabsTrigger>\n            <TabsTrigger value=\"user-management\" className=\"flex items-center gap-2\">\n              <Users className=\"h-4 w-4\" />\n              {t('securityAudit.userManagement', 'User Management')}\n            </TabsTrigger>\n            <TabsTrigger value=\"sensitive-access\" className=\"flex items-center gap-2\">\n              <Lock className=\"h-4 w-4\" />\n              {t('securityAudit.sensitiveAccess', 'Data Access')}\n            </TabsTrigger>\n            <TabsTrigger value=\"settings-actions\" className=\"flex items-center gap-2\">\n              <Settings className=\"h-4 w-4\" />\n              {t('securityAudit.settingsActions', 'Settings & Actions')}\n            </TabsTrigger>\n          </TabsList>\n        </div>\n\n        {/* Overview Tab */}\n        <TabsContent value=\"overview\">\n          <SecurityOverviewTab tenantId={selectedTenantId} />\n        </TabsContent>\n\n        {/* Active Sessions Tab */}\n        <TabsContent value=\"active-sessions\">\n          <ActiveSessionsTab tenantId={selectedTenantId} />\n        </TabsContent>\n\n        <SuspiciousActivityTabContent state={state} />\n        <SecurityEventsTabContent state={state} />\n        <UserManagementTabContent state={state} />\n        <SensitiveDataAccessTabContent state={state} />\n\n        {/* Settings & Actions Tab */}\n        <TabsContent value=\"settings-actions\">\n          <SecuritySettingsActionsTab tenantId={selectedTenantId} />\n        </TabsContent>\n      </Tabs>\n    </div>\n  );\n}\n";

fs.writeFileSync(path.join(targetDir, 'SecurityAuditLog.tsx'), pureShell);

fs.writeFileSync(path.join(targetDir, 'index.tsx'), "export { default } from './SecurityAuditLog';\n");

console.log('Extraction complete!');
