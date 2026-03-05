const fs = require('fs');
const path = require('path');

const srcFile = 'src/pages/admin/UserManagement.tsx';
const targetDir = 'src/pages/admin/UserManagement/components';

if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

let content = fs.readFileSync(srcFile, 'utf8');

// Function to extract based on opening and closing strings (basic balancing for JSX tags)
function extractJsxBlock(content, startString, tag) {
  const startIdx = content.indexOf(startString);
  if (startIdx === -1) return null;

  let endIdx = -1;
  let count = 0;

  const openTag = "<" + tag;
  const closeTag = "</" + tag + ">";

  for (let i = startIdx; i < content.length; i++) {
    if (content.substring(i, i + openTag.length) === openTag || content.substring(i, i + openTag.length + 1) === openTag + " ") {
      count++;
    } else if (content.substring(i, i + closeTag.length) === closeTag) {
      count--;
      if (count === 0) {
        endIdx = i + closeTag.length;
        break;
      }
    }
  }

  if (endIdx !== -1) {
    return {
      start: startIdx,
      end: endIdx,
      code: content.substring(startIdx, endIdx)
    };
  }
  return null;
}

// Extract Filters Card
const filtersStartStr = "{/* Search and Filters */}\\n      <Card>";
let filtersBlock = extractJsxBlock(content, filtersStartStr, "Card");

// Extract Table Card
const tableStartStr = "<Card>\\n        <CardContent className=\\"p-0\\">\\n          {loading ?";
let tableBlock = extractJsxBlock(content, tableStartStr, "Card");

// Fallbacks if Windows CRLF matching fails
if (!filtersBlock) {
  const altStart = "{/* Search and Filters */}\\r\\n      <Card>";
  filtersBlock = extractJsxBlock(content, altStart, "Card");
}
if (!tableBlock) {
  const altStart = "<Card>\\r\\n        <CardContent className=\\"p-0\\">\\r\\n          {loading ?";
  tableBlock = extractJsxBlock(content, altStart, "Card");
}

if (!filtersBlock || !tableBlock) {
  console.error("Could not find blocks");
  process.exit(1);
}

// 1. Create UserManagementFilters.tsx
const filtersImports = `import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserManagementFiltersProps {
  searchInput: string;
  setSearchInput: (v: string) => void;
  filtersOpen: boolean;
  setFiltersOpen: (v: boolean) => void;
  activeFilterCount: number;
  clearAllFilters: () => void;
  userTypeFilter: string;
  setUserTypeFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  branchFilter: string;
  setBranchFilter: (v: string) => void;
  divisionFilter: string;
  setDivisionFilter: (v: string) => void;
  roleFilter: string;
  setRoleFilter: (v: string) => void;
  branches: any[];
  divisions: any[];
  roles: any[];
  direction: "rtl" | "ltr";
}

export function UserManagementFilters(props: UserManagementFiltersProps) {
  const { t } = useTranslation();
  const {
    searchInput, setSearchInput, filtersOpen, setFiltersOpen, activeFilterCount, clearAllFilters,
    userTypeFilter, setUserTypeFilter, statusFilter, setStatusFilter,
    branchFilter, setBranchFilter, divisionFilter, setDivisionFilter,
    roleFilter, setRoleFilter, branches, divisions, roles, direction
  } = props;

  return (
    ${filtersBlock.code.replace("{/* Search and Filters */}\\n      ", "").replace("{/* Search and Filters */}\\r\\n      ", "").replace(/\\r\\n/g, '\\n    ').replace(/\\n/g, '\\n    ')}
  );
}
`;

fs.writeFileSync(path.join(targetDir, 'UserManagementFilters.tsx'), filtersImports);

// 2. Create UserManagementTable.tsx
const tableImports = `import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Pencil, RefreshCw, KeyRound } from "lucide-react";
import { UserDetailPopover } from "@/components/users";
import { RoleBadge } from "@/components/roles/RoleBadge";
import { ManagerTeamViewer } from "@/components/hierarchy/ManagerTeamViewer";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { cn } from "@/lib/utils";
import { getUserTypeLabel } from "@/lib/license-utils";
import type { RoleCategory } from "@/hooks/use-user-roles";

interface UserManagementTableProps {
  users: any[];
  loading: boolean;
  allSelected: boolean;
  someSelected: boolean;
  handleSelectAll: (v: boolean) => void;
  selectedUsers: Set<string>;
  handleSelectUser: (id: string, checked: boolean) => void;
  getUserInitials: (name: string | null) => string;
  handleEditUser: (user: any) => void;
  handleToggleUserStatus: (user: any) => void;
  handleDeleteUser: (id: string, name: string) => void;
  getUserTypeBadgeVariant: (type: string | null) => "default" | "secondary" | "outline";
  handleSyncUserEmail: (id: string, name: string) => void;
  syncingUserId: string | null;
  handleResetPasswordClick: (id: string, name: string, phone: string | null) => void;
  resetPasswordUserId: string | null;
  page: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToPage: (p: number) => void;
}

export function UserManagementTable(props: UserManagementTableProps) {
  const { t } = useTranslation();
  const {
    users, loading, allSelected, someSelected, handleSelectAll, selectedUsers, handleSelectUser,
    getUserInitials, handleEditUser, handleToggleUserStatus, handleDeleteUser, getUserTypeBadgeVariant,
    handleSyncUserEmail, syncingUserId, handleResetPasswordClick, resetPasswordUserId,
    page, totalPages, totalCount, hasNextPage, hasPreviousPage, goToNextPage, goToPreviousPage, goToPage
  } = props;

  return (
    ${tableBlock.code.replace(/\\r\\n/g, '\\n    ').replace(/\\n/g, '\\n    ')}
  );
}
`;

fs.writeFileSync(path.join(targetDir, 'UserManagementTable.tsx'), tableImports);

// Update main file
let newMainContent = content;

// Replace Table
const tablePropsExec = `<UserManagementTable
        users={users}
        loading={loading}
        allSelected={allSelected}
        someSelected={someSelected}
        handleSelectAll={handleSelectAll}
        selectedUsers={selectedUsers}
        handleSelectUser={handleSelectUser}
        getUserInitials={getUserInitials}
        handleEditUser={handleEditUser}
        handleToggleUserStatus={handleToggleUserStatus}
        handleDeleteUser={handleDeleteUser}
        getUserTypeBadgeVariant={getUserTypeBadgeVariant}
        handleSyncUserEmail={handleSyncUserEmail}
        syncingUserId={syncingUserId}
        handleResetPasswordClick={handleResetPasswordClick}
        resetPasswordUserId={resetPasswordUserId}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        goToNextPage={goToNextPage}
        goToPreviousPage={goToPreviousPage}
        goToPage={goToPage}
      />`;
newMainContent = newMainContent.replace(tableBlock.code, tablePropsExec);

// Replace Filters
const filtersPropsExec = `<UserManagementFilters
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
        activeFilterCount={activeFilterCount}
        clearAllFilters={clearAllFilters}
        userTypeFilter={userTypeFilter}
        setUserTypeFilter={setUserTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        branchFilter={branchFilter}
        setBranchFilter={setBranchFilter}
        divisionFilter={divisionFilter}
        setDivisionFilter={setDivisionFilter}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        branches={branches}
        divisions={divisions}
        roles={roles}
        direction={direction as any}
      />`;
newMainContent = newMainContent.replace(filtersBlock.code, filtersPropsExec);

// Add imports
const newImports = `import { UserManagementFilters } from './UserManagement/components/UserManagementFilters';
import { UserManagementTable } from './UserManagement/components/UserManagementTable';\n`;
newMainContent = newMainContent.replace(`import { useEffect `, newImports + `import { useEffect `);

// Clean up unused imports gracefully (just brute force replace exact string for known ones)
newMainContent = newMainContent.replace(/import {\\s*Search,\\s*X,\\s*Filter,\\s*ChevronDown\\s*} from "lucide-react";/g, '');

fs.writeFileSync(srcFile, newMainContent);

console.log('Successfully extracted UserManagement filters and table!');
