import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { isValidPhoneNumber } from "react-phone-number-input";
import { DhuudPhoneInput } from "@/components/ui/phone-input";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
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
  XCircle,
  Plus,
  Info,
  ChevronRight,
  ChevronLeft,
  Check,
  CheckCircle2,
  FileText
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


export default function PublicRequestPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  // Steps configuration
  const steps = [
    { id: 1, label: isRTL ? "مقدم الطلب" : "Requester" },
    { id: 2, label: isRTL ? "المركبة" : "Vehicle" },
    { id: 3, label: isRTL ? "المواد" : "Items" },
    { id: 4, label: isRTL ? "مراجعة" : "Review" },
  ];
  const [currentStep, setCurrentStep] = useState(1);

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
      setEndDate(startDate);
    }
  };

  // When start date changes in date range mode, auto-adjust end date if needed
  const handleStartDateChange = (d: Date) => {
    setStartDate(d);
    if (!isDateRange) {
      setEndDate(d);
    } else {
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

  // Validation Logic per Step
  const validateStep = (step: number): boolean => {
    setShowValidation(true);
    let isValid = true;

    if (step === 1) {
      // Requester Info
      if (!requesterName.trim() || requesterName.length < 2) isValid = false;
      if (!requesterPhone || !isValidPhoneNumber(requesterPhone)) isValid = false;
      // Branch is optional unless logic dictates otherwise, but let's say optional for public
    } else if (step === 2) {
      // Vehicle Info
      // At least plate letters AND numbers if provided, OR just skip if optional? 
      // Requirement: Vehicle Info usually required for Gate Pass. Let's make Plate mandatory.
      // But maybe user is "Walking"? If so, maybe we need a "Walk-in" option?
      // Assuming vehicle is mandatory for "Material Gate Pass" usually involving a truck.
      // But let's be lenient or check requirements.
      // "Step 2: Vehicle Info (Plate, Type, Driver)"
      // Let's require Plate Numbers + Letters.
      if (!vehiclePlateLetters || !vehiclePlateNumbers) isValid = false;
      if (!driverName.trim()) isValid = false;
      if (driverMobile && !isValidPhoneNumber(driverMobile)) isValid = false;
      // Date validations
      if (dateRangeError) isValid = false;
    } else if (step === 3) {
      // Items
      if (items.length === 0) isValid = false;
      for (const item of items) {
        if (!item.item_name.trim()) isValid = false;
        if (!item.photo) isValid = false;
      }
    }

    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setShowValidation(false);
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.error(isRTL ? "يرجى تعبئة الحقول المطلوبة" : "Please fill in required fields");
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Upload photo to storage
  const uploadPhoto = async (file: File, gatePassRef: string, index: number): Promise<{ path: string; fileName: string; size: number; mimeType: string }> => {
    const timestamp = Date.now();
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

  // Upload photo with retry
  const uploadPhotoWithRetry = async (file: File, gatePassRef: string, index: number, retries = 1): Promise<{ path: string; fileName: string; size: number; mimeType: string }> => {
    try {
      return await uploadPhoto(file, gatePassRef, index);
    } catch (err) {
      if (retries > 0) {
        console.warn(`[PublicGatePass] Photo upload retry for item ${index + 1}`);
        return uploadPhotoWithRetry(file, gatePassRef, index, retries - 1);
      }
      throw err;
    }
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validateStep(3)) {
      toast.error(isRTL ? "يرجى التحقق من البنود" : "Please check the items");
      return;
    }

    if (!tenantSlug) return;

    try {
      setIsUploading(true);
      const tempRef = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const uploadedItems: PublicGatePassItem[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let photoData = null;
        if (item.photo) {
          try {
            photoData = await uploadPhotoWithRetry(item.photo, tempRef, i);
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
      toast.error(isRTL ? "فشل إرسال الطلب" : "Failed to submit request");
    }
  };

  // Apply tenant branding
  const brandColor = tenant?.brand_color || "221.2 83.2% 53.3%";
  const brandStyle = {
    "--primary": brandColor,
  } as React.CSSProperties;

  if (loadingTenant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tenantError || !tenant) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <p>{isRTL ? "المنظمة غير موجودة" : "Organization Not Found"}</p>
        </div>
      </div>
    );
  }

  if (!tenant.allow_public_gate_pass_requests) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <Card className="w-full max-w-md border-warning">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{isRTL ? "الخدمة غير متاحة" : "Service Unavailable"}</h2>
            <p className="text-muted-foreground">{isRTL ? "هذه الخدمة غير مفعلة حالياً" : "This service is currently disabled"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const instructions = isRTL
    ? tenant.public_gate_pass_instructions_ar || tenant.public_gate_pass_instructions
    : tenant.public_gate_pass_instructions || tenant.public_gate_pass_instructions_ar;

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4 pb-20"
      dir={isRTL ? "rtl" : "ltr"}
      style={brandStyle}
    >
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header & Logo */}
        <div className="text-center pt-4 space-y-3">
          {tenant.logo_url && (
            <img src={tenant.logo_url} alt={tenant.name} className="h-14 mx-auto object-contain" />
          )}
          <div>
            <h1 className="text-xl font-bold">{tenant.name}</h1>
            <p className="text-sm text-muted-foreground">{isRTL ? "طلب تصريح خروج مواد" : "Material Exit Permit Request"}</p>
          </div>
        </div>

        {/* Wizard Progress */}
        <div className="relative flex items-center justify-between px-2">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary transition-all duration-300 -z-10"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            dir="ltr"
          />
          {steps.map((step) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            return (
              <div key={step.id} className="flex flex-col items-center gap-1 bg-background px-1">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                  isActive ? "border-primary bg-primary text-primary-foreground" :
                    isCompleted ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground bg-muted"
                )}>
                  {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* Step 1: Requester */}
          {currentStep === 1 && (
            <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CardHeader>
                <CardTitle className="text-lg">{isRTL ? "بيانات مقدم الطلب" : "Requester Details"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "الاسم الكامل" : "Full Name"} *</Label>
                  <div className="relative">
                    <User className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={requesterName}
                      onChange={e => setRequesterName(e.target.value)}
                      className="ps-10"
                      placeholder={isRTL ? "الاسم" : "Name"}
                    />
                    {showValidation && !requesterName.trim() && <p className="text-xs text-destructive mt-1">{isRTL ? "مطلوب" : "Required"}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "رقم الجوال" : "Mobile Number"} *</Label>
                  <div className="relative">
                    <DhuudPhoneInput
                      value={requesterPhone}
                      onChange={setRequesterPhone}
                      placeholder="+966..."
                      defaultCountry="SA"
                    />
                    {showValidation && (!requesterPhone || !isValidPhoneNumber(requesterPhone)) && <p className="text-xs text-destructive mt-1">{isRTL ? "رقم غير صحيح" : "Invalid number"}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "البريد الإلكتروني (اختياري)" : "Email (Optional)"}</Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      dir="ltr"
                      value={requesterEmail}
                      onChange={e => setRequesterEmail(e.target.value)}
                      className="ps-10"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الشركة (اختياري)" : "Company (Optional)"}</Label>
                  <div className="relative">
                    <Building2 className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={requesterCompany}
                      onChange={e => setRequesterCompany(e.target.value)}
                      className="ps-10"
                      placeholder={isRTL ? "اسم الشركة" : "Company Name"}
                    />
                  </div>
                </div>
                {branches && branches.length > 0 && (
                  <div className="space-y-2">
                    <Label>{isRTL ? "الفرع" : "Branch"}</Label>
                    <Select value={branchId} onValueChange={setBranchId}>
                      <SelectTrigger>
                        <SelectValue placeholder={isRTL ? "اختر الفرع" : "Select Branch"} />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Vehicle & Driver */}
          {currentStep === 2 && (
            <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CardHeader>
                <CardTitle className="text-lg">{isRTL ? "بيانات النقل" : "Transport Details"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <PublicVehiclePlateInput
                  letters={vehiclePlateLetters}
                  numbers={vehiclePlateNumbers}
                  onLettersChange={setVehiclePlateLetters}
                  onNumbersChange={setVehiclePlateNumbers}
                />
                {showValidation && (!vehiclePlateLetters || !vehiclePlateNumbers) && (
                  <p className="text-xs text-destructive text-center -mt-2">{isRTL ? "بيانات اللوحة مطلوبة" : "Plate details required"}</p>
                )}

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {isRTL ? "السائق" : "Driver"}
                  </h4>
                  <div className="grid gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{isRTL ? "اسم السائق" : "Driver Name"} *</Label>
                      <Input
                        value={driverName}
                        onChange={e => setDriverName(e.target.value)}
                      />
                      {showValidation && !driverName.trim() && <p className="text-xs text-destructive">{isRTL ? "مطلوب" : "Required"}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{isRTL ? "جوال السائق" : "Driver Mobile"}</Label>
                      <DhuudPhoneInput
                        value={driverMobile}
                        onChange={setDriverMobile}
                        placeholder="+966.."
                        defaultCountry="SA"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {isRTL ? "التوقيت" : "Schedule"}
                  </h4>
                  <Select value={passType} onValueChange={(v) => handlePassTypeChange(v as typeof passType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_out">{isRTL ? "دخول وخروج (عدة أيام)" : "Entry & Exit (Multi-day)"}</SelectItem>
                      <SelectItem value="out">{isRTL ? "خروج فقط (يوم واحد)" : "Exit Only (One day)"}</SelectItem>
                      <SelectItem value="in">{isRTL ? "دخول فقط (يوم واحد)" : "Entry Only (One day)"}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{isRTL ? "من" : "From"}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full text-xs h-9 justify-start">
                            {format(startDate, "dd/MM/yyyy")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                          <Calendar mode="single" selected={startDate} onSelect={d => d && handleStartDateChange(d)} disabled={d => isBefore(d, startOfDay(new Date()))} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{isRTL ? "إلى" : "To"}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full text-xs h-9 justify-start" disabled={!isDateRange}>
                            {format(endDate, "dd/MM/yyyy")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                          <Calendar mode="single" selected={endDate} onSelect={d => d && setEndDate(d)} disabled={d => isBefore(d, startDate) || isBefore(maxEndDate, d)} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  {dateRangeError && <p className="text-xs text-destructive">{dateRangeError}</p>}
                </div>

              </CardContent>
            </Card>
          )}

          {/* Step 3: Items */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex justify-between items-center">
                    <span>{isRTL ? "المواد المنقولة" : "Items to Move"}</span>
                    <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
                      {items.length}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {isRTL ? "يجب إرفاق صورة واضحة لكل بند" : "Clear photo required for each item"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
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

                  {items.length < 10 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={handleAddItem}
                    >
                      <Plus className="h-4 w-4 me-2" />
                      {isRTL ? "إضافة بند جديد" : "Add New Item"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300 border-primary/20">
              <CardHeader className="bg-primary/5 pb-4">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                  <h2 className="text-lg font-bold">{isRTL ? "مراجعة الطلب" : "Review Request"}</h2>
                </div>
                <CardDescription>
                  {isRTL ? "يرجى التأكد من صحة البيانات قبل الإرسال" : "Please verify details before submitting"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">

                {/* Summary Section */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block text-xs">{isRTL ? "مقدم الطلب" : "Requester"}</span>
                    <span className="font-medium">{requesterName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">{isRTL ? "الجوال" : "Mobile"}</span>
                    <span className="font-medium" dir="ltr">{requesterPhone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">{isRTL ? "اللوحة" : "Plate"}</span>
                    <span className="font-mono">{vehiclePlateLetters} {vehiclePlateNumbers}</span>
                  </div>
                  <div>
                   <span className="text-muted-foreground block text-xs">{isRTL ? "عدد المواد" : "Items Count"}</span>
                    <span className="font-medium">{items.length}</span>
                  </div>
                </div>

                {/* Item photo thumbnails in review */}
                {items.some(i => i.photoPreviewUrl) && (
                  <div className="space-y-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">{isRTL ? "صور المواد" : "Item Photos"}</span>
                    <div className="flex flex-wrap gap-2">
                      {items.map((item, idx) => item.photoPreviewUrl ? (
                        <div key={idx} className="relative">
                          <img
                            src={item.photoPreviewUrl}
                            alt={item.item_name || `Item ${idx + 1}`}
                            className="h-14 w-14 rounded-lg object-cover border"
                          />
                          <span className="absolute -top-1 -end-1 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Notifications Preferences */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">{isRTL ? "تفضيلات الإشعارات" : "Notify me via"}</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox id="n_wa" checked={notifyWhatsapp} onCheckedChange={v => setNotifyWhatsapp(!!v)} />
                      <Label htmlFor="n_wa" className="text-sm">WhatsApp</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="n_email" checked={notifyEmail} onCheckedChange={v => setNotifyEmail(!!v)} />
                      <Label htmlFor="n_email" className="text-sm">Email</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="n_sms" checked={notifySms} onCheckedChange={v => setNotifySms(!!v)} />
                      <Label htmlFor="n_sms" className="text-sm">SMS</Label>
                    </div>
                  </div>
                </div>

                {/* Instructions Repeater */}
                {instructions && (
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800">
                    <span className="font-bold block mb-1">{isRTL ? "تذكير:" : "Reminder:"}</span>
                    {instructions.substring(0, 100)}...
                  </div>
                )}

              </CardContent>
            </Card>
          )}

        </div>

        {/* Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-10 md:static md:bg-transparent md:border-0 md:p-0">
          <div className="max-w-lg mx-auto flex gap-3">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack} className="flex-1" disabled={isUploading}>
                {isRTL ? <ChevronRight className="h-4 w-4 me-1" /> : <ChevronLeft className="h-4 w-4 me-1" />}
                {isRTL ? "السابق" : "Back"}
              </Button>
            )}

            {currentStep < 4 ? (
              <Button onClick={handleNext} className="flex-[2]">
                {isRTL ? "التالي" : "Next"}
                {isRTL ? <ChevronLeft className="h-4 w-4 ms-1" /> : <ChevronRight className="h-4 w-4 ms-1" />}
              </Button>
            ) : (
              <Button onClick={handleSubmit} className="flex-[2] bg-green-600 hover:bg-green-700" disabled={isUploading}>
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Check className="h-4 w-4 me-2" />}
                {isRTL ? (isUploading ? "جاري الإرسال..." : "إرسال الطلب") : (isUploading ? "Submitting..." : "Submit Request")}
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
