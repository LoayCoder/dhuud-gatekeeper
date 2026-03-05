import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useDocumentBranding } from './use-document-branding';
import { supabase } from '@/integrations/supabase/client';
import { exportTeamSummary } from './security-report-team-export';
import { exportGuardPerformance, exportAttendance } from './security-report-guard-export';

export type ReportType = 'team_summary' | 'individual_guard' | 'attendance_excel';

export interface ReportSections {
    attendance: boolean;
    shifts: boolean;
    training: boolean;
    incidents: boolean;
}

export interface ExportOptions {
    reportType: ReportType;
    startDate: string;
    endDate: string;
    guardId?: string;
    sections?: ReportSections;
    language: 'en' | 'ar';
    isRTL: boolean;
}

export interface BrandingConfig {
    headerBgColor: string;
    headerTextColor: string;
    footerBgColor: string;
    footerTextColor: string;
    footerText?: string;
    watermarkText?: string | null;
    watermarkEnabled: boolean;
}

interface TenantData {
    name: string;
    logo_url: string | null;
}

interface ProfileWithRelations {
    tenant?: TenantData | null;
    department?: { name: string } | null;
}

export function useSecurityReportExport() {
    const { t } = useTranslation();
    const [isExporting, setIsExporting] = useState(false);
    const { settings } = useDocumentBranding();

    const exportReport = async (options: ExportOptions) => {
        setIsExporting(true);

        try {
            // Get tenant info
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id, tenant:tenants(name, logo_url)')
                .eq('id', user?.id || '')
                .single();

            const typedProfile = profile as unknown as ProfileWithRelations;
            const tenantName = typedProfile?.tenant?.name || 'Organization';
            const logoUrl = typedProfile?.tenant?.logo_url || null;

            const branding: BrandingConfig = {
                headerBgColor: settings?.headerBgColor || '#ffffff',
                headerTextColor: settings?.headerTextColor || '#1f2937',
                footerBgColor: settings?.footerBgColor || '#f3f4f6',
                footerTextColor: settings?.footerTextColor || '#6b7280',
                footerText: settings?.footerText || undefined,
                watermarkText: settings?.watermarkText || null,
                watermarkEnabled: settings?.watermarkEnabled || false,
            };

            switch (options.reportType) {
                case 'team_summary':
                    await exportTeamSummary(options, tenantName, logoUrl, branding);
                    break;
                case 'individual_guard':
                    if (options.guardId) {
                        await exportGuardPerformance(options, tenantName, logoUrl, branding);
                    }
                    break;
                case 'attendance_excel':
                    await exportAttendance(options);
                    break;
            }

            toast.success(t('security.exportSuccess', 'Report downloaded successfully'));
        } catch (error) {
            console.error('Export error:', error);
            toast.error(t('security.exportError', 'Failed to generate report'));
        } finally {
            setIsExporting(false);
        }
    };

    return { exportReport, isExporting };
}
