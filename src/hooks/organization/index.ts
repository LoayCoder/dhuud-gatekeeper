/**
 * Organization Structure Hooks
 * 
 * This barrel file exports all hooks related to organizational hierarchy.
 */

// Hierarchy
export * from '../use-org-hierarchy';

// Branches
export * from '../use-branches';

// Divisions (via other hooks)

// Departments
export * from '../use-departments';
export * from '../use-department-users';

// Sites
export * from '../use-sites';
export * from '../use-site-sections';
export * from '../use-site-departments';
export * from '../use-user-department-sites';

// Tenant
export * from '../use-tenant-profiles';
export * from '../use-tenant-currency';

// Manager/Team
export * from '../use-manager-team';
export * from '../use-my-manager';
export * from '../use-team-performance';
