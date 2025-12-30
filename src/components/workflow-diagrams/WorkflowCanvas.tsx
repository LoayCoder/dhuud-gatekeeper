import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Move,
  RotateCcw
} from 'lucide-react';
import { WorkflowDefinition } from '@/lib/workflow-definitions';
import { renderWorkflowSVG } from '@/lib/render-workflow-svg';

interface WorkflowCanvasProps {
  workflow: WorkflowDefinition | null;
  includeActors?: boolean;
  showLegend?: boolean;
  className?: string;
  onNodeClick?: (nodeId: string) => void;
}

export function WorkflowCanvas({ 
  workflow, 
  includeActors = true, 
  showLegend = true,
  className,
  onNodeClick 
}: WorkflowCanvasProps) {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Generate SVG
  const svgContent = useMemo(() => {
    if (!workflow) return null;
    return renderWorkflowSVG(workflow, {
      isRtl,
      includeActors,
      showLegend,
    });
  }, [workflow, isRtl, includeActors, showLegend]);

  // Reset view when workflow changes
  useEffect(() => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  }, [workflow?.id]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 400));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 25));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    
    const container = containerRef.current.getBoundingClientRect();
    const content = contentRef.current.getBoundingClientRect();
    
    const scaleX = (container.width - 40) / (content.width / (zoom / 100));
    const scaleY = (container.height - 40) / (content.height / (zoom / 100));
    const newZoom = Math.min(scaleX, scaleY) * 100;
    
    setZoom(Math.max(25, Math.min(newZoom, 200)));
    setPan({ x: 0, y: 0 });
  }, [zoom]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom(prev => Math.max(25, Math.min(prev + delta, 400)));
    }
  }, []);

  // Handle node clicks
  useEffect(() => {
    if (!contentRef.current || !onNodeClick) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as SVGElement;
      const nodeGroup = target.closest('[data-node-id]');
      if (nodeGroup) {
        const nodeId = nodeGroup.getAttribute('data-node-id');
        if (nodeId) onNodeClick(nodeId);
      }
    };

    const content = contentRef.current;
    content.addEventListener('click', handleClick);
    return () => content.removeEventListener('click', handleClick);
  }, [onNodeClick]);

  if (!workflow) {
    return (
      <div className={cn(
        'flex items-center justify-center h-full bg-muted/30 rounded-lg',
        className
      )}>
        <p className="text-muted-foreground">Select a workflow to preview</p>
      </div>
    );
  }

  return (
    <div className={cn('relative flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="absolute top-3 end-3 z-10 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 shadow-md border">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomOut}
          disabled={zoom <= 25}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <div className="w-24">
          <Slider
            value={[zoom]}
            onValueChange={([v]) => setZoom(v)}
            min={25}
            max={400}
            step={5}
            className="cursor-pointer"
          />
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomIn}
          disabled={zoom >= 400}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleFitToScreen}
          title="Fit to screen"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleResetView}
          title="Reset view"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-3 end-3 z-10 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs font-medium shadow border">
        {zoom}%
      </div>

      {/* Pan indicator */}
      {isPanning && (
        <div className="absolute top-3 start-3 z-10 bg-primary/10 backdrop-blur-sm rounded px-2 py-1 text-xs flex items-center gap-1.5">
          <Move className="h-3 w-3" />
          Panning
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className={cn(
          'flex-1 overflow-hidden bg-muted/30 rounded-lg cursor-grab',
          isPanning && 'cursor-grabbing'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          ref={contentRef}
          className="inline-block origin-center transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
          }}
        >
          {svgContent && (
            <div
              className="bg-white dark:bg-slate-900 rounded shadow-sm p-4"
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(svgContent, { 
                  USE_PROFILES: { svg: true, svgFilters: true } 
                }) 
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
