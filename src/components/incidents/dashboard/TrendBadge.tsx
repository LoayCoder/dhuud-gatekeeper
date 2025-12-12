import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendBadgeProps {
  current: number;
  previous: number;
  invertColors?: boolean; // true = down is good (e.g., incidents), false = up is good
}

export function TrendBadge({ current, previous, invertColors = true }: TrendBadgeProps) {
  if (previous === 0 && current === 0) {
    return null;
  }

  const diff = previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);
  const isUp = diff > 0;
  const isDown = diff < 0;
  const isSteady = diff === 0;

  // For incidents/issues, DOWN is good (fewer problems)
  // For closures/resolutions, UP is good (more resolved)
  const isPositive = invertColors ? isDown : isUp;
  const isNegative = invertColors ? isUp : isDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isPositive && "text-green-600 dark:text-green-400",
        isNegative && "text-red-600 dark:text-red-400",
        isSteady && "text-muted-foreground"
      )}
    >
      {isUp && <TrendingUp className="h-3 w-3" />}
      {isDown && <TrendingDown className="h-3 w-3" />}
      {isSteady && <Minus className="h-3 w-3" />}
      <span>{Math.abs(Math.round(diff))}%</span>
    </span>
  );
}
