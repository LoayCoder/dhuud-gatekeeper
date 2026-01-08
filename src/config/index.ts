/**
 * Route Registry Configuration Exports
 * 
 * Central export point for all route registry functionality.
 */

export { routeRegistry, getRouteByPath, getRouteByMenuCode, getVisibleRoutes, getChildRoutes, validateRegistry } from './route-registry';
export { menuGroups, getMenuGroup, getChildMenuGroups, getTopLevelMenuGroups } from './menu-groups';
export type { RouteDefinition, RouteProtection, MenuItem, RegistryValidationError, MenuCode } from './route-registry-types';
export type { MenuGroup } from './menu-groups';
