import { format } from 'date-fns';
import { 
  generateBrandedPDFFromElement, 
  preloadImageWithDimensions,
  createPDFRenderContainer,
  removePDFRenderContainer,
  type PDFBrandingOptions 
} from './pdf-utils';
import type { AssetWithRelations } from '@/hooks/use-assets';

export interface AssetReportOptions {
  asset: AssetWithRelations;
  photos?: Array<{ storage_path: string; file_name: string; is_primary: boolean }>;
  maintenanceHistory?: Array<{
    id: string;
    maintenance_type: string;
    performed_date: string;
    notes?: string;
    cost?: number;
  }>;
  branding: {
    logoUrl?: string | null;
    tenantName?: string;
    headerText?: string;
    footerText?: string;
    watermarkText?: string | null;
    watermarkEnabled?: boolean;
  };
  isRTL?: boolean;
  includePhotos?: boolean;
  includeHistory?: boolean;
  includeFinancials?: boolean;
}

function formatCurrency(value: number | null | undefined, currency = 'SAR'): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency,
  }).format(value);
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: '#22c55e',
    inactive: '#6b7280',
    under_maintenance: '#eab308',
    out_of_service: '#ef4444',
    disposed: '#9ca3af',
  };
  return colors[status] || '#6b7280';
}

function getConditionColor(condition: string): string {
  const colors: Record<string, string> = {
    excellent: '#22c55e',
    good: '#3b82f6',
    fair: '#eab308',
    poor: '#f97316',
    critical: '#ef4444',
  };
  return colors[condition] || '#6b7280';
}

export async function generateAssetReportPDF(options: AssetReportOptions): Promise<void> {
  const {
    asset,
    photos = [],
    maintenanceHistory = [],
    branding,
    isRTL = false,
    includePhotos = true,
    includeHistory = true,
    includeFinancials = true,
  } = options;

  const container = createPDFRenderContainer();
  container.style.direction = isRTL ? 'rtl' : 'ltr';

  // Preload logo
  const logoData = branding.logoUrl ? await preloadImageWithDimensions(branding.logoUrl) : null;

  // Build HTML content
  container.innerHTML = `
    <div style="font-family: 'Rubik', Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <!-- Asset Header -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <h1 style="font-size: 24px; font-weight: 700; margin: 0;">${asset.name}</h1>
          <span style="
            background: ${getStatusColor(asset.status || 'active')}20;
            color: ${getStatusColor(asset.status || 'active')};
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 500;
          ">
            ${asset.status?.replace('_', ' ').toUpperCase() || 'ACTIVE'}
          </span>
        </div>
        <p style="font-family: monospace; color: #6b7280; margin: 0;">${asset.asset_code}</p>
      </div>

      <!-- Basic Info Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
          <h3 style="font-size: 14px; color: #6b7280; margin: 0 0 12px 0;">Classification</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Category:</td>
              <td style="padding: 4px 0; font-weight: 500; text-align: end;">
                ${isRTL && asset.category?.name_ar ? asset.category.name_ar : asset.category?.name || '-'}
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Type:</td>
              <td style="padding: 4px 0; font-weight: 500; text-align: end;">
                ${isRTL && asset.type?.name_ar ? asset.type.name_ar : asset.type?.name || '-'}
              </td>
            </tr>
            ${asset.subtype ? `
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Subtype:</td>
              <td style="padding: 4px 0; font-weight: 500; text-align: end;">
                ${isRTL && asset.subtype?.name_ar ? asset.subtype.name_ar : asset.subtype?.name || '-'}
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Condition:</td>
              <td style="padding: 4px 0; font-weight: 500; text-align: end;">
                <span style="color: ${getConditionColor(asset.condition_rating || 'good')};">
                  ${asset.condition_rating?.toUpperCase() || '-'}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
          <h3 style="font-size: 14px; color: #6b7280; margin: 0 0 12px 0;">Location</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Branch:</td>
              <td style="padding: 4px 0; font-weight: 500; text-align: end;">${asset.branch?.name || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Site:</td>
              <td style="padding: 4px 0; font-weight: 500; text-align: end;">${asset.site?.name || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Building:</td>
              <td style="padding: 4px 0; font-weight: 500; text-align: end;">
                ${isRTL && asset.building?.name_ar ? asset.building.name_ar : asset.building?.name || '-'}
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Floor/Zone:</td>
              <td style="padding: 4px 0; font-weight: 500; text-align: end;">
                ${isRTL && asset.floor_zone?.name_ar ? asset.floor_zone.name_ar : asset.floor_zone?.name || '-'}
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Identification -->
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <h3 style="font-size: 14px; color: #6b7280; margin: 0 0 12px 0;">Identification & Specifications</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
          <div>
            <p style="color: #6b7280; margin: 0; font-size: 12px;">Serial Number</p>
            <p style="font-weight: 500; margin: 4px 0 0 0; font-family: monospace;">${asset.serial_number || '-'}</p>
          </div>
          <div>
            <p style="color: #6b7280; margin: 0; font-size: 12px;">Manufacturer</p>
            <p style="font-weight: 500; margin: 4px 0 0 0;">${asset.manufacturer || '-'}</p>
          </div>
          <div>
            <p style="color: #6b7280; margin: 0; font-size: 12px;">Model</p>
            <p style="font-weight: 500; margin: 4px 0 0 0;">${asset.model || '-'}</p>
          </div>
        </div>
      </div>

      <!-- Dates -->
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <h3 style="font-size: 14px; color: #6b7280; margin: 0 0 12px 0;">Important Dates</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px;">
          <div>
            <p style="color: #6b7280; margin: 0; font-size: 12px;">Purchase Date</p>
            <p style="font-weight: 500; margin: 4px 0 0 0;">
              ${asset.purchase_date ? format(new Date(asset.purchase_date), 'MMM d, yyyy') : '-'}
            </p>
          </div>
          <div>
            <p style="color: #6b7280; margin: 0; font-size: 12px;">Commissioning Date</p>
            <p style="font-weight: 500; margin: 4px 0 0 0;">
              ${asset.commissioning_date ? format(new Date(asset.commissioning_date), 'MMM d, yyyy') : '-'}
            </p>
          </div>
          <div>
            <p style="color: #6b7280; margin: 0; font-size: 12px;">Warranty Expiry</p>
            <p style="font-weight: 500; margin: 4px 0 0 0;">
              ${asset.warranty_expiry_date ? format(new Date(asset.warranty_expiry_date), 'MMM d, yyyy') : '-'}
            </p>
          </div>
          <div>
            <p style="color: #6b7280; margin: 0; font-size: 12px;">Next Inspection</p>
            <p style="font-weight: 500; margin: 4px 0 0 0;">
              ${asset.next_inspection_due ? format(new Date(asset.next_inspection_due), 'MMM d, yyyy') : '-'}
            </p>
          </div>
        </div>
      </div>

      ${includeFinancials ? `
      <!-- Financial Info -->
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <h3 style="font-size: 14px; color: #6b7280; margin: 0 0 12px 0;">Financial Information</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
          <div>
            <p style="color: #6b7280; margin: 0; font-size: 12px;">Purchase Value</p>
            <p style="font-weight: 500; margin: 4px 0 0 0; font-size: 18px;">
              ${formatCurrency(asset.purchase_value, asset.currency || 'SAR')}
            </p>
          </div>
          <div>
            <p style="color: #6b7280; margin: 0; font-size: 12px;">Current Value</p>
            <p style="font-weight: 500; margin: 4px 0 0 0; font-size: 18px;">
              ${formatCurrency(asset.current_value, asset.currency || 'SAR')}
            </p>
          </div>
          <div>
            <p style="color: #6b7280; margin: 0; font-size: 12px;">Residual Value</p>
            <p style="font-weight: 500; margin: 4px 0 0 0; font-size: 18px;">
              ${formatCurrency(asset.residual_value, asset.currency || 'SAR')}
            </p>
          </div>
        </div>
      </div>
      ` : ''}

      ${asset.description ? `
      <!-- Description -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0;">Description</h3>
        <p style="margin: 0; background: #f9fafb; padding: 12px; border-radius: 8px;">
          ${asset.description}
        </p>
      </div>
      ` : ''}

      ${includeHistory && maintenanceHistory.length > 0 ? `
      <!-- Maintenance History -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 14px; color: #6b7280; margin: 0 0 12px 0;">Recent Maintenance History</h3>
        <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #e5e7eb;">
              <th style="padding: 8px 12px; text-align: start; font-size: 12px;">Date</th>
              <th style="padding: 8px 12px; text-align: start; font-size: 12px;">Type</th>
              <th style="padding: 8px 12px; text-align: start; font-size: 12px;">Notes</th>
              <th style="padding: 8px 12px; text-align: end; font-size: 12px;">Cost</th>
            </tr>
          </thead>
          <tbody>
            ${maintenanceHistory.slice(0, 10).map(record => `
            <tr style="border-top: 1px solid #e5e7eb;">
              <td style="padding: 8px 12px; font-size: 12px;">${format(new Date(record.performed_date), 'MMM d, yyyy')}</td>
              <td style="padding: 8px 12px; font-size: 12px;">${record.maintenance_type?.replace('_', ' ') || '-'}</td>
              <td style="padding: 8px 12px; font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${record.notes || '-'}</td>
              <td style="padding: 8px 12px; font-size: 12px; text-align: end;">${formatCurrency(record.cost)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Footer Note -->
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 11px; margin: 0;">
          Report generated on ${format(new Date(), 'PPpp')}
        </p>
      </div>
    </div>
  `;

  const pdfOptions: PDFBrandingOptions = {
    filename: `asset-report-${asset.asset_code}-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
    margin: 15,
    quality: 2,
    isRTL,
    header: {
      logoBase64: logoData?.base64 || null,
      logoWidth: logoData?.width,
      logoHeight: logoData?.height,
      logoPosition: 'left',
      primaryText: branding.headerText || branding.tenantName || 'Asset Report',
      secondaryText: `Asset: ${asset.asset_code}`,
      bgColor: '#ffffff',
      textColor: '#1f2937',
    },
    footer: {
      text: branding.footerText || 'Confidential - Generated by Dhuud Gatekeeper',
      showPageNumbers: true,
      showDatePrinted: true,
      bgColor: '#f3f4f6',
      textColor: '#6b7280',
    },
    watermark: {
      text: branding.watermarkText,
      enabled: branding.watermarkEnabled ?? false,
      opacity: 15,
    },
  };

  try {
    await generateBrandedPDFFromElement(container, pdfOptions);
  } finally {
    removePDFRenderContainer(container);
  }
}
