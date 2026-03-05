import React from "react";
import { format } from "date-fns";
import { FIELD_LABELS } from "@/types/id-card.types";
import type { BackFieldKey } from "@/types/id-card.types";
import { CardSideProps } from "./types";
import { formatBilingual } from "./utils";

export function IDCardBack({
  personData,
  tenantData,
  settings,
  language,
  width,
  height,
  scale,
  className,
  isPortrait,
}: CardSideProps) {
  const isRTL = language === 'ar';

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
      case 'company_contact':
        return '';
      case 'office_location':
        return '';
      case 'custom_text':
        return isRTL ? (settings.back_custom_text_ar || '') : (settings.back_custom_text || '');
      default:
        return '';
    }
  };

  return (
    <div
      className={`id-card-back ${className}`}
      style={{
        width: width * scale,
        height: height * scale,
        backgroundColor: settings.back_bg_color,
        borderRadius: 8 * scale,
        overflow: 'hidden',
        fontFamily: "'IBM Plex Sans Arabic', 'Inter', sans-serif",
        direction: isRTL ? 'rtl' : 'ltr',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        padding: isPortrait ? `${12 * scale}px ${10 * scale}px` : 10 * scale,
      }}
    >
      {/* Back content fields */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: isPortrait ? 10 * scale : 6 * scale,
        }}
      >
        {settings.back_fields.map((field) => {
          const value = getBackFieldValue(field);
          if (!value) return null;

          return (
            <div
              key={field}
              style={{
                fontSize: isPortrait ? 8 * scale : 7 * scale,
                color: settings.front_text_color,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 3 * scale,
                  color: settings.front_accent_color,
                  fontSize: isPortrait ? 7 * scale : 6 * scale,
                }}
              >
                {FIELD_LABELS[field][language]}
              </div>
              <div style={{ opacity: 0.9, lineHeight: 1.4 }}>{value}</div>
            </div>
          );
        })}
      </div>

      {/* Footer with tenant info */}
      <div
        style={{
          borderTop: `1px solid ${settings.front_accent_color}30`,
          paddingTop: 6 * scale,
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 6 * scale,
          color: settings.front_text_color,
          opacity: 0.7,
        }}
      >
        <span>{formatBilingual(tenantData.name, tenantData.nameAr)}</span>
        <span>www.dhuud.com</span>
      </div>
    </div>
  );
}

