// Investigation completeness hook stub
import { useMemo } from 'react';

export function useInvestigationCompleteness(investigation: any) {
  return useMemo(() => {
    if (!investigation) return { percentage: 0, missingFields: [], isComplete: false };
    
    const fields = [
      'root_cause', 'findings', 'methodology', 'timeline_of_events',
      'contributing_factors', 'recommendations',
    ];
    const filled = fields.filter(f => investigation[f]);
    const percentage = Math.round((filled.length / fields.length) * 100);
    const missingFields = fields.filter(f => !investigation[f]);
    
    return { percentage, missingFields, isComplete: percentage === 100 };
  }, [investigation]);
}
