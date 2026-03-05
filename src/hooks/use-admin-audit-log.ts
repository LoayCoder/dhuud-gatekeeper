// Stub for use-admin-audit-log
export function useAdminAuditLog() {
  return {
    logAction: async (...args: any[]) => {},
    logUserCreated: async (...args: any[]) => {},
    logUserUpdated: async (...args: any[]) => {},
    logUserDeactivated: async (...args: any[]) => {},
    logUserActivated: async (...args: any[]) => {},
    logUserDeleted: async (...args: any[]) => {},
  };
}

export function detectUserChanges(oldData: any, newData: any) {
  return {};
}
