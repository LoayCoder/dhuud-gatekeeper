import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pipette } from 'lucide-react';

interface HslColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

function parseHsl(hslString: string): { h: number; s: number; l: number } {
  const parts = hslString.replace(/[^\d.\s]/g, '').trim().split(/\s+/);
  return {
    h: parseFloat(parts[0]) || 0,
    s: parseFloat(parts[1]) || 50,
    l: parseFloat(parts[2]) || 50,
  };
}

function formatHsl(h: number, s: number, l: number): string {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

// Convert HSL to HSV for the color plane
function hslToHsv(h: number, s: number, l: number): { h: number; s: number; v: number } {
  s = s / 100;
  l = l / 100;
  const v = l + s * Math.min(l, 1 - l);
  const sv = v === 0 ? 0 : 2 * (1 - l / v);
  return { h, s: sv * 100, v: v * 100 };
}

// Convert HSV to HSL for output
function hsvToHsl(h: number, s: number, v: number): { h: number; s: number; l: number } {
  s = s / 100;
  v = v / 100;
  const l = v * (1 - s / 2);
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return { h, s: sl * 100, l: l * 100 };
}

export function HslColorPicker({ value, onChange, label }: HslColorPickerProps) {
  const { t } = useTranslation();
  const [hsl, setHsl] = useState(() => parseHsl(value));
  const [open, setOpen] = useState(false);
  const planeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Convert to HSV for the color plane
  const hsv = hslToHsv(hsl.h, hsl.s, hsl.l);

  useEffect(() => {
    if (value) {
      setHsl(parseHsl(value));
    }
  }, [value]);

  const updateFromHsv = useCallback((h: number, s: number, v: number) => {
    const newHsl = hsvToHsl(h, s, v);
    setHsl(newHsl);
    onChange(formatHsl(newHsl.h, newHsl.s, newHsl.l));
  }, [onChange]);

  const handlePlaneInteraction = useCallback((clientX: number, clientY: number) => {
    if (!planeRef.current) return;
    
    const rect = planeRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    
    const newS = x * 100;
    const newV = (1 - y) * 100;
    
    updateFromHsv(hsl.h, newS, newV);
  }, [hsl.h, updateFromHsv]);

  const handlePlaneMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handlePlaneInteraction(e.clientX, e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handlePlaneInteraction(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handlePlaneInteraction]);

  const handleHueChange = ([newHue]: number[]) => {
    updateFromHsv(newHue, hsv.s, hsv.v);
  };

  const colorPreview = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-3 items-center rtl:flex-row-reverse">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-12 w-12 p-0 border-2 rounded-lg shadow-sm flex-shrink-0"
              style={{ backgroundColor: colorPreview }}
            >
              <span className="sr-only">{t('adminBranding.colorPicker.pickColor')}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="start">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Pipette className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{t('adminBranding.colorPicker.title')}</span>
              </div>

              {/* Color Plane (Saturation x Value/Brightness) */}
              <div
                ref={planeRef}
                className="relative h-40 rounded-lg cursor-crosshair border shadow-inner select-none"
                style={{
                  background: `
                    linear-gradient(to top, #000, transparent),
                    linear-gradient(to right, #fff, hsl(${hsl.h}, 100%, 50%))
                  `
                }}
                onMouseDown={handlePlaneMouseDown}
              >
                {/* Color picker cursor */}
                <div
                  className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md pointer-events-none"
                  style={{
                    left: `${hsv.s}%`,
                    top: `${100 - hsv.v}%`,
                    backgroundColor: colorPreview,
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3)'
                  }}
                />
              </div>

              {/* Hue Slider */}
              <div className="space-y-2">
                <div 
                  className="h-4 rounded-full"
                  style={{
                    background: 'linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))'
                  }}
                >
                  <Slider
                    value={[hsl.h]}
                    max={360}
                    step={1}
                    onValueChange={handleHueChange}
                    className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:shadow-md [&>.bg-primary]:bg-transparent"
                  />
                </div>
              </div>

              {/* Color Preview & Values */}
              <div className="flex gap-3">
                <div 
                  className="h-10 w-16 rounded-lg border shadow-inner flex-shrink-0"
                  style={{ backgroundColor: colorPreview }}
                />
                <div className="flex-1 grid grid-cols-3 gap-1 text-xs">
                  <div className="text-center">
                    <div className="text-muted-foreground">H</div>
                    <div className="font-mono">{Math.round(hsl.h)}°</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">S</div>
                    <div className="font-mono">{Math.round(hsl.s)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">L</div>
                    <div className="font-mono">{Math.round(hsl.l)}%</div>
                  </div>
                </div>
              </div>

              {/* Manual Input */}
              <div className="pt-2 border-t">
                <Label className="text-xs text-muted-foreground">{t('adminBranding.colorPicker.hslValue')}</Label>
                <Input
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={t('adminBranding.colorPicker.hslPlaceholder')}
                  className="mt-1 font-mono text-xs h-8"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Input 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., 221 83% 53%"
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}
