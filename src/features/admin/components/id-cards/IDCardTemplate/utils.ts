import { IDCardType, CARD_TYPE_LABELS } from "@/types/id-card.types";

// CR-80 Card dimensions in mm (85.6mm x 54mm)
export const CARD_WIDTH_MM = 85.6;
export const CARD_HEIGHT_MM = 54;

// Convert to pixels at 96 DPI for screen (multiply by 3.78)
export const CARD_WIDTH_PX = Math.round(CARD_WIDTH_MM * 3.78);
export const CARD_HEIGHT_PX = Math.round(CARD_HEIGHT_MM * 3.78);

// Helper function to format bilingual text
export const formatBilingual = (en: string | undefined, ar: string | undefined, separator = ' | ') => {
  if (en && ar && en !== ar) {
    return `${en}${separator}${ar}`;
  }
  return en || ar || '';
};

// Helper to get bilingual card type label
export const getBilingualCardTypeLabel = (cardType: IDCardType) => {
  const en = CARD_TYPE_LABELS[cardType]['en'];
  const ar = CARD_TYPE_LABELS[cardType]['ar'];
  if (en && ar && en !== ar) {
    return `${en} | ${ar}`;
  }
  return en || ar;
};
