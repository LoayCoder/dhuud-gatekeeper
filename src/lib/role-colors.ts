import { cn } from "@/lib/utils";

export type RoleCategory =
    | 'internal'    // Dept Rep, Manager, Investigator, Reporter
    | 'contractor'  // Contractor Consultant, Contractor Site Rep
    | 'hsse'        // HSSE Expert, HSSE Manager
    | 'warning'     // Unassigned states
    | 'system';     // System / default fallback

export const ROLE_COLORS: Record<RoleCategory, string> = {
    internal: "bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    contractor: "bg-orange-100/50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    hsse: "bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    warning: "bg-yellow-100/50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    system: "bg-slate-100/50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800",
};

export const ROLE_TEXT_COLORS: Record<RoleCategory, string> = {
    internal: "text-blue-600 dark:text-blue-400",
    contractor: "text-orange-600 dark:text-orange-400",
    hsse: "text-emerald-600 dark:text-emerald-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    system: "text-slate-600 dark:text-slate-400",
};

export const ROLE_BORDER_COLORS: Record<RoleCategory, string> = {
    internal: "border-blue-200 dark:border-blue-800/60",
    contractor: "border-orange-200 dark:border-orange-800/60",
    hsse: "border-emerald-200 dark:border-emerald-800/60",
    warning: "border-yellow-200 dark:border-yellow-800/60",
    system: "border-slate-200 dark:border-slate-800/60",
};

export const ROLE_BG_COLORS: Record<RoleCategory, string> = {
    internal: "bg-blue-50 dark:bg-blue-950/20",
    contractor: "bg-orange-50 dark:bg-orange-950/20",
    hsse: "bg-emerald-50 dark:bg-emerald-950/20",
    warning: "bg-yellow-50 dark:bg-yellow-950/20",
    system: "bg-slate-50 dark:bg-slate-950/20",
};

/**
 * Determines the visual category for a given role name.
 */
export function getRoleCategory(roleName?: string | null): RoleCategory {
    if (!roleName) return 'warning'; // Unassigned

    const lowerRole = roleName.toLowerCase();

    if (lowerRole.includes('hsse')) return 'hsse';
    if (lowerRole.includes('contractor') || lowerRole.includes('consultant') || lowerRole.includes('client')) return 'contractor';

    // Explicitly check for internal roles
    if (
        lowerRole.includes('department') ||
        lowerRole.includes('manager') ||
        lowerRole.includes('investigator') ||
        lowerRole.includes('rep') ||
        lowerRole.includes('reporter') ||
        lowerRole.includes('employee')
    ) {
        return 'internal';
    }

    // Fallback for anything else (e.g., system verifier)
    return 'system';
}

/**
 * Get the full Tailwind class string (bg, text, border) for a role.
 */
export function getRoleColorClasses(roleName?: string | null, className?: string): string {
    const category = getRoleCategory(roleName);
    return cn(ROLE_COLORS[category], className);
}
