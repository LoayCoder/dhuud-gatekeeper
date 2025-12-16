import { useTranslation } from 'react-i18next';
import { AlertTriangle, MapPin, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SIMOPSConflict } from '@/hooks/ptw/use-simops-check';
import { cn } from '@/lib/utils';

interface SIMOPSConflictWarningProps {
  conflicts: SIMOPSConflict[];
  className?: string;
}

export function SIMOPSConflictWarning({ conflicts, className }: SIMOPSConflictWarningProps) {
  const { t } = useTranslation();

  if (!conflicts || conflicts.length === 0) return null;

  const hasBlockingConflict = conflicts.some(c => c.auto_reject);
  
  return (
    <Alert 
      variant={hasBlockingConflict ? "destructive" : "default"}
      className={cn("border-2", className)}
    >
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="font-semibold">
        {hasBlockingConflict 
          ? t('ptw.simops.criticalConflict', 'Critical SIMOPS Conflict - Permit Blocked')
          : t('ptw.simops.warningConflict', 'SIMOPS Conflict Warning')
        }
      </AlertTitle>
      <AlertDescription>
        <p className="text-sm mb-3">
          {hasBlockingConflict 
            ? t('ptw.simops.criticalDescription', 'This permit cannot be issued due to safety conflicts with existing active permits.')
            : t('ptw.simops.warningDescription', 'Review the following conflicts before proceeding.')
          }
        </p>
        
        <div className="space-y-2">
          {conflicts.map((conflict, index) => (
            <Card key={index} className={cn(
              "border",
              conflict.auto_reject ? "border-destructive bg-destructive/5" : "border-yellow-500 bg-yellow-500/5"
            )}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {conflict.auto_reject ? (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
                      )}
                      <span className="font-medium text-sm">
                        {conflict.conflicting_reference_id}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {conflict.conflicting_permit_type}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2">
                      {conflict.rule_description}
                    </p>
                    
                    <div className="flex flex-wrap gap-3 text-xs">
                      {conflict.conflict_type === 'spatial' || conflict.conflict_type === 'both' ? (
                        <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                          <MapPin className="h-3 w-3" />
                          {t('ptw.simops.distanceViolation', 'Distance: {{distance}}m', {
                            distance: conflict.distance_meters?.toFixed(0) || '0'
                          })}
                        </div>
                      ) : null}
                      
                      {conflict.conflict_type === 'temporal' || conflict.conflict_type === 'both' ? (
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <Clock className="h-3 w-3" />
                          {t('ptw.simops.timeOverlap', 'Overlap: {{minutes}} min', {
                            minutes: conflict.time_overlap_minutes
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}
