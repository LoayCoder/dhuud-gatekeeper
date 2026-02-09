import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Package,
  CalendarIcon,
  Loader2,
  Building2,
  User,
  Phone,
  Mail,
  Truck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Info,
} from "lucide-react";
import {
  useTenantBySlug,
  usePublicBranches,
  useSubmitPublicGatePass,
} from "@/hooks/public-gate-pass";
import { PublicGatePassItemForm, GatePassItemData } from "./components/PublicGatePassItemForm";
import { PublicVehiclePlateInput } from "./components/PublicVehiclePlateInput";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PublicGatePassItem } from "@/types/public-gate-pass.types";

// Generate unique ID for items
const generateItemId = () => crypto.randomUUID();

// Create empty item
const createEmptyItem = (): GatePassItemData => ({
  id: generateItemId(),
  sr_number: "",
  item_name: "",
  description: "",
  quantity: "",
  unit: "",
  photo: null,
  photoPreviewUrl: null,
});

// Phone validation regex (supports international formats)
const phoneRegex = /^\+?[1-9]\d{7,14}$/;

export default function PublicRequestPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  // Form state
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requesterCompany, setRequesterCompany] = useState("");
  const [branchId, setBranchId] = useState("");
  const [passType, setPassType] = useState<"in" | "out" | "in_out">("in_out");
  const [items, setItems] = useState<GatePassItemData[]>([createEmptyItem()]);
  const [vehiclePlateLetters, setVehiclePlateLetters] = useState("");
  const [vehiclePlateNumbers, setVehiclePlateNumbers] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  
  // Validation state
  const [showValidation, setShowValidation] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Whether the current pass type uses a date range (in_out) or single date (in/out)
  const isDateRange = passType === "in_out";
  const maxEndDate = addDays(startDate, 6); // max 7 days from start

  // When pass type changes to single-date mode, sync end date to start date
  const handlePassTypeChange = (newType: "in" | "out" | "in_out") => {
    setPassType(newType);
    if (newType !== "in_out") {
      // Single-date mode: end date must equal start date
      setEndDate(startDate);
    }
  };

  // When start date changes in date range mode, auto-adjust end date if needed
  const handleStartDateChange = (d: Date) => {
    setStartDate(d);
    if (!isDateRange) {
      // Single-date mode: keep end date in sync
      setEndDate(d);
    } else {
      // Ensure end date is not before new start date and not beyond 7-day max
      if (isBefore(endDate, d)) {
        setEndDate(d);
      } else if (isBefore(addDays(d, 6), endDate)) {
        setEndDate(addDays(d, 6));
      }
    }
  };

  // Validate end date is within range
  const dateRangeError = isDateRange && isBefore(addDays(startDate, 6), endDate)
    ? (isRTL ? "لا يمكن أن يتجاوز النطاق 7 أيام" : "Date range cannot exceed 7 days")
    : null;

  const { data: tenant, isLoading: loadingTenant, error: tenantError } = useTenantBySlug(tenantSlug);
  const { data: branches, isLoading: loadingBranches } = usePublicBranches(tenant?.id);
  const submitGatePass = useSubmitPublicGatePass();

  // Clean up photo URLs on unmount
  useEffect(() => {
    return () => {
      items.forEach((item) => {
        if (item.photoPreviewUrl) {
          URL.revokeObjectURL(item.photoPreviewUrl);
        }
      });
    };
  }, []);

  // Update item handler
  const handleItemUpdate = useCallback((index: number, field: keyof GatePassItemData, value: string | File | null) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  // Add item handler
  const handleAddItem = useCallback(() => {
    if (items.length < 10) {
      setItems(prev => [...prev, createEmptyItem()]);
    }
  }, [items.length]);

  // Remove item handler
  const handleRemoveItem = useCallback((index: number) => {
    setItems(prev => {
      const item = prev[index];
      if (item.photoPreviewUrl) {
        URL.revokeObjectURL(item.photoPreviewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Validate form
  const validateForm = (): boolean => {
    // Required fields
    if (!requesterName.trim() || requesterName.length < 2) return false;
    if (!requesterPhone.trim() || !phoneRegex.test(requesterPhone)) return false;

    // At least one item required
    if (items.length === 0) return false;

    // Each item must have name and photo
    for (const item of items) {
      if (!item.item_name.trim()) return false;
      if (!item.photo) return false;
    }

    // Date range validation
    if (dateRangeError) return false;

    return true;
  };

  // Upload photo to storage
  const uploadPhoto = async (file: File, gatePassRef: string, index: number): Promise<{ path: string; fileName: string; size: number; mimeType: string }> => {
    const timestamp = Date.now();
    // Use extension matching the actual MIME type to avoid storage rejection
    const mimeToExt: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const ext = mimeToExt[file.type] || 'jpg';
    const contentType = mimeToExt[file.type] ? file.type : 'image/jpeg';
    const path = `${gatePassRef}/${index + 1}-${timestamp}.${ext}`;

    const { error } = await supabase.storage
      .from('public-gate-pass-photos')
      .upload(path, file, {
        cacheControl: '3600',
        contentType,
        upsert: false,
      });

    if (error) throw error;

    return {
      path,
      fileName: file.name,
      size: file.size,
      mimeType: contentType,
    };
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setShowValidation(true);
    
    if (!validateForm() || !tenantSlug) {
      toast.error(isRTL ? "يرجى تعبئة جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }

    try {
      setIsUploading(true);
      
      // Generate a temporary reference for organizing photos
      const tempRef = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      
      // Upload all item photos first
      const uploadedItems: PublicGatePassItem[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let photoData = null;
        
        if (item.photo) {
          try {
            photoData = await uploadPhoto(item.photo, tempRef, i);
          } catch (uploadError) {
            console.error('Photo upload failed:', uploadError);
            toast.error(isRTL ? `فشل رفع صورة البند ${i + 1}` : `Failed to upload photo for item ${i + 1}`);
            setIsUploading(false);
            return;
          }
        }
        
        uploadedItems.push({
          sr_number: item.sr_number || undefined,
          item_name: item.item_name,
          description: item.description || undefined,
          quantity: item.quantity || undefined,
          unit: item.unit || undefined,
          photo_path: photoData?.path,
          photo_file_name: photoData?.fileName,
          photo_file_size: photoData?.size,
          photo_mime_type: photoData?.mimeType,
        });
      }

      setIsUploading(false);

      // Submit the gate pass
      const result = await submitGatePass.mutateAsync({
        tenant_slug: tenantSlug,
        branch_id: branchId || undefined,
        requester_name: requesterName,
        requester_phone: requesterPhone,
        requester_email: requesterEmail || undefined,
        requester_company: requesterCompany || undefined,
        pass_type: passType,
        items: uploadedItems,
        vehicle_plate_letters: vehiclePlateLetters || undefined,
        vehicle_plate_numbers: vehiclePlateNumbers || undefined,
        driver_name: driverName || undefined,
        driver_mobile: driverMobile || undefined,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        notify_whatsapp: notifyWhatsapp,
        notify_email: notifyEmail,
        notify_sms: notifySms,
      });

      if (result.success && result.public_access_token) {
        navigate(`/${tenantSlug}/track/${result.public_access_token}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      setIsUploading(false);
    }
  };

  // Apply tenant branding
  const brandColor = tenant?.brand_color || "221.2 83.2% 53.3%";
  const brandStyle = {
    "--primary": brandColor,
  } as React.CSSProperties;

  // Loading state
  if (loadingTenant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background p-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="max-w-lg mx-auto space-y-6">
          <Skeleton className="h-16 w-32 mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state - tenant not found
  if (tenantError || !tenant) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-destructive mb-2">
              {isRTL ? "المنظمة غير موجودة" : "Organization Not Found"}
            </h2>
            <p className="text-muted-foreground">
              {isRTL
                ? "لم يتم العثور على المنظمة المطلوبة أو أنها غير متاحة"
                : "The requested organization was not found or is unavailable"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Public gate passes not enabled
  if (!tenant.allow_public_gate_pass_requests) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <Card className="w-full max-w-md border-warning">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {isRTL ? "الخدمة غير متاحة" : "Service Unavailable"}
            </h2>
            <p className="text-muted-foreground">
              {isRTL
                ? "طلبات تصاريح المرور العامة غير مفعلة لهذه المنظمة"
                : "Public gate pass requests are not enabled for this organization"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const instructions = isRTL
    ? tenant.public_gate_pass_instructions_ar || tenant.public_gate_pass_instructions
    : tenant.public_gate_pass_instructions || tenant.public_gate_pass_instructions_ar;

  const isSubmitting = submitGatePass.isPending || isUploading;

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4 pb-safe"
      dir={isRTL ? "rtl" : "ltr"}
      style={brandStyle}
    >
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header with Tenant Branding */}
        <div className="text-center pt-4 space-y-3">
          {tenant.logo_url && (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="h-16 mx-auto object-contain"
            />
          )}
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <p className="text-muted-foreground">
            {isRTL ? "طلب تصريح مرور للمواد" : "Material Gate Pass Request"}
          </p>
        </div>

        {/* Instructions Alert */}
        {instructions && (
          <Alert className="border-primary/50 bg-primary/5">
            <Package className="h-5 w-5" />
            <AlertTitle>
              {isRTL ? "تعليمات" : "Instructions"}
            </AlertTitle>
            <AlertDescription className="whitespace-pre-wrap text-sm">
              {instructions}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Requester Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {isRTL ? "معلومات مقدم الطلب" : "Requester Information"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "يرجى تعبئة بياناتك" : "Please fill in your details"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Requester Name */}
              <div className="space-y-2">
                <Label className={cn(showValidation && !requesterName.trim() && "text-destructive")}>
                  {isRTL ? "الاسم الكامل" : "Full Name"} *
                </Label>
                <div className="relative">
                  <User className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={isRTL ? "أدخل اسمك الكامل" : "Enter your full name"}
                    className={cn("ps-10", showValidation && !requesterName.trim() && "border-destructive")}
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label className={cn(showValidation && !phoneRegex.test(requesterPhone) && "text-destructive")}>
                  {isRTL ? "رقم الهاتف" : "Phone Number"} *
                </Label>
                <div className="relative">
                  <Phone className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="+966501234567"
                    className={cn("ps-10", showValidation && !phoneRegex.test(requesterPhone) && "border-destructive")}
                    dir="ltr"
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? "صيغة دولية مع رمز الدولة" : "International format with country code"}
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
                <div className="relative">
                  <Mail className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="example@company.com"
                    className="ps-10"
                    dir="ltr"
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Company */}
              <div className="space-y-2">
                <Label>{isRTL ? "اسم الشركة" : "Company Name"}</Label>
                <div className="relative">
                  <Building2 className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={isRTL ? "اسم شركتك" : "Your company name"}
                    className="ps-10"
                    value={requesterCompany}
                    onChange={(e) => setRequesterCompany(e.target.value)}
                  />
                </div>
              </div>

              {/* Branch Selector */}
              {branches && branches.length > 0 && (
                <div className="space-y-2">
                  <Label>{isRTL ? "الفرع / الموقع" : "Branch / Location"}</Label>
                  <Select onValueChange={setBranchId} value={branchId}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? "اختر الفرع" : "Select a branch"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingBranches ? (
                        <SelectItem value="loading" disabled>
                          {isRTL ? "جاري التحميل..." : "Loading..."}
                        </SelectItem>
                      ) : (
                        branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                            {branch.location && ` - ${branch.location}`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {isRTL ? "بنود المواد" : "Material Items"}
              </CardTitle>
              <CardDescription>
                {isRTL 
                  ? "أضف البنود مع صورة لكل بند (مطلوبة)" 
                  : "Add items with a photo for each (required)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pass Type */}
              <div className="space-y-2">
                <Label>{isRTL ? "نوع التصريح" : "Pass Type"} *</Label>
                <Select value={passType} onValueChange={(v) => handlePassTypeChange(v as typeof passType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">{isRTL ? "دخول فقط" : "Entry Only"}</SelectItem>
                    <SelectItem value="out">{isRTL ? "خروج فقط" : "Exit Only"}</SelectItem>
                    <SelectItem value="in_out">{isRTL ? "دخول وخروج" : "Entry & Exit"}</SelectItem>
                  </SelectContent>
                </Select>
                {/* Helper text based on pass type */}
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    {passType === "in_out"
                      ? (isRTL ? "صالح حتى 7 أيام. يمكن الدخول والخروج في أي وقت خلال الفترة المعتمدة" : "Valid up to 7 days. Entry and exit can occur anytime within the approved date range")
                      : passType === "in"
                      ? (isRTL ? "صالح ليوم واحد فقط. سيتم تسجيل وقت الدخول بواسطة حارس الأمن" : "Valid for one day only. Entry time is logged by the security guard")
                      : (isRTL ? "صالح ليوم واحد فقط. سيتم تسجيل وقت الخروج بواسطة حارس الأمن" : "Valid for one day only. Exit time is logged by the security guard")}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {items.map((item, index) => (
                  <PublicGatePassItemForm
                    key={item.id}
                    item={item}
                    index={index}
                    onUpdate={handleItemUpdate}
                    onRemove={handleRemoveItem}
                    canRemove={items.length > 1}
                    showValidation={showValidation}
                  />
                ))}
              </div>

              {/* Add Item Button */}
              {items.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleAddItem}
                >
                  <Plus className="h-4 w-4 me-2" />
                  {isRTL ? "إضافة بند آخر" : "Add Another Item"}
                </Button>
              )}

              <p className="text-xs text-muted-foreground text-center">
                {items.length} / 10 {isRTL ? "بنود" : "items"}
              </p>
            </CardContent>
          </Card>

          {/* Vehicle & Driver Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                {isRTL ? "معلومات المركبة والسائق" : "Vehicle & Driver Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vehicle Plate */}
              <PublicVehiclePlateInput
                letters={vehiclePlateLetters}
                numbers={vehiclePlateNumbers}
                onLettersChange={setVehiclePlateLetters}
                onNumbersChange={setVehiclePlateNumbers}
              />

              {/* Driver Name */}
              <div className="space-y-2">
                <Label>{isRTL ? "اسم السائق" : "Driver Name"}</Label>
                <Input
                  placeholder={isRTL ? "الاسم الكامل للسائق" : "Driver's full name"}
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </div>

              {/* Driver Mobile */}
              <div className="space-y-2">
                <Label>{isRTL ? "هاتف السائق" : "Driver Mobile"}</Label>
                <Input
                  type="tel"
                  placeholder="+966501234567"
                  dir="ltr"
                  value={driverMobile}
                  onChange={(e) => setDriverMobile(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Schedule Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {isRTL ? "الجدولة" : "Schedule"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDateRange ? (
                /* Entry & Exit: Start Date + End Date (max 7 days) */
                <>
                  <div className="space-y-2">
                    <Label>{isRTL ? "تاريخ البدء" : "Start Date"} *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full ps-3 text-start font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          {startDate ? format(startDate, "PPP") : (
                            <span>{isRTL ? "اختر التاريخ" : "Pick a date"}</span>
                          )}
                          <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(d) => d && handleStartDateChange(d)}
                          disabled={(date) => isBefore(date, startOfDay(new Date()))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>{isRTL ? "تاريخ الانتهاء" : "End Date"} *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full ps-3 text-start font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          {endDate ? format(endDate, "PPP") : (
                            <span>{isRTL ? "اختر التاريخ" : "Pick a date"}</span>
                          )}
                          <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(d) => d && setEndDate(d)}
                          disabled={(date) =>
                            isBefore(date, startDate) || isBefore(maxEndDate, date)
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {dateRangeError && (
                    <p className="text-xs text-destructive">{dateRangeError}</p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? "التصريح صالح حتى 7 أيام كحد أقصى. الدخول والخروج لا يحتاجان أن يكونا في نفس اليوم"
                      : "Pass valid up to 7 days maximum. Entry and exit do not need to be on the same day."}
                  </p>
                </>
              ) : (
                /* Entry Only / Exit Only: Single Date */
                <>
                  <div className="space-y-2">
                    <Label>
                      {passType === "in"
                        ? (isRTL ? "تاريخ الدخول" : "Entry Date")
                        : (isRTL ? "تاريخ الخروج" : "Exit Date")} *
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full ps-3 text-start font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          {startDate ? format(startDate, "PPP") : (
                            <span>{isRTL ? "اختر التاريخ" : "Pick a date"}</span>
                          )}
                          <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(d) => d && handleStartDateChange(d)}
                          disabled={(date) => isBefore(date, startOfDay(new Date()))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {passType === "in"
                      ? (isRTL ? "صالح ليوم واحد فقط. سيتم تسجيل وقت الدخول بواسطة حارس الأمن" : "Valid for one day only. Entry time is logged by the security guard at access time.")
                      : (isRTL ? "صالح ليوم واحد فقط. سيتم تسجيل وقت الخروج بواسطة حارس الأمن" : "Valid for one day only. Exit time is logged by the security guard at access time.")}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notifications Card */}
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? "تفضيلات الإشعارات" : "Notification Preferences"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="notify_whatsapp"
                  checked={notifyWhatsapp}
                  onCheckedChange={(v) => setNotifyWhatsapp(!!v)}
                />
                <Label htmlFor="notify_whatsapp" className="font-normal cursor-pointer">
                  {isRTL ? "إشعارات واتساب" : "WhatsApp notifications"}
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="notify_email"
                  checked={notifyEmail}
                  onCheckedChange={(v) => setNotifyEmail(!!v)}
                />
                <Label htmlFor="notify_email" className="font-normal cursor-pointer">
                  {isRTL ? "إشعارات البريد الإلكتروني" : "Email notifications"}
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="notify_sms"
                  checked={notifySms}
                  onCheckedChange={(v) => setNotifySms(!!v)}
                />
                <Label htmlFor="notify_sms" className="font-normal cursor-pointer">
                  {isRTL ? "إشعارات SMS" : "SMS notifications"}
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 me-2 animate-spin" />
                {isUploading 
                  ? (isRTL ? "جاري رفع الصور..." : "Uploading photos...") 
                  : (isRTL ? "جاري الإرسال..." : "Submitting...")}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 me-2" />
                {isRTL ? "إرسال الطلب" : "Submit Request"}
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          {isRTL
            ? "سيتم إرسال رابط تتبع الطلب إلى هاتفك"
            : "A tracking link will be sent to your phone"}
        </p>
      </div>
    </div>
  );
}
