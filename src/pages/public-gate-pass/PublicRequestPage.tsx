import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  Camera,
} from "lucide-react";
import {
  useTenantBySlug,
  usePublicBranches,
  useSubmitPublicGatePass,
} from "@/hooks/public-gate-pass";
import { PublicImageUpload } from "./components/PublicImageUpload";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Phone validation regex (supports international formats)
const phoneRegex = /^\+?[1-9]\d{7,14}$/;

const formSchema = z.object({
  requester_name: z.string().min(2, "Name must be at least 2 characters"),
  requester_phone: z.string().regex(phoneRegex, "Please enter a valid phone number (e.g., +966501234567)"),
  requester_email: z.string().email("Invalid email address").optional().or(z.literal("")),
  requester_company: z.string().optional(),
  branch_id: z.string().optional(),
  pass_type: z.enum(["in", "out", "in_out"]),
  material_description: z.string().min(5, "Please describe the materials (at least 5 characters)"),
  quantity: z.string().optional(),
  vehicle_plate: z.string().optional(),
  driver_name: z.string().optional(),
  driver_mobile: z.string().optional(),
  pass_date: z.date(),
  time_window_start: z.string().optional(),
  time_window_end: z.string().optional(),
  notify_whatsapp: z.boolean().default(true),
  notify_email: z.boolean().default(true),
  notify_sms: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function PublicRequestPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const { data: tenant, isLoading: loadingTenant, error: tenantError } = useTenantBySlug(tenantSlug);
  const { data: branches, isLoading: loadingBranches } = usePublicBranches(tenant?.id);
  const submitGatePass = useSubmitPublicGatePass();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requester_name: "",
      requester_phone: "",
      requester_email: "",
      requester_company: "",
      branch_id: "",
      pass_type: "in_out",
      material_description: "",
      quantity: "",
      vehicle_plate: "",
      driver_name: "",
      driver_mobile: "",
      pass_date: new Date(),
      time_window_start: "",
      time_window_end: "",
      notify_whatsapp: true,
      notify_email: true,
      notify_sms: false,
    },
  });

  // Clean up photo URLs on unmount
  useEffect(() => {
    return () => {
      photoUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoUrls]);

  const onSubmit = async (values: FormValues) => {
    if (!tenantSlug) return;

    const result = await submitGatePass.mutateAsync({
      tenant_slug: tenantSlug,
      branch_id: values.branch_id || undefined,
      requester_name: values.requester_name,
      requester_phone: values.requester_phone,
      requester_email: values.requester_email || undefined,
      requester_company: values.requester_company || undefined,
      pass_type: values.pass_type,
      material_description: values.material_description,
      quantity: values.quantity || undefined,
      vehicle_plate: values.vehicle_plate || undefined,
      driver_name: values.driver_name || undefined,
      driver_mobile: values.driver_mobile || undefined,
      pass_date: format(values.pass_date, "yyyy-MM-dd"),
      time_window_start: values.time_window_start || undefined,
      time_window_end: values.time_window_end || undefined,
      notify_whatsapp: values.notify_whatsapp,
      notify_email: values.notify_email,
      notify_sms: values.notify_sms,
    });

    if (result.success && result.public_access_token) {
      // Navigate to tracking page
      navigate(`/${tenantSlug}/track/${result.public_access_token}`);
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

        {/* Main Form */}
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
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Requester Name */}
                <FormField
                  control={form.control}
                  name="requester_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "الاسم الكامل" : "Full Name"} *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={isRTL ? "أدخل اسمك الكامل" : "Enter your full name"}
                            className="ps-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone Number */}
                <FormField
                  control={form.control}
                  name="requester_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "رقم الهاتف" : "Phone Number"} *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder={isRTL ? "+966501234567" : "+966501234567"}
                            className="ps-10"
                            dir="ltr"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        {isRTL ? "صيغة دولية مع رمز الدولة" : "International format with country code"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="requester_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "البريد الإلكتروني" : "Email"}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder={isRTL ? "example@company.com" : "example@company.com"}
                            className="ps-10"
                            dir="ltr"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Company */}
                <FormField
                  control={form.control}
                  name="requester_company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "اسم الشركة" : "Company Name"}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building2 className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={isRTL ? "اسم شركتك" : "Your company name"}
                            className="ps-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Branch Selector */}
                {branches && branches.length > 0 && (
                  <FormField
                    control={form.control}
                    name="branch_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? "الفرع / الموقع" : "Branch / Location"}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={isRTL ? "اختر الفرع" : "Select a branch"}
                              />
                            </SelectTrigger>
                          </FormControl>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Divider */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <Package className="h-5 w-5" />
                    {isRTL ? "تفاصيل المواد" : "Material Details"}
                  </h3>
                </div>

                {/* Pass Type */}
                <FormField
                  control={form.control}
                  name="pass_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "نوع التصريح" : "Pass Type"} *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="in">
                            {isRTL ? "دخول فقط" : "Entry Only"}
                          </SelectItem>
                          <SelectItem value="out">
                            {isRTL ? "خروج فقط" : "Exit Only"}
                          </SelectItem>
                          <SelectItem value="in_out">
                            {isRTL ? "دخول وخروج" : "Entry & Exit"}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Material Description */}
                <FormField
                  control={form.control}
                  name="material_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "وصف المواد" : "Material Description"} *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={
                            isRTL
                              ? "صف المواد التي سيتم نقلها..."
                              : "Describe the materials being transported..."
                          }
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quantity */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "الكمية" : "Quantity"}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={isRTL ? "مثال: 10 صناديق" : "e.g., 10 boxes"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Photo Upload */}
                <div className="space-y-2">
                  <FormLabel className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    {isRTL ? "صور المواد / الفاتورة" : "Material / Invoice Photos"}
                  </FormLabel>
                  <PublicImageUpload
                    photos={photos}
                    photoUrls={photoUrls}
                    onPhotosChange={(newPhotos, newUrls) => {
                      setPhotos(newPhotos);
                      setPhotoUrls(newUrls);
                    }}
                    maxPhotos={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? "يمكنك رفع حتى 5 صور للمواد أو الفواتير"
                      : "You can upload up to 5 photos of materials or invoices"}
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <Truck className="h-5 w-5" />
                    {isRTL ? "معلومات المركبة والسائق" : "Vehicle & Driver Information"}
                  </h3>
                </div>

                {/* Vehicle Plate */}
                <FormField
                  control={form.control}
                  name="vehicle_plate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "لوحة المركبة" : "Vehicle Plate"}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={isRTL ? "مثال: ABC 1234" : "e.g., ABC 1234"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Driver Name */}
                <FormField
                  control={form.control}
                  name="driver_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "اسم السائق" : "Driver Name"}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={isRTL ? "الاسم الكامل للسائق" : "Driver's full name"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Driver Mobile */}
                <FormField
                  control={form.control}
                  name="driver_mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "هاتف السائق" : "Driver Mobile"}</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder={isRTL ? "+966501234567" : "+966501234567"}
                          dir="ltr"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pass Date */}
                <FormField
                  control={form.control}
                  name="pass_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{isRTL ? "تاريخ التصريح" : "Pass Date"} *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full ps-3 text-start font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{isRTL ? "اختر التاريخ" : "Pick a date"}</span>
                              )}
                              <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Time Window */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="time_window_start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? "من الساعة" : "From"}</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="time_window_end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? "إلى الساعة" : "To"}</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Notification Preferences */}
                <div className="border-t pt-6 space-y-4">
                  <h3 className="font-semibold">
                    {isRTL ? "تفضيلات الإشعارات" : "Notification Preferences"}
                  </h3>
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="notify_whatsapp"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {isRTL ? "إشعارات واتساب" : "WhatsApp notifications"}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notify_email"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {isRTL ? "إشعارات البريد الإلكتروني" : "Email notifications"}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notify_sms"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {isRTL ? "إشعارات SMS" : "SMS notifications"}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 text-lg"
                  disabled={submitGatePass.isPending}
                >
                  {submitGatePass.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 me-2 animate-spin" />
                      {isRTL ? "جاري الإرسال..." : "Submitting..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 me-2" />
                      {isRTL ? "إرسال الطلب" : "Submit Request"}
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

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
