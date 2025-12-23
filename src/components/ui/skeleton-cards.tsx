import { cn } from "@/lib/utils";

const shimmerClass = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent";

interface SkeletonCardProps {
  className?: string;
}

// Dashboard Stats Card Skeleton
export function StatsCardSkeleton({ className }: SkeletonCardProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-6 space-y-3", shimmerClass, className)}>
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
      </div>
      <div className="h-8 w-20 rounded bg-muted animate-pulse" />
      <div className="h-3 w-32 rounded bg-muted animate-pulse" />
    </div>
  );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className={cn("flex items-center gap-4 px-4 py-3 border-b", shimmerClass)}>
      {Array.from({ length: columns }).map((_, i) => (
        <div 
          key={i} 
          className="h-4 rounded bg-muted animate-pulse"
          style={{ width: `${Math.random() * 80 + 60}px` }}
        />
      ))}
    </div>
  );
}

// Full Table Skeleton
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Table Header */}
      <div className={cn("flex items-center gap-4 px-4 py-3 bg-muted/50 border-b", shimmerClass)}>
        {Array.from({ length: columns }).map((_, i) => (
          <div 
            key={i} 
            className="h-4 rounded bg-muted animate-pulse"
            style={{ width: `${Math.random() * 60 + 50}px` }}
          />
        ))}
      </div>
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  );
}

// Dashboard Grid Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      
      {/* Table */}
      <TableSkeleton rows={6} columns={6} />
    </div>
  );
}

// Chart/Graph Skeleton
export function ChartSkeleton({ className }: SkeletonCardProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-6 space-y-4", shimmerClass, className)}>
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 rounded bg-muted animate-pulse" />
        <div className="h-8 w-24 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-64 w-full rounded-lg bg-muted/50 animate-pulse flex items-end justify-around gap-2 p-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div 
            key={i}
            className="w-8 bg-muted rounded-t animate-pulse"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// List Item Skeleton
export function ListItemSkeleton() {
  return (
    <div className={cn("flex items-center gap-4 p-4 border-b last:border-0", shimmerClass)}>
      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
    </div>
  );
}

// Form Field Skeleton
export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 w-20 rounded bg-muted animate-pulse" />
      <div className="h-10 w-full rounded-md border bg-muted/30 animate-pulse" />
    </div>
  );
}

// Page Header Skeleton
export function PageHeaderSkeleton() {
  return (
    <div className={cn("flex items-center justify-between py-4", shimmerClass)}>
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-muted animate-pulse" />
        <div className="h-4 w-64 rounded bg-muted animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-24 rounded-md bg-muted animate-pulse" />
        <div className="h-10 w-32 rounded-md bg-muted animate-pulse" />
      </div>
    </div>
  );
}

// Card with Image Skeleton
export function MediaCardSkeleton({ className }: SkeletonCardProps) {
  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", shimmerClass, className)}>
      <div className="h-40 w-full bg-muted animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-full rounded bg-muted animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}

// Avatar Group Skeleton
export function AvatarGroupSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex -space-x-2">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className="h-8 w-8 rounded-full border-2 border-background bg-muted animate-pulse"
        />
      ))}
    </div>
  );
}

// Notification Item Skeleton
export function NotificationSkeleton() {
  return (
    <div className={cn("flex items-start gap-3 p-3 border-b last:border-0", shimmerClass)}>
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-full rounded bg-muted animate-pulse" />
        <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
