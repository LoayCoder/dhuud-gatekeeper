// Stub for use-users-paginated
export interface UserWithRoles {
  id: string;
  full_name: string;
  email: string;
  status: string;
  roles: string[];
  [key: string]: any;
}

export interface UseUsersPaginatedFilters {
  search?: string;
  status?: string;
  role?: string;
  branch?: string;
  division?: string;
  userType?: string;
}

export function useUsersPaginated(filters?: UseUsersPaginatedFilters) {
  return {
    users: [] as UserWithRoles[],
    totalCount: 0,
    loading: false,
    refetchUsers: () => {},
    page: 1,
    setPage: (p: number) => {},
    pageSize: 20,
  };
}
