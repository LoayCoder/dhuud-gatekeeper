/**
 * Live preview component for ID card settings
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { IDCardTemplate } from "../IDCardTemplate";
import { TestPrintButton } from "./TestPrintButton";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import type { 
  TenantIDCardSettings, 
  IDCardTenantData, 
  IDCardPersonData,
  IDCardType 
} from "@/types/id-card.types";

interface IDCardLivePreviewProps {
  settings: TenantIDCardSettings;
  tenantData: IDCardTenantData;
  cardType: IDCardType;
  className?: string;
}

// Sample data for preview
const SAMPLE_PERSON_DATA: Record<IDCardType, IDCardPersonData> = {
  visitor: {
    id: 'sample-visitor',
    fullName: 'Sarah Johnson',
    fullNameAr: 'سارة جونسون',
    photo: '',
    company: 'Tech Solutions Inc.',
    companyAr: 'شركة الحلول التقنية',
    destination: 'Meeting Room 3B',
    destinationAr: 'قاعة الاجتماعات 3B',
    hostName: 'Mohammed Ali',
    hostNameAr: 'محمد علي',
    validUntil: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    entryDate: new Date().toISOString().split('T')[0],
    qrToken: 'VIS-SAMPLE-001',
    emergencyContact: '+966 50 123 4567',
  },
  visitor_vip: {
    id: 'sample-vip',
    fullName: 'James Anderson',
    fullNameAr: 'جيمس أندرسون',
    photo: '',
    company: 'Global Enterprises',
    companyAr: 'المؤسسات العالمية',
    destination: 'Executive Floor',
    destinationAr: 'الطابق التنفيذي',
    hostName: 'CEO Office',
    hostNameAr: 'مكتب الرئيس التنفيذي',
    validUntil: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    qrToken: 'VIP-SAMPLE-001',
    emergencyContact: '+966 50 987 6543',
  },
  worker: {
    id: 'sample-worker',
    fullName: 'Ahmed Hassan',
    fullNameAr: 'أحمد حسن',
    photo: '',
    company: 'Safety First Ltd.',
    companyAr: 'السلامة أولا المحدودة',
    role: 'Electrician',
    roleAr: 'كهربائي',
    project: 'Tower A Construction',
    projectAr: 'بناء البرج أ',
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    badgeNumber: 'WRK-2024-001',
    inductionCompleted: true,
    qrToken: 'WRK-SAMPLE-001',
    emergencyContact: '+966 55 111 2222',
    safetyInstructions: 'PPE required at all times. Report to safety officer.',
  },
  employee: {
    id: 'sample-employee',
    fullName: 'Fatima Al-Rashid',
    fullNameAr: 'فاطمة الراشد',
    photo: '',
    department: 'HSSE Department',
    departmentAr: 'إدارة الصحة والسلامة',
    role: 'Safety Officer',
    roleAr: 'مسؤول السلامة',
    employeeId: 'EMP-10042',
    qrToken: 'EMP-SAMPLE-001',
    emergencyContact: '+966 50 333 4444',
  },
  contractor_rep: {
    id: 'sample-contractor',
    fullName: 'Michael Chen',
    fullNameAr: 'مايكل تشن',
    photo: '',
    company: 'BuildPro Contractors',
    companyAr: 'بيلد برو للمقاولات',
    role: 'Project Manager',
    roleAr: 'مدير المشروع',
    validUntil: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    qrToken: 'CTR-SAMPLE-001',
    emergencyContact: '+966 55 555 6666',
  },
};

export function IDCardLivePreview({
  settings,
  tenantData,
  cardType,
  className,
}: IDCardLivePreviewProps) {
  const { t } = useTranslation();
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');

  const sampleData = SAMPLE_PERSON_DATA[cardType];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={side} onValueChange={(v) => setSide(v as 'front' | 'back')}>
          <TabsList>
            <TabsTrigger value="front">
              {t("idCard.preview.front", "Front")}
            </TabsTrigger>
            <TabsTrigger value="back" disabled={!settings.back_enabled}>
              {t("idCard.preview.back", "Back")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button
            variant={language === 'en' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage('en')}
            className="min-w-[60px]"
          >
            EN
          </Button>
          <Button
            variant={language === 'ar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage('ar')}
            className="min-w-[60px]"
          >
            AR
          </Button>
        </div>
      </div>

      {/* Card Preview */}
      <div className="flex justify-center p-4 bg-muted/30 rounded-lg border border-dashed">
        <div className="transform transition-transform hover:scale-105">
          <IDCardTemplate
            cardType={cardType}
            personData={sampleData}
            tenantData={tenantData}
            settings={settings}
            side={side}
            language={language}
            scale={1.5}
          />
        </div>
      </div>

      {/* Test Print Button */}
      <div className="flex justify-center">
        <TestPrintButton
          settings={settings}
          tenantData={tenantData}
          cardType={cardType}
          samplePersonData={sampleData}
        />
      </div>

      {/* Preview Info */}
      <div className="text-center text-xs text-muted-foreground">
        <p>{t("idCard.preview.sampleNote", "Preview uses sample data. Actual cards will use real person data.")}</p>
      </div>
    </div>
  );
}
