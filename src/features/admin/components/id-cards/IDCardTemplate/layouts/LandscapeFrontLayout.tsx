import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { FIELD_LABELS } from "@/types/id-card.types";
import { LayoutProps } from "../types";

export function LandscapeFrontLayout({
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
  const qrSize = Math.round(height * 0.55);
  const photoSize = Math.round(height * 0.45);

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
          padding: `${6 * scale}px ${10 * scale}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8 * scale,
        }}
      >
        {/* Logo */}
        {settings.show_logo && tenantData.logoUrl && (
          <img
            src={tenantData.logoUrl}
            alt="Logo"
            style={{
              height: 24 * scale,
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
              fontSize: 9 * scale,
              fontWeight: 600,
              flex: 1,
              textAlign: isRTL ? 'right' : 'left',
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
            padding: `${2 * scale}px ${8 * scale}px`,
            borderRadius: 4 * scale,
            fontSize: 6 * scale,
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          {bilingualCardTypeLabel}
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          padding: `${8 * scale}px ${10 * scale}px`,
          display: 'flex',
          gap: 10 * scale,
        }}
      >
        {/* Photo Section */}
        {settings.show_photo && (
          <div
            style={{
              width: photoSize * scale,
              height: photoSize * scale,
              borderRadius: 4 * scale,
              overflow: 'hidden',
              flexShrink: 0,
              backgroundColor: '#f3f4f6',
              border: `1px solid ${settings.front_accent_color}`,
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
                  fontSize: 24 * scale,
                  fontWeight: 700,
                }}
              >
                {personData.fullName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Fields Section */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 3 * scale,
            minWidth: 0,
          }}
        >
          {/* Name - Bilingual (always show both) */}
          <div
            style={{
              fontSize: 10 * scale,
              fontWeight: 700,
              color: settings.front_text_color,
              lineHeight: 1.2,
            }}
          >
            {personData.fullName}
          </div>
          {personData.fullNameAr && (
            <div
              style={{
                fontSize: 9 * scale,
                fontWeight: 600,
                color: settings.front_text_color,
                opacity: 0.85,
                direction: 'rtl',
                marginTop: 1 * scale,
              }}
            >
              {personData.fullNameAr}
            </div>
          )}
          
          {/* Other fields */}
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
                    fontSize: 7 * scale,
                    color: settings.front_text_color,
                    gap: 4 * scale,
                  }}
                >
                  <span style={{ opacity: 0.7 }}>
                    {FIELD_LABELS[field][language]}:
                  </span>
                  <span style={{ fontWeight: 500 }}>{value}</span>
                </div>
              );
            })}
        </div>

        {/* QR Code Section */}
        {settings.show_qr_code && settings.qr_position === 'right' && (
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2 * scale,
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

      {/* Bottom QR (if position is bottom) */}
      {settings.show_qr_code && settings.qr_position === 'bottom' && (
        <div
          style={{
            padding: `${4 * scale}px`,
            display: 'flex',
            justifyContent: 'center',
            borderTop: `1px solid ${settings.front_accent_color}20`,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: 3 * scale,
              borderRadius: 4 * scale,
            }}
          >
            <QRCodeSVG
              value={personData.qrUrl || personData.qrToken}
              size={qrSize * 0.6 * scale}
              level="H"
            />
          </div>
        </div>
      )}
    </div>
  );
}

