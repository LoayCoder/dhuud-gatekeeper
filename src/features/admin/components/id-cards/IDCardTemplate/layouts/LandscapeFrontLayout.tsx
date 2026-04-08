import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { FIELD_LABELS } from "@/types/id-card.types";
import { LayoutProps } from "../types";
import { CARD_TYPE_COLORS } from "../utils";

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
  const qrSize = Math.round(height * 0.45);
  const photoSize = Math.round(height * 0.35);
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

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          padding: `${10 * scale}px ${12 * scale}px`,
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
        )}

        {/* Fields Section */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 4 * scale,
            minWidth: 0,
          }}
        >
          {/* Name - Arabic primary, English secondary */}
          {personData.fullNameAr && (
            <div
              style={{
                fontSize: 13 * scale,
                fontWeight: 700,
                color: settings.front_text_color,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                direction: 'rtl',
              }}
            >
              {personData.fullNameAr}
            </div>
          )}
          <div
            style={{
              fontSize: 10 * scale,
              fontWeight: 600,
              color: settings.front_text_color,
              opacity: 0.7,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: 1 * scale,
            }}
          >
            {personData.fullName}
          </div>
          
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
                    fontSize: 8 * scale,
                    color: settings.front_text_color,
                    gap: 4 * scale,
                  }}
                >
                  <span style={{ opacity: 0.7 }}>
                    {FIELD_LABELS[field][language]}:
                  </span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
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

      {/* Bottom QR (if position is bottom) */}
      {settings.show_qr_code && settings.qr_position === 'bottom' && (
        <div
          style={{
            padding: `${4 * scale}px`,
            display: 'flex',
            justifyContent: 'center',
            borderTop: `1px solid ${accentColor}20`,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: 3 * scale,
              borderRadius: 4 * scale,
              border: `2px solid ${accentColor}`,
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
