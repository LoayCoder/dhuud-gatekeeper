import type { 
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
