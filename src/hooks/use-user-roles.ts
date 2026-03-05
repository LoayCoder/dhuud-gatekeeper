// Stub for use-user-roles
export type RoleCategory = string;

export function useUserRoles() {
  return {
    roles: [] as any[],
    hasRole: (role: string) => false,
    isLoading: false,
  };
}
