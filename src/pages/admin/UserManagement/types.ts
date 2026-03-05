export type BaseUserManagementProps = ReturnType<typeof import('./hooks/useUserManagement').useUserManagementState> &
    ReturnType<typeof import('./hooks/useUserManagement').useUserManagementData> &
    ReturnType<typeof import('./hooks/useUserManagement').useUserManagementSaveActions> &
    ReturnType<typeof import('./hooks/useUserManagement').useUserManagementStatusActions> &
    ReturnType<typeof import('./hooks/useUserManagement').useUserManagementExtraActions>;
