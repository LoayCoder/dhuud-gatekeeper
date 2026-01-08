import { ComponentType, LazyExoticComponent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Protection levels for routes
 */
export type RouteProtection = 
  | "public"           // No auth required (login, signup, legal pages)
  | "protected"        // Requires authenticated user
  | "admin"            // Requires admin role
  | "hsse"             // Requires HSSE role
  | "security"         // Requires security role
  | "menu-based";      // Uses MenuBasedAdminRoute with menuCode

/**
 * Single source of truth for a route/page
 */
export interface RouteDefinition {
  /** Route path (e.g., "/dashboard", "/incidents/:id") */
  path: string;
  
  /** Unique menu code for access control and database sync */
  menuCode: string;
  
  /** Display titles for sidebar */
  title: {
    en: string;
    ar: string;
  };
  
  /** Lucide icon component for sidebar */
  icon: LucideIcon;
  
  /** Lazy-loaded component */
  component: LazyExoticComponent<ComponentType<any>> | ComponentType<any>;
  
  /** Protection level */
  protection: RouteProtection;
  
  /** For menu-based protection, the menu code to check */
  menuBasedCode?: string;
  
  /** Parent menu group code for sidebar hierarchy */
  parentCode?: string;
  
  /** Sort order within parent group (lower = higher) */
  sortOrder?: number;
  
  /**
   * If true, this route won't appear in sidebar
   * Use for dynamic routes like /incidents/:id or system routes
   */
  hidden?: boolean;
  
  /**
   * REQUIRED if hidden is true - documents why this route is hidden
   */
  hiddenReason?: string;
  
  /** 
   * If true, this route uses MainLayout (sidebar)
   * Default: true for protected routes
   */
  usesLayout?: boolean;
  
  /**
   * Translation key for the title (auto-generated from menuCode)
   */
  translationKey?: string;
}

/**
 * Menu item structure for sidebar (built from RouteDefinition)
 */
export interface MenuItem {
  title: string;
  url?: string;
  icon: LucideIcon;
  menuCode: string;
  isActive?: boolean;
  items?: MenuItem[];
  subItems?: MenuItem[];
}

/**
 * Validation error for route registry
 */
export interface RegistryValidationError {
  type: "missing_hidden_reason" | "duplicate_path" | "duplicate_menu_code" | "orphan_route";
  path: string;
  menuCode: string;
  message: string;
}

/**
 * Helper type for extracting just the menu codes
 */
export type MenuCode = RouteDefinition["menuCode"];
