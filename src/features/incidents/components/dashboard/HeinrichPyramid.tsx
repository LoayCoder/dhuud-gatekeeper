import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Triangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeinrichPyramidProps {
  fatalOrMajor: number;
  minorInjuries: number;
  nearMisses: number;
  unsafeActs: number;
  positiveObservations: number;
}

export function HeinrichPyramid({ 
  fatalOrMajor, 
  minorInjuries, 
  nearMisses, 
  unsafeActs, 
  positiveObservations 
}: HeinrichPyramidProps) {
  const { t } = useTranslation();

  // Heinrich's ideal ratio: 1:29:300 (major:minor:near miss)
  // Bird's ratio: 1:10:30:600 (fatal:serious:minor:near miss)
  const pyramidLevels = [
    {
      label: t('dashboard.fatalMajor', 'Fatal/Major'),
      count: fatalOrMajor,
      idealRatio: 1,
      color: 'bg-destructive',
      textColor: 'text-destructive-foreground',
      width: 'w-16',
    },
    {
      label: t('dashboard.minorInjuries', 'Minor Injuries'),
      count: minorInjuries,
      idealRatio: 10,
      color: 'bg-warning',
      textColor: 'text-warning-foreground',
      width: 'w-32',
    },
    {
      label: t('dashboard.nearMisses', 'Near Misses'),
      count: nearMisses,
      idealRatio: 30,
      color: 'bg-warning/70',
      textColor: 'text-foreground',
      width: 'w-48',
    },
    {
      label: t('dashboard.unsafeConditions', 'Unsafe Acts/Conditions'),
      count: unsafeActs,
      idealRatio: 600,
      color: 'bg-info',
      textColor: 'text-info-foreground',
      width: 'w-64',
    },
    {
      label: t('dashboard.positiveObservations', 'Positive Observations'),
      count: positiveObservations,
      idealRatio: null,
      color: 'bg-success',
      textColor: 'text-success-foreground',
      width: 'w-80',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Triangle className="h-4 w-4" />
          {t('dashboard.safetyPyramid', "Heinrich's Safety Pyramid")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-1 py-4">
          {pyramidLevels.map((level) => (
            <div
              key={level.label}
              className={cn(
                "flex items-center justify-center py-2 px-4 rounded-sm transition-all hover:scale-105",
                level.color,
                level.textColor,
                level.width,
                "min-h-[2.5rem]"
              )}
            >
              <div className="text-center">
                <div className="font-bold text-lg">{level.count}</div>
                <div className="text-[10px] opacity-90 whitespace-nowrap">
                  {level.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Insights */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            {fatalOrMajor === 0 ? (
              t('dashboard.pyramidHealthy', 'No fatal/major incidents. Focus on increasing near miss and observation reporting to maintain this.')
            ) : (
              t('dashboard.pyramidWarning', 'Each major incident indicates potential gaps in the lower pyramid levels. Review near miss and observation reporting.')
            )}
          </p>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {t('dashboard.pyramidTheory', "Based on Heinrich's theory: For every major injury, there are approximately 29 minor injuries and 300 near misses.")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
