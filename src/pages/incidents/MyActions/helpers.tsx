import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export const getStatusIcon = (status: string | null) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'in_progress': return <Clock className="h-4 w-4 text-info" />;
    case 'verified': return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case 'approved': return <CheckCircle2 className="h-4 w-4 text-primary" />;
    default: return <AlertCircle className="h-4 w-4 text-warning" />;
  }
};

export const getPriorityBadgeVariant = (priority: string | null): "destructive" | "secondary" | "outline" => {
  switch (priority) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
};

export const formatFallbackLabel = (raw: string | null | undefined): string => {
  if (!raw) return 'Unknown';
  return raw
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
