import React from "react";
import { IDCardTemplateProps } from "./types";
import { CARD_WIDTH_PX, CARD_HEIGHT_PX } from "./utils";
import { IDCardFront } from "./IDCardFront";
import { IDCardBack } from "./IDCardBack";

export function IDCardTemplate({
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

