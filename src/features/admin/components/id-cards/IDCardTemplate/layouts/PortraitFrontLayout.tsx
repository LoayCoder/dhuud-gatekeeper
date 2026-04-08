import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { FIELD_LABELS } from "@/types/id-card.types";
import { LayoutProps } from "../types";
import { CARD_TYPE_COLORS } from "../utils";

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
  const photoSize = Math.round(width * 0.32);
  const qrSize = Math.round(width * 0.22);
  const accentColor = CARD_TYPE_COLORS[cardType] || settings.front_accent_color;

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
      {/* Header: Logo + Color Bar */}
      <div
        style={{
          backgroundColor: '#f5f5f5',
          padding: `${8 * scale}px ${10 * scale}px`,
          display: 'flex',
          alignItems: 'center',
          gap: 10 * scale,
          borderBottom: `2px solid #e0e0e0`,
        }}
      >
        {settings.show_logo && tenantData.logoUrl && (
          <img
            src={tenantData.logoUrl}
            alt="Logo"
            crossOrigin="anonymous"
            style={{
              height: 32 * scale,
              width: 'auto',
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />
        )}
        <div
          style={{
            flex: 1,
            height: 32 * scale,
            backgroundColor: accentColor,
            borderRadius: 4 * scale,
          }}
        />
      </div>

      {/* Photo Section - Centered */}
      {settings.show_photo && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: `${8 * scale}px 0 ${4 * scale}px`,
          }}
        >
          <div
            style={{
              width: photoSize * scale,
              height: photoSize * scale,
              borderRadius: 6 * scale,
              overflow: 'hidden',
              backgroundColor: '#f3f4f6',
              border: `3px solid ${accentColor}`,
            }}
          >
            {personData.photo ? (
              <img
                src={personData.photo}
                alt="Photo"
                crossOrigin="anonymous"
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
                  backgroundColor: accentColor,
                  color: '#FFFFFF',
                }}
              >
                <svg width={28 * scale} height={28 * scale} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Name - Arabic primary, English secondary */}
      <div
        style={{
          textAlign: 'center',
          padding: `0 ${10 * scale}px`,
        }}
      >
        {personData.fullNameAr && (
          <div
            style={{
              fontSize: 12 * scale,
              fontWeight: 700,
              color: settings.front_text_color,
              lineHeight: 1.3,
              direction: 'rtl',
            }}
          >
            {personData.fullNameAr}
          </div>
        )}
        <div
          style={{
            fontSize: 9 * scale,
            fontWeight: 600,
            color: settings.front_text_color,
            opacity: 0.7,
            marginTop: 2 * scale,
          }}
        >
          {personData.fullName}
        </div>
      </div>

      {/* Fields Section */}
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
                  fontSize: 8 * scale,
                  color: settings.front_text_color,
                  gap: 4 * scale,
                  borderBottom: `1px solid ${accentColor}15`,
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

      {/* QR Code Section */}
      {settings.show_qr_code && (
        <div
          style={{
            padding: `${6 * scale}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2 * scale,
            borderTop: `1px solid ${accentColor}20`,
            backgroundColor: `${accentColor}08`,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: 4 * scale,
              borderRadius: 4 * scale,
              border: `2px solid ${accentColor}`,
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
