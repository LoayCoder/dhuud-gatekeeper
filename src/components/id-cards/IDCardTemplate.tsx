import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import type { 
  IDCardRenderOptions, 
  IDCardPersonData, 
  IDCardTenantData, 
  TenantIDCardSettings,
  FrontFieldKey,
  BackFieldKey,
  IDCardType 
} from "@/types/id-card.types";
import { FIELD_LABELS, CARD_TYPE_LABELS } from "@/types/id-card.types";

interface IDCardTemplateProps extends IDCardRenderOptions {
  className?: string;
  scale?: number;
}

// CR-80 Card dimensions in mm (85.6mm x 54mm)
const CARD_WIDTH_MM = 85.6;
const CARD_HEIGHT_MM = 54;

// Convert to pixels at 96 DPI for screen (multiply by 3.78)
const CARD_WIDTH_PX = Math.round(CARD_WIDTH_MM * 3.78);
const CARD_HEIGHT_PX = Math.round(CARD_HEIGHT_MM * 3.78);

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

interface CardSideProps {
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

interface FrontCardProps extends CardSideProps {
  cardType: IDCardType;
}

function IDCardFront({
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

interface LayoutProps {
  cardType: IDCardType;
  cardTypeLabel: string;
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

function PortraitFrontLayout({
  cardType,
  cardTypeLabel,
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
        
        {/* Tenant Name */}
        {settings.show_tenant_name && (
          <div
            style={{
              color: '#FFFFFF',
              fontSize: 8 * scale,
              fontWeight: 600,
              flex: 1,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {isRTL ? (tenantData.nameAr || tenantData.name) : tenantData.name}
          </div>
        )}
        
        {/* Card Type Badge */}
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: '#FFFFFF',
            padding: `${2 * scale}px ${6 * scale}px`,
            borderRadius: 4 * scale,
            fontSize: 6 * scale,
            fontWeight: 600,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {cardTypeLabel}
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

      {/* Name - Centered, Prominent */}
      <div
        style={{
          textAlign: 'center',
          padding: `0 ${10 * scale}px`,
        }}
      >
        <div
          style={{
            fontSize: 12 * scale,
            fontWeight: 700,
            color: settings.front_text_color,
            lineHeight: 1.3,
          }}
        >
          {isRTL ? (personData.fullNameAr || personData.fullName) : personData.fullName}
        </div>
        {/* Show secondary name if bilingual */}
        {!isRTL && personData.fullNameAr && (
          <div
            style={{
              fontSize: 10 * scale,
              fontWeight: 500,
              color: settings.front_text_color,
              opacity: 0.8,
              marginTop: 2 * scale,
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

function LandscapeFrontLayout({
  cardType,
  cardTypeLabel,
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
        
        {/* Tenant Name */}
        {settings.show_tenant_name && (
          <div
            style={{
              color: '#FFFFFF',
              fontSize: 10 * scale,
              fontWeight: 600,
              flex: 1,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {isRTL ? (tenantData.nameAr || tenantData.name) : tenantData.name}
          </div>
        )}
        
        {/* Card Type Badge */}
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: '#FFFFFF',
            padding: `${2 * scale}px ${8 * scale}px`,
            borderRadius: 4 * scale,
            fontSize: 8 * scale,
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          {cardTypeLabel}
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
          {/* Name - always prominent */}
          <div
            style={{
              fontSize: 11 * scale,
              fontWeight: 700,
              color: settings.front_text_color,
              lineHeight: 1.2,
            }}
          >
            {isRTL ? (personData.fullNameAr || personData.fullName) : personData.fullName}
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

function IDCardBack({
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
        <span>{isRTL ? tenantData.nameAr || tenantData.name : tenantData.name}</span>
        <span>{isRTL ? 'www.dhuud.com' : 'www.dhuud.com'}</span>
      </div>
    </div>
  );
}

export default IDCardTemplate;
