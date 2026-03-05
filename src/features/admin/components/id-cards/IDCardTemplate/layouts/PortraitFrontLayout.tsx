import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { FIELD_LABELS } from "@/types/id-card.types";
import { LayoutProps } from "../types";

export function PortraitFrontLayout({
  cardType,
  cardTypeLabel,
  bilingualCardTypeLabel,
  bilingualTenantName,
  personData,
  tenantData,
  settings,
  language,
  width,
  height,
  scale,
  className,
  isRTL,
  getFieldValue,
}: LayoutProps) {
  const photoSize = Math.round(width * 0.45);
  const qrSize = Math.round(width * 0.35);

  return (
    <div
      className={`id-card-front ${className}`}
      style={{
        width: width * scale,
        height: height * scale,
        backgroundColor: settings.front_bg_color,
        borderRadius: 8 * scale,
        overflow: 'hidden',
        fontFamily: "'IBM Plex Sans Arabic', 'Inter', sans-serif",
        direction: isRTL ? 'rtl' : 'ltr',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Header with accent color */}
      <div
        style={{
          backgroundColor: settings.front_accent_color,
          padding: `${6 * scale}px ${8 * scale}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6 * scale,
        }}
      >
        {/* Logo */}
        {settings.show_logo && tenantData.logoUrl && (
          <img
            src={tenantData.logoUrl}
            alt="Logo"
            style={{
              height: 20 * scale,
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        )}
        
        {/* Tenant Name - Bilingual */}
        {settings.show_tenant_name && (
          <div
            style={{
              color: '#FFFFFF',
              fontSize: 7 * scale,
              fontWeight: 600,
              flex: 1,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {bilingualTenantName}
          </div>
        )}
        
        {/* Card Type Badge - Bilingual */}
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: '#FFFFFF',
            padding: `${2 * scale}px ${6 * scale}px`,
            borderRadius: 4 * scale,
            fontSize: 5 * scale,
            fontWeight: 600,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {bilingualCardTypeLabel}
        </div>
      </div>

      {/* Photo Section - Centered */}
      {settings.show_photo && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: `${10 * scale}px 0 ${6 * scale}px`,
          }}
        >
          <div
            style={{
              width: photoSize * scale,
              height: photoSize * scale,
              borderRadius: 6 * scale,
              overflow: 'hidden',
              backgroundColor: '#f3f4f6',
              border: `2px solid ${settings.front_accent_color}`,
            }}
          >
            {personData.photo ? (
              <img
                src={personData.photo}
                alt="Photo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: settings.front_accent_color,
                  color: '#FFFFFF',
                  fontSize: 32 * scale,
                  fontWeight: 700,
                }}
              >
                {personData.fullName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Name - Centered, Prominent, Bilingual */}
      <div
        style={{
          textAlign: 'center',
          padding: `0 ${10 * scale}px`,
        }}
      >
        {/* English Name (Primary) */}
        <div
          style={{
            fontSize: 11 * scale,
            fontWeight: 700,
            color: settings.front_text_color,
            lineHeight: 1.3,
          }}
        >
          {personData.fullName}
        </div>
        {/* Arabic Name (Always shown if available) */}
        {personData.fullNameAr && (
          <div
            style={{
              fontSize: 10 * scale,
              fontWeight: 600,
              color: settings.front_text_color,
              opacity: 0.85,
              marginTop: 2 * scale,
              direction: 'rtl',
            }}
          >
            {personData.fullNameAr}
          </div>
        )}
      </div>

      {/* Fields Section - Vertical Stack */}
      <div
        style={{
          flex: 1,
          padding: `${8 * scale}px ${12 * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 4 * scale,
        }}
      >
        {settings.front_fields
          .filter(f => f !== 'full_name' && f !== 'full_name_ar')
          .map((field) => {
            const value = getFieldValue(field);
            if (!value) return null;
            
            return (
              <div
                key={field}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 7 * scale,
                  color: settings.front_text_color,
                  gap: 4 * scale,
                  borderBottom: `1px solid ${settings.front_accent_color}15`,
                  paddingBottom: 3 * scale,
                }}
              >
                <span style={{ opacity: 0.7 }}>
                  {FIELD_LABELS[field][language]}
                </span>
                <span style={{ fontWeight: 600, textAlign: isRTL ? 'left' : 'right' }}>
                  {value}
                </span>
              </div>
            );
          })}
      </div>

      {/* QR Code Section - Bottom Center */}
      {settings.show_qr_code && (
        <div
          style={{
            padding: `${6 * scale}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2 * scale,
            borderTop: `1px solid ${settings.front_accent_color}20`,
            backgroundColor: `${settings.front_accent_color}08`,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: 4 * scale,
              borderRadius: 4 * scale,
              border: `1px solid ${settings.front_accent_color}`,
            }}
          >
            <QRCodeSVG
              value={personData.qrUrl || personData.qrToken}
              size={qrSize * scale}
              level="H"
            />
          </div>
          <div
            style={{
              fontSize: 5 * scale,
              color: settings.front_text_color,
              opacity: 0.6,
            }}
          >
            {isRTL ? 'امسح للتحقق' : 'Scan to verify'}
          </div>
        </div>
      )}
    </div>
  );
}

