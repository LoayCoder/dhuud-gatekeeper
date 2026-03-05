const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/components/id-cards/IDCardTemplate.tsx');
let content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/components/id-cards/IDCardTemplate');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const layoutsDir = path.join(targetDir, 'layouts');
if (!fs.existsSync(layoutsDir)) fs.mkdirSync(layoutsDir, { recursive: true });

function extractBetween(str, startStr, endStr) {
    const startIdx = str.indexOf(startStr);
    if (startIdx === -1) return '';
    const restStr = str.substring(startIdx);
    const endIdx = restStr.indexOf(endStr);
    if (endIdx === -1) return restStr; // till end
    return restStr.substring(0, endIdx);
}

// 1. types.ts
const typesContent = `import type { 
  IDCardRenderOptions, 
  IDCardPersonData, 
  IDCardTenantData, 
  TenantIDCardSettings,
  FrontFieldKey,
  IDCardType 
} from "@/types/id-card.types";

export interface IDCardTemplateProps extends IDCardRenderOptions {
  className?: string;
  scale?: number;
}

export interface CardSideProps {
  personData: IDCardPersonData;
  tenantData: IDCardTenantData;
  settings: TenantIDCardSettings;
  language: 'en' | 'ar';
  width: number;
  height: number;
  scale: number;
  className?: string;
  isPortrait: boolean;
}

export interface FrontCardProps extends CardSideProps {
  cardType: IDCardType;
}

export interface LayoutProps {
  cardType: IDCardType;
  cardTypeLabel: string;
  bilingualCardTypeLabel: string;
  bilingualTenantName: string;
  personData: IDCardPersonData;
  tenantData: IDCardTenantData;
  settings: TenantIDCardSettings;
  language: 'en' | 'ar';
  width: number;
  height: number;
  scale: number;
  className?: string;
  isRTL: boolean;
  getFieldValue: (field: FrontFieldKey) => string;
}
`;
fs.writeFileSync(path.join(targetDir, 'types.ts'), typesContent);

// 2. utils.ts
const utilsContent = `import { IDCardType, CARD_TYPE_LABELS } from "@/types/id-card.types";

// CR-80 Card dimensions in mm (85.6mm x 54mm)
export const CARD_WIDTH_MM = 85.6;
export const CARD_HEIGHT_MM = 54;

// Convert to pixels at 96 DPI for screen (multiply by 3.78)
export const CARD_WIDTH_PX = Math.round(CARD_WIDTH_MM * 3.78);
export const CARD_HEIGHT_PX = Math.round(CARD_HEIGHT_MM * 3.78);

// Helper function to format bilingual text
export const formatBilingual = (en: string | undefined, ar: string | undefined, separator = ' | ') => {
  if (en && ar && en !== ar) {
    return \`\${en}\${separator}\${ar}\`;
  }
  return en || ar || '';
};

// Helper to get bilingual card type label
export const getBilingualCardTypeLabel = (cardType: IDCardType) => {
  const en = CARD_TYPE_LABELS[cardType]['en'];
  const ar = CARD_TYPE_LABELS[cardType]['ar'];
  if (en && ar && en !== ar) {
    return \`\${en} | \${ar}\`;
  }
  return en || ar;
};
`;
fs.writeFileSync(path.join(targetDir, 'utils.ts'), utilsContent);

// 3. layouts/PortraitFrontLayout.tsx
const portraitFrontImport = `import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { FIELD_LABELS } from "@/types/id-card.types";
import { LayoutProps } from "../types";

`;
const portraitFrontBody = extractBetween(content, 'function PortraitFrontLayout', 'function LandscapeFrontLayout');
fs.writeFileSync(path.join(layoutsDir, 'PortraitFrontLayout.tsx'), portraitFrontImport + "export " + portraitFrontBody);

// 4. layouts/LandscapeFrontLayout.tsx
const landscapeFrontImport = `import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { FIELD_LABELS } from "@/types/id-card.types";
import { LayoutProps } from "../types";

`;
const landscapeFrontBody = extractBetween(content, 'function LandscapeFrontLayout', 'function IDCardBack');
fs.writeFileSync(path.join(layoutsDir, 'LandscapeFrontLayout.tsx'), landscapeFrontImport + "export " + landscapeFrontBody);

// 5. IDCardFront.tsx
const idCardFrontImport = `import React from "react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { CARD_TYPE_LABELS } from "@/types/id-card.types";
import type { FrontFieldKey } from "@/types/id-card.types";
import { FrontCardProps } from "./types";
import { formatBilingual, getBilingualCardTypeLabel } from "./utils";
import { PortraitFrontLayout } from "./layouts/PortraitFrontLayout";
import { LandscapeFrontLayout } from "./layouts/LandscapeFrontLayout";

`;
const idCardFrontBody = extractBetween(content, 'function IDCardFront', 'interface LayoutProps');
fs.writeFileSync(path.join(targetDir, 'IDCardFront.tsx'), idCardFrontImport + "export " + idCardFrontBody);

// 6. IDCardBack.tsx
const idCardBackImport = `import React from "react";
import { format } from "date-fns";
import { FIELD_LABELS } from "@/types/id-card.types";
import type { BackFieldKey } from "@/types/id-card.types";
import { CardSideProps } from "./types";
import { formatBilingual } from "./utils";

`;
const idCardBackBody = extractBetween(content, 'function IDCardBack', 'export default IDCardTemplate');
fs.writeFileSync(path.join(targetDir, 'IDCardBack.tsx'), idCardBackImport + "export " + idCardBackBody);

// 7. IDCardTemplate.tsx (shell)
const shellContent = `import React from "react";
import { IDCardTemplateProps } from "./types";
import { CARD_WIDTH_PX, CARD_HEIGHT_PX } from "./utils";
import { IDCardFront } from "./IDCardFront";
import { IDCardBack } from "./IDCardBack";

export default function IDCardTemplate({
  cardType,
  personData,
  tenantData,
  settings,
  side,
  language,
  className = '',
  scale = 1,
}: IDCardTemplateProps) {
  const isPortrait = settings.card_orientation === 'portrait';
  
  // Portrait: swap width/height
  const width = isPortrait ? CARD_HEIGHT_PX : CARD_WIDTH_PX;
  const height = isPortrait ? CARD_WIDTH_PX : CARD_HEIGHT_PX;

  if (side === 'front') {
    return (
      <IDCardFront
        cardType={cardType}
        personData={personData}
        tenantData={tenantData}
        settings={settings}
        language={language}
        width={width}
        height={height}
        scale={scale}
        className={className}
        isPortrait={isPortrait}
      />
    );
  }

  return (
    <IDCardBack
      personData={personData}
      tenantData={tenantData}
      settings={settings}
      language={language}
      width={width}
      height={height}
      scale={scale}
      className={className}
      isPortrait={isPortrait}
    />
  );
}
`;
fs.writeFileSync(path.join(targetDir, 'IDCardTemplate.tsx'), shellContent);
fs.writeFileSync(path.join(targetDir, 'index.tsx'), "export { default } from './IDCardTemplate';\nexport * from './types';\n");

console.log('IDCardTemplate split successfully');
