import { useState, useEffect } from 'react';
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

export function HslColorPicker({ value, onChange, label }: HslColorPickerProps) {
  const [hsl, setHsl] = useState(() => parseHsl(value));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value) {
      setHsl(parseHsl(value));
    }
  }, [value]);

  const handleChange = (key: 'h' | 's' | 'l', newValue: number) => {
    const updated = { ...hsl, [key]: newValue };
    setHsl(updated);
    onChange(formatHsl(updated.h, updated.s, updated.l));
  };

  const colorPreview = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-3 items-center">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-12 w-12 p-0 border-2 rounded-lg shadow-sm"
              style={{ backgroundColor: colorPreview }}
            >
              <span className="sr-only">Pick color</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="start">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Pipette className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">HSL Color Picker</span>
              </div>

              {/* Color Preview */}
              <div 
                className="h-16 rounded-lg border shadow-inner"
                style={{ backgroundColor: colorPreview }}
              />

              {/* Hue Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Hue</span>
                  <span className="font-mono">{Math.round(hsl.h)}°</span>
                </div>
                <div 
                  className="h-3 rounded-full"
                  style={{
                    background: 'linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))'
                  }}
                >
                  <Slider
                    value={[hsl.h]}
                    max={360}
                    step={1}
                    onValueChange={([v]) => handleChange('h', v)}
                    className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:shadow-md [&>.bg-primary]:bg-transparent"
                  />
                </div>
              </div>

              {/* Saturation Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Saturation</span>
                  <span className="font-mono">{Math.round(hsl.s)}%</span>
                </div>
                <div 
                  className="h-3 rounded-full"
                  style={{
                    background: `linear-gradient(to right, hsl(${hsl.h}, 0%, ${hsl.l}%), hsl(${hsl.h}, 100%, ${hsl.l}%))`
                  }}
                >
                  <Slider
                    value={[hsl.s]}
                    max={100}
                    step={1}
                    onValueChange={([v]) => handleChange('s', v)}
                    className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:shadow-md [&>.bg-primary]:bg-transparent"
                  />
                </div>
              </div>

              {/* Lightness Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Lightness</span>
                  <span className="font-mono">{Math.round(hsl.l)}%</span>
                </div>
                <div 
                  className="h-3 rounded-full"
                  style={{
                    background: `linear-gradient(to right, hsl(${hsl.h}, ${hsl.s}%, 0%), hsl(${hsl.h}, ${hsl.s}%, 50%), hsl(${hsl.h}, ${hsl.s}%, 100%))`
                  }}
                >
                  <Slider
                    value={[hsl.l]}
                    max={100}
                    step={1}
                    onValueChange={([v]) => handleChange('l', v)}
                    className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:shadow-md [&>.bg-primary]:bg-transparent"
                  />
                </div>
              </div>

              {/* Manual Input */}
              <div className="pt-2 border-t">
                <Label className="text-xs text-muted-foreground">HSL Value</Label>
                <Input
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="H S% L%"
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
