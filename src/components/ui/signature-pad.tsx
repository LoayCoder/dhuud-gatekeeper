import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SignaturePadRef {
  clear: () => void;
  isEmpty: () => boolean;
  getSignatureDataUrl: () => string | null;
}

interface SignaturePadProps {
  onSignatureChange?: (isEmpty: boolean) => void;
  className?: string;
  height?: number;
  disabled?: boolean;
  label?: string;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ onSignatureChange, className, height = 150, disabled = false, label }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    const getCoordinates = useCallback((e: React.TouchEvent | React.MouseEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ('touches' in e) {
        const touch = e.touches[0];
        if (!touch) return null;
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      } else {
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        };
      }
    }, []);

    const startDrawing = useCallback((e: React.TouchEvent | React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      const coords = getCoordinates(e);
      if (coords) {
        setIsDrawing(true);
        lastPointRef.current = coords;
      }
    }, [disabled, getCoordinates]);

    const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
      if (!isDrawing || disabled) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const coords = getCoordinates(e);
      if (!coords || !lastPointRef.current) return;

      ctx.beginPath();
      ctx.strokeStyle = 'hsl(var(--foreground))';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      lastPointRef.current = coords;
      
      if (isEmpty) {
        setIsEmpty(false);
        onSignatureChange?.(false);
      }
    }, [isDrawing, disabled, getCoordinates, isEmpty, onSignatureChange]);

    const stopDrawing = useCallback(() => {
      setIsDrawing(false);
      lastPointRef.current = null;
    }, []);

    const clearCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setIsEmpty(true);
      onSignatureChange?.(true);
    }, [onSignatureChange]);

    const checkIsEmpty = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return true;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return true;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return !imageData.data.some((channel, i) => i % 4 === 3 && channel !== 0);
    }, []);

    const getSignatureDataUrl = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || isEmpty) return null;
      return canvas.toDataURL('image/png');
    }, [isEmpty]);

    useImperativeHandle(ref, () => ({
      clear: clearCanvas,
      isEmpty: () => isEmpty,
      getSignatureDataUrl,
    }), [clearCanvas, isEmpty, getSignatureDataUrl]);

    // Set up canvas with proper scaling
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }, []);

    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {label && (
          <label className="text-sm font-medium text-foreground">{label}</label>
        )}
        <div className="relative rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30">
          <canvas
            ref={canvasRef}
            className={cn(
              'w-full touch-none cursor-crosshair rounded-lg',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{ height }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {isEmpty && !disabled && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Sign here
            </div>
          )}
        </div>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            disabled={isEmpty}
            className="self-end"
          >
            <Eraser className="me-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    );
  }
);

SignaturePad.displayName = 'SignaturePad';
