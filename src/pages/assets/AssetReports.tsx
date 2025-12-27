import { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  Building2,
  DollarSign,
  Shield,
  MapPin,
  Activity,
  Filter
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { exportToExcel, exportToCSV } from "@/lib/export-utils";
import { generateAssetReportPDF } from "@/lib/asset-report-utils";
import { format } from "date-fns";

type ReportType = "register" | "valuation" | "warranty" | "location" | "health" | "maintenance";

interface ReportConfig {
  type: ReportType;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: React.ElementType;
}

const reportConfigs: ReportConfig[] = [
  { type: "register", title: "Asset Register", titleAr: "سجل الأصول", description: "Complete list of all assets", descriptionAr: "قائمة كاملة بجميع الأصول", icon: FileText },
  { type: "valuation", title: "Asset Valuation", titleAr: "تقييم الأصول", description: "Book values and depreciation", descriptionAr: "القيم الدفترية والإهلاك", icon: DollarSign },
  { type: "warranty", title: "Warranty Status", titleAr: "حالة الضمان", description: "Warranties by status", descriptionAr: "الضمانات حسب الحالة", icon: Shield },
  { type: "location", title: "Location Report", titleAr: "تقرير المواقع", description: "Assets by location", descriptionAr: "الأصول حسب الموقع", icon: MapPin },
  { type: "health", title: "Asset Health", titleAr: "صحة الأصول", description: "Health scores and risks", descriptionAr: "درجات الصحة والمخاطر", icon: Activity },
  { type: "maintenance", title: "Maintenance Report", titleAr: "تقرير الصيانة", description: "Maintenance history", descriptionAr: "سجل الصيانة", icon: Building2 }
];

export default function AssetReports() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { toast } = useToast();
  
  const [selectedReport, setSelectedReport] = useState<ReportType>("register");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['asset-categories-for-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_categories')
        .select('id, name, name_ar')
        .is('deleted_at', null)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const fetchReportData = async () => {
    let query = supabase.from('hsse_assets').select(`
      id, asset_code, name, serial_number, status, condition_rating,
      purchase_price, current_book_value, warranty_expiry_date,
      category:asset_categories(name, name_ar),
      type:asset_types(name, name_ar),
      site:sites(name, name_ar),
      branch:branches(name, name_ar)
    `).is('deleted_at', null);

    if (categoryFilter !== "all") {
      query = query.eq('category_id', categoryFilter);
    }
    if (statusFilter !== "all") {
      query = query.eq('status', statusFilter as "active" | "missing" | "out_of_service" | "pending_inspection" | "retired" | "under_maintenance");
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  const handleExport = async (exportFormat: "pdf" | "excel" | "csv") => {
    setIsGenerating(true);
    try {
      const data = await fetchReportData();
      
      if (!data || data.length === 0) {
        toast({ title: isRTL ? "لا توجد بيانات" : "No Data", variant: "destructive" });
        return;
      }

      const reportConfig = reportConfigs.find(r => r.type === selectedReport)!;
      const reportTitle = isRTL ? reportConfig.titleAr : reportConfig.title;
      const filename = `${selectedReport}_report_${format(new Date(), 'yyyy-MM-dd')}`;

      if (exportFormat === "pdf") {
        await generateAssetReportPDF(data, selectedReport, reportTitle, isRTL);
      } else {
        const columns = [
          { key: 'asset_code', label: isRTL ? 'كود الأصل' : 'Asset Code' },
          { key: 'name', label: isRTL ? 'الاسم' : 'Name' },
          { key: 'category', label: isRTL ? 'الفئة' : 'Category' },
          { key: 'status', label: isRTL ? 'الحالة' : 'Status' }
        ];
        
        const flatData = data.map((asset: any) => ({
          asset_code: asset.asset_code,
          name: asset.name,
          category: isRTL ? asset.category?.name_ar || asset.category?.name : asset.category?.name,
          status: asset.status
        }));
        
        if (exportFormat === "excel") {
          exportToExcel(flatData, filename, columns);
        } else {
          exportToCSV(flatData, filename, columns);
        }
      }

      toast({ title: isRTL ? "تم التصدير بنجاح" : "Export Successful" });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: isRTL ? "خطأ في التصدير" : "Export Error", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{isRTL ? 'تقارير الأصول' : 'Asset Reports'}</h1>
        <p className="text-muted-foreground">{isRTL ? 'إنشاء وتصدير تقارير الأصول' : 'Generate and export asset reports'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportConfigs.map((config) => (
          <Card 
            key={config.type}
            className={`cursor-pointer transition-all hover:shadow-md ${selectedReport === config.type ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelectedReport(config.type)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedReport === config.type ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <config.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{isRTL ? config.titleAr : config.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{isRTL ? config.descriptionAr : config.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {isRTL ? 'خيارات التصفية' : 'Filter Options'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'الفئة' : 'Category'}</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'جميع الفئات' : 'All Categories'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع الفئات' : 'All Categories'}</SelectItem>
                  {categories?.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {isRTL ? cat.name_ar || cat.name : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? 'الحالة' : 'Status'}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'جميع الحالات' : 'All Statuses'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                  <SelectItem value="active">{isRTL ? 'نشط' : 'Active'}</SelectItem>
                  <SelectItem value="under_maintenance">{isRTL ? 'قيد الصيانة' : 'Under Maintenance'}</SelectItem>
                  <SelectItem value="retired">{isRTL ? 'متقاعد' : 'Retired'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button onClick={() => handleExport('pdf')} disabled={isGenerating} className="gap-2">
              <FileText className="h-4 w-4" />
              {isRTL ? 'تصدير PDF' : 'Export PDF'}
            </Button>
            <Button variant="outline" onClick={() => handleExport('excel')} disabled={isGenerating} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {isRTL ? 'تصدير Excel' : 'Export Excel'}
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')} disabled={isGenerating} className="gap-2">
              <Download className="h-4 w-4" />
              {isRTL ? 'تصدير CSV' : 'Export CSV'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
