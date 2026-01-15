/**
 * Asset Management Hooks
 * 
 * This barrel file exports all hooks related to asset management functionality.
 */

// Asset CRUD and listing
export * from '../use-assets';
export * from '../use-asset-by-code';
export * from '../use-bulk-asset-operations';

// Asset Dashboard & Health
export * from '../use-asset-dashboard';
export * from '../use-asset-dashboard-extended';
export * from '../use-asset-health-dashboard';
export * from '../use-asset-health-scores';
export * from '../use-asset-health-trend';

// Asset Maintenance
// Note: use-maintenance excluded to avoid duplicate exports with use-assets (useAssetMaintenanceSchedules)
export * from '../use-maintenance-parts';

// Asset Categories & Transfers
export * from '../use-asset-category-management';
export * from '../use-asset-type-parts';
export * from '../use-asset-transfers';
export * from '../use-asset-location';

// Asset Cost & Depreciation
export * from '../use-asset-cost-transactions';
export * from '../use-depreciation-schedules';
export * from '../use-warranty-claims';

// Asset Uploads & Documents
export * from '../use-asset-uploads';
export * from '../use-asset-audit-log-viewer';

// Asset Notifications & Preferences
export * from '../use-asset-notification-preferences';

// Asset Offline Support
export * from '../use-offline-assets';
export * from '../use-offline-asset-photos';
export * from '../use-asset-offline-actions';

// Asset Approval Workflows
export * from '../use-asset-approval-workflows';

// Asset Dependencies
export * from '../use-check-asset-dependencies';
