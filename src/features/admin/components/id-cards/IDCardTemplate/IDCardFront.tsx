import React from "react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { CARD_TYPE_LABELS } from "@/types/id-card.types";
import type { FrontFieldKey } from "@/types/id-card.types";
import { FrontCardProps } from "./types";
import { formatBilingual, getBilingualCardTypeLabel } from "./utils";
import { PortraitFrontLayout } from "./layouts/PortraitFrontLayout";
import { LandscapeFrontLayout } from "./layouts/LandscapeFrontLayout";

export function IDCardFront({
  cardType,
  personData,
  tenantData,
  settings,
  language,
  width,
  height,
  scale,
  className,
  isPortrait,
}: FrontCardProps) {
  const isRTL = language === 'ar';
  const cardTypeLabel = CARD_TYPE_LABELS[cardType][language];
  const bilingualCardTypeLabel = getBilingualCardTypeLabel(cardType);
  const bilingualTenantName = formatBilingual(tenantData.name, tenantData.nameAr);
  
  const getFieldValue = (field: FrontFieldKey): string => {
    switch (field) {
      case 'full_name':
        return isRTL ? (personData.fullNameAr || personData.fullName) : personData.fullName;
      case 'full_name_ar':
        return personData.fullNameAr || '';
      case 'company':
        return isRTL ? (personData.companyAr || personData.company || '') : (personData.company || '');
      case 'department':
        return isRTL ? (personData.departmentAr || personData.department || '') : (personData.department || '');
      case 'role':
        return isRTL ? (personData.roleAr || personData.role || '') : (personData.role || '');
      case 'employee_id':
        return personData.employeeId || '';
      case 'national_id':
        return personData.nationalId ? `****${personData.nationalId.slice(-4)}` : '';
      case 'project':
        return isRTL ? (personData.projectAr || personData.project || '') : (personData.project || '');
      case 'valid_until':
        return personData.validUntil 
          ? format(new Date(personData.validUntil), 'dd/MM/yyyy', { locale: isRTL ? ar : enUS })
          : '';
      case 'entry_date':
        return personData.entryDate
          ? format(new Date(personData.entryDate), 'dd/MM/yyyy', { locale: isRTL ? ar : enUS })
          : '';
      case 'destination':
        return isRTL ? (personData.destinationAr || personData.destination || '') : (personData.destination || '');
      case 'host_name':
        return isRTL ? (personData.hostNameAr || personData.hostName || '') : (personData.hostName || '');
      case 'badge_number':
        return personData.badgeNumber || '';
      default:
        return '';
    }
  };

  if (isPortrait) {
    return (
      <PortraitFrontLayout
        cardType={cardType}
        cardTypeLabel={cardTypeLabel}
        bilingualCardTypeLabel={bilingualCardTypeLabel}
        bilingualTenantName={bilingualTenantName}
        personData={personData}
        tenantData={tenantData}
        settings={settings}
        language={language}
        width={width}
        height={height}
        scale={scale}
        className={className}
        isRTL={isRTL}
        getFieldValue={getFieldValue}
      />
    );
  }

  return (
    <LandscapeFrontLayout
      cardType={cardType}
      cardTypeLabel={cardTypeLabel}
      bilingualCardTypeLabel={bilingualCardTypeLabel}
      bilingualTenantName={bilingualTenantName}
      personData={personData}
      tenantData={tenantData}
      settings={settings}
      language={language}
      width={width}
      height={height}
      scale={scale}
      className={className}
      isRTL={isRTL}
      getFieldValue={getFieldValue}
    />
  );
}

