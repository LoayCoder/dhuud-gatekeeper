import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import {
  BODY_PARTS,
  INJURY_TYPES,
  type BodyDiagramMarker,
  type BodyDiagramData,
  type BodyPartCode,
  type InjuryTypeCode,
} from '@/lib/body-parts-constants';

type ViewType = 'front' | 'back' | 'left' | 'right';

interface BodyDiagramCanvasProps {
  value: BodyDiagramData;
  onChange: (data: BodyDiagramData) => void;
  readOnly?: boolean;
}

const VIEW_LABELS: Record<ViewType, { en: string; ar: string }> = {
  front: { en: 'Front', ar: 'الأمام' },
  back: { en: 'Back', ar: 'الخلف' },
  left: { en: 'Left Side', ar: 'الجانب الأيسر' },
  right: { en: 'Right Side', ar: 'الجانب الأيمن' },
};

export function BodyDiagramCanvas({ value, onChange, readOnly = false }: BodyDiagramCanvasProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [activeView, setActiveView] = useState<ViewType>('front');
  const [editingMarker, setEditingMarker] = useState<string | null>(null);

  const currentMarkers = value[activeView] || [];

  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly) return;

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newMarker: BodyDiagramMarker = {
      id: crypto.randomUUID(),
      x,
      y,
    };

    onChange({
      ...value,
      [activeView]: [...currentMarkers, newMarker],
    });

    setEditingMarker(newMarker.id);
  }, [activeView, currentMarkers, onChange, readOnly, value]);

  const handleMarkerUpdate = useCallback((markerId: string, updates: Partial<BodyDiagramMarker>) => {
    onChange({
      ...value,
      [activeView]: currentMarkers.map(m =>
        m.id === markerId ? { ...m, ...updates } : m
      ),
    });
  }, [activeView, currentMarkers, onChange, value]);

  const handleMarkerDelete = useCallback((markerId: string) => {
    onChange({
      ...value,
      [activeView]: currentMarkers.filter(m => m.id !== markerId),
    });
    setEditingMarker(null);
  }, [activeView, currentMarkers, onChange, value]);

  const getTotalMarkers = () => {
    return (value.front?.length || 0) +
      (value.back?.length || 0) +
      (value.left?.length || 0) +
      (value.right?.length || 0);
  };

  return (
    <div className="space-y-4">
      {/* View selector tabs */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(VIEW_LABELS) as ViewType[]).map((view) => {
          const markerCount = value[view]?.length || 0;
          return (
            <Button
              key={view}
              type="button"
              variant={activeView === view ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView(view)}
              className="gap-2"
            >
              {isRTL ? VIEW_LABELS[view].ar : VIEW_LABELS[view].en}
              {markerCount > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                  {markerCount}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Total markers indicator */}
      {getTotalMarkers() > 0 && (
        <p className="text-sm text-muted-foreground">
          {t('investigation.injuries.totalMarkers', 'Total injury markers')}: {getTotalMarkers()}
        </p>
      )}

      {/* Canvas area */}
      <div className="relative border rounded-lg bg-muted/30 p-4">
        {!readOnly && (
          <p className="text-xs text-muted-foreground text-center mb-2">
            {t('investigation.injuries.clickToMark', 'Click on the body diagram to mark injury locations')}
          </p>
        )}

        <svg
          viewBox="0 0 100 150"
          className={cn(
            "w-full max-w-[300px] mx-auto aspect-[2/3]",
            !readOnly && "cursor-crosshair"
          )}
          onClick={handleCanvasClick}
        >
          {/* Body outline based on view */}
          <BodyOutline view={activeView} />

          {/* Markers */}
          {currentMarkers.map((marker, index) => (
            <Popover
              key={marker.id}
              open={editingMarker === marker.id}
              onOpenChange={(open) => setEditingMarker(open ? marker.id : null)}
            >
              <PopoverTrigger asChild>
                <g
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingMarker(marker.id);
                  }}
                >
                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    r={3}
                    className="fill-destructive stroke-destructive-foreground stroke-1"
                  />
                  <text
                    x={marker.x}
                    y={marker.y - 4}
                    textAnchor="middle"
                    className="fill-destructive text-[4px] font-bold"
                  >
                    {index + 1}
                  </text>
                </g>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="start">
                <MarkerEditor
                  marker={marker}
                  index={index}
                  onUpdate={(updates) => handleMarkerUpdate(marker.id, updates)}
                  onDelete={() => handleMarkerDelete(marker.id)}
                  readOnly={readOnly}
                />
              </PopoverContent>
            </Popover>
          ))}
        </svg>
      </div>

      {/* Markers list */}
      {currentMarkers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            {isRTL ? VIEW_LABELS[activeView].ar : VIEW_LABELS[activeView].en} - {t('investigation.injuries.markers', 'Markers')}
          </h4>
          <div className="grid gap-2">
            {currentMarkers.map((marker, index) => (
              <div
                key={marker.id}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm"
              >
                <Badge variant="destructive" className="h-5 w-5 p-0 justify-center">
                  {index + 1}
                </Badge>
                <span className="flex-1">
                  {marker.bodyPart
                    ? (isRTL ? BODY_PARTS[marker.bodyPart].ar : BODY_PARTS[marker.bodyPart].en)
                    : t('investigation.injuries.unmarked', 'Not specified')}
                  {marker.injuryType && (
                    <span className="text-muted-foreground">
                      {' - '}
                      {isRTL ? INJURY_TYPES[marker.injuryType].ar : INJURY_TYPES[marker.injuryType].en}
                    </span>
                  )}
                </span>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMarkerDelete(marker.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Body outline SVG component
function BodyOutline({ view }: { view: ViewType }) {
  // Simplified human body outline
  const commonStyles = "fill-none stroke-muted-foreground/50 stroke-[0.5]";

  if (view === 'front' || view === 'back') {
    return (
      <g className={commonStyles}>
        {/* Head */}
        <ellipse cx="50" cy="12" rx="8" ry="10" />
        {/* Neck */}
        <line x1="50" y1="22" x2="50" y2="28" />
        {/* Torso */}
        <path d="M 35 28 L 35 75 L 65 75 L 65 28 Z" />
        {/* Arms */}
        <path d="M 35 30 L 20 55 L 15 75" />
        <path d="M 65 30 L 80 55 L 85 75" />
        {/* Legs */}
        <path d="M 40 75 L 38 120 L 35 145" />
        <path d="M 60 75 L 62 120 L 65 145" />
        {/* Shoulders */}
        <line x1="35" y1="28" x2="65" y2="28" />
      </g>
    );
  }

  // Side view (left or right - mirrored)
  const isLeft = view === 'left';
  return (
    <g className={commonStyles} transform={isLeft ? '' : 'translate(100,0) scale(-1,1)'}>
      {/* Head */}
      <ellipse cx="50" cy="12" rx="6" ry="10" />
      {/* Neck */}
      <line x1="50" y1="22" x2="50" y2="28" />
      {/* Torso */}
      <path d="M 42 28 L 42 75 L 58 75 L 58 28 Z" />
      {/* Arm */}
      <path d="M 42 32 L 30 55 L 28 75" />
      {/* Leg */}
      <path d="M 48 75 L 46 120 L 45 145" />
    </g>
  );
}

// Marker editor component
interface MarkerEditorProps {
  marker: BodyDiagramMarker;
  index: number;
  onUpdate: (updates: Partial<BodyDiagramMarker>) => void;
  onDelete: () => void;
  readOnly?: boolean;
}

function MarkerEditor({ marker, index, onUpdate, onDelete, readOnly }: MarkerEditorProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  if (readOnly) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="destructive">{index + 1}</Badge>
          <span className="font-medium">
            {marker.bodyPart
              ? (isRTL ? BODY_PARTS[marker.bodyPart].ar : BODY_PARTS[marker.bodyPart].en)
              : t('investigation.injuries.unmarked', 'Not specified')}
          </span>
        </div>
        {marker.injuryType && (
          <p className="text-sm">
            <span className="text-muted-foreground">{t('investigation.injuries.fields.injuryType', 'Injury Type')}:</span>{' '}
            {isRTL ? INJURY_TYPES[marker.injuryType].ar : INJURY_TYPES[marker.injuryType].en}
          </p>
        )}
        {marker.notes && (
          <p className="text-sm">
            <span className="text-muted-foreground">{t('common.notes', 'Notes')}:</span>{' '}
            {marker.notes}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="destructive">{index + 1}</Badge>
          <span className="text-sm font-medium">{t('investigation.injuries.editMarker', 'Edit Marker')}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={onDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label>{t('investigation.injuries.fields.bodyPart', 'Body Part')}</Label>
        <Select
          value={marker.bodyPart || ''}
          onValueChange={(val) => onUpdate({ bodyPart: val as BodyPartCode })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('common.select', 'Select...')} />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(BODY_PARTS).map(([code, labels]) => (
              <SelectItem key={code} value={code}>
                {isRTL ? labels.ar : labels.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('investigation.injuries.fields.injuryType', 'Injury Type')}</Label>
        <Select
          value={marker.injuryType || ''}
          onValueChange={(val) => onUpdate({ injuryType: val as InjuryTypeCode })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('common.select', 'Select...')} />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(INJURY_TYPES).map(([code, labels]) => (
              <SelectItem key={code} value={code}>
                {isRTL ? labels.ar : labels.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('common.notes', 'Notes')}</Label>
        <Textarea
          value={marker.notes || ''}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder={t('investigation.injuries.markerNotesPlaceholder', 'Add notes about this injury location...')}
          rows={2}
        />
      </div>
    </div>
  );
}
