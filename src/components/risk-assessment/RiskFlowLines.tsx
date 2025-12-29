import { useEffect, useState, useRef, RefObject, useMemo } from "react";
import { cn } from "@/lib/utils";

interface Hazard {
  id: string;
  likelihood: number;
  severity: number;
  residual_likelihood?: number;
  residual_severity?: number;
  hazard_description: string;
}

interface RiskFlowLinesProps {
  hazards: Hazard[];
  leftMatrixRef: RefObject<HTMLDivElement>;
  rightMatrixRef: RefObject<HTMLDivElement>;
  containerRef: RefObject<HTMLDivElement>;
  animated?: boolean;
  cellSize?: number;
  gap?: number;
}

interface LineData {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  improved: boolean;
  initialScore: number;
  residualScore: number;
}

export function RiskFlowLines({
  hazards,
  leftMatrixRef,
  rightMatrixRef,
  containerRef,
  animated = true,
  cellSize = 32,
  gap = 4,
}: RiskFlowLinesProps) {
  const [lines, setLines] = useState<LineData[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate line positions based on hazard data and matrix positions
  useEffect(() => {
    const calculateLines = () => {
      if (!leftMatrixRef.current || !rightMatrixRef.current || !containerRef.current) {
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const leftRect = leftMatrixRef.current.getBoundingClientRect();
      const rightRect = rightMatrixRef.current.getBoundingClientRect();

      setDimensions({
        width: containerRect.width,
        height: containerRect.height,
      });

      const newLines: LineData[] = hazards.map((hazard) => {
        const initialL = hazard.likelihood;
        const initialS = hazard.severity;
        const residualL = hazard.residual_likelihood || hazard.likelihood;
        const residualS = hazard.residual_severity || hazard.severity;

        // Calculate cell position in grid (0-indexed, with row 0 being likelihood 5)
        const startRow = 5 - initialL;
        const startCol = initialS - 1;
        const endRow = 5 - residualL;
        const endCol = residualS - 1;

        // Calculate actual pixel positions within matrices
        const cellWithGap = cellSize + gap;
        
        // Start position (center of cell in left matrix)
        const startX = (leftRect.left - containerRect.left) + (startCol * cellWithGap) + (cellSize / 2);
        const startY = (leftRect.top - containerRect.top) + (startRow * cellWithGap) + (cellSize / 2);

        // End position (center of cell in right matrix)
        const endX = (rightRect.left - containerRect.left) + (endCol * cellWithGap) + (cellSize / 2);
        const endY = (rightRect.top - containerRect.top) + (endRow * cellWithGap) + (cellSize / 2);

        const initialScore = initialL * initialS;
        const residualScore = residualL * residualS;

        return {
          id: hazard.id,
          startX,
          startY,
          endX,
          endY,
          improved: residualScore < initialScore,
          initialScore,
          residualScore,
        };
      });

      setLines(newLines);
    };

    calculateLines();

    // Recalculate on resize
    const resizeObserver = new ResizeObserver(calculateLines);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [hazards, leftMatrixRef, rightMatrixRef, containerRef, cellSize, gap]);

  // Generate curved path between two points
  const generatePath = (line: LineData): string => {
    const { startX, startY, endX, endY } = line;
    
    // Control point for bezier curve (arc upward)
    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 30; // Arc above the highest point
    
    return `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
  };

  if (lines.length === 0 || dimensions.width === 0) {
    return null;
  }

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none overflow-visible"
      width={dimensions.width}
      height={dimensions.height}
      style={{ zIndex: 10 }}
    >
      <defs>
        {/* Gradient for improved lines */}
        <linearGradient id="improvedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity="0.8" />
          <stop offset="50%" stopColor="hsl(45, 93%, 47%)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity="0.8" />
        </linearGradient>
        
        {/* Gradient for unchanged lines */}
        <linearGradient id="unchangedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.5" />
        </linearGradient>

        {/* Arrowhead marker */}
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L6,3 z" fill="hsl(142, 76%, 36%)" />
        </marker>

        <marker
          id="arrowhead-muted"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L6,3 z" fill="hsl(var(--muted-foreground))" opacity="0.5" />
        </marker>
      </defs>

      {lines.map((line, index) => {
        const pathLength = 200; // Approximate path length for animation
        
        return (
          <g key={line.id}>
            {/* Shadow/glow effect */}
            <path
              d={generatePath(line)}
              fill="none"
              stroke={line.improved ? "hsl(142, 76%, 36%)" : "hsl(var(--muted-foreground))"}
              strokeWidth="4"
              strokeOpacity="0.2"
              strokeLinecap="round"
            />
            
            {/* Main path */}
            <path
              d={generatePath(line)}
              fill="none"
              stroke={line.improved ? "url(#improvedGradient)" : "url(#unchangedGradient)"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={line.improved ? "none" : "4 4"}
              markerEnd={line.improved ? "url(#arrowhead)" : "url(#arrowhead-muted)"}
              className={cn(
                animated && line.improved && "animate-draw-line"
              )}
              style={animated ? {
                strokeDasharray: pathLength,
                strokeDashoffset: pathLength,
                animation: `drawLine 0.8s ease-out ${index * 0.15}s forwards`,
              } : undefined}
            />

            {/* Hazard number label at midpoint */}
            <g>
              <circle
                cx={(line.startX + line.endX) / 2}
                cy={Math.min(line.startY, line.endY) - 30}
                r="10"
                fill={line.improved ? "hsl(142, 76%, 36%)" : "hsl(var(--muted))"}
                stroke="hsl(var(--background))"
                strokeWidth="2"
                className={cn(
                  animated && "opacity-0",
                  animated && "animate-fade-in"
                )}
                style={animated ? {
                  animationDelay: `${index * 0.15 + 0.6}s`,
                  animationFillMode: "forwards",
                } : undefined}
              />
              <text
                x={(line.startX + line.endX) / 2}
                y={Math.min(line.startY, line.endY) - 26}
                textAnchor="middle"
                fontSize="9"
                fontWeight="bold"
                fill={line.improved ? "white" : "hsl(var(--foreground))"}
                className={cn(
                  animated && "opacity-0",
                  animated && "animate-fade-in"
                )}
                style={animated ? {
                  animationDelay: `${index * 0.15 + 0.6}s`,
                  animationFillMode: "forwards",
                } : undefined}
              >
                H{parseInt(line.id) + 1}
              </text>
            </g>
          </g>
        );
      })}

      <style>{`
        @keyframes drawLine {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </svg>
  );
}

// Static version for print (no animations)
export function StaticRiskFlowLines(props: Omit<RiskFlowLinesProps, 'animated'>) {
  return <RiskFlowLines {...props} animated={false} />;
}
