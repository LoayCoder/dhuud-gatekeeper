import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TemporalHeatmapCell } from "@/hooks/use-location-heatmap";

interface Props {
  data: TemporalHeatmapCell[];
  maxCount: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = [0, 3, 6, 9, 12, 15, 18, 21]; // Show every 3 hours for compact view

function getDensityOpacity(density: number): number {
  if (density === 0) return 0.05;
  return Math.max(0.2, density / 100);
}

export function TemporalHeatmap({ data, maxCount }: Props) {
  const { t } = useTranslation();

  // Group data by day and hour
  const grid: Map<string, TemporalHeatmapCell> = new Map();
  data.forEach(cell => {
    grid.set(`${cell.day}-${cell.hour}`, cell);
  });

  // Aggregate to 3-hour blocks for compact display
  const aggregatedGrid: { day: number; hourBlock: number; count: number; density: number }[] = [];
  for (let day = 0; day < 7; day++) {
    for (let block = 0; block < 8; block++) {
      const startHour = block * 3;
      let blockCount = 0;
      for (let h = 0; h < 3; h++) {
        const cell = grid.get(`${day}-${startHour + h}`);
        blockCount += cell?.count || 0;
      }
      const maxBlockCount = maxCount * 3; // Max possible per block
      aggregatedGrid.push({
        day,
        hourBlock: block,
        count: blockCount,
        density: maxBlockCount > 0 ? (blockCount / maxBlockCount) * 100 : 0,
      });
    }
  }

  const maxBlockDensity = Math.max(...aggregatedGrid.map(g => g.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {t('dashboard.temporalPatterns', 'Event Timing Patterns')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="overflow-x-auto">
            {/* Hour labels */}
            <div className="flex mb-1">
              <div className="w-10 shrink-0" />
              {HOURS.map((hour) => (
                <div 
                  key={hour} 
                  className="flex-1 text-center text-xs text-muted-foreground min-w-[28px]"
                >
                  {hour.toString().padStart(2, '0')}
                </div>
              ))}
            </div>

            {/* Grid */}
            {DAYS.map((dayLabel, dayIndex) => (
              <div key={dayLabel} className="flex items-center gap-1 mb-1">
                <div className="w-10 shrink-0 text-xs text-muted-foreground text-end pe-1">
                  {t(`dashboard.day${dayLabel}`, dayLabel)}
                </div>
                {HOURS.map((_, blockIndex) => {
                  const cell = aggregatedGrid.find(
                    c => c.day === dayIndex && c.hourBlock === blockIndex
                  );
                  const count = cell?.count || 0;
                  const normalizedDensity = (count / maxBlockDensity) * 100;

                  return (
                    <Tooltip key={blockIndex}>
                      <TooltipTrigger asChild>
                        <div
                          className="flex-1 h-6 min-w-[28px] rounded-sm transition-all hover:ring-2 hover:ring-primary cursor-default"
                          style={{
                            backgroundColor: count > 0 
                              ? `hsl(var(--primary) / ${getDensityOpacity(normalizedDensity)})`
                              : 'hsl(var(--muted) / 0.3)',
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div>
                          {dayLabel} {HOURS[blockIndex].toString().padStart(2, '0')}:00 - {(HOURS[blockIndex] + 3).toString().padStart(2, '0')}:00
                        </div>
                        <div className="font-semibold">
                          {count} {t('dashboard.events', 'events')}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
          <span>{t('dashboard.lessEvents', 'Less')}</span>
          <div className="flex gap-0.5">
            {[0.1, 0.25, 0.5, 0.75, 1].map((opacity) => (
              <div
                key={opacity}
                className="w-4 h-4 rounded-sm"
                style={{ backgroundColor: `hsl(var(--primary) / ${opacity})` }}
              />
            ))}
          </div>
          <span>{t('dashboard.moreEvents', 'More')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
