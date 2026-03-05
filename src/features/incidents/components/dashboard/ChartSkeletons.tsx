import { Card, CardContent, CardHeader } from "@/components/ui/card";

const shimmerClass = "bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-shimmer";

export function ParetoChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className={`h-5 w-48 rounded ${shimmerClass}`} />
        <div className={`h-4 w-64 rounded mt-1.5 ${shimmerClass}`} />
      </CardHeader>
      <CardContent className="h-[320px] pt-4">
        <div className="flex h-[260px] items-end justify-between gap-2 px-8">
          {/* Y-axis labels */}
          <div className="absolute start-4 flex flex-col justify-between h-[220px] gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`h-3 w-6 rounded ${shimmerClass}`} />
            ))}
          </div>
          
          {/* Bars - descending heights for Pareto effect */}
          {[85, 70, 55, 40, 30, 20, 15].map((height, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div 
                className={`w-full rounded-t ${shimmerClass}`} 
                style={{ height: `${height}%`, animationDelay: `${i * 100}ms` }}
              />
              <div className={`h-3 w-full max-w-[50px] rounded ${shimmerClass}`} />
            </div>
          ))}
          
          {/* Y-axis labels right */}
          <div className="absolute end-4 flex flex-col justify-between h-[220px] gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`h-3 w-8 rounded ${shimmerClass}`} />
            ))}
          </div>
        </div>
        
        {/* Cumulative line placeholder */}
        <div className="relative -mt-[240px] ms-12 me-12 h-[200px]">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <path
              d="M 0 180 Q 50 150, 100 100 Q 150 60, 200 40 Q 250 25, 300 15 Q 350 8, 400 5"
              fill="none"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="3"
              strokeOpacity="0.2"
              strokeLinecap="round"
              className="animate-pulse"
            />
          </svg>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center gap-6 mt-16">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded ${shimmerClass}`} />
              <div className={`h-3 w-16 rounded ${shimmerClass}`} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function WaterfallChartSkeleton() {
  // Waterfall pattern: start high, then positive/negative changes, end with total
  const waterfallHeights = [
    { base: 0, height: 70, type: 'start' },
    { base: 50, height: 25, type: 'positive' },
    { base: 40, height: 35, type: 'positive' },
    { base: 55, height: -20, type: 'negative' },
    { base: 30, height: 25, type: 'positive' },
    { base: 45, height: -15, type: 'negative' },
    { base: 0, height: 55, type: 'total' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className={`h-5 w-52 rounded ${shimmerClass}`} />
        <div className={`h-4 w-72 rounded mt-1.5 ${shimmerClass}`} />
      </CardHeader>
      <CardContent className="h-[320px] pt-4">
        <div className="flex h-[260px] items-end justify-between gap-3 px-6">
          {/* Y-axis labels */}
          <div className="absolute start-2 flex flex-col justify-between h-[220px]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`h-3 w-6 rounded ${shimmerClass}`} />
            ))}
          </div>
          
          {/* Waterfall bars */}
          {waterfallHeights.map((bar, i) => (
            <div key={i} className="flex flex-col items-center flex-1" style={{ height: '100%' }}>
              <div 
                className="w-full flex flex-col justify-end"
                style={{ height: '100%' }}
              >
                {/* Invisible spacer */}
                <div style={{ flexGrow: 1 - (bar.base + Math.abs(bar.height)) / 100 }} />
                {/* Base spacer for waterfall effect */}
                <div style={{ height: `${bar.base}%` }} />
                {/* Actual bar */}
                <div 
                  className={`w-full rounded-t ${shimmerClass}`}
                  style={{ 
                    height: `${Math.abs(bar.height)}%`,
                    animationDelay: `${i * 100}ms`
                  }}
                />
              </div>
              <div className={`h-3 w-full max-w-[40px] rounded mt-1 ${shimmerClass}`} />
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded ${shimmerClass}`} />
              <div className={`h-3 w-20 rounded ${shimmerClass}`} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DonutChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className={`h-5 w-40 rounded ${shimmerClass}`} />
        <div className={`h-4 w-56 rounded mt-1.5 ${shimmerClass}`} />
      </CardHeader>
      <CardContent className="h-[280px] flex items-center justify-center">
        <div className="relative">
          {/* Outer ring */}
          <div className={`w-48 h-48 rounded-full border-[24px] border-muted ${shimmerClass}`} />
          {/* Inner circle (donut hole) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-background" />
          </div>
          {/* Center text placeholder */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`h-6 w-12 rounded ${shimmerClass}`} />
            <div className={`h-3 w-16 rounded mt-1 ${shimmerClass}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BarChartSkeleton({ horizontal = false }: { horizontal?: boolean }) {
  const barCount = 6;
  const heights = [80, 65, 90, 45, 70, 55];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className={`h-5 w-44 rounded ${shimmerClass}`} />
        <div className={`h-4 w-60 rounded mt-1.5 ${shimmerClass}`} />
      </CardHeader>
      <CardContent className="h-[280px] pt-4">
        {horizontal ? (
          <div className="flex flex-col gap-3 h-full justify-center px-4">
            {heights.map((width, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`h-3 w-20 rounded ${shimmerClass}`} />
                <div 
                  className={`h-6 rounded ${shimmerClass}`}
                  style={{ width: `${width}%`, animationDelay: `${i * 80}ms` }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-[220px] items-end justify-between gap-4 px-6">
            {heights.map((height, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <div 
                  className={`w-full rounded-t ${shimmerClass}`}
                  style={{ height: `${height}%`, animationDelay: `${i * 80}ms` }}
                />
                <div className={`h-3 w-12 rounded ${shimmerClass}`} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LineChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className={`h-5 w-36 rounded ${shimmerClass}`} />
        <div className={`h-4 w-52 rounded mt-1.5 ${shimmerClass}`} />
      </CardHeader>
      <CardContent className="h-[280px] pt-4 px-6">
        {/* Grid lines */}
        <div className="relative h-[220px]">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className="absolute w-full border-t border-dashed border-muted"
              style={{ top: `${i * 25}%` }}
            />
          ))}
          
          {/* Line chart path */}
          <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
            <path
              d="M 0 150 Q 30 130, 60 120 Q 90 100, 120 80 Q 150 90, 180 70 Q 210 50, 240 60 Q 270 40, 300 30"
              fill="none"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="3"
              strokeOpacity="0.3"
              strokeLinecap="round"
              className="animate-pulse"
            />
            {/* Data points */}
            {[
              { x: 0, y: 150 },
              { x: 60, y: 120 },
              { x: 120, y: 80 },
              { x: 180, y: 70 },
              { x: 240, y: 60 },
              { x: 300, y: 30 },
            ].map((point, i) => (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r="5"
                className={`fill-muted ${shimmerClass}`}
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </svg>
        </div>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`h-3 w-10 rounded ${shimmerClass}`} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
