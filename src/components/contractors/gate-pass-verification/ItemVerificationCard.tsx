import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export interface GatePassItem {
  id: string;
  sr_number: string;
  item_name: string;
  description?: string | null;
  quantity: number;
  unit?: string | null;
  photos?: string[];
}

export interface ItemVerificationState {
  itemId: string;
  itemMatches: boolean;
  quantityVerified: boolean;
  actualQuantity?: number;
  discrepancyNotes?: string;
  verificationPhoto?: string;
}

interface ItemVerificationCardProps {
  item: GatePassItem;
  index: number;
  totalItems: number;
  verification?: ItemVerificationState;
  onVerificationChange: (state: ItemVerificationState) => void;
  onTakePhoto?: () => void;
  className?: string;
}

export function ItemVerificationCard({
  item,
  index,
  totalItems,
  verification,
  onVerificationChange,
  onTakePhoto,
  className,
}: ItemVerificationCardProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDiscrepancy, setShowDiscrepancy] = useState(false);

  const isVerified = verification?.itemMatches && verification?.quantityVerified;
  const hasDiscrepancy = verification?.discrepancyNotes && verification.discrepancyNotes.length > 0;

  const handleItemMatchChange = (checked: boolean) => {
    onVerificationChange({
      itemId: item.id,
      itemMatches: checked,
      quantityVerified: verification?.quantityVerified || false,
      actualQuantity: verification?.actualQuantity,
      discrepancyNotes: verification?.discrepancyNotes,
      verificationPhoto: verification?.verificationPhoto,
    });
  };

  const handleQuantityChange = (checked: boolean) => {
    onVerificationChange({
      itemId: item.id,
      itemMatches: verification?.itemMatches || false,
      quantityVerified: checked,
      actualQuantity: checked ? item.quantity : verification?.actualQuantity,
      discrepancyNotes: verification?.discrepancyNotes,
      verificationPhoto: verification?.verificationPhoto,
    });
  };

  const handleActualQuantityChange = (value: string) => {
    const qty = parseInt(value) || 0;
    onVerificationChange({
      itemId: item.id,
      itemMatches: verification?.itemMatches || false,
      quantityVerified: verification?.quantityVerified || false,
      actualQuantity: qty,
      discrepancyNotes: verification?.discrepancyNotes,
      verificationPhoto: verification?.verificationPhoto,
    });
  };

  const handleDiscrepancyNotesChange = (notes: string) => {
    onVerificationChange({
      itemId: item.id,
      itemMatches: verification?.itemMatches || false,
      quantityVerified: verification?.quantityVerified || false,
      actualQuantity: verification?.actualQuantity,
      discrepancyNotes: notes,
      verificationPhoto: verification?.verificationPhoto,
    });
  };

  return (
    <div className={cn(
      "border-2 rounded-xl overflow-hidden transition-all duration-300",
      isVerified ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" :
      hasDiscrepancy ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20" :
      "border-border bg-card",
      className
    )}>
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold flex-shrink-0",
          isVerified ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" :
          hasDiscrepancy ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400" :
          "bg-muted text-muted-foreground"
        )}>
          {isVerified ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-base leading-tight">{item.item_name}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                SR# {item.sr_number}
              </p>
            </div>
            <Badge variant="outline" className="flex-shrink-0">
              {item.quantity} {item.unit || 'pcs'}
            </Badge>
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {/* Request Photos Preview */}
      {item.photos && item.photos.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
            {t('contractors.gatePasses.requestPhotos', 'Request Photos')}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {item.photos.map((photo, idx) => (
              <img
                key={idx}
                src={photo}
                alt={`${item.item_name} - ${idx + 1}`}
                className="h-16 w-16 rounded-lg object-cover flex-shrink-0 border-2 border-border"
              />
            ))}
          </div>
        </div>
      )}

      {/* Verification Checks */}
      <div className="px-4 pb-4 space-y-3">
        {/* Item Matches Check */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 min-h-[48px]">
          <Checkbox 
            id={`item-match-${item.id}`}
            checked={verification?.itemMatches || false}
            onCheckedChange={(checked) => handleItemMatchChange(checked === true)}
            className="h-6 w-6"
          />
          <Label 
            htmlFor={`item-match-${item.id}`}
            className="flex-1 cursor-pointer select-none text-sm"
          >
            {t('contractors.gatePasses.itemMatchesRequest', 'Item matches request')}
          </Label>
        </div>

        {/* Quantity Check */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 min-h-[48px]">
          <Checkbox 
            id={`qty-check-${item.id}`}
            checked={verification?.quantityVerified || false}
            onCheckedChange={(checked) => handleQuantityChange(checked === true)}
            className="h-6 w-6"
          />
          <Label 
            htmlFor={`qty-check-${item.id}`}
            className="flex-1 cursor-pointer select-none text-sm"
          >
            {t('contractors.gatePasses.quantityVerified', 'Quantity verified')} ({item.quantity} {item.unit || 'pcs'})
          </Label>
        </div>

        {/* Actual Quantity Input (if different) */}
        {!verification?.quantityVerified && (
          <div className="flex items-center gap-3 ps-12">
            <span className="text-sm text-muted-foreground">
              {t('contractors.gatePasses.actualQty', 'Actual:')}
            </span>
            <Input
              type="number"
              value={verification?.actualQuantity || ''}
              onChange={(e) => handleActualQuantityChange(e.target.value)}
              placeholder={String(item.quantity)}
              className="w-24 h-10"
            />
          </div>
        )}
      </div>

      {/* Discrepancy Section */}
      <Collapsible open={showDiscrepancy} onOpenChange={setShowDiscrepancy}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between rounded-none border-t h-12 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t('contractors.gatePasses.reportDiscrepancy', 'Report Discrepancy')}
            </div>
            {showDiscrepancy ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 border-t bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
            <Textarea
              value={verification?.discrepancyNotes || ''}
              onChange={(e) => handleDiscrepancyNotesChange(e.target.value)}
              placeholder={t('contractors.gatePasses.discrepancyPlaceholder', 'Describe the discrepancy...')}
              className="min-h-[80px]"
            />
            {onTakePhoto && (
              <Button 
                variant="outline" 
                onClick={onTakePhoto}
                className="gap-2 h-12"
              >
                <Camera className="h-4 w-4" />
                {t('contractors.gatePasses.takePhoto', 'Take Photo')}
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
