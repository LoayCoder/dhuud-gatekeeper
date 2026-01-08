/**
 * useRegistryMenu - Build sidebar menu from route registry
 * 
 * This hook transforms the flat route registry into a hierarchical menu structure
 * that matches the existing AppSidebar format.
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { routeRegistry, getChildRoutes } from "@/config/route-registry";
import { menuGroups, getChildMenuGroups, getTopLevelMenuGroups } from "@/config/menu-groups";
import type { RouteDefinition } from "@/config/route-registry-types";
import type { TFunction } from "i18next";

export interface RegistryMenuItem {
  title: string;
  url?: string;
  icon: LucideIcon;
  menuCode: string;
  isActive?: boolean;
  items?: RegistryMenuItem[];
  subItems?: RegistryMenuItem[];
}

/**
 * Build menu items from registry for a specific parent group
 */
function buildMenuItemsForGroup(
  groupCode: string,
  routes: RouteDefinition[],
  currentPath: string,
  t: TFunction<"translation", undefined>,
  language: string
): RegistryMenuItem[] {
  const items: RegistryMenuItem[] = [];
  
  // Get routes that belong to this group
  const groupRoutes = routes
    .filter(r => r.parentCode === groupCode && !r.hidden)
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  
  // Get child menu groups for this group
  const childGroups = getChildMenuGroups(groupCode);
  
  // Add child groups as nested menus
  for (const childGroup of childGroups) {
    const groupItem = buildMenuGroupItem(childGroup.code, routes, currentPath, t, language);
    if (groupItem) {
      items.push(groupItem);
    }
  }
  
  // Add routes directly under this group
  for (const route of groupRoutes) {
    items.push({
      title: language === "ar" ? route.title.ar : route.title.en,
      url: route.path,
      icon: route.icon,
      menuCode: route.menuCode,
      isActive: currentPath === route.path || currentPath.startsWith(route.path + "/"),
    });
  }
  
  return items;
}

/**
 * Build a menu group item with its children
 */
function buildMenuGroupItem(
  groupCode: string,
  routes: RouteDefinition[],
  currentPath: string,
  t: TFunction<"translation", undefined>,
  language: string
): RegistryMenuItem | null {
  const group = menuGroups.find(g => g.code === groupCode);
  if (!group) return null;
  
  const children = buildMenuItemsForGroup(groupCode, routes, currentPath, t, language);
  
  // Don't show empty groups
  if (children.length === 0) return null;
  
  // Check if any child is active
  const isActive = children.some(child => 
    child.isActive || 
    child.items?.some(sub => sub.isActive) ||
    child.subItems?.some(sub => sub.isActive || sub.subItems?.some(deep => deep.isActive))
  );
  
  // Determine if children should be in items or subItems based on depth
  const hasGrandchildren = children.some(c => c.items || c.subItems);
  
  return {
    title: t(group.translationKey, language === "ar" ? group.title.ar : group.title.en),
    icon: group.icon,
    menuCode: group.code,
    isActive,
    ...(hasGrandchildren ? { items: children } : { subItems: children }),
  };
}

/**
 * Hook to generate sidebar menu from route registry
 */
export function useRegistryMenu() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const currentPath = location.pathname;
  const language = i18n.language?.startsWith("ar") ? "ar" : "en";
  
  const menuItems = useMemo(() => {
    const items: RegistryMenuItem[] = [];
    const topLevelGroups = getTopLevelMenuGroups();
    
    for (const group of topLevelGroups) {
      // Special handling for dashboard - it's a direct link, not a group
      if (group.code === "dashboard") {
        const dashboardRoute = routeRegistry.find(r => r.menuCode === "dashboard");
        if (dashboardRoute) {
          items.push({
            title: t("navigation.dashboard", language === "ar" ? dashboardRoute.title.ar : dashboardRoute.title.en),
            url: dashboardRoute.path,
            icon: dashboardRoute.icon,
            menuCode: dashboardRoute.menuCode,
            isActive: currentPath === dashboardRoute.path,
          });
        }
        continue;
      }
      
      // Special handling for support - direct link
      if (group.code === "support") {
        const supportRoute = routeRegistry.find(r => r.menuCode === "support");
        if (supportRoute) {
          items.push({
            title: t("navigation.support", language === "ar" ? supportRoute.title.ar : supportRoute.title.en),
            url: supportRoute.path,
            icon: supportRoute.icon,
            menuCode: supportRoute.menuCode,
            isActive: currentPath === supportRoute.path,
          });
        }
        continue;
      }
      
      // Build group with children
      const groupItem = buildMenuGroupItem(group.code, routeRegistry, currentPath, t, language);
      if (groupItem) {
        items.push(groupItem);
      }
    }
    
    return items;
  }, [currentPath, t, language]);
  
  return { menuItems };
}

/**
 * Get all menu codes from the registry (for access control sync)
 */
export function getAllMenuCodes(): string[] {
  const codes = new Set<string>();
  
  // Add route menu codes
  for (const route of routeRegistry) {
    codes.add(route.menuCode);
  }
  
  // Add group menu codes
  for (const group of menuGroups) {
    codes.add(group.code);
  }
  
  return Array.from(codes);
}

/**
 * Get menu code to URL mapping for access control
 */
export function getMenuCodeUrlMap(): Map<string, string> {
  const map = new Map<string, string>();
  
  for (const route of routeRegistry) {
    if (!route.hidden && route.path) {
      map.set(route.menuCode, route.path);
    }
  }
  
  return map;
}
