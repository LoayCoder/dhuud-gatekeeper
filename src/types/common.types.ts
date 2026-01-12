/**
 * Common/Shared Types
 * Types used across multiple modules: pagination, API responses, form states, etc.
 */

// Pagination types
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Form state types
export interface FormState<T> {
  data: T;
  isDirty: boolean;
  isSubmitting: boolean;
  errors: Record<keyof T, string | undefined>;
}

// Filter/sort types
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export interface FilterConfig {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';
  value: unknown;
}

export interface QueryConfig {
  filters?: FilterConfig[];
  sort?: SortConfig;
  pagination?: PaginationParams;
  search?: string;
}

// Date range
export interface DateRange {
  from: Date | null;
  to: Date | null;
}

// Location types
export interface GpsCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  formatted?: string;
}

// File/upload types
export interface UploadedFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface FileUploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

// Notification types
export type NotificationType = 
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'action_required';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

// Selection types
export interface SelectOption<T = string> {
  value: T;
  label: string;
  labelAr?: string;
  disabled?: boolean;
  icon?: string;
}

// Status badge config
export interface StatusBadgeConfig {
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  label: string;
  labelAr?: string;
  icon?: string;
}

// Table column config
export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  headerAr?: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'start' | 'center' | 'end';
  render?: (value: unknown, row: T) => React.ReactNode;
}

// Modal/dialog state
export interface DialogState<T = unknown> {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view' | 'delete';
  data?: T;
}

// Tenant context
export interface TenantContext {
  tenantId: string;
  tenantName: string;
  settings?: Record<string, unknown>;
}

// Offline support
export interface OfflineAction {
  id: string;
  actionType: string;
  payload: Record<string, unknown>;
  createdAt: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  syncError?: string;
}

// Export format
export type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'docx';

export interface ExportConfig {
  format: ExportFormat;
  columns?: string[];
  filename?: string;
  includeHeaders?: boolean;
}

// RTL support
export type TextDirection = 'ltr' | 'rtl';
export type Language = 'en' | 'ar';

// Theme
export type ThemeMode = 'light' | 'dark' | 'system';
