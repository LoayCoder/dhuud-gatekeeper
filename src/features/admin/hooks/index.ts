/**
 * Organization Structure Hooks
 * 
 * This barrel file exports all hooks related to organizational hierarchy.
 */

// Hierarchy
export * from '@/hooks/use-org-hierarchy';

// Branches
export * from '@/hooks/use-branches';

// Divisions (via other hooks)

// Departments
export * from '@/hooks/use-departments';
export * from '@/hooks/use-department-users';

// Sites
export * from '@/hooks/use-sites';
export * from '@/hooks/use-site-sections';
export * from '@/hooks/use-site-departments';
// export * from '@/hooks/use-user-department-sites'; // TODO: module not found

// Tenant
export * from '@/hooks/use-tenant-profiles';
export * from '@/hooks/use-tenant-currency';

// Manager/Team
export * from '@/hooks/use-manager-team';
export * from '@/hooks/use-my-manager';
export * from '@/hooks/use-team-performance';
