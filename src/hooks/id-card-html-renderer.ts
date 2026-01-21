/**
 * HTML Renderer for ID Cards
 * Generates HTML string for card rendering (used by html2canvas)
 */

import type { 
  IDCardRenderOptions, 
  FrontFieldKey,
  BackFieldKey 
} from "@/types/id-card.types";
import { FIELD_LABELS, CARD_TYPE_LABELS } from "@/types/id-card.types";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

// CR-80 Card dimensions in pixels at 96 DPI
const CARD_WIDTH_PX = 323;
const CARD_HEIGHT_PX = 204;

export function renderIDCardToHTML(options: IDCardRenderOptions): string {
  const { side } = options;
  
  if (side === 'front') {
    return renderFrontSide(options);
  }
  return renderBackSide(options);
}

function renderFrontSide(options: IDCardRenderOptions): string {
  const { cardType, personData, tenantData, settings, language } = options;
  const isRTL = language === 'ar';
  const isLandscape = settings.card_orientation === 'landscape';
  
  const width = isLandscape ? CARD_WIDTH_PX : CARD_HEIGHT_PX;
  const height = isLandscape ? CARD_HEIGHT_PX : CARD_WIDTH_PX;
  const cardTypeLabel = CARD_TYPE_LABELS[cardType][language];
  
  const qrSize = Math.round(height * 0.55);
  const photoSize = Math.round(height * 0.45);

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

  const fieldsHTML = (settings.front_fields as FrontFieldKey[])
    .filter(f => f !== 'full_name' && f !== 'full_name_ar')
    .map(field => {
      const value = getFieldValue(field);
      if (!value) return '';
      return `
        <div style="display: flex; font-size: 7px; color: ${settings.front_text_color}; gap: 4px; margin-bottom: 2px;">
          <span style="opacity: 0.7;">${FIELD_LABELS[field][language]}:</span>
          <span style="font-weight: 500;">${value}</span>
        </div>
      `;
    })
    .join('');

  const photoHTML = settings.show_photo ? `
    <div style="width: ${photoSize}px; height: ${photoSize}px; border-radius: 4px; overflow: hidden; flex-shrink: 0; background-color: #f3f4f6; border: 1px solid ${settings.front_accent_color};">
      ${personData.photo 
        ? `<img src="${personData.photo}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />`
        : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: ${settings.front_accent_color}; color: #FFFFFF; font-size: 24px; font-weight: 700;">${personData.fullName.charAt(0).toUpperCase()}</div>`
      }
    </div>
  ` : '';

  const qrHTML = settings.show_qr_code && settings.qr_position === 'right' ? `
    <div style="flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 2px;">
      <div style="background-color: #FFFFFF; padding: 4px; border-radius: 4px; border: 1px solid ${settings.front_accent_color};">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(personData.qrUrl || personData.qrToken)}" width="${qrSize}" height="${qrSize}" />
      </div>
      <div style="font-size: 5px; color: ${settings.front_text_color}; opacity: 0.6;">
        ${isRTL ? 'امسح للتحقق' : 'Scan to verify'}
      </div>
    </div>
  ` : '';

  const logoHTML = settings.show_logo && tenantData.logoUrl ? `
    <img src="${tenantData.logoUrl}" style="height: 24px; width: auto; object-fit: contain;" crossorigin="anonymous" />
  ` : '';

  return `
    <div style="
      width: ${width}px;
      height: ${height}px;
      background-color: ${settings.front_bg_color};
      border-radius: 8px;
      overflow: hidden;
      font-family: 'IBM Plex Sans Arabic', 'Inter', sans-serif;
      direction: ${isRTL ? 'rtl' : 'ltr'};
      display: flex;
      flex-direction: column;
      position: relative;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    ">
      <!-- Header -->
      <div style="
        background-color: ${settings.front_accent_color};
        padding: 6px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      ">
        ${logoHTML}
        ${settings.show_tenant_name ? `
          <div style="color: #FFFFFF; font-size: 10px; font-weight: 600; flex: 1; text-align: ${isRTL ? 'right' : 'left'};">
            ${isRTL ? (tenantData.nameAr || tenantData.name) : tenantData.name}
          </div>
        ` : ''}
        <div style="
          background-color: rgba(255,255,255,0.2);
          color: #FFFFFF;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 8px;
          font-weight: 600;
          text-transform: uppercase;
        ">${cardTypeLabel}</div>
      </div>

      <!-- Main Content -->
      <div style="flex: 1; padding: 8px 10px; display: flex; gap: 10px;">
        ${photoHTML}
        
        <div style="flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0;">
          <div style="font-size: 11px; font-weight: 700; color: ${settings.front_text_color}; line-height: 1.2;">
            ${isRTL ? (personData.fullNameAr || personData.fullName) : personData.fullName}
          </div>
          ${fieldsHTML}
        </div>

        ${qrHTML}
      </div>
    </div>
  `;
}

function renderBackSide(options: IDCardRenderOptions): string {
  const { personData, tenantData, settings, language } = options;
  const isRTL = language === 'ar';
  const isLandscape = settings.card_orientation === 'landscape';
  
  const width = isLandscape ? CARD_WIDTH_PX : CARD_HEIGHT_PX;
  const height = isLandscape ? CARD_HEIGHT_PX : CARD_WIDTH_PX;

  const getBackFieldValue = (field: BackFieldKey): string => {
    switch (field) {
      case 'emergency_contact':
        return personData.emergencyContact || (isRTL ? 'اتصل بالأمن: 911' : 'Contact Security: 911');
      case 'safety_instructions':
        return personData.safetyInstructions || (isRTL 
          ? 'اتبع جميع إجراءات السلامة. استخدم معدات الحماية الشخصية.'
          : 'Follow all safety procedures. Wear required PPE.');
      case 'induction_status':
        return personData.inductionCompleted 
          ? (isRTL ? '✓ تم إكمال التعريف' : '✓ Induction Completed')
          : (isRTL ? '⚠ التعريف مطلوب' : '⚠ Induction Required');
      case 'contract_validity':
        return personData.validUntil 
          ? `${isRTL ? 'صالح حتى' : 'Valid until'}: ${format(new Date(personData.validUntil), 'dd/MM/yyyy')}`
          : '';
      case 'custom_text':
        return isRTL ? (settings.back_custom_text_ar || '') : (settings.back_custom_text || '');
      default:
        return '';
    }
  };

  const fieldsHTML = (settings.back_fields as BackFieldKey[])
    .map(field => {
      const value = getBackFieldValue(field);
      if (!value) return '';
      return `
        <div style="font-size: 7px; color: ${settings.front_text_color}; margin-bottom: 6px;">
          <div style="font-weight: 600; margin-bottom: 2px; color: ${settings.front_accent_color};">
            ${FIELD_LABELS[field][language]}
          </div>
          <div style="opacity: 0.9; line-height: 1.3;">${value}</div>
        </div>
      `;
    })
    .join('');

  return `
    <div style="
      width: ${width}px;
      height: ${height}px;
      background-color: ${settings.back_bg_color};
      border-radius: 8px;
      overflow: hidden;
      font-family: 'IBM Plex Sans Arabic', 'Inter', sans-serif;
      direction: ${isRTL ? 'rtl' : 'ltr'};
      display: flex;
      flex-direction: column;
      position: relative;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      padding: 10px;
    ">
      <div style="flex: 1; display: flex; flex-direction: column;">
        ${fieldsHTML}
      </div>

      <div style="
        border-top: 1px solid ${settings.front_accent_color}30;
        padding-top: 6px;
        margin-top: auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 6px;
        color: ${settings.front_text_color};
        opacity: 0.7;
      ">
        <span>${isRTL ? tenantData.nameAr || tenantData.name : tenantData.name}</span>
        <span>www.dhuud.com</span>
      </div>
    </div>
  `;
}
