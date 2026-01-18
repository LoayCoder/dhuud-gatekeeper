/**
 * MENU GROUPS CONFIGURATION
 * 
 * Defines the hierarchical structure of the sidebar menu.
 * This is used to organize routes from the registry into the sidebar.
 */

import type { LucideIcon } from "lucide-react";
import {
  Shield,
  LayoutDashboard,
  FileWarning,
  ClipboardCheck,
  Package,
  Briefcase,
  FileKey,
  Settings,
  GraduationCap,
  LifeBuoy,
  Route,
  Radio,
  Bell,
  BarChart3,
  Settings2,
  Layers,
  Users,
  Clock,
  Database,
} from "lucide-react";

export interface MenuGroup {
  code: string;
  title: { en: string; ar: string };
  translationKey: string;
  icon: LucideIcon;
  parentCode?: string;
  sortOrder: number;
}

/**
 * Menu group hierarchy - defines the structure of sidebar sections
 */
export const menuGroups: MenuGroup[] = [
  // Top-level modules
  {
    code: "dashboard",
    title: { en: "Dashboard", ar: "لوحة القيادة" },
    translationKey: "navigation.dashboard",
    icon: LayoutDashboard,
    sortOrder: 1,
  },
  {
    code: "my_actions",
    title: { en: "My Actions", ar: "إجراءاتي" },
    translationKey: "navigation.myActions",
    icon: ClipboardCheck,
    sortOrder: 2,
  },
  {
    code: "hsse_management",
    title: { en: "HSSE Management", ar: "إدارة HSSE" },
    translationKey: "navigation.hsseManagement",
    icon: Shield,
    sortOrder: 10,
  },
  
  // HSSE sub-groups
  {
    code: "hsse_events",
    title: { en: "HSSE Events", ar: "أحداث HSSE" },
    translationKey: "navigation.hsseEvents",
    icon: FileWarning,
    parentCode: "hsse_management",
    sortOrder: 1,
  },
  {
    code: "audits_inspections",
    title: { en: "Audits & Inspections", ar: "التدقيق والتفتيش" },
    translationKey: "navigation.auditsInspections",
    icon: ClipboardCheck,
    parentCode: "hsse_management",
    sortOrder: 2,
  },
  {
    code: "security",
    title: { en: "Security", ar: "الأمن" },
    translationKey: "navigation.security",
    icon: Shield,
    parentCode: "hsse_management",
    sortOrder: 3,
  },
  
  // Security sub-groups
  {
    code: "security_patrols",
    title: { en: "Security Patrols", ar: "دوريات الأمن" },
    translationKey: "navigation.securityPatrols",
    icon: Route,
    parentCode: "security",
    sortOrder: 10,
  },
  {
    code: "workforce_command",
    title: { en: "Workforce Command", ar: "قيادة القوى العاملة" },
    translationKey: "security.menu.workforceCommand",
    icon: Radio,
    parentCode: "security",
    sortOrder: 20,
  },
  {
    code: "security_operations",
    title: { en: "Operations", ar: "العمليات" },
    translationKey: "security.menu.operations",
    icon: Radio,
    parentCode: "security",
    sortOrder: 30,
  },
  
  // Asset Management
  {
    code: "asset_management",
    title: { en: "Asset Management", ar: "إدارة الأصول" },
    translationKey: "navigation.assetManagement",
    icon: Package,
    sortOrder: 20,
  },
  
  // Contractors
  {
    code: "contractors_module",
    title: { en: "Contractors", ar: "المقاولون" },
    translationKey: "navigation.contractors",
    icon: Briefcase,
    sortOrder: 30,
  },
  
  // PTW
  {
    code: "ptw_module",
    title: { en: "Permit to Work", ar: "تصاريح العمل" },
    translationKey: "ptw.nav.title",
    icon: FileKey,
    sortOrder: 40,
  },
  
  // Administration
  {
    code: "administration",
    title: { en: "Administration", ar: "الإدارة" },
    translationKey: "navigation.administration",
    icon: Settings,
    sortOrder: 50,
  },
  
  // Admin sub-groups
  {
    code: "admin_sla_management",
    title: { en: "SLA Management", ar: "إدارة SLA" },
    translationKey: "navigation.slaManagement",
    icon: Clock,
    parentCode: "administration",
    sortOrder: 1,
  },
  {
    code: "admin_user_access",
    title: { en: "User & Access", ar: "المستخدم والوصول" },
    translationKey: "navigation.userAccess",
    icon: Users,
    parentCode: "administration",
    sortOrder: 2,
  },
  {
    code: "admin_notifications_group",
    title: { en: "Notifications", ar: "الإشعارات" },
    translationKey: "navigation.notificationsGroup",
    icon: Bell,
    parentCode: "administration",
    sortOrder: 3,
  },
  {
    code: "admin_whatsapp",
    title: { en: "WhatsApp", ar: "واتساب" },
    translationKey: "navigation.whatsapp",
    icon: Bell,
    parentCode: "admin_notifications_group",
    sortOrder: 1,
  },
  {
    code: "admin_reporting_kpis",
    title: { en: "Reporting & KPIs", ar: "التقارير ومؤشرات الأداء" },
    translationKey: "navigation.reportingKpis",
    icon: BarChart3,
    parentCode: "administration",
    sortOrder: 4,
  },
  {
    code: "admin_system_config",
    title: { en: "System Configuration", ar: "تكوين النظام" },
    translationKey: "navigation.systemConfig",
    icon: Settings2,
    parentCode: "administration",
    sortOrder: 5,
  },
  {
    code: "admin_platform_management",
    title: { en: "Platform Management", ar: "إدارة المنصة" },
    translationKey: "navigation.platformManagement",
    icon: Layers,
    parentCode: "administration",
    sortOrder: 6,
  },
  {
    code: "admin_database_health",
    title: { en: "Database Health", ar: "صحة قاعدة البيانات" },
    translationKey: "navigation.databaseHealth",
    icon: Database,
    parentCode: "administration",
    sortOrder: 7,
  },
  
  // Training
  {
    code: "training",
    title: { en: "Training", ar: "التدريب" },
    translationKey: "navigation.training",
    icon: GraduationCap,
    sortOrder: 60,
  },
  
  // Support
  {
    code: "support",
    title: { en: "Support", ar: "الدعم" },
    translationKey: "navigation.support",
    icon: LifeBuoy,
    sortOrder: 70,
  },
  
  // Settings
  {
    code: "settings",
    title: { en: "Settings", ar: "الإعدادات" },
    translationKey: "navigation.settings",
    icon: Settings,
    sortOrder: 80,
  },
];

/**
 * Get a menu group by its code
 */
export function getMenuGroup(code: string): MenuGroup | undefined {
  return menuGroups.find(g => g.code === code);
}

/**
 * Get child menu groups for a parent code
 */
export function getChildMenuGroups(parentCode: string): MenuGroup[] {
  return menuGroups
    .filter(g => g.parentCode === parentCode)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get top-level menu groups (no parent)
 */
export function getTopLevelMenuGroups(): MenuGroup[] {
  return menuGroups
    .filter(g => !g.parentCode)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
